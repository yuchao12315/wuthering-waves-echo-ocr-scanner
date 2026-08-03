import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'acorn'
import { describe, expect, it } from 'vitest'
import { calcDamage as webCalcDamage, selectKeySkills as webSelectKeySkills } from '@/lib/damage'
import type { CharacterBase, Weapon } from '@/types/damage'

const root = resolve(import.meta.dirname, '..')

function loadGeneratedEngine() {
  const filename = resolve(root, 'miniprogram/services/damage.js')
  const source = readFileSync(filename, 'utf8')
  const module = { exports: {} as Record<string, unknown> }
  const localRequire = (request: string) => {
    const dependencyFilename = resolve(filename, '..', request)
    if (!existsSync(dependencyFilename)) throw new Error(`Missing generated dependency: ${dependencyFilename}`)

    const dependency = { exports: {} as Record<string, unknown> }
    const dependencySource = readFileSync(dependencyFilename, 'utf8')
    Function('module', 'exports', dependencySource)(dependency, dependency.exports)
    return dependency.exports
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

  it('emits a physical ES5 CommonJS module for the miniprogram runtime', () => {
    const source = readFileSync(resolve(root, 'miniprogram/services/damage.js'), 'utf8')

    expect(() => parse(source, { ecmaVersion: 5 })).not.toThrow()
    expect(source).toContain('module.exports = {')
    expect(source).not.toMatch(/\bexports\./)
    expect(existsSync(resolve(root, 'miniprogram/lib/damage.js'))).toBe(false)
    expect(existsSync(resolve(root, 'miniprogram/lib/damage.ts'))).toBe(false)
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
      expect(source).toContain("require('../../services/damage.js')")
      expect(source).not.toContain("require('../../lib/damage")
      expect(source).not.toContain('var totalDefIgnore')
      expect(source).not.toContain('function parseMultiplierStr')
    }
  })
})
