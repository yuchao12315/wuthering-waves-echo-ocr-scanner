import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'acorn'
import { describe, expect, it } from 'vitest'
import { calcDamage as webCalcDamage, selectKeySkills as webSelectKeySkills } from '@/lib/damage'
import type { CharacterBase, Weapon } from '@/types/damage'

const root = resolve(import.meta.dirname, '..')

type CalculatorPage = Record<string, unknown> & {
  _calc: Record<string, unknown>
  calculateLoadouts: (
    echoes: Array<Record<string, unknown>>,
    calc: Record<string, unknown>,
    config: { sonatas: string[]; costFilter: string },
    allEchoes: Array<Record<string, unknown>>,
  ) => unknown[]
}

function loadCalculatorPage() {
  const filename = resolve(root, 'miniprogram/pages/calculator/calculator.js')
  const source = readFileSync(filename, 'utf8')
  let page: CalculatorPage | undefined
  const noop = () => undefined
  const localRequire = (request: string) => {
    if (request.includes('ad-quota-service')) {
      return {
        isAdQuotaEnabled: () => false,
        getQuotaSummary: noop,
        useCalculateQuota: noop,
        useAdvancedThresholdQuota: noop,
        refundAdvancedThresholdQuota: noop,
        unlockCalculateByAd: noop,
        unlockAdvancedThresholdByAd: noop,
      }
    }
    if (request.includes('storage-service')) return { getStorage: noop, setStorage: noop }
    if (request.includes('sonata-effects')) return {}
    if (request.includes('weapons')) return []
    if (request.includes('damage')) return { calcDamage: noop }
    throw new Error(`Unexpected calculator dependency: ${request}`)
  }

  Function('require', 'Page', source)(localRequire, (definition: CalculatorPage) => { page = definition })
  if (!page) throw new Error('Calculator page was not registered')
  return page
}

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

  it('shows the damage error range and feedback guidance on both result pages', () => {
    for (const file of ['miniprogram/pages/calculator/calculator.wxml', 'miniprogram/pages/loadouts/loadouts.wxml']) {
      const source = readFileSync(resolve(root, file), 'utf8')
      expect(source).toContain('约 0%–2% 误差')
      expect(source).toContain('若误差超过 5%')
      expect(source).toContain('反馈开发者修复')
    }
  })

  it('keeps long loadout multipliers from covering expected and crit damage', () => {
    const template = readFileSync(resolve(root, 'miniprogram/pages/loadouts/loadouts.wxml'), 'utf8')
    const styles = readFileSync(resolve(root, 'miniprogram/pages/loadouts/loadouts.wxss'), 'utf8')

    expect(template).toContain('dmg-td-multiplier')
    expect(styles).toMatch(/\.dmg-th-right,\s*\.dmg-td-right\s*\{[^}]*flex:\s*0 0 112rpx/s)
    expect(styles).toMatch(/\.dmg-td-multiplier\s*\{[^}]*overflow-wrap:\s*anywhere/s)
  })

  it('refreshes saved loadouts when returning to the calculator page', () => {
    const source = readFileSync(resolve(root, 'miniprogram/pages/calculator/calculator.js'), 'utf8')
    const onShow = source.match(/async onShow\(\)\s*\{([\s\S]*?)\n {2}\},\n\n {2}\/\*\* 设置当前角色/)

    expect(onShow).not.toBeNull()
    expect(onShow?.[1]).toContain('await this.loadSavedLoadouts()')
  })

  it('does not fall back to off-set echoes when a selected sonata is incomplete', () => {
    const page = loadCalculatorPage()
    page._calc = { score_max: [1, 1, 1], main_props: {}, sub_props: {}, skill_weight: [0, 0, 0, 0] }
    const costs = [4, 3, 3, 1, 1]
    const echoes = costs.map((cost, index) => ({
      id: `echo-${index}`,
      monsterName: `声骸-${index}`,
      cost,
      sonata: index < 4 ? 'selected-set' : 'off-set',
      mainStat: null,
      secondaryStat: null,
      substats: [{ type: 'CRIT_RATE', value: 10 }, { type: 'CRIT_DMG', value: 20 }],
    }))

    expect(page.calculateLoadouts(echoes, page._calc, { sonatas: ['selected-set'], costFilter: 'all' }, echoes)).toEqual([])
    expect(page.calculateLoadouts(echoes, page._calc, { sonatas: ['selected-set', 'off-set'], costFilter: 'all' }, echoes)).toEqual([])

    const completeSet = echoes.map(echo => ({ ...echo, sonata: 'selected-set' }))
    expect(page.calculateLoadouts(completeSet, page._calc, { sonatas: ['selected-set'], costFilter: 'all' }, completeSet)).toHaveLength(1)
    expect(readFileSync(resolve(root, 'src/workers/loadout-worker.ts'), 'utf8')).not.toContain('回退到散件模式')
    expect(readFileSync(resolve(root, 'miniprogram/pages/calculator/calculator.wxml'), 'utf8'))
      .toContain('当前库存无法组成所选完整套装')
  })

  it('uses deterministic scoring for replacement previews and echo sorting', () => {
    const source = readFileSync(resolve(root, 'miniprogram/services/scoring-service.js'), 'utf8')
    const module = { exports: {} as Record<string, unknown> }
    Function('require', 'module', 'exports', source)(
      () => ({ getNightmareBonus: () => null }), module, module.exports,
    )
    const scoring = module.exports as {
      scoreEcho: (echo: Record<string, unknown>, calc: Record<string, unknown>) => number
    }
    const calc = {
      score_max: [100, 100, 100],
      main_props: { '4': { 暴击: 1 } },
      sub_props: { 暴击: 2 },
      skill_weight: [0, 0, 0, 0],
    }
    const echo = { cost: 4, mainStat: { type: 'CRIT_RATE', value: 22 }, substats: [{ type: 'CRIT_RATE', value: 10 }] }

    expect(scoring.scoreEcho(echo, calc)).toBe(21)
    expect(readFileSync(resolve(root, 'miniprogram/pages/echoes/echoes.js'), 'utf8')).not.toContain('Math.random() * 25')
  })

  it('connects all P0 controls to working page handlers', () => {
    const loadoutJs = readFileSync(resolve(root, 'miniprogram/pages/loadouts/loadouts.js'), 'utf8')
    const loadoutWxml = readFileSync(resolve(root, 'miniprogram/pages/loadouts/loadouts.wxml'), 'utf8')
    const calculatorJs = readFileSync(resolve(root, 'miniprogram/pages/calculator/calculator.js'), 'utf8')
    expect(loadoutWxml).toContain('onPreviewReplacement')
    expect(loadoutWxml).toContain('onConfirmReplacement')
    expect(loadoutJs).toContain('preview.scoreAfter')
    expect(loadoutWxml).toContain('onShareReport')
    expect(loadoutJs).toContain("wx.canvasToTempFilePath")
    expect(loadoutJs).toContain("wx.showShareImageMenu")
    expect(loadoutJs).toContain('loadout._skillLevel || 10')
    expect(calculatorJs).toContain('this.data.enemyResist / 100')
  })
})
