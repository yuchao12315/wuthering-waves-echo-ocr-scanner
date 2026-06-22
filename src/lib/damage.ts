import type { Echo } from '@/types/echo'
import type { CharacterBase, Weapon, DamageResult, BuffType, SonataEffect, InherentBuff, ChainEffect } from '@/types/damage'
import SONATA_EFFECTS from '@/data/sonata-effects.json'

import { getNightmareBonus } from '@/data/nightmare-bonuses'

const sonataEffects = SONATA_EFFECTS as Record<string, SonataEffect>

const SKILL_DMG_MAP: Record<string, string> = {
  NORMAL_ATK_DMG: 'normalAtk',
  HEAVY_ATK_DMG: 'heavyAtk',
  RESONANCE_SKILL_DMG: 'resonanceSkill',
  RESONANCE_LIBERATION_DMG: 'resonanceLiberation',
}

const SKILLTYPE_TO_DMG: Record<string, string> = {
  '常态攻击': 'normalAtk',
  '共鸣技能': 'resonanceSkill',
  '共鸣解放': 'resonanceLiberation',
  '共鸣回路': 'resonanceSkill',
}

const BUFF_TO_DMG_KEY: Record<string, string> = {
  normalAtkDmg: 'normalAtk',
  heavyAtkDmg: 'heavyAtk',
  resonanceSkillDmg: 'resonanceSkill',
  resonanceLiberationDmg: 'resonanceLiberation',
}

/** Round to 5 decimal places (ATK and all multipliers) */
const round5 = (v: number) => Math.round(v * 1e5) / 1e5
/** Round to 9 decimal places (defense multiplier) */
const round9 = (v: number) => Math.round(v * 1e9) / 1e9

interface EchoStats {
  atkPct: number
  flatAtk: number
  hpPct: number
  flatHp: number
  critRate: number
  critDmg: number
  elemDmg: number
  skillDmg: Record<string, number>
  nightmareElemDmg: number
  nightmareSecondType: string
  nightmareSecondValue: number
}

function collectEchoStats(echoes: Echo[]): EchoStats {
  const stats: EchoStats = {
    atkPct: 0, flatAtk: 0, hpPct: 0, flatHp: 0,
    critRate: 0, critDmg: 0, elemDmg: 0,
    skillDmg: { normalAtk: 0, heavyAtk: 0, resonanceSkill: 0, resonanceLiberation: 0 },
    nightmareElemDmg: 0,
    nightmareSecondType: '',
    nightmareSecondValue: 0,
  }

  for (const echo of echoes) {
    const allEntries = [
      echo.mainStat,
      echo.secondaryStat,
      ...echo.substats,
    ].filter(Boolean)

    for (const entry of allEntries) {
      if (!entry) continue
      const { type, value } = entry
      switch (type) {
        case 'ATK_PCT': stats.atkPct += value / 100; break
        case 'FLAT_ATK': stats.flatAtk += value; break
        case 'HP_PCT': stats.hpPct += value / 100; break
        case 'FLAT_HP': stats.flatHp += value; break
        case 'CRIT_RATE': stats.critRate += value / 100; break
        case 'CRIT_DMG': stats.critDmg += value / 100; break
        case 'ELEM_DMG': stats.elemDmg += value / 100; break
        default: {
          const key = SKILL_DMG_MAP[type]
          if (key) stats.skillDmg[key] += value / 100
        }
      }
    }

    // Nightmare bonus: use stored field or auto-match by name
    const nmBonus = echo.nightmareBonus ?? getNightmareBonus(echo.monsterName)
    if (nmBonus) {
      stats.nightmareElemDmg += nmBonus.elemDmg
      if (nmBonus.secondValue > 0) {
        stats.nightmareSecondType = nmBonus.secondType
        stats.nightmareSecondValue += nmBonus.secondValue
      }
    }
  }

  return stats
}

function collectSonataBuffs(echoes: Echo[]): { atkPct: number; elemDmg: number; skillDmg: Record<string, number> } {
  const counts: Record<string, number> = {}
  for (const e of echoes) {
    if (e.sonata) counts[e.sonata] = (counts[e.sonata] ?? 0) + 1
  }

  let atkPct = 0
  let elemDmg = 0
  const skillDmg: Record<string, number> = {}

  for (const [sonata, count] of Object.entries(counts)) {
    const effect = sonataEffects[sonata]
    if (!effect) continue

    if (count >= 2 && effect.set2) {
      const val = effect.set2.stacks ? effect.set2.value * effect.set2.stacks : effect.set2.value
      applyBuff(effect.set2.type, val)
    }
    if (count >= 5 && effect.set5) {
      const val = effect.set5.stacks ? effect.set5.value * effect.set5.stacks : effect.set5.value
      applyBuff(effect.set5.type, val)
    }
  }

  function applyBuff(type: BuffType, value: number) {
    if (type === 'atkPct') atkPct += value
    else if (type === 'elemDmg') elemDmg += value
    else {
      const key = BUFF_TO_DMG_KEY[type]
      if (key) skillDmg[key] = (skillDmg[key] ?? 0) + value
    }
  }

  return { atkPct, elemDmg, skillDmg }
}

function parseParamValue(paramStr: string): number {
  if (!paramStr) return 0
  const match = paramStr.match(/^([0-9.]+)(%?)$/)
  if (!match) return 0
  const val = parseFloat(match[1])
  return match[2] === '%' ? val / 100 : val
}

export function parseMultiplierStr(str: string): number {
  if (!str || !str.includes('%')) return 0
  const parts = str.split('+')
  let total = 0
  for (const part of parts) {
    const trimmed = part.trim()
    const match = trimmed.match(/^([0-9.]+)%(?:\*(\d+))?$/)
    if (match) {
      const pct = parseFloat(match[1]) / 100
      const count = match[2] ? parseInt(match[2]) : 1
      total += pct * count
    }
  }
  return total
}

function isBuffEnabled(buff: InherentBuff): boolean {
  return buff.enabled !== false
}

function buffMatchesSkill(buff: InherentBuff, skillName: string): boolean {
  if (!buff.targetSkill) return true
  try {
    return new RegExp(buff.targetSkill).test(skillName)
  } catch {
    return skillName.includes(buff.targetSkill)
  }
}

export function calcDamage(
  character: CharacterBase,
  weapon: Weapon,
  weaponRefine: number,
  echoes: Echo[],
  _chainNodes = -1,
  skillLevel = 10,
  charLevel = 90,
  enemyLevel = 89,
  enemyResist = 0.1,
  chainLevel = 0,
): DamageResult {
  const echoStats = collectEchoStats(echoes)
  const sonataBuff = collectSonataBuffs(echoes)
  const refineIdx = Math.max(0, Math.min(4, weaponRefine - 1))
  const levelIdx = Math.max(0, Math.min(18, skillLevel - 1))

  const baseAtk = character.baseAtk + weapon.baseAtk
  const enabledBuffs = character.inherentBuffs.filter(isBuffEnabled)

  const activeChainLevel = Math.min(6, chainLevel)
  const activeChainEffects: ChainEffect[] = []
  if (character.chainEffects) {
    for (const eff of character.chainEffects) {
      if (eff.sequence <= activeChainLevel && eff.enabled !== false) {
        activeChainEffects.push(eff)
      }
    }
  }

  // Source tracking helpers
  type S = { label: string; value: number }
  const src = {
    atk: [] as S[], critRate: [] as S[], critDmg: [] as S[], elemDmg: [] as S[],
    normalAtk: [] as S[], heavyAtk: [] as S[], resonanceSkill: [] as S[], resonanceLiberation: [] as S[],
  }
  function addSrc(cat: keyof typeof src, label: string, value: number) {
    if (value) src[cat].push({ label, value })
  }

  // --- Collect global buffs with source tracking ---
  let totalAtkPct = 0
  let totalCritRate = 0.05
  let totalCritDmg = 1.50
  let baseElemDmg = 0
  let totalDefIgnore = 0
  let totalResReduce = 0
  let globalDmgDeepen = 0

  // Weapon secondary stat
  if (weapon.atkPct) { totalAtkPct += weapon.atkPct; addSrc('atk', `${weapon.name}副属性`, weapon.atkPct) }
  if (weapon.critRate) { totalCritRate += weapon.critRate; addSrc('critRate', `${weapon.name}副属性`, weapon.critRate) }
  if (weapon.critDmg) { totalCritDmg += weapon.critDmg; addSrc('critDmg', `${weapon.name}副属性`, weapon.critDmg) }

  // Echo stats
  if (echoStats.atkPct) { totalAtkPct += echoStats.atkPct; addSrc('atk', '声骸攻击%', echoStats.atkPct) }
  if (echoStats.critRate) { totalCritRate += echoStats.critRate; addSrc('critRate', '声骸暴击率', echoStats.critRate) }
  if (echoStats.critDmg) { totalCritDmg += echoStats.critDmg; addSrc('critDmg', '声骸暴击伤害', echoStats.critDmg) }
  if (echoStats.elemDmg) { baseElemDmg += echoStats.elemDmg; addSrc('elemDmg', '声骸属性伤害', echoStats.elemDmg) }

  // Sonata
  if (sonataBuff.atkPct) { totalAtkPct += sonataBuff.atkPct; addSrc('atk', '套装效果', sonataBuff.atkPct) }
  if (sonataBuff.elemDmg) { baseElemDmg += sonataBuff.elemDmg; addSrc('elemDmg', '套装效果', sonataBuff.elemDmg) }

  const skillDmgBonuses: Record<string, number> = { normalAtk: 0, heavyAtk: 0, resonanceSkill: 0, resonanceLiberation: 0 }
  // Echo skill dmg substats
  for (const [k, v] of Object.entries(echoStats.skillDmg)) {
    if (v) { skillDmgBonuses[k] += v; addSrc(k as keyof typeof src, '声骸技能增伤', v) }
  }
  // Nightmare echo fixed bonus: elemDmg to baseElemDmg, secondType to specific skill pool
  if (echoStats.nightmareElemDmg) { baseElemDmg += echoStats.nightmareElemDmg; addSrc('elemDmg', '梦魇声骸属性伤害', echoStats.nightmareElemDmg) }
  if (echoStats.nightmareSecondValue > 0) {
    const nmKey = BUFF_TO_DMG_KEY[echoStats.nightmareSecondType]
    if (nmKey && skillDmgBonuses[nmKey] !== undefined) {
      skillDmgBonuses[nmKey] += echoStats.nightmareSecondValue
      addSrc(nmKey as keyof typeof src, '梦魇声骸技能增伤', echoStats.nightmareSecondValue)
    }
  }
  // Sonata skill dmg
  for (const [k, v] of Object.entries(sonataBuff.skillDmg)) {
    if (v) { skillDmgBonuses[k] += v; addSrc(k as keyof typeof src, '套装效果', v) }
  }

  // ascensionStat: 90级满突后已包含在baseAtk/基础暴击中，不再额外计算

  // Inherent buffs
  for (const buff of enabledBuffs) {
    if (buff.targetSkill) continue
    const lbl = buff.condition ?? '固有技能'
    switch (buff.type) {
      case 'atkPct': totalAtkPct += buff.value; addSrc('atk', lbl, buff.value); break
      case 'critRate': totalCritRate += buff.value; addSrc('critRate', lbl, buff.value); break
      case 'critDmg': totalCritDmg += buff.value; addSrc('critDmg', lbl, buff.value); break
      case 'elemDmg': baseElemDmg += buff.value; addSrc('elemDmg', lbl, buff.value); break
      case 'defIgnore': totalDefIgnore += buff.value; break
      case 'resReduce': totalResReduce += buff.value; break
      case 'dmgDeepen': globalDmgDeepen += buff.value; break
      default: {
        const key = BUFF_TO_DMG_KEY[buff.type]
        if (key) { skillDmgBonuses[key] += buff.value; addSrc(key as keyof typeof src, lbl, buff.value) }
      }
    }
  }

  // Chain effects — global
  for (const eff of activeChainEffects) {
    if (eff.targetSkill) continue
    const lbl = `S${eff.sequence} ${eff.condition ?? '命座'}`
    switch (eff.type) {
      case 'atkPct': totalAtkPct += eff.value; addSrc('atk', lbl, eff.value); break
      case 'critRate': totalCritRate += eff.value; addSrc('critRate', lbl, eff.value); break
      case 'critDmg': totalCritDmg += eff.value; addSrc('critDmg', lbl, eff.value); break
      case 'elemDmg': baseElemDmg += eff.value; addSrc('elemDmg', lbl, eff.value); break
      case 'defIgnore': totalDefIgnore += eff.value; break
      case 'resReduce': totalResReduce += eff.value; break
      case 'dmgDeepen': globalDmgDeepen += eff.value; break
      default: {
        const key = BUFF_TO_DMG_KEY[eff.type]
        if (key) { skillDmgBonuses[key] += eff.value; addSrc(key as keyof typeof src, lbl, eff.value) }
      }
    }
  }

  // Weapon passive effects
  const weaponDmgBonuses: Record<string, number> = {}
  if (weapon.passiveEffects) {
    for (const eff of weapon.passiveEffects) {
      const paramArr = weapon.passive?.param?.[eff.paramIdx]
      if (!paramArr) continue
      let val = parseParamValue(paramArr[refineIdx] ?? paramArr[paramArr.length - 1] ?? '')
      if (eff.stacks) {
        const stackCount = eff.stackParamIdx != null
          ? parseParamValue(weapon.passive?.param?.[eff.stackParamIdx]?.[refineIdx] ?? '')
          : eff.stacks
        val *= stackCount
      }
      const lbl = `${weapon.name}被动`
      switch (eff.type) {
        case 'atkPct': totalAtkPct += val; addSrc('atk', lbl, val); break
        case 'critRate': totalCritRate += val; addSrc('critRate', lbl, val); break
        case 'critDmg': totalCritDmg += val; addSrc('critDmg', lbl, val); break
        case 'elemDmg': baseElemDmg += val; addSrc('elemDmg', lbl, val); break
        default: {
          const key = BUFF_TO_DMG_KEY[eff.type]
          if (key) { weaponDmgBonuses[key] = (weaponDmgBonuses[key] ?? 0) + val; addSrc(key as keyof typeof src, lbl, val) }
        }
      }
    }
  }

  if (echoStats.flatAtk) addSrc('atk', '声骸固定攻击', echoStats.flatAtk)

  const totalAtk = round5(baseAtk * (1 + totalAtkPct) + echoStats.flatAtk)

  const defReduce = totalDefIgnore
  const defPen = 0
  const defMult = round9((100 + charLevel) / ((99 + enemyLevel) + (100 + charLevel) * (1 - defReduce - defPen)))
  const effectiveResist = Math.max(0, enemyResist - totalResReduce)
  const resMult = round5(1 - effectiveResist)

  const skills = character.skills.map(skill => {
    const multiplierStr = skill.multipliers[levelIdx] ?? skill.multipliers[skill.multipliers.length - 1] ?? '0%'
    let multiplier = parseMultiplierStr(multiplierStr)

    let dmgBonus = baseElemDmg + skill.bonusDmg
    let skillDmgDeepen = globalDmgDeepen
    let skillGuaranteedCrit = false

    // Per-skillType echo/sonata/global-inherent dmg bonuses
    const dmgKey = skill.isHeavy ? 'heavyAtk' : (SKILLTYPE_TO_DMG[skill.skillType] ?? '')
    if (dmgKey && skillDmgBonuses[dmgKey]) {
      dmgBonus += skillDmgBonuses[dmgKey]
    }

    // Weapon passive per-skill dmg
    if (dmgKey && weaponDmgBonuses[dmgKey]) {
      dmgBonus += weaponDmgBonuses[dmgKey]
    }

    // Targeted inherent buffs (with targetSkill)
    for (const buff of enabledBuffs) {
      if (!buff.targetSkill) continue
      if (!buffMatchesSkill(buff, skill.name)) continue
      switch (buff.type) {
        case 'dmgDeepen': skillDmgDeepen += buff.value; break
        default: {
          const buffKey = BUFF_TO_DMG_KEY[buff.type]
          if (buffKey) {
            dmgBonus += buff.value
          }
        }
      }
    }

    // Targeted chain effects (with targetSkill)
    for (const eff of activeChainEffects) {
      if (!eff.targetSkill) continue
      if (!buffMatchesSkill(eff as unknown as InherentBuff, skill.name)) continue
      switch (eff.type) {
        case 'guaranteedCrit': skillGuaranteedCrit = true; break
        case 'dmgDeepen': skillDmgDeepen += eff.value; break
        case 'multiplierBoost': multiplier *= (1 + eff.value); break
        default: {
          const effKey = BUFF_TO_DMG_KEY[eff.type]
          if (effKey) {
            dmgBonus += eff.value
          } else {
            switch (eff.type) {
              case 'atkPct': /* handled globally */ break
              case 'critRate': /* handled globally */ break
              case 'critDmg': /* handled globally */ break
              case 'elemDmg': dmgBonus += eff.value; break
            }
          }
        }
      }
    }

    const baseDmg = round5(totalAtk * multiplier)
    const deepenMult = round5(1 + skillDmgDeepen)
    const dmgBonusTotal = round5(1 + dmgBonus)
    const critMult = skillGuaranteedCrit ? totalCritDmg : round5(1 + totalCritRate * (totalCritDmg - 1))
    const crit = round5(round5(round5(round5(baseDmg * dmgBonusTotal) * deepenMult) * round5(totalCritDmg)) * defMult) * resMult
    const expected = skillGuaranteedCrit
      ? crit
      : round5(round5(round5(round5(baseDmg * dmgBonusTotal) * deepenMult) * critMult) * defMult) * resMult

    return {
      name: skill.name,
      tag: skill.tag,
      skillType: skill.skillType,
      multiplierStr,
      multiplier,
      expected: Math.round(expected),
      crit: Math.round(crit),
    }
  })

  const totalExpected = skills.reduce((s, sk) => s + sk.expected, 0)

  const rSkill = (skillDmgBonuses.resonanceSkill ?? 0) + (weaponDmgBonuses.resonanceSkill ?? 0)
  const rLib = (skillDmgBonuses.resonanceLiberation ?? 0) + (weaponDmgBonuses.resonanceLiberation ?? 0)
  const nAtk = (skillDmgBonuses.normalAtk ?? 0) + (weaponDmgBonuses.normalAtk ?? 0)
  const hAtk = (skillDmgBonuses.heavyAtk ?? 0) + (weaponDmgBonuses.heavyAtk ?? 0)

  return {
    panel: {
      atk: Math.round(totalAtk),
      critRate: totalCritRate,
      critDmg: totalCritDmg,
      elemDmg: baseElemDmg,
      resonanceSkillDmg: rSkill,
      resonanceLiberationDmg: rLib,
      normalAtkDmg: nAtk,
      heavyAtkDmg: hAtk,
    },
    breakdown: {
      atk: { total: Math.round(totalAtk), baseAtk, sources: src.atk },
      critRate: { total: totalCritRate, sources: src.critRate },
      critDmg: { total: totalCritDmg, sources: src.critDmg },
      elemDmg: { total: baseElemDmg, sources: src.elemDmg },
      normalAtkDmg: { total: nAtk, sources: src.normalAtk },
      heavyAtkDmg: { total: hAtk, sources: src.heavyAtk },
      resonanceSkillDmg: { total: rSkill, sources: src.resonanceSkill },
      resonanceLiberationDmg: { total: rLib, sources: src.resonanceLiberation },
    },
    skills,
    totalExpected,
  }
}
