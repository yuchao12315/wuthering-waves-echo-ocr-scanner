import type { Echo } from '@/types/echo'
import type { CharacterBase, Weapon, DamageResult, BuffType, SonataEffect, InherentBuff, ChainEffect } from '@/types/damage'
import SONATA_EFFECTS from '@/data/sonata-effects.json'

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

interface EchoStats {
  atkPct: number
  flatAtk: number
  hpPct: number
  flatHp: number
  critRate: number
  critDmg: number
  elemDmg: number
  skillDmg: Record<string, number>
}

function collectEchoStats(echoes: Echo[]): EchoStats {
  const stats: EchoStats = {
    atkPct: 0, flatAtk: 0, hpPct: 0, flatHp: 0,
    critRate: 0, critDmg: 0, elemDmg: 0,
    skillDmg: { normalAtk: 0, heavyAtk: 0, resonanceSkill: 0, resonanceLiberation: 0 },
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
  chainNodes = -1,
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

  // Resolve active chain level (default 0 = no effects active)
  const activeChainLevel = Math.min(6, chainLevel)

  // Collect active chain effects based on sequence level and enabled status
  const activeChainEffects: ChainEffect[] = []
  if (character.chainEffects) {
    for (const eff of character.chainEffects) {
      if (eff.sequence <= activeChainLevel && eff.enabled !== false) {
        activeChainEffects.push(eff)
      }
    }
  }

  // --- Collect global buffs ---
  let totalAtkPct = weapon.atkPct + echoStats.atkPct + sonataBuff.atkPct
  let totalCritRate = 0.05 + weapon.critRate + echoStats.critRate
  let totalCritDmg = 1.50 + weapon.critDmg + echoStats.critDmg
  let baseElemDmg = echoStats.elemDmg + sonataBuff.elemDmg
  let totalDefIgnore = 0
  let totalResReduce = 0
  let globalDmgDeepen = 0

  const skillDmgBonuses: Record<string, number> = {
    normalAtk: echoStats.skillDmg.normalAtk + (sonataBuff.skillDmg.normalAtk ?? 0),
    heavyAtk: echoStats.skillDmg.heavyAtk + (sonataBuff.skillDmg.heavyAtk ?? 0),
    resonanceSkill: echoStats.skillDmg.resonanceSkill + (sonataBuff.skillDmg.resonanceSkill ?? 0),
    resonanceLiberation: echoStats.skillDmg.resonanceLiberation + (sonataBuff.skillDmg.resonanceLiberation ?? 0),
  }

  // Ascension stat — handle ALL types
  const asc = character.ascensionStat
  switch (asc.type) {
    case 'atkPct': totalAtkPct += asc.value; break
    case 'critRate': totalCritRate += asc.value; break
    case 'critDmg': totalCritDmg += asc.value; break
    case 'elemDmg': baseElemDmg += asc.value; break
  }

  // Inherent buffs — global (no targetSkill) non-skill-dmg types
  for (const buff of enabledBuffs) {
    if (buff.targetSkill) continue
    switch (buff.type) {
      case 'atkPct': totalAtkPct += buff.value; break
      case 'critRate': totalCritRate += buff.value; break
      case 'critDmg': totalCritDmg += buff.value; break
      case 'elemDmg': baseElemDmg += buff.value; break
      case 'defIgnore': totalDefIgnore += buff.value; break
      case 'resReduce': totalResReduce += buff.value; break
      case 'dmgDeepen': globalDmgDeepen += buff.value; break
      default: {
        // Global skill-type dmg buffs (no targetSkill = applies to all skills of that type)
        const key = BUFF_TO_DMG_KEY[buff.type]
        if (key) skillDmgBonuses[key] = (skillDmgBonuses[key] ?? 0) + buff.value
      }
    }
  }

  // Chain stats (8 passive attribute nodes)
  const activeChainCount = chainNodes < 0 ? character.chainStats.length : chainNodes
  for (let i = 0; i < activeChainCount && i < character.chainStats.length; i++) {
    const cs = character.chainStats[i]
    switch (cs.type) {
      case 'atkPct': totalAtkPct += cs.value; break
      case 'critRate': totalCritRate += cs.value; break
      case 'critDmg': totalCritDmg += cs.value; break
      case 'elemDmg': baseElemDmg += cs.value; break
    }
  }

  // Chain effects — global (no targetSkill)
  for (const eff of activeChainEffects) {
    if (eff.targetSkill) continue
    switch (eff.type) {
      case 'atkPct': totalAtkPct += eff.value; break
      case 'critRate': totalCritRate += eff.value; break
      case 'critDmg': totalCritDmg += eff.value; break
      case 'elemDmg': baseElemDmg += eff.value; break
      case 'defIgnore': totalDefIgnore += eff.value; break
      case 'resReduce': totalResReduce += eff.value; break
      case 'dmgDeepen': globalDmgDeepen += eff.value; break
      default: {
        const key = BUFF_TO_DMG_KEY[eff.type]
        if (key) skillDmgBonuses[key] = (skillDmgBonuses[key] ?? 0) + eff.value
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
      switch (eff.type) {
        case 'atkPct': totalAtkPct += val; break
        case 'critRate': totalCritRate += val; break
        case 'critDmg': totalCritDmg += val; break
        case 'elemDmg': baseElemDmg += val; break
        default: {
          const key = BUFF_TO_DMG_KEY[eff.type]
          if (key) weaponDmgBonuses[key] = (weaponDmgBonuses[key] ?? 0) + val
        }
      }
    }
  }

  const totalAtk = baseAtk * (1 + totalAtkPct) + echoStats.flatAtk

  // Defense multiplier with ignore
  const effectiveEnemyDef = 1 - totalDefIgnore
  const defMult = (100 + charLevel) / ((100 + charLevel) + (100 + enemyLevel) * effectiveEnemyDef)

  // Resistance multiplier with reduce
  const effectiveResist = Math.max(0, enemyResist - totalResReduce)
  const resMult = 1 - effectiveResist

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

    const baseDmg = totalAtk * multiplier
    const deepenMult = 1 + skillDmgDeepen
    const crit = baseDmg * (1 + dmgBonus) * deepenMult * (1 + totalCritDmg) * defMult * resMult
    const expected = skillGuaranteedCrit
      ? crit
      : baseDmg * (1 + dmgBonus) * deepenMult * (1 + totalCritRate * totalCritDmg) * defMult * resMult

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

  return {
    panel: {
      atk: Math.round(totalAtk),
      critRate: totalCritRate,
      critDmg: totalCritDmg,
      elemDmg: baseElemDmg,
    },
    skills,
    totalExpected,
  }
}
