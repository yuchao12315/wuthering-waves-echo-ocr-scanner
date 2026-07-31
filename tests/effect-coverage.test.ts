import { describe, expect, it, vi } from 'vitest'
import { calcDamage } from '@/lib/damage'
import charactersJson from '@/data/characters-base.json'
import weaponsJson from '@/data/weapons.json'
import type { CharacterBase, ChainEffect, InherentBuff, Weapon } from '@/types/damage'

const characters = charactersJson as Record<string, CharacterBase>
const weapons = weaponsJson as Weapon[]
const neutralWeapon: Weapon = {
  name: '审计武器', type: '审计', rarity: 1, baseAtk: 0,
  atkPct: 0, critRate: 0, critDmg: 0,
  passive: { effectName: '', effect: '', param: [] }, passiveEffects: [],
}

function signature(character: CharacterBase, chainLevel = 0): string {
  const result = calcDamage(character, neutralWeapon, 1, [], -1, 10, 90, 89, 0.1, chainLevel)
  return JSON.stringify({ panel: result.panel, skills: result.skills.map(skill => [skill.name, skill.crit, skill.expected]) })
}

function isolated(source: CharacterBase): CharacterBase {
  return structuredClone({ ...source, inherentBuffs: [], chainEffects: [] })
}

describe('damage effect data coverage', () => {
  it('makes every declared inherent skill effect observable', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const inert: string[] = []

    for (const [name, source] of Object.entries(characters)) {
      for (const rawBuff of source.inherentBuffs ?? []) {
        const buff = { ...rawBuff, enabled: true } as InherentBuff
        const baseline = isolated(source)
        const candidate = isolated(source)
        candidate.inherentBuffs = [buff]
        if (signature(baseline) === signature(candidate)) {
          inert.push(`${name}:${buff.type}:${buff.targetSkill ?? buff.damageType ?? 'global'}`)
        }
      }
    }

    expect(inert).toEqual([])
  })

  it('makes every declared chain effect observable and targetable', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const inert: string[] = []
    const unmatched: string[] = []

    for (const [name, source] of Object.entries(characters)) {
      for (const rawEffect of source.chainEffects ?? []) {
        const effect = { ...rawEffect, enabled: true } as ChainEffect
        if (effect.targetSkill && !source.skills.some(skill => new RegExp(effect.targetSkill!).test(skill.name))) {
          unmatched.push(`${name}:S${effect.sequence}:${effect.targetSkill}`)
        }
        const baseline = isolated(source)
        const candidate = isolated(source)
        candidate.chainEffects = [effect]
        if (signature(baseline) === signature(candidate, effect.sequence)) {
          inert.push(`${name}:S${effect.sequence}:${effect.type}:${effect.targetSkill ?? 'global'}`)
        }
      }
    }

    expect(unmatched).toEqual([])
    expect(inert).toEqual([])
  })

  it('assigns every named heavy attack an explicit damage category', () => {
    const ambiguous = Object.entries(characters).flatMap(([name, character]) =>
      character.skills
        .filter(skill => skill.name.includes('重击') && !skill.isHeavy && !skill.damageType)
        .map(skill => `${name}:${skill.name}`),
    )
    expect(ambiguous).toEqual([])
  })

  it('structures defense ignore, resistance reduction, and damage deepen weapon text', () => {
    const rules = [
      { pattern: /无视目标.*防御/, type: 'defIgnore' },
      { pattern: /(无视目标.*抗性|抗性降低)/, type: 'resReduce' },
      { pattern: /伤害加深/, type: 'dmgDeepen' },
    ] as const
    const gaps = weapons.flatMap(weapon => rules
      .filter(rule => rule.pattern.test(weapon.passive?.effect ?? ''))
      .filter(rule => !(weapon.passiveEffects ?? []).some(effect => effect.type === rule.type))
      .map(rule => `${weapon.name}:${rule.type}`))

    expect(gaps).toEqual([])
  })

  it('makes every structured weapon effect observable in its declared scope', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const inert: string[] = []

    for (const weapon of weapons) {
      for (const rawEffect of weapon.passiveEffects ?? []) {
        const effect = { ...rawEffect, enabled: true }
        const auditCharacter: CharacterBase = {
          baseAtk: 1000, baseHp: 10000, baseDef: 1000,
          weaponType: weapon.type, element: effect.targetElement ?? '热熔',
          ascensionStat: { type: 'critRate', value: 0 }, inherentBuffs: [], chainStats: [], chainEffects: [],
          weaponPassiveMultiplier: {},
          skills: [
            { name: '审计普攻', multipliers: ['100%'], tag: 'E', bonusDmg: 0, treeId: '1', skillType: '常态攻击', damageType: 'normalAtk' },
            { name: '审计重击', multipliers: ['100%'], tag: 'E', bonusDmg: 0, treeId: '1', skillType: '常态攻击', damageType: 'heavyAtk' },
            { name: '审计技能', multipliers: ['100%'], tag: 'E', bonusDmg: 0, treeId: '2', skillType: '共鸣技能', damageType: 'resonanceSkill' },
            { name: '审计解放', multipliers: ['100%'], tag: 'Q', bonusDmg: 0, treeId: '3', skillType: '共鸣解放', damageType: 'resonanceLiberation' },
            { name: '审计声骸', multipliers: ['100%'], tag: 'E', bonusDmg: 0, treeId: '7', skillType: '共鸣回路', damageType: 'phantom' },
            { name: '审计效应', multipliers: ['100%'], tag: 'E', bonusDmg: 0, treeId: '7', skillType: '共鸣回路', damageType: 'effect' },
          ],
        }
        const baselineWeapon = structuredClone(weapon)
        baselineWeapon.passiveEffects = []
        const candidateWeapon = structuredClone(weapon)
        candidateWeapon.passiveEffects = [effect]
        const baseline = calcDamage(auditCharacter, baselineWeapon, 1, [], -1, 1, 90, 89, 0.1)
        const candidate = calcDamage(auditCharacter, candidateWeapon, 1, [], -1, 1, 90, 89, 0.1)
        if (JSON.stringify(baseline) === JSON.stringify(candidate)) {
          inert.push(`${weapon.name}:${effect.type}:param${effect.paramIdx}`)
        }
      }
    }

    expect(inert).toEqual([])
  })
})
