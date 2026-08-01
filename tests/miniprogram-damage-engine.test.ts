import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { calcDamage as webCalcDamage, selectKeySkills as webSelectKeySkills } from '@/lib/damage'
import type { CharacterBase, Weapon } from '@/types/damage'

const root = resolve(import.meta.dirname, '..')

function loadGeneratedEngine() {
  const filename = resolve(root, 'miniprogram/lib/damage.js')
  const source = readFileSync(filename, 'utf8')
  const module = { exports: {} as Record<string, unknown> }
  const localRequire = (request: string) => {
    if (request.endsWith('sonata-effects.js')) return {}
    if (request.endsWith('nightmare-bonuses.js')) return { getNightmareBonus: () => null }
    throw new Error(`Unexpected generated-engine dependency: ${request}`)
  }
  new Function('require', 'exports', 'module', source)(localRequire, module.exports, module)
  return module.exports as {
    calcDamage: typeof webCalcDamage
    selectKeySkills: typeof webSelectKeySkills
  }
}

describe('miniprogram shared damage engine', () => {
  it('is generated from the canonical TypeScript source', () => {
    execFileSync(process.execPath, ['scripts/generate-miniprogram-damage.cjs', '--check'], { cwd: root })
  })

  it('uses the native CommonJS module shape supported by the miniprogram runtime', () => {
    const source = readFileSync(resolve(root, 'miniprogram/lib/damage.js'), 'utf8')

    expect(source).toContain('module.exports = {')
    expect(source).not.toContain('Object.defineProperty(exports')
    expect(source).not.toMatch(/\bexports\./)
  })

  it('keeps Web and generated miniprogram results identical', () => {
    const character: CharacterBase = {
      baseAtk: 1000, baseHp: 10000, baseDef: 1000, weaponType: '迅刀', element: '热熔',
      ascensionStat: { type: 'critRate', value: 0 }, inherentBuffs: [], chainStats: [],
      chainEffects: [{ sequence: 1, type: 'critDmg', value: 1, targetSkill: '目标' }],
      weaponPassiveMultiplier: {},
      skills: [{ name: '目标重击', multipliers: ['200%防御'], tag: 'E', bonusDmg: 0, treeId: '1', skillType: '常态攻击', damageStat: 'def', damageType: 'heavyAtk' }],
    }
    const weapon: Weapon = {
      name: '测试', type: '迅刀', rarity: 5, baseAtk: 0, atkPct: 0, critRate: 0.5, critDmg: 0,
      passive: { effectName: '', effect: '', param: [] }, passiveEffects: [],
    }
    const miniCalcDamage = loadGeneratedEngine().calcDamage

    expect(miniCalcDamage(character, weapon, 1, [], -1, 1, 90, 89, 0.1, 1))
      .toEqual(webCalcDamage(character, weapon, 1, [], -1, 1, 90, 89, 0.1, 1))
  })

  it('keeps compact key-skill selection identical', () => {
    const skills = Array.from({ length: 8 }, (_, index) => ({
      name: `技能${index}`,
      tag: 'E',
      skillType: '共鸣技能',
      multiplierStr: '100%',
      multiplier: 1,
      expected: index * 100,
      crit: index * 120,
    }))
    const miniSelectKeySkills = loadGeneratedEngine().selectKeySkills

    expect(miniSelectKeySkills(skills)).toEqual(webSelectKeySkills(skills))
  })

  it('keeps page-level formula copies removed', () => {
    for (const file of ['miniprogram/pages/calculator/calculator.js', 'miniprogram/pages/loadouts/loadouts.js']) {
      const source = readFileSync(resolve(root, file), 'utf8')
      expect(source).toContain("require('../../lib/damage.js')")
      expect(source).not.toContain('var totalDefIgnore')
      expect(source).not.toContain('function parseMultiplierStr')
    }
  })
})
