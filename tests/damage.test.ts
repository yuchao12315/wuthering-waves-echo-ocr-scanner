import { describe, expect, it } from 'vitest'
import { calcDamage } from '@/lib/damage'
import charactersBase from '@/data/characters-base.json'
import weapons from '@/data/weapons.json'
import type { CharacterBase, Weapon } from '@/types/damage'
import type { Echo } from '@/types/echo'

const character: CharacterBase = {
  baseAtk: 10000,
  weaponType: '手枪',
  element: '热熔',
  ascensionStat: { type: 'atkPct', value: 0 },
  inherentBuffs: [],
  chainStats: [],
  chainEffects: [],
  weaponPassiveMultiplier: {},
  skills: [{
    name: '测试技能',
    multipliers: ['100.00%'],
    tag: 'E',
    bonusDmg: 0,
    treeId: '1',
    skillType: '共鸣技能',
  }],
}

const weapon: Weapon = {
  name: '测试武器',
  type: '手枪',
  rarity: 5,
  baseAtk: 0,
  atkPct: 0,
  critRate: 0,
  critDmg: 0,
  passive: { effectName: '', effect: '', param: [] },
  passiveEffects: [],
}

describe('calcDamage', () => {
  it('uses the level defense multiplier for a level 90 character against a level 89 enemy', () => {
    const result = calcDamage(character, weapon, 1, [], -1, 1, 90, 89, 0)
    const expectedDefMult = (100 + 90) / (199 + 90 + 89)
    const expectedCrit = Math.round(10000 * expectedDefMult * 1.5)

    expect(result.skills[0].crit).toBe(expectedCrit)
  })

  it('matches Chixia panel attack for the screenshot loadout with Death and Dance', () => {
    const chixia = (charactersBase as Record<string, CharacterBase>)['炽霞']
    const deathAndDance = (weapons as Weapon[]).find(w => w.name === '死与舞')!
    const echoes: Echo[] = [
      {
        id: 'nightmare-rider',
        monsterId: 0,
        monsterName: '梦魇·燎照之骑',
        cost: 4,
        rarity: 5,
        level: 25,
        tuneLevel: 5,
        sonata: 'molten_rift',
        mainStat: { type: 'CRIT_RATE', value: 22 },
        secondaryStat: { type: 'FLAT_ATK', value: 150 },
        substats: [
          { type: 'ATK_PCT', value: 7.9 },
          { type: 'CRIT_RATE', value: 10.5 },
          { type: 'CRIT_DMG', value: 15 },
          { type: 'FLAT_ATK', value: 50 },
          { type: 'RESONANCE_LIBERATION_DMG', value: 10.1 },
        ],
      },
      {
        id: 'wolf',
        monsterId: 0,
        monsterName: '暗鬃狼',
        cost: 3,
        rarity: 5,
        level: 25,
        tuneLevel: 5,
        sonata: 'molten_rift',
        mainStat: { type: 'ELEM_DMG', value: 30 },
        secondaryStat: { type: 'FLAT_ATK', value: 100 },
        substats: [
          { type: 'ATK_PCT', value: 10.1 },
          { type: 'CRIT_RATE', value: 8.7 },
          { type: 'FLAT_ATK', value: 40 },
          { type: 'CRIT_DMG', value: 15 },
          { type: 'RESONANCE_SKILL_DMG', value: 11.6 },
        ],
      },
      {
        id: 'violet-heron',
        monsterId: 0,
        monsterName: '紫羽鹭',
        cost: 3,
        rarity: 5,
        level: 25,
        tuneLevel: 5,
        sonata: 'molten_rift',
        mainStat: { type: 'ELEM_DMG', value: 30 },
        secondaryStat: { type: 'FLAT_ATK', value: 100 },
        substats: [
          { type: 'CRIT_DMG', value: 21 },
          { type: 'RESONANCE_SKILL_DMG', value: 10.9 },
          { type: 'CRIT_RATE', value: 6.9 },
          { type: 'ATK_PCT', value: 10.1 },
          { type: 'ENERGY_REGEN', value: 8.4 },
        ],
      },
      {
        id: 'traffic-light',
        monsterId: 0,
        monsterName: '通行灯偶',
        cost: 1,
        rarity: 5,
        level: 25,
        tuneLevel: 5,
        sonata: 'molten_rift',
        mainStat: { type: 'ATK_PCT', value: 18 },
        secondaryStat: { type: 'FLAT_HP', value: 2280 },
        substats: [
          { type: 'CRIT_RATE', value: 9.9 },
          { type: 'CRIT_DMG', value: 16.2 },
          { type: 'ENERGY_REGEN', value: 11.6 },
          { type: 'ATK_PCT', value: 10.1 },
          { type: 'RESONANCE_SKILL_DMG', value: 9.4 },
        ],
      },
      {
        id: 'lizard',
        monsterId: 0,
        monsterName: '绿熔蜥·稚形',
        cost: 1,
        rarity: 5,
        level: 25,
        tuneLevel: 5,
        sonata: 'molten_rift',
        mainStat: { type: 'ATK_PCT', value: 18 },
        secondaryStat: { type: 'FLAT_HP', value: 2280 },
        substats: [
          { type: 'NORMAL_ATK_DMG', value: 8.6 },
          { type: 'CRIT_DMG', value: 21 },
          { type: 'ATK_PCT', value: 9.4 },
          { type: 'ENERGY_REGEN', value: 8.4 },
          { type: 'CRIT_RATE', value: 8.1 },
        ],
      },
    ]

    const result = calcDamage(chixia, deathAndDance, 1, echoes, -1, 10, 90, 99, 0.3, 6, '炽霞')
    const hoho = result.skills.find(s => s.name === '轰轰伤害')!

    expect(result.panel.atk).toBe(2580.8)
    expect(result.panel.elemDmg).toBeCloseTo(1.24, 5)
    expect(result.panel.resonanceSkillDmg).toBeCloseTo(0.919, 5)
    expect(hoho.crit).toBe(43918)
  })
})
