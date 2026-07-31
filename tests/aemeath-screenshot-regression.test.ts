import { describe, expect, it, vi } from 'vitest'
import { calcDamage, selectKeySkills } from '@/lib/damage'
import charactersBase from '@/data/characters-base.json'
import weapons from '@/data/weapons.json'
import type { CharacterBase, Weapon } from '@/types/damage'
import type { Echo, StatEntry } from '@/types/echo'

const stat = (type: StatEntry['type'], value: number): StatEntry => ({ type, value })

const echoes: Echo[] = [
  {
    id: 'singularity', monsterId: 0, monsterName: '辛吉勒姆', cost: 4, rarity: 5, level: 25, tuneLevel: 5,
    sonata: 'trailblazing_star', mainStat: stat('CRIT_DMG', 44), secondaryStat: stat('FLAT_ATK', 150),
    substats: [stat('CRIT_RATE', 7.5), stat('CRIT_DMG', 16.2), stat('ATK_PCT', 8.6), stat('FLAT_ATK', 40), stat('ENERGY_REGEN', 10)],
  },
  {
    id: 'crown-falcon', monsterId: 0, monsterName: '共鸣回响·冠顶苍隼', cost: 3, rarity: 5, level: 25, tuneLevel: 5,
    sonata: 'trailblazing_star', mainStat: stat('ELEM_DMG', 30), secondaryStat: stat('FLAT_ATK', 100),
    substats: [stat('NORMAL_ATK_DMG', 9.4), stat('CRIT_RATE', 9.3), stat('ATK_PCT', 7.9), stat('ENERGY_REGEN', 9.2), stat('CRIT_DMG', 15)],
  },
  {
    id: 'glofen', monsterId: 0, monsterName: '格洛芬图', cost: 3, rarity: 5, level: 25, tuneLevel: 5,
    sonata: 'trailblazing_star', mainStat: stat('ELEM_DMG', 30), secondaryStat: stat('FLAT_ATK', 100),
    substats: [stat('FLAT_DEF', 40), stat('CRIT_RATE', 6.3), stat('ATK_PCT', 9.4), stat('CRIT_DMG', 18.6), stat('HP_PCT', 10.9)],
  },
  {
    id: 'ice-dancer', monsterId: 0, monsterName: '冰盈舞者', cost: 1, rarity: 5, level: 25, tuneLevel: 5,
    sonata: 'trailblazing_star', mainStat: stat('ATK_PCT', 18), secondaryStat: stat('FLAT_HP', 2280),
    substats: [stat('CRIT_DMG', 15), stat('RESONANCE_SKILL_DMG', 6.4), stat('CRIT_RATE', 6.3), stat('ATK_PCT', 7.9), stat('FLAT_HP', 430)],
  },
  {
    id: 'rock-spider', monsterId: 0, monsterName: '岩蛛S4型', cost: 1, rarity: 5, level: 25, tuneLevel: 5,
    sonata: 'trailblazing_star', mainStat: stat('ATK_PCT', 18), secondaryStat: stat('FLAT_HP', 2280),
    substats: [stat('ATK_PCT', 11.6), stat('CRIT_DMG', 17.4), stat('HEAVY_ATK_DMG', 7.1), stat('CRIT_RATE', 7.5), stat('HP_PCT', 9.4)],
  },
]

const character = (charactersBase as Record<string, CharacterBase>)['爱弥斯']
const weapon = (weapons as Weapon[]).find(item => item.name === '永远的启明星')!

function find(result: ReturnType<typeof calcDamage>, pattern: RegExp) {
  const skill = result.skills.find(item => pattern.test(item.name))
  if (!skill) throw new Error(`missing skill ${pattern}`)
  return { crit: skill.crit, expected: skill.expected, multiplier: skill.multiplierStr }
}

function run(inputCharacter: CharacterBase, inputWeapon: Weapon, inputEchoes = echoes) {
  const heavy = calcDamage(inputCharacter, inputWeapon, 1, inputEchoes, -1, 8, 90, 89, 0.1, 2, '爱弥斯')
  const terminal = calcDamage(inputCharacter, inputWeapon, 1, inputEchoes, -1, 10, 90, 89, 0.1, 2, '爱弥斯')
  return {
    panel: heavy.panel,
    heavy: find(heavy, /^重击·爱弥斯·二段蓄力伤害$/),
    terminal: find(terminal, /^星辉破界而来·终结伤害$/),
  }
}

describe('爱弥斯截图回放', () => {
  it('matches the reference loadout within displayed-stat rounding tolerance', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const result = run(character, weapon)
    const targets = {
      heavy: { crit: 113897, expected: 108399 },
      terminal: { crit: 168359, expected: 161891 },
    }
    const relativeError = (actual: number, expected: number) => Math.abs(actual - expected) / expected

    expect(result.panel.atk).toBeCloseTo(2346, -1)
    expect(result.panel.hp).toBeCloseTo(18251, -1)
    expect(result.panel.def).toBe(1188)
    expect(relativeError(result.heavy.crit, targets.heavy.crit)).toBeLessThan(0.005)
    expect(relativeError(result.heavy.expected, targets.heavy.expected)).toBeLessThan(0.005)
    expect(relativeError(result.terminal.crit, targets.terminal.crit)).toBeLessThan(0.005)
    expect(relativeError(result.terminal.expected, targets.terminal.expected)).toBeLessThan(0.005)

    const keySkills = selectKeySkills(calcDamage(character, weapon, 1, echoes, -1, 10, 90, 89, 0.1, 2, '爱弥斯').skills)
    expect(keySkills).toHaveLength(5)
    expect(keySkills.map(skill => skill.name)).toContain('重击·爱弥斯·二段蓄力伤害')
    expect(keySkills.map(skill => skill.name)).toContain('星辉破界而来·终结伤害')
  })
})
