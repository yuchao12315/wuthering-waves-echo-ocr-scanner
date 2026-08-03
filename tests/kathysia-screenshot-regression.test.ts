import { describe, expect, it, vi } from 'vitest'
import { calcDamage } from '@/lib/damage'
import charactersBase from '@/data/characters-base.json'
import weapons from '@/data/weapons.json'
import type { CharacterBase, Weapon } from '@/types/damage'
import type { Echo, StatEntry } from '@/types/echo'

const stat = (type: StatEntry['type'], value: number): StatEntry => ({ type, value })
const sonata = 'windward_pilgrimage'

const echoes: Echo[] = [
  {
    id: 'fleurdelys', monsterId: 0, monsterName: '共鸣回响·芙露德莉斯', cost: 4, rarity: 5, level: 25, tuneLevel: 5,
    sonata, mainStat: stat('CRIT_RATE', 22), secondaryStat: stat('FLAT_ATK', 150),
    substats: [stat('CRIT_RATE', 8.7), stat('FLAT_HP', 510), stat('RESONANCE_SKILL_DMG', 8.6), stat('NORMAL_ATK_DMG', 10.1), stat('CRIT_DMG', 18.6)],
  },
  {
    id: 'nightmare-kelpie', monsterId: 0, monsterName: '梦魇·凯尔匹', cost: 4, rarity: 5, level: 25, tuneLevel: 5,
    sonata, mainStat: stat('CRIT_DMG', 44), secondaryStat: stat('FLAT_ATK', 150),
    substats: [stat('HP_PCT', 7.9), stat('RESONANCE_SKILL_DMG', 10.9), stat('CRIT_DMG', 19.8), stat('CRIT_RATE', 9.3), stat('FLAT_ATK', 50)],
  },
  {
    id: 'young-dragon-fusion', monsterId: 0, monsterName: '小翼龙·热熔', cost: 1, rarity: 5, level: 25, tuneLevel: 5,
    sonata, mainStat: stat('HP_PCT', 22.8), secondaryStat: stat('FLAT_HP', 2280),
    substats: [stat('CRIT_DMG', 19.8), stat('ENERGY_REGEN', 9.2), stat('CRIT_RATE', 6.9), stat('NORMAL_ATK_DMG', 10.1), stat('RESONANCE_SKILL_DMG', 10.1)],
  },
  {
    id: 'young-dragon-spectro', monsterId: 0, monsterName: '小翼龙·衍射', cost: 1, rarity: 5, level: 25, tuneLevel: 5,
    sonata, mainStat: stat('HP_PCT', 22.8), secondaryStat: stat('FLAT_HP', 2280),
    substats: [stat('CRIT_RATE', 9.9), stat('FLAT_HP', 510), stat('NORMAL_ATK_DMG', 8.6), stat('CRIT_DMG', 15), stat('RESONANCE_SKILL_DMG', 9.4)],
  },
  {
    id: 'young-dragon-glacio', monsterId: 0, monsterName: '小翼龙·冷凝', cost: 1, rarity: 5, level: 25, tuneLevel: 5,
    sonata, mainStat: stat('HP_PCT', 22.8), secondaryStat: stat('FLAT_HP', 2280),
    substats: [stat('ENERGY_REGEN', 10.8), stat('FLAT_HP', 390), stat('HP_PCT', 8.6), stat('CRIT_DMG', 15), stat('CRIT_RATE', 7.5)],
  },
]

const character = (charactersBase as Record<string, CharacterBase>)['卡提希娅']
const weapon = (weapons as Weapon[]).find(item => item.name === '不屈命定之冠')!

const targets = {
  '第三段伤害': { crit: 50686, expected: 46530 },
  '第四段伤害': { crit: 44705, expected: 41040 },
  '重击伤害': { crit: 36949, expected: 33919 },
  '空中攻击': { crit: 33455, expected: 30712 },
  '空中攻击回收三剑': { crit: 200553, expected: 184108 },
  '此剑以人之名': { crit: 58285, expected: 53506 },
  '看潮怒风哮之刃伤害': { crit: 795978, expected: 721338 },
} as const

describe('卡提希娅截图回放', () => {
  it('matches the displayed panel and key damage rows', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const result = calcDamage(character, weapon, 1, echoes, -1, 10, 90, 89, 0.1, 3, '卡提希娅')

    expect(result.panel.hp).toBeCloseTo(49850, -1)
    expect(result.panel.atk).toBeCloseTo(1074, -1)
    expect(result.panel.def).toBe(611)
    expect(result.panel.critRate).toBeCloseTo(0.873, 3)
    expect(result.panel.critDmg).toBeCloseTo(2.822, 3)
    expect(result.panel.elemDmg).toBeCloseTo(0.72, 3)
    expect(result.panel.energyRegen).toBeCloseTo(0.20, 3)
    expect(result.panel.normalAtkDmg).toBeCloseTo(0.288, 3)
    expect(result.panel.resonanceSkillDmg).toBeCloseTo(0.39, 3)

    for (const [name, target] of Object.entries(targets)) {
      const skill = result.skills.find(item => item.name === name)
      expect(skill, name).toBeDefined()
      expect(Math.abs((skill?.crit ?? 0) - target.crit) / target.crit, `${name} crit`).toBeLessThan(0.015)
      expect(Math.abs((skill?.expected ?? 0) - target.expected) / target.expected, `${name} expected`).toBeLessThan(0.015)
    }
  })
})
