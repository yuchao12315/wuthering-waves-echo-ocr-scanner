/**
 * 声骸评分引擎
 *
 * score_max = 动态计算: 最优主词条 + 最优副属性 + 5个最优副词条的理论最大原始分
 * 单词条得分 = 词条数值 × 当前词条权重 / score_max × 50
 */

import type { Echo, StatType } from '@/types/echo'
import type { CalcJson } from '@/types/character'
import { CN_TO_STAT } from './constants'
import { getNightmareBonus } from '@/data/nightmare-bonuses'

// 满级(Lv25)各Cost主词条固定数值
const MAIN_STAT_VALUES: Record<number, Record<string, number>> = {
  1: { 'ATK_PCT': 18.0, 'HP_PCT': 22.8, 'DEF_PCT': 18.0, 'FLAT_HP': 2280 },
  3: { 'ATK_PCT': 30.0, 'HP_PCT': 30.0, 'DEF_PCT': 38.0, 'ELEM_DMG': 30.0, 'ENERGY_REGEN': 32.0, 'FLAT_ATK': 100 },
  4: { 'ATK_PCT': 33.0, 'HP_PCT': 33.0, 'DEF_PCT': 41.5, 'CRIT_RATE': 22.0, 'CRIT_DMG': 44.0, 'HEAL_BONUS': 26.4, 'FLAT_ATK': 150 },
}

// 主词条中文key → 固定值 (用于score_max计算)
const MAIN_STAT_CN_VALUES: Record<number, Record<string, number>> = {
  1: { '攻击%': 18.0, '生命%': 22.8, '防御%': 18.0, '生命': 2280 },
  3: { '攻击%': 30.0, '生命%': 30.0, '防御%': 38.0, '属性伤害加成': 30.0, '共鸣效率': 32.0, '攻击': 100 },
  4: { '攻击%': 33.0, '生命%': 33.0, '防御%': 41.5, '暴击': 22.0, '暴击伤害': 44.0, '治疗效果加成': 26.4, '攻击': 150 },
}

// 副属性固定值(中文key)
const SEC_STAT_CN_VALUES: Record<number, Record<string, number>> = {
  1: { '生命': 2280 },
  3: { '攻击': 100 },
  4: { '攻击': 150 },
}

// 每个副词条的满级最大值(5星Lv25调谐5)
const MAX_SUB_VALUES: Record<string, number> = {
  '暴击': 10.5, '暴击伤害': 21.0,
  '攻击%': 11.6, '生命%': 11.6, '防御%': 14.7,
  '攻击': 60, '生命': 580, '防御': 70,
  '共鸣效率': 12.4,
  '普攻伤害加成': 11.6, '重击伤害加成': 11.6,
  '共鸣技能伤害加成': 11.6, '共鸣解放伤害加成': 11.6,
}

// 技能伤害词条 → skill_weight 数组下标映射
// WutheringWavesUID calc_sub_max_score 对技能类副词条额外乘 skill_weight[index]
const SKILL_INDEX: Record<string, number> = {
  '普攻伤害加成': 0, '重击伤害加成': 1, '共鸣技能伤害加成': 2, '共鸣解放伤害加成': 3,
}

/**
 * 基于声骸实际词条计算 score_max
 * = 该声骸主词条固定值×权重 + 副属性固定值×权重 + 该声骸实际5条副词条各自的(理论最大值×权重)之和
 */
function calcEchoScoreMax(echo: Echo, calc: CalcJson): number {
  const cost = echo.cost
  const mainProps = calc.main_props[String(cost)] ?? {}
  const subProps = calc.sub_props

  let bestMain = 0
  if (echo.mainStat) {
    const mainCn = Object.entries(CN_TO_STAT).find(([_, v]) => v === echo.mainStat.type)?.[0]
    const mainFixed = MAIN_STAT_CN_VALUES[cost] ?? {}
    bestMain = mainCn ? (mainFixed[mainCn] ?? 0) * (mainProps[mainCn] ?? 0) : 0
  }

  // 泛型技能伤害加成: WW 用 "技能伤害加成" base_weight × maxVal × max(skill_weight)
  // 从 individual skill weights 反推 base_weight (e.g. 重击0.605/0.55=1.1)
  const skillWeight = calc.skill_weight ?? [0, 0, 0, 0]
  const maxSW = Math.max(...skillWeight, 0)
  let genericSkillContrib = 0
  for (const [cn, si] of Object.entries(SKILL_INDEX)) {
    const indW = subProps[cn] ?? 0
    const sw = skillWeight[si] ?? 0
    if (indW > 0 && sw > 0) {
      const baseW = indW / sw
      genericSkillContrib = 11.6 * baseW * maxSW
      break
    }
  }

  const maxSubProps = calc.max_sub_props ?? []
  const hasGenericSkill = maxSubProps.includes('技能伤害加成')

  const usedCns = new Set<string>()
  const validSubScores: number[] = []
  let genericUsed = false
  for (const sub of (echo.substats ?? [])) {
    const cn = Object.entries(CN_TO_STAT).find(([_, v]) => v === sub.type)?.[0]
    if (!cn) continue

    const si = SKILL_INDEX[cn]
    if (si != null && hasGenericSkill) {
      // 技能副词条 → 映射到泛型 "技能伤害加成"
      if (!maxSubProps.includes('技能伤害加成')) continue
      usedCns.add(cn)
      if (!genericUsed && genericSkillContrib > 0) {
        genericUsed = true
        validSubScores.push(genericSkillContrib)
      }
    } else {
      // 非技能词条: 必须在 max_sub_props 中
      if (!maxSubProps.includes(cn)) continue
      usedCns.add(cn)
      const maxVal = MAX_SUB_VALUES[cn] ?? 0
      const w = subProps[cn] ?? 0
      if (w > 0) validSubScores.push(maxVal * w)
    }
  }

  if (validSubScores.length < 5) {
    const candidates: number[] = []
    // 只从 max_sub_props 中选取候选
    for (const cn of maxSubProps) {
      if (usedCns.has(cn)) continue
      if (cn === '技能伤害加成') {
        if (!genericUsed && genericSkillContrib > 0) {
          candidates.push(genericSkillContrib)
        }
      } else {
        const w = subProps[cn] ?? 0
        const maxVal = MAX_SUB_VALUES[cn] ?? 0
        if (w > 0 && maxVal > 0) {
          candidates.push(maxVal * w)
        }
      }
    }
    candidates.sort((a, b) => b - a)
    for (const c of candidates) {
      if (validSubScores.length >= 5) break
      validSubScores.push(c)
    }
  }

  const subSum = validSubScores.reduce((s, v) => s + v, 0)

  // 副属性(secondaryStat)理论最大贡献
  let bestSec = 0
  const secFixed = SEC_STAT_CN_VALUES[cost]
  if (secFixed) {
    for (const [cn, val] of Object.entries(secFixed)) {
      const w = mainProps[cn] ?? 0
      if (val * w > bestSec) bestSec = val * w
    }
  }

  return bestMain + bestSec + subSum
}

function getSubWeight(statType: StatType, calc: CalcJson): number {
  const cnKey = Object.entries(CN_TO_STAT).find(([_, v]) => v === statType)?.[0]
  if (!cnKey) return 0
  return calc.sub_props[cnKey] ?? 0
}

function getMainWeight(statType: StatType, cost: number, calc: CalcJson): number {
  const costKey = String(cost)
  const mainProps = calc.main_props[costKey]
  if (!mainProps) return 0
  const cnKey = Object.entries(CN_TO_STAT).find(([_, v]) => v === statType)?.[0]
  if (!cnKey) return 0
  return mainProps[cnKey] ?? 0
}

export function scoreEcho(echo: Echo, calc: CalcJson): number {
  const scoreMax = calcEchoScoreMax(echo, calc)
  if (!scoreMax || scoreMax === 0) return 0

  let rawScore = 0

  // 主词条: 固定满级数值 × main_props权重
  if (echo.mainStat) {
    const fixedValue = MAIN_STAT_VALUES[echo.cost]?.[echo.mainStat.type] ?? echo.mainStat.value
    rawScore += fixedValue * getMainWeight(echo.mainStat.type, echo.cost, calc)
  }

  // 副属性: OCR值 × main_props权重
  if (echo.secondaryStat) {
    rawScore += echo.secondaryStat.value * getMainWeight(echo.secondaryStat.type, echo.cost, calc)
  }

  // 副词条: OCR实际值 × sub_props权重
  for (const sub of (echo.substats ?? [])) {
    if (sub && sub.type && typeof sub.value === 'number') {
      rawScore += sub.value * getSubWeight(sub.type, calc)
    }
  }

  // 梦魇声骸固定加成评分 (stored field or auto-match by name)
  const nmBonus = echo.nightmareBonus ?? getNightmareBonus(echo.monsterName)
  if (nmBonus) {
    if (nmBonus.elemDmg && nmBonus.elemType) {
      const elemCnKey = `${nmBonus.elemType}伤害加成`
      const elemWeight = calc.sub_props[elemCnKey] ?? 0
      rawScore += nmBonus.elemDmg * 100 * elemWeight
    }
    if (nmBonus.secondValue > 0) {
      const secondCnMap: Record<string, string> = {
        resonanceSkillDmg: '共鸣技能伤害加成',
        resonanceLiberationDmg: '共鸣解放伤害加成',
        normalAtkDmg: '普攻伤害加成',
        heavyAtkDmg: '重击伤害加成',
      }
      const secondCnKey = secondCnMap[nmBonus.secondType]
      if (secondCnKey) {
        rawScore += nmBonus.secondValue * 100 * (calc.sub_props[secondCnKey] ?? 0)
      }
    }
  }

  const result = (rawScore / scoreMax) * 50
  return isNaN(result) ? 0 : Math.round(result * 10000) / 10000
}

export interface StatScoreDetail {
  label: string
  field: '主词条' | '副属性' | '副词条'
  value: number
  score: number
  maxScore: number
}

export function scoreEchoDetailed(echo: Echo, calc: CalcJson): { total: number; scoreMax: number; details: StatScoreDetail[] } {
  const scoreMax = calcEchoScoreMax(echo, calc)
  if (!scoreMax || scoreMax === 0) return { total: 0, scoreMax: 0, details: [] }

  const details: StatScoreDetail[] = []
  const STAT_DISPLAY: Record<string, string> = {
    FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
    FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
    ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害', HEAL_BONUS: '治疗加成',
    NORMAL_ATK_DMG: '普攻伤害', HEAVY_ATK_DMG: '重击伤害',
    RESONANCE_SKILL_DMG: '共鸣技能伤害', RESONANCE_LIBERATION_DMG: '共鸣解放伤害',
  }

  if (echo.mainStat) {
    const fixedValue = MAIN_STAT_VALUES[echo.cost]?.[echo.mainStat.type] ?? echo.mainStat.value
    const raw = fixedValue * getMainWeight(echo.mainStat.type, echo.cost, calc)
    const mainCn = Object.entries(CN_TO_STAT).find(([_, v]) => v === echo.mainStat.type)?.[0]
    const mainFixed = MAIN_STAT_CN_VALUES[echo.cost] ?? {}
    const maxRaw = mainCn ? (mainFixed[mainCn] ?? 0) * (calc.main_props[String(echo.cost)]?.[mainCn] ?? 0) : 0
    details.push({
      label: STAT_DISPLAY[echo.mainStat.type] ?? echo.mainStat.type,
      field: '主词条',
      value: echo.mainStat.value,
      score: (raw / scoreMax) * 50,
      maxScore: (maxRaw / scoreMax) * 50,
    })
  }

  if (echo.secondaryStat) {
    const raw = echo.secondaryStat.value * getMainWeight(echo.secondaryStat.type, echo.cost, calc)
    const secCn = Object.entries(CN_TO_STAT).find(([_, v]) => v === echo.secondaryStat!.type)?.[0]
    const secFixed = SEC_STAT_CN_VALUES[echo.cost] ?? {}
    const maxRaw = secCn ? (secFixed[secCn] ?? 0) * (calc.main_props[String(echo.cost)]?.[secCn] ?? 0) : 0
    details.push({
      label: STAT_DISPLAY[echo.secondaryStat.type] ?? echo.secondaryStat.type,
      field: '副属性',
      value: echo.secondaryStat.value,
      score: (raw / scoreMax) * 50,
      maxScore: (maxRaw / scoreMax) * 50,
    })
  }

  for (const sub of (echo.substats ?? [])) {
    if (sub && sub.type && typeof sub.value === 'number') {
      const raw = sub.value * getSubWeight(sub.type, calc)
      const cn = Object.entries(CN_TO_STAT).find(([_, v]) => v === sub.type)?.[0]
      const maxVal = cn ? (MAX_SUB_VALUES[cn] ?? 0) : 0
      const w = cn ? (calc.sub_props[cn] ?? 0) : 0
      const maxRaw = maxVal * w
      details.push({
        label: STAT_DISPLAY[sub.type] ?? sub.type,
        field: '副词条',
        value: sub.value,
        score: (raw / scoreMax) * 50,
        maxScore: (maxRaw / scoreMax) * 50,
      })
    }
  }

  const total = details.reduce((s, d) => s + d.score, 0)
  return { total, scoreMax, details }
}

export function scoreLoadout(echoes: Echo[], calc: CalcJson): number {
  return echoes.reduce((sum, echo) => sum + scoreEcho(echo, calc), 0)
}

export function getGrade(totalScore: number): string {
  if (totalScore >= 210) return 'SSS'
  if (totalScore >= 195) return 'SS'
  if (totalScore >= 175) return 'S'
  if (totalScore >= 150) return 'A'
  if (totalScore >= 120) return 'B'
  return 'C'
}

export function getEchoGrade(score: number): string {
  if (score >= 42) return 'SSS'
  if (score >= 39) return 'SS'
  if (score >= 35) return 'S'
  if (score >= 30) return 'A'
  if (score >= 24) return 'B'
  return 'C'
}
