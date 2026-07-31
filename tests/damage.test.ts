import { describe, expect, it } from 'vitest'
import { calcDamage, parseMultiplierStr, selectKeySkills } from '@/lib/damage'
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
  it('keeps only the five highest expected-damage skills for compact display', () => {
    const skills = Array.from({ length: 7 }, (_, index) => ({
      name: `技能${index + 1}`,
      tag: 'E',
      skillType: index % 2 === 0 ? '常态攻击' : '共鸣解放',
      multiplierStr: '100%',
      multiplier: 1,
      expected: (index + 1) * 100,
      crit: (index + 1) * 120,
    }))

    expect(selectKeySkills(skills).map(skill => skill.expected)).toEqual([700, 600, 500, 400, 300])
    expect(skills.map(skill => skill.expected)).toEqual([100, 200, 300, 400, 500, 600, 700])
  })

  it('parses official HP/DEF multiplier suffixes and repeated percent signs', () => {
    expect(parseMultiplierStr('19.64%*3生命')).toBeCloseTo(0.5892, 5)
    expect(parseMultiplierStr('449.71%防御')).toBeCloseTo(4.4971, 5)
    expect(parseMultiplierStr('21.62%%')).toBeCloseTo(0.2162, 5)
  })

  it('uses HP as the skill base stat when a skill is marked as HP-scaling', () => {
    const hpCharacter: CharacterBase = {
      ...character,
      baseAtk: 100,
      baseHp: 10000,
      skills: [{
        name: '生命倍率伤害',
        multipliers: ['500+100.00%'],
        tag: 'E',
        bonusDmg: 0,
        treeId: '1',
        skillType: '共鸣技能',
        damageStat: 'hp',
      }],
    }
    const echoes: Echo[] = [{
      id: 'hp-test',
      monsterId: 0,
      monsterName: '生命测试声骸',
      cost: 1,
      rarity: 5,
      level: 25,
      tuneLevel: 5,
      sonata: '',
      mainStat: { type: 'HP_PCT', value: 10 },
      secondaryStat: { type: 'FLAT_HP', value: 1000 },
      substats: [],
    }]

    const result = calcDamage(hpCharacter, weapon, 1, echoes, -1, 1, 90, 89, 0)
    const expectedDefMult = (100 + 90) / (199 + 90 + 89)
    const expectedCrit = Math.round(12500 * expectedDefMult * 1.5)
    const expectedAverage = Math.round(12500 * expectedDefMult * (1 + 0.05 * (1.5 - 1)))

    expect(result.panel.hp).toBe(12000)
    expect(result.skills[0].crit).toBe(expectedCrit)
    expect(result.skills[0].expected).toBe(expectedAverage)
  })

  it('uses the level defense multiplier for a level 90 character against a level 89 enemy', () => {
    const result = calcDamage(character, weapon, 1, [], -1, 1, 90, 89, 0)
    const expectedDefMult = (100 + 90) / (199 + 90 + 89)
    const expectedCrit = Math.round(10000 * expectedDefMult * 1.5)

    expect(result.skills[0].crit).toBe(expectedCrit)
  })

  it('includes both critical and non-critical outcomes in expected damage', () => {
    const result = calcDamage(character, weapon, 1, [], -1, 1, 90, 89, 0)
    const expectedDefMult = (100 + 90) / (199 + 90 + 89)

    expect(result.skills[0].expected).toBe(Math.round(10000 * expectedDefMult * 1.025))
  })

  it.each([
    ['critRate', 0.5],
    ['critDmg', 1],
    ['defIgnore', 0.4],
    ['resReduce', 0.1],
    ['dmgDeepen', 0.5],
    ['multiplierBoost', 0.5],
  ] as const)('applies targeted %s effects to matching skills', (type, value) => {
    const targetedCharacter: CharacterBase = {
      ...character,
      skills: [
        { ...character.skills[0], name: '目标技能' },
        { ...character.skills[0], name: '其他技能' },
      ],
      chainEffects: [{ sequence: 1, type, value, targetSkill: '^目标技能$' }],
    }
    const baseline = calcDamage({ ...targetedCharacter, chainEffects: [] }, weapon, 1, [], -1, 1, 90, 89, 0.1, 0)
    const result = calcDamage(targetedCharacter, weapon, 1, [], -1, 1, 90, 89, 0.1, 1)

    expect(result.skills[0].expected).toBeGreaterThan(baseline.skills[0].expected)
    expect(result.skills[1].expected).toBe(baseline.skills[1].expected)
  })

  it('applies global multiplier boosts to every skill', () => {
    const boosted: CharacterBase = {
      ...character,
      chainEffects: [{ sequence: 1, type: 'multiplierBoost', value: 0.5 }],
    }
    const baseline = calcDamage({ ...boosted, chainEffects: [] }, weapon, 1, [], -1, 1, 90, 89, 0.1, 0)
    const result = calcDamage(boosted, weapon, 1, [], -1, 1, 90, 89, 0.1, 1)

    expect(result.skills[0].expected).toBeGreaterThan(baseline.skills[0].expected)
  })

  it('uses an explicit damage category instead of the skill tree category', () => {
    const liberationHeavy = {
      ...character,
      skills: [{ ...character.skills[0], name: '特殊重击', isHeavy: true, damageType: 'resonanceLiberation' }],
    } as CharacterBase
    const echoes: Echo[] = [{
      id: 'liberation-bonus', monsterId: 0, monsterName: '测试', cost: 1, rarity: 5, level: 25, tuneLevel: 5,
      sonata: '', mainStat: { type: 'FLAT_HP', value: 0 }, secondaryStat: { type: 'FLAT_HP', value: 0 },
      substats: [{ type: 'RESONANCE_LIBERATION_DMG', value: 20 }, { type: 'HEAVY_ATK_DMG', value: 50 }],
    }]
    const baseline = calcDamage(liberationHeavy, weapon, 1, [], -1, 1, 90, 89, 0)
    const result = calcDamage(liberationHeavy, weapon, 1, echoes, -1, 1, 90, 89, 0)

    expect(result.skills[0].crit).toBeCloseTo(baseline.skills[0].crit * 1.2, -1)
  })

  it('keeps unmarked skills attack-scaling even when HP and DEF stats exist', () => {
    const atkCharacter: CharacterBase = {
      ...character,
      baseAtk: 1000,
      baseHp: 50000,
      baseDef: 3000,
    }
    const echoes: Echo[] = [
      {
        id: 'hp-def-noise',
        monsterId: 0,
        monsterName: '生命防御干扰声骸',
        cost: 4,
        rarity: 5,
        level: 25,
        tuneLevel: 5,
        sonata: '',
        mainStat: { type: 'HP_PCT', value: 50 },
        secondaryStat: { type: 'FLAT_HP', value: 5000 },
        substats: [
          { type: 'DEF_PCT', value: 50 },
          { type: 'FLAT_DEF', value: 500 },
        ],
      },
    ]

    const result = calcDamage(atkCharacter, weapon, 1, echoes, -1, 1, 90, 89, 0)
    const expectedDefMult = (100 + 90) / (199 + 90 + 89)
    const expectedCrit = Math.round(1000 * expectedDefMult * 1.5)

    expect(result.panel.atk).toBe(1000)
    expect(result.panel.hp).toBe(80000)
    expect(result.panel.def).toBe(5000)
    expect(result.skills[0].damageStat).toBe('atk')
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

  it('marks weight-biased characters with the matching damage base stat', () => {
    const characters = charactersBase as Record<string, CharacterBase>
    const expected = [
      { name: '白芷', damageStat: 'hp', baseHp: 12812, baseDef: 1002 },
      { name: '守岸人', damageStat: 'hp', baseHp: 16712, baseDef: 1099 },
      { name: '卡提希娅', damageStat: 'hp', baseHp: 14800, baseDef: 611 },
      { name: '渊武', damageStat: 'def', baseHp: 8525, baseDef: 1637 },
      { name: '桃祈', damageStat: 'def', baseHp: 8950, baseDef: 1564 },
      { name: '莫宁', damageStat: 'def', baseHp: 15375, baseDef: 1356 },
    ] as const

    for (const item of expected) {
      const character = characters[item.name]
      if ('baseHp' in item) expect(character.baseHp, item.name).toBe(item.baseHp)
      expect(character.baseDef, item.name).toBe(item.baseDef)
      expect(character.skills.length, item.name).toBeGreaterThan(0)
      expect(character.skills.every(skill => skill.damageStat === item.damageStat), item.name).toBe(true)
    }
  })
})
