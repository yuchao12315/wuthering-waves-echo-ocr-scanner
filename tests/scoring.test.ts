import { describe, it, expect } from 'vitest'
import { scoreEcho, getGrade, getEchoGrade } from '@/lib/scoring'
import type { Echo } from '@/types/echo'
import type { CalcJson } from '@/types/character'

const aimeiCalc: CalcJson = {
  name: '爱弥斯-通用',
  main_props: {
    '4': { '攻击': 0.025, '攻击%': 0.275, '生命%': 0, '防御%': 0, '暴击': 0.5, '暴击伤害': 0.25, '治疗效果加成': 0 },
    '3': { '攻击': 0.025, '攻击%': 0.275, '生命%': 0, '防御%': 0, '共鸣效率': 0, '属性伤害加成': 0.275 },
    '1': { '攻击%': 0.4, '生命': 0, '生命%': 0, '防御%': 0 },
  },
  sub_props: { '攻击': 0.12, '攻击%': 1.1, '生命': 0, '生命%': 0, '防御': 0, '防御%': 0, '暴击': 2, '暴击伤害': 1, '技能伤害加成': 1.1, '共鸣效率': 0.2 },
  skill_weight: [0, 0, 0, 0.7],
  score_max: [76.254, 79.804, 83.804],
  total_grade: [0, 0.48, 0.6, 0.7, 0.78, 0.84],
  grade: { valid_s: ['暴击', '暴击伤害', '攻击'], valid_a: ['共鸣解放伤害加成'], valid_b: ['共鸣效率'] },
}

const sampleEcho: Echo = {
  id: 'test-1',
  monsterId: 340000070,
  monsterName: '无常凶鹭',
  cost: 4,
  rarity: 5,
  level: 25,
  tuneLevel: 5,
  sonata: 'havoc_eclipse',
  mainStat: { type: 'CRIT_RATE', value: 22.0 },
  secondaryStat: { type: 'FLAT_ATK', value: 150 },
  substats: [
    { type: 'CRIT_DMG', value: 18.6 },
    { type: 'ATK_PCT', value: 9.4 },
    { type: 'FLAT_ATK', value: 50 },
    { type: 'RESONANCE_LIBERATION_DMG', value: 8.6 },
    { type: 'ENERGY_REGEN', value: 10.0 },
  ],
}

describe('scoreEcho', () => {
  it('scores a high-quality Cost4 echo for Aimei', () => {
    const score = scoreEcho(sampleEcho, aimeiCalc)
    // Main: 22.0 * 0.5 = 11.0
    // Secondary: 150 * 0.12 = 18.0
    // Sub CRIT_DMG: 18.6 * 1 = 18.6
    // Sub ATK_PCT: 9.4 * 1.1 = 10.34
    // Sub FLAT_ATK: 50 * 0.12 = 6.0
    // Sub RESONANCE_LIBERATION_DMG: 8.6 * (1.1 * 0.7) = 8.6 * 0.77 = 6.622
    // Sub ENERGY_REGEN: 10.0 * 0.2 = 2.0
    // Raw = 11 + 18 + 18.6 + 10.34 + 6 + 6.622 + 2 = 72.562
    // Normalized = 72.562 / 83.804 * 50 ≈ 43.27
    expect(score).toBeCloseTo(43.27, 1)
  })

  it('scores 0 for empty substats with zero weights', () => {
    const echo: Echo = {
      ...sampleEcho,
      cost: 1,
      mainStat: { type: 'HP_PCT', value: 33 },
      secondaryStat: null,
      substats: [{ type: 'DEF_PCT', value: 10 }],
    }
    const score = scoreEcho(echo, aimeiCalc)
    // main HP_PCT weight = 0, sub DEF_PCT weight = 0
    expect(score).toBe(0)
  })
})

describe('getGrade', () => {
  it('returns correct grades', () => {
    expect(getGrade(250)).toBe('SSS')
    expect(getGrade(210)).toBe('SSS')
    expect(getGrade(195)).toBe('SS')
    expect(getGrade(175)).toBe('S')
    expect(getGrade(150)).toBe('A')
    expect(getGrade(120)).toBe('B')
    expect(getGrade(50)).toBe('C')
  })
})

describe('getEchoGrade', () => {
  it('returns correct grades for single echo', () => {
    expect(getEchoGrade(45)).toBe('SSS')
    expect(getEchoGrade(35)).toBe('S')
    expect(getEchoGrade(20)).toBe('C')
  })
})
