import type { Echo } from '@/types/echo'
import type { CharacterBase, Weapon, DamageResult } from '@/types/damage'

const SKILL_DMG_MAP: Record<string, string> = {
  NORMAL_ATK_DMG: 'normalAtk',
  HEAVY_ATK_DMG: 'heavyAtk',
  RESONANCE_SKILL_DMG: 'resonanceSkill',
  RESONANCE_LIBERATION_DMG: 'resonanceLiberation',
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

export function calcDamage(
  character: CharacterBase,
  weapon: Weapon,
  weaponRefine: number,
  echoes: Echo[],
  charLevel = 90,
  enemyLevel = 90,
  enemyResist = 0.1,
): DamageResult {
  const echoStats = collectEchoStats(echoes)
  const refineIdx = Math.max(0, Math.min(4, weaponRefine - 1))

  const baseAtk = character.baseAtk + weapon.baseAtk

  let totalAtkPct = weapon.atkPct + echoStats.atkPct
  for (const buff of character.inherentBuffs) {
    if (buff.type === 'atkPct') totalAtkPct += buff.value
  }
  const totalAtk = baseAtk * (1 + totalAtkPct) + echoStats.flatAtk

  let totalCritRate = 0.05 + weapon.critRate + echoStats.critRate
  if (character.ascensionStat.type === 'critRate') {
    totalCritRate += character.ascensionStat.value
  }
  for (const buff of character.inherentBuffs) {
    if (buff.type === 'critRate') totalCritRate += buff.value
  }

  let totalCritDmg = 1.50 + weapon.critDmg + echoStats.critDmg
  if (character.ascensionStat.type === 'critDmg') {
    totalCritDmg += character.ascensionStat.value
  }
  for (const buff of character.inherentBuffs) {
    if (buff.type === 'critDmg') totalCritDmg += buff.value
  }

  let baseElemDmg = echoStats.elemDmg
  for (const buff of character.inherentBuffs) {
    if (buff.type === 'elemDmg') baseElemDmg += buff.value
  }

  let weaponPassiveVal = 0
  if (weapon.passive) {
    weaponPassiveVal = weapon.passive.values[refineIdx] ?? 0
  }

  const defMult = (100 + charLevel) / (199 + charLevel + enemyLevel)
  const resMult = 1 - enemyResist

  // 基础属性增伤 = 声骸属性伤害 + 角色固有 + 武器被动(1x base)
  const totalElemDmg = baseElemDmg + weaponPassiveVal

  const skills = character.skills.map(skill => {
    // 增伤区 = 基础属性增伤 + 技能固有增伤 + 武器被动额外倍数
    const extraWeaponMult = character.weaponPassiveMultiplier?.[skill.tag] ?? 0
    let dmgBonus = totalElemDmg + skill.bonusDmg + weaponPassiveVal * extraWeaponMult

    // 声骸技能增伤副词条
    if (skill.tag === 'E') {
      dmgBonus += echoStats.skillDmg.resonanceSkill
    } else if (skill.tag === 'Q') {
      dmgBonus += echoStats.skillDmg.resonanceLiberation
    }

    const baseDmg = totalAtk * skill.multiplier
    const crit = baseDmg * (1 + dmgBonus) * (1 + totalCritDmg) * defMult * resMult
    const expected = baseDmg * (1 + dmgBonus) * (1 + totalCritRate * totalCritDmg) * defMult * resMult

    return {
      name: skill.name,
      tag: skill.tag,
      multiplier: skill.multiplier,
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
      elemDmg: totalElemDmg,
    },
    skills,
    totalExpected,
  }
}
