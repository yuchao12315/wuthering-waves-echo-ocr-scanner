// pages/calculator/calculator.js
var adQuotaService = require('../../services/ad-quota-service.js')
var isAdQuotaEnabled = adQuotaService.isAdQuotaEnabled
var getQuotaSummary = adQuotaService.getQuotaSummary
var useCalculateQuota = adQuotaService.useCalculateQuota
var useAdvancedThresholdQuota = adQuotaService.useAdvancedThresholdQuota
var refundAdvancedThresholdQuota = adQuotaService.refundAdvancedThresholdQuota
var unlockCalculateByAd = adQuotaService.unlockCalculateByAd
var unlockAdvancedThresholdByAd = adQuotaService.unlockAdvancedThresholdByAd
var storageService = require('../../services/storage-service.js')
var getStorage = storageService.getStorage
var setStorage = storageService.setStorage

// 套装数据（本地打包）
var SONATA_EFFECTS = require('../../data/sonata-effects.js')
var WEAPONS = require('../../data/weapons.js')

// 技能类型中文映射
var SKILL_TYPE_LABELS = {
  '常态攻击': '普攻', '共鸣技能': '技能', '共鸣解放': '解放',
  '变奏技能': '变奏', '共鸣回路': '回路',
}

var STAT_DISPLAY = {
  FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
  FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害', HEAL_BONUS: '治疗加成',
  NORMAL_ATK_DMG: '普攻伤害', HEAVY_ATK_DMG: '重击伤害',
  RESONANCE_SKILL_DMG: '共鸣技能', RESONANCE_LIBERATION_DMG: '共鸣解放',
}

var CN_TO_STAT = {
  '攻击': 'FLAT_ATK',
  '攻击%': 'ATK_PCT',
  '生命': 'FLAT_HP',
  '生命%': 'HP_PCT',
  '防御': 'FLAT_DEF',
  '防御%': 'DEF_PCT',
  '暴击': 'CRIT_RATE',
  '暴击伤害': 'CRIT_DMG',
  '共鸣效率': 'ENERGY_REGEN',
  '属性伤害加成': 'ELEM_DMG',
  '治疗效果加成': 'HEAL_BONUS',
  '普攻伤害加成': 'NORMAL_ATK_DMG',
  '重击伤害加成': 'HEAVY_ATK_DMG',
  '共鸣技能伤害加成': 'RESONANCE_SKILL_DMG',
  '共鸣解放伤害加成': 'RESONANCE_LIBERATION_DMG',
}

var STAT_TO_CN = {}
Object.keys(CN_TO_STAT).forEach(function (key) {
  STAT_TO_CN[CN_TO_STAT[key]] = key
})

var MAIN_STAT_VALUES = {
  1: { ATK_PCT: 18.0, HP_PCT: 22.8, DEF_PCT: 18.0, FLAT_HP: 2280 },
  3: { ATK_PCT: 30.0, HP_PCT: 30.0, DEF_PCT: 38.0, ELEM_DMG: 30.0, ENERGY_REGEN: 32.0, FLAT_ATK: 100 },
  4: { ATK_PCT: 33.0, HP_PCT: 33.0, DEF_PCT: 41.5, CRIT_RATE: 22.0, CRIT_DMG: 44.0, HEAL_BONUS: 26.4, FLAT_ATK: 150 },
}

var MAIN_STAT_CN_VALUES = {
  1: { '攻击%': 18.0, '生命%': 22.8, '防御%': 18.0, '生命': 2280 },
  3: { '攻击%': 30.0, '生命%': 30.0, '防御%': 38.0, '属性伤害加成': 30.0, '共鸣效率': 32.0, '攻击': 100 },
  4: { '攻击%': 33.0, '生命%': 33.0, '防御%': 41.5, '暴击': 22.0, '暴击伤害': 44.0, '治疗效果加成': 26.4, '攻击': 150 },
}

var SEC_STAT_CN_VALUES = {
  1: { '生命': 2280 },
  3: { '攻击': 100 },
  4: { '攻击': 150 },
}

var MAX_SUB_VALUES = {
  '暴击': 10.5, '暴击伤害': 21.0,
  '攻击%': 11.6, '生命%': 11.6, '防御%': 14.7,
  '攻击': 60, '生命': 580, '防御': 70,
  '共鸣效率': 12.4,
  '普攻伤害加成': 11.6, '重击伤害加成': 11.6,
  '共鸣技能伤害加成': 11.6, '共鸣解放伤害加成': 11.6,
}

var SKILL_INDEX = {
  '普攻伤害加成': 0,
  '重击伤害加成': 1,
  '共鸣技能伤害加成': 2,
  '共鸣解放伤害加成': 3,
}

var SKILL_DMG_MAP = {
  NORMAL_ATK_DMG: 'normalAtk',
  HEAVY_ATK_DMG: 'heavyAtk',
  RESONANCE_SKILL_DMG: 'resonanceSkill',
  RESONANCE_LIBERATION_DMG: 'resonanceLiberation',
}

var SKILLTYPE_TO_DMG = {
  '常态攻击': 'normalAtk',
  '共鸣技能': 'resonanceSkill',
  '共鸣解放': 'resonanceLiberation',
  '共鸣回路': 'resonanceSkill',
}

var BUFF_TO_DMG_KEY = {
  normalAtkDmg: 'normalAtk',
  heavyAtkDmg: 'heavyAtk',
  resonanceSkillDmg: 'resonanceSkill',
  resonanceLiberationDmg: 'resonanceLiberation',
  phantomDmg: 'phantom',
}

// Cost分配选项
var COST_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '4+3+3+1+1', value: '4+3+3+1+1' },
  { label: '4+4+1+1+1', value: '4+4+1+1+1' },
]

// 评级计算
function getGrade(score) {
  if (score >= 210) return { grade: 'SSS', gradeClass: 'SSS' }
  if (score >= 195) return { grade: 'SS', gradeClass: 'SS' }
  if (score >= 175) return { grade: 'S', gradeClass: 'S' }
  if (score >= 150) return { grade: 'A', gradeClass: 'A' }
  if (score >= 120) return { grade: 'B', gradeClass: 'B' }
  return { grade: 'C', gradeClass: 'C' }
}

function getWeapons(weaponType) {
  var weapons = weaponType ? WEAPONS.filter(function (w) { return w.type === weaponType }) : WEAPONS
  return Promise.resolve(weapons)
}

function costToIndex(cost) {
  if (cost === 1) return 0
  if (cost === 3) return 1
  return 2
}

function roundScore(value) {
  if (!value || isNaN(value)) return 0
  return Math.round(value * 10000) / 10000
}

function round5(value) {
  return Math.round(value * 100000) / 100000
}

function round9(value) {
  return Math.round(value * 1000000000) / 1000000000
}

function parseParamValue(paramStr) {
  if (!paramStr) return 0
  var match = String(paramStr).match(/^([0-9.]+)(%?)$/)
  if (!match) return 0
  var val = parseFloat(match[1])
  return match[2] === '%' ? val / 100 : val
}

function normalizeDamageStat(stat) {
  if (stat === 'hp' || stat === '生命') return 'hp'
  if (stat === 'def' || stat === '防御') return 'def'
  return 'atk'
}

function parseMultiplierStr(str) {
  if (!str || String(str).indexOf('%') < 0) return 0
  var parts = String(str).split('+')
  var total = 0
  for (var i = 0; i < parts.length; i++) {
    var trimmed = parts[i].trim()
    var match = trimmed.match(/^([0-9.]+)%(?:\*(\d+))?$/)
    if (match) {
      var pct = parseFloat(match[1]) / 100
      var count = match[2] ? parseInt(match[2]) : 1
      total += pct * count
    }
  }
  return total
}

function parseFlatBaseValue(str) {
  if (!str) return 0
  var parts = String(str).split('+')
  var total = 0
  for (var i = 0; i < parts.length; i++) {
    var trimmed = parts[i].trim()
    if (trimmed.indexOf('%') >= 0) continue
    var match = trimmed.match(/^([0-9.]+)(?:\*(\d+))?$/)
    if (match) {
      var value = parseFloat(match[1])
      var count = match[2] ? parseInt(match[2]) : 1
      total += value * count
    }
  }
  return total
}

Page({
  data: {
    // 角色
    selectedChar: null,
    selectedCharName: '',
    hasCharBase: false,
    hasChainEffects: false,
    showCharacterPicker: false,

    // 排序模式
    rankMode: 'score',

    // 武器
    weaponNames: [],
    weaponIndex: 0,
    weaponName: '',
    weaponRefine: 1,

    // 命座
    chainLevel: 0,

    // 技能筛选
    skillTypes: [],
    skillTypeLabels: SKILL_TYPE_LABELS,
    activeSkillTypes: {},
    activeSkillTypeCount: 0,

    // 阈值筛选
    minCritRate: '',
    minEnergyRegen: '',
    hasThresholds: false,
    adQuotaEnabled: false,
    calculateLeft: 3,
    advancedThresholdLeft: 0,

    // 套装
    allSonatas: [],
    sonatas: [],

    // Cost
    costOptions: COST_OPTIONS,
    costFilter: 'all',

    // 排除
    savedLoadouts: [],
    excludedIds: {},

    // 计算状态
    computing: false,
    computeProgress: 0,
    countdown: '',

    // 结果
    sortedResults: [],
    filteredResults: [],
    belowCount: 0,
  },

  // 内部数据（不触发渲染）
  _charBase: null,
  _calc: null,
  _weapons: [],
  _echoes: [],
  _results: [],

  onLoad() {
    // 初始化套装列表
    var allSonatas = Object.keys(SONATA_EFFECTS).map(function (key) {
      return {
        key: key,
        name: SONATA_EFFECTS[key].name,
      }
    })
    this.setData({ allSonatas })

    // 加载已保存的套装
    this.loadSavedLoadouts()

    // 加载广告配额
    this.refreshQuota()
  },

  async onShow() {
    // 每次显示时检查全局角色选择
    var app = getApp()
    if (app.globalData.selectedCharacter) {
      this.setCharacter(app.globalData.selectedCharacter)
    }

    // 加载声骸库存
    this._echoes = await getStorage('echoes', [])
  },

  /** 设置当前角色 */
  async setCharacter(detail) {
    this._charBase = detail.base
    this._calc = detail.weights

    // 加载武器列表
    try {
      var weapons = await getWeapons(detail.weaponType)
      this._weapons = weapons
      var weaponNames = weapons.map(function (w) { return w.name })

      // 提取技能类型
      var skillTypeSet = new Set()
      if (detail.base && detail.base.skills) {
        detail.base.skills.forEach(function (s) {
          if (s.skillType) skillTypeSet.add(s.skillType)
        })
      }
      var skillTypes = Array.from(skillTypeSet)

      this.setData({
        selectedChar: { name: detail.name, element: detail.element, weaponType: detail.weaponType },
        selectedCharName: detail.name,
        hasCharBase: true,
        hasChainEffects: (detail.base.chainEffects || []).length > 0,
        weaponNames,
        weaponName: weaponNames[0] || '',
        weaponIndex: 0,
        skillTypes,
      })
    } catch (e) {
      console.error('加载武器失败:', e)
    }
  },

  /** 加载已保存的套装 */
  async loadSavedLoadouts() {
    try {
      const loadouts = await getStorage('loadouts', [])
      this.setData({ savedLoadouts: loadouts })
    } catch (e) {}
  },

  /** 刷新本地广告配额 */
  async refreshQuota() {
    var quota = await getQuotaSummary()
    this.setData({
      adQuotaEnabled: isAdQuotaEnabled(),
      calculateLeft: quota.calculateLeft,
      advancedThresholdLeft: quota.advancedThresholdLeft,
    })
  },

  // ====== 事件处理 ======

  openCharacterPicker() {
    this.setData({ showCharacterPicker: true })
  },

  closeCharacterPicker() {
    this.setData({ showCharacterPicker: false })
  },

  onCharacterPicked(e) {
    var detail = e.detail.character
    this.setData({ showCharacterPicker: false })
    this.setCharacter(detail)
  },

  setRankMode(e) {
    var mode = e.currentTarget.dataset.mode
    if (mode === 'damage' && !this.data.hasCharBase) return
    this.setData({ rankMode: mode })
  },

  onWeaponChange(e) {
    var idx = parseInt(e.detail.value)
    this.setData({
      weaponIndex: idx,
      weaponName: this.data.weaponNames[idx] || '',
    })
  },

  setRefine(e) {
    this.setData({ weaponRefine: e.currentTarget.dataset.refine })
  },

  setChainLevel(e) {
    this.setData({ chainLevel: e.currentTarget.dataset.level })
  },

  toggleSkillType(e) {
    var type = e.currentTarget.dataset.type
    var active = Object.assign({}, this.data.activeSkillTypes)
    if (active[type]) {
      delete active[type]
    } else {
      active[type] = true
    }
    this.setData({
      activeSkillTypes: active,
      activeSkillTypeCount: Object.keys(active).length,
    })
  },

  clearSkillTypes() {
    this.setData({ activeSkillTypes: {}, activeSkillTypeCount: 0 })
  },

  onMinCritInput(e) {
    var val = e.detail.value
    this.setData({
      minCritRate: val,
      hasThresholds: !!(val || this.data.minEnergyRegen),
    })
  },

  onMinEnergyInput(e) {
    var val = e.detail.value
    this.setData({
      minEnergyRegen: val,
      hasThresholds: !!(this.data.minCritRate || val),
    })
  },

  clearThresholds() {
    this.setData({ minCritRate: '', minEnergyRegen: '', hasThresholds: false })
  },

  toggleSonata(e) {
    var key = e.currentTarget.dataset.key
    var sonatas = this.data.sonatas.slice()
    var idx = sonatas.indexOf(key)
    if (idx >= 0) {
      sonatas.splice(idx, 1)
    } else if (sonatas.length < 2) {
      sonatas.push(key)
    }
    this.refreshSonataSelection(sonatas)
  },

  clearSonatas() {
    this.refreshSonataSelection([])
  },

  refreshSonataSelection(sonatas) {
    var selectedMap = {}
    for (var i = 0; i < sonatas.length; i++) {
      selectedMap[sonatas[i]] = true
    }
    var allSonatas = this.data.allSonatas.map(function (item) {
      var key = item.key
      return Object.assign({}, item, {
        selected: selectedMap[key] === true,
      })
    })
    this.setData({
      sonatas: sonatas,
      allSonatas: allSonatas,
    })
  },

  setCostFilter(e) {
    this.setData({ costFilter: e.currentTarget.dataset.value })
  },

  toggleExclude(e) {
    var id = e.currentTarget.dataset.id
    var excluded = Object.assign({}, this.data.excludedIds)
    if (excluded[id]) {
      delete excluded[id]
    } else {
      excluded[id] = true
    }
    this.setData({ excludedIds: excluded })
  },

  // ====== 计算 ======

  async onCalculate() {
    if (!this.data.selectedChar || this.data.computing) return

    if (this._echoes.length === 0) {
      wx.showToast({ title: '声骸库存为空，请先导入声骸', icon: 'none' })
      return
    }

    const quotaReady = await this.ensureCalculationQuota()
    if (!quotaReady) return

    this.setData({ computing: true, computeProgress: 0, countdown: '计算中...' })

    // 使用 setTimeout 让 UI 有时间更新
    var self = this
    setTimeout(function () { self.runCalculation() }, 100)
  },

  /** 计算前检查基础计算次数和高级阈值筛选次数 */
  async ensureCalculationQuota() {
    let usedAdvancedQuota = false

    if (this.data.hasThresholds) {
      let advancedQuota = await useAdvancedThresholdQuota()
      if (!advancedQuota.ok) {
        var unlocked = await unlockAdvancedThresholdByAd()
        if (!unlocked.ok) {
          this.refreshQuota()
          return false
        }

        advancedQuota = await useAdvancedThresholdQuota()
        if (!advancedQuota.ok) {
          this.refreshQuota()
          return false
        }
      }
      usedAdvancedQuota = true
    }

    let calcQuota = await useCalculateQuota()
    if (!calcQuota.ok) {
      var unlocked = await unlockCalculateByAd()
      if (!unlocked.ok) {
        if (usedAdvancedQuota) await refundAdvancedThresholdQuota()
        this.refreshQuota()
        return false
      }

      calcQuota = await useCalculateQuota()
      if (!calcQuota.ok) {
        if (usedAdvancedQuota) await refundAdvancedThresholdQuota()
        this.refreshQuota()
        return false
      }
    }

    this.refreshQuota()
    return true
  },

  /** 执行搭配计算（主线程） */
  runCalculation() {
    try {
      var config = {
        sonatas: this.data.sonatas,
        costFilter: this.data.costFilter,
        excludeEchoIds: this.buildExcludedEchoIds(),
      }
      var echoes = this.applyExcludedEchoes(this._echoes, config.excludeEchoIds)
      var results = this.calculateLoadouts(echoes, this._calc, config, this._echoes)
      this._results = results

      // 处理结果
      this.processResults(results)

      this.setData({
        computing: false,
        computeProgress: 100,
      })
    } catch (e) {
      console.error('计算失败:', e)
      wx.showToast({ title: '计算失败', icon: 'none' })
      this.setData({ computing: false })
    }
  },

  /** 处理计算结果：排序、过滤、格式化 */
  processResults(results) {
    var rankMode = this.data.rankMode
    var costFilter = this.data.costFilter
    var activeSkillTypeCount = this.data.activeSkillTypeCount
    var minCritRate = this.data.minCritRate
    var minEnergyRegen = this.data.minEnergyRegen
    var hasThresholds = this.data.hasThresholds

    var critThreshold = minCritRate ? parseFloat(minCritRate) / 100 : 0
    var energyThreshold = minEnergyRegen ? parseFloat(minEnergyRegen) / 100 : 0

    // 排序
    var sorted = results.slice().filter(function (r) {
      return this.matchesCostFilter(r.echoes, costFilter)
    }, this)
    if (rankMode === 'damage' && this._charBase) {
      sorted = sorted.map(function (r) {
        return Object.assign({}, r, {
          damage: this.calcLoadoutDamage(r.echoes),
        })
      }, this).sort(function (a, b) {
        return (b.damage || 0) - (a.damage || 0)
      })
    }

    // 格式化 + 过滤
    var formatted = sorted.map(function (r) {
      var gradeInfo = getGrade(r.score)

      // 计算暴击率和共鸣效率
      var stats = this.calcEchoStats(r.echoes)
      var critRateBelow = critThreshold > 0 && stats.critRate < critThreshold
      var energyBelow = energyThreshold > 0 && stats.energyRegen < energyThreshold

      return Object.assign({}, r, {
        scoreDisplay: r.score.toFixed(2),
        grade: gradeInfo.grade,
        gradeClass: gradeInfo.gradeClass,
        critRateDisplay: (stats.critRate * 100).toFixed(1) + '%',
        energyDisplay: (stats.energyRegen * 100).toFixed(1) + '%',
        critRateBelow,
        energyBelow,
        costPattern: this.formatCostPattern(r.echoes),
        damage: r.damage || 0,
        damageDisplay: r.damage ? r.damage.toLocaleString() : '',
        damageLabel: activeSkillTypeCount > 0 ? '筛选' : '总',
        echoes: r.echoes.map(function (echo) {
          var detail = this.scoreEchoDetailed(echo)
          var scoreValue = detail.scoreMax ? detail.total : (echo._score || 0)
          var scoreDetails = detail.details.length > 0 ? detail.details : (echo._scoreDetails || [])
          return Object.assign({}, echo, {
            shortName: echo.monsterName.length > 4
              ? echo.monsterName.substring(0, 4) + '..'
              : echo.monsterName,
            scoreDisplay: scoreValue ? scoreValue.toFixed(2) : '',
            scoreDetails: scoreDetails,
            scoreMaxDisplay: detail.scoreMax ? detail.scoreMax.toFixed(2) : '',
          })
        }, this),
      })
    }, this)

    // 阈值过滤
    let filtered = formatted
    let belowCount = 0
    if (hasThresholds) {
      var before = filtered.length
      filtered = filtered.filter(function (r) { return !r.critRateBelow && !r.energyBelow })
      belowCount = before - filtered.length
    }
    this._results = filtered

    this.setData({
      sortedResults: formatted,
      filteredResults: filtered,
      belowCount,
    })
  },

  /** 计算5个声骸的暴击率和共鸣效率 */
  calcEchoStats(echoes) {
    let critRate = 0.05  // 基础暴击率
    let energyRegen = 0

    for (var i = 0; i < echoes.length; i++) {
      var echo = echoes[i]
      var entries = [echo.mainStat, echo.secondaryStat].concat(echo.substats || []).filter(Boolean)
      for (var j = 0; j < entries.length; j++) {
        var entry = entries[j]
        if (entry.type === 'CRIT_RATE') critRate += entry.value / 100
        if (entry.type === 'ENERGY_REGEN') energyRegen += entry.value / 100
      }
    }

    return { critRate, energyRegen }
  },

  buildExcludedEchoIds() {
    var excluded = {}
    var active = this.data.excludedIds || {}
    var loadouts = this.data.savedLoadouts || []
    for (var i = 0; i < loadouts.length; i++) {
      var loadout = loadouts[i]
      if (!active[loadout.id]) continue
      var echoes = loadout.echoes || []
      for (var j = 0; j < echoes.length; j++) {
        if (echoes[j] && echoes[j].id) excluded[echoes[j].id] = true
      }
    }
    return excluded
  },

  applyExcludedEchoes(echoes, excludeEchoIds) {
    if (!excludeEchoIds || Object.keys(excludeEchoIds).length === 0) return echoes
    return echoes.filter(function (echo) {
      return !excludeEchoIds[echo.id]
    })
  },

  hasDoubleCrit(echo) {
    var substats = echo.substats || []
    var hasCrit = false
    var hasCritDmg = false
    for (var i = 0; i < substats.length; i++) {
      if (substats[i].type === 'CRIT_RATE') hasCrit = true
      if (substats[i].type === 'CRIT_DMG') hasCritDmg = true
    }
    return hasCrit && hasCritDmg
  },

  countEchoCosts(echoes) {
    var counts = { 1: 0, 3: 0, 4: 0 }
    for (var i = 0; i < echoes.length; i++) {
      var cost = echoes[i].cost
      if (counts[cost] == null) counts[cost] = 0
      counts[cost] += 1
    }
    return counts
  },

  formatCostPattern(echoes) {
    return echoes.slice().sort(function (a, b) {
      return b.cost - a.cost
    }).map(function (e) { return 'C' + e.cost }).join('+')
  },

  matchesCostFilter(echoes, costFilter) {
    if (!costFilter || costFilter === 'all') return true
    if (!echoes || echoes.length !== 5) return false

    var counts = this.countEchoCosts(echoes)
    if (costFilter === '4+3+3+1+1') {
      return counts[1] === 2 && counts[3] === 2 && counts[4] === 1
    }
    if (costFilter === '4+4+1+1+1') {
      return counts[1] === 3 && counts[3] === 0 && counts[4] === 2
    }
    return true
  },

  getCostFilterTargets(costFilter) {
    if (costFilter === '4+3+3+1+1') return [4, 3, 3, 1, 1]
    if (costFilter === '4+4+1+1+1') return [4, 4, 1, 1, 1]
    return null
  },

  getCostDistributions(totalCost) {
    var results = []
    for (var c4 = 0; c4 <= 5; c4++) {
      for (var c3 = 0; c3 <= 5 - c4; c3++) {
        var c1 = 5 - c4 - c3
        if (c1 + c3 * 3 + c4 * 4 === totalCost) {
          results.push([c1, c3, c4])
        }
      }
    }
    return results
  },

  getCostDistributionsLeq(maxCost) {
    var results = []
    for (var c4 = 0; c4 <= 5; c4++) {
      for (var c3 = 0; c3 <= 5 - c4; c3++) {
        var c1 = 5 - c4 - c3
        var total = c1 + c3 * 3 + c4 * 4
        if (total <= maxCost) results.push([c1, c3, c4])
      }
    }
    return results
  },

  topK(echoes, k) {
    return echoes.sort(function (a, b) { return b.score - a.score }).slice(0, k)
  },

  enumerateCombinations(arr, k) {
    if (k === 0) return [[]]
    if (k === 1) {
      return arr.map(function (e) { return [e] })
    }
    var results = []
    var n = arr.length
    if (k === 2) {
      for (var i = 0; i < n - 1; i++) {
        for (var j = i + 1; j < n; j++) results.push([arr[i], arr[j]])
      }
      return results
    }
    if (k === 3) {
      for (var a = 0; a < n - 2; a++) {
        for (var b = a + 1; b < n - 1; b++) {
          for (var c = b + 1; c < n; c++) results.push([arr[a], arr[b], arr[c]])
        }
      }
      return results
    }
    if (k === 4) {
      for (var p = 0; p < n - 3; p++) {
        for (var q = p + 1; q < n - 2; q++) {
          for (var r = q + 1; r < n - 1; r++) {
            for (var s = r + 1; s < n; s++) results.push([arr[p], arr[q], arr[r], arr[s]])
          }
        }
      }
      return results
    }
    if (k === 5) {
      for (var v = 0; v < n - 4; v++) {
        for (var w = v + 1; w < n - 3; w++) {
          for (var x = w + 1; x < n - 2; x++) {
            for (var y = x + 1; y < n - 1; y++) {
              for (var z = y + 1; z < n; z++) results.push([arr[v], arr[w], arr[x], arr[y], arr[z]])
            }
          }
        }
      }
    }
    return results
  },

  hasDuplicateSameCostName(echoes) {
    var seen = {}
    for (var i = 0; i < echoes.length; i++) {
      var echo = echoes[i]
      var key = echo.cost + ':' + (echo.monsterName || echo.monsterId || echo.id)
      if (seen[key]) return true
      seen[key] = true
    }
    return false
  },

  matchesSonataConstraint(echoes, sonataConstraint) {
    if (!sonataConstraint || sonataConstraint.type === 'none') return true
    if (sonataConstraint.type === 'single') {
      for (var i = 0; i < echoes.length; i++) {
        if (echoes[i].sonata !== sonataConstraint.sonata) return false
      }
      return true
    }
    if (sonataConstraint.type === 'dual') {
      var s1 = sonataConstraint.sonatas[0]
      var s2 = sonataConstraint.sonatas[1]
      var countS1 = 0
      var countS2 = 0
      for (var j = 0; j < echoes.length; j++) {
        if (echoes[j].sonata === s1) countS1++
        if (echoes[j].sonata === s2) countS2++
      }
      return countS1 >= 2 && countS2 >= 2
    }
    return true
  },

  findBestCombinations(bucket1, bucket3, bucket4, distributions, sonataConstraint) {
    var top10 = []
    var minTopScore = -Infinity
    for (var d = 0; d < distributions.length; d++) {
      var dist = distributions[d]
      var c1 = dist[0]
      var c3 = dist[1]
      var c4 = dist[2]
      if (c1 > bucket1.length || c3 > bucket3.length || c4 > bucket4.length) continue

      var picks1 = this.enumerateCombinations(bucket1, c1)
      var picks3 = this.enumerateCombinations(bucket3, c3)
      var picks4 = this.enumerateCombinations(bucket4, c4)
      for (var i = 0; i < picks1.length; i++) {
        for (var j = 0; j < picks3.length; j++) {
          for (var k = 0; k < picks4.length; k++) {
            var combined = picks1[i].concat(picks3[j], picks4[k])
            if (this.hasDuplicateSameCostName(combined)) continue
            if (!this.matchesSonataConstraint(combined, sonataConstraint)) continue

            var totalScore = combined.reduce(function (sum, e) { return sum + e.score }, 0)
            if (top10.length < 10 || totalScore > minTopScore) {
              var loadout = {
                echoes: combined.map(function (e) { return e.echo }),
                score: totalScore,
              }
              top10.push(loadout)
              top10.sort(function (a, b) { return b.score - a.score })
              if (top10.length > 10) top10.length = 10
              minTopScore = top10[top10.length - 1].score
            }
          }
        }
      }
    }
    return top10
  },

  calculateLoadouts(echoes, calc, config, allEchoes) {
    if (!calc || !echoes || echoes.length < 5) return []
    var sonatas = config.sonatas || []
    var filtered = echoes
    var sonataConstraint = { type: 'none' }

    if (sonatas.length === 1) {
      var single = sonatas[0]
      var singleFiltered = echoes.filter(function (e) { return e.sonata === single })
      if (singleFiltered.length >= 5) {
        filtered = singleFiltered
        sonataConstraint = { type: 'single', sonata: single }
      }
    } else if (sonatas.length === 2) {
      var s1 = sonatas[0]
      var s2 = sonatas[1]
      var count1 = echoes.filter(function (e) { return e.sonata === s1 }).length
      var count2 = echoes.filter(function (e) { return e.sonata === s2 }).length
      if (count1 >= 2 && count2 >= 2) {
        sonataConstraint = { type: 'dual', sonatas: [s1, s2] }
      }
    }

    filtered = filtered.filter(function (echo) {
      return this.hasDoubleCrit(echo)
    }, this)

    var scored = filtered.map(function (echo) {
      var detail = this.scoreEchoDetailed(echo)
      return {
        id: echo.id,
        echo: Object.assign({}, echo, {
          _score: detail.total,
          _scoreDetails: detail.details,
          _scoreMax: detail.scoreMax,
        }),
        score: detail.total,
        cost: echo.cost,
        sonata: echo.sonata,
        monsterName: echo.monsterName || '',
      }
    }, this)

    var bucket1 = this.topK(scored.filter(function (e) { return e.cost === 1 }), 15)
    var bucket3 = this.topK(scored.filter(function (e) { return e.cost === 3 }), 15)
    var bucket4 = this.topK(scored.filter(function (e) { return e.cost === 4 }), 15)

    var costFilter = config.costFilter || 'all'
    var distributions
    if (costFilter === '4+3+3+1+1') {
      distributions = [[2, 2, 1]]
    } else if (costFilter === '4+4+1+1+1') {
      distributions = [[3, 0, 2]]
    } else if (sonatas.length === 1 || sonatas.length === 2) {
      distributions = this.getCostDistributions(12)
    } else {
      distributions = this.getCostDistributionsLeq(12)
    }

    return this.findBestCombinations(bucket1, bucket3, bucket4, distributions, sonataConstraint)
  },

  getScoreMax(echo) {
    if (!this._calc || !this._calc.score_max) return 0
    return this._calc.score_max[costToIndex(echo.cost)] || 0
  },

  getSubWeight(statType) {
    if (!this._calc || !this._calc.sub_props) return 0
    var cnKey = STAT_TO_CN[statType]
    if (!cnKey) return 0
    var direct = this._calc.sub_props[cnKey]
    if (direct != null) return direct
    var skillIndex = SKILL_INDEX[cnKey]
    if (skillIndex == null) return 0
    var skillWeight = this._calc.skill_weight || []
    return (this._calc.sub_props['技能伤害加成'] || 0) * (skillWeight[skillIndex] || 0)
  },

  getMainWeight(statType, cost) {
    if (!this._calc || !this._calc.main_props) return 0
    var mainProps = this._calc.main_props[String(cost)]
    if (!mainProps) return 0
    var cnKey = STAT_TO_CN[statType]
    if (!cnKey) return 0
    return mainProps[cnKey] || 0
  },

  buildScoreDetail(field, stat, cost, scoreMax) {
    if (!stat || !stat.type || typeof stat.value !== 'number') return null
    var cnKey = STAT_TO_CN[stat.type]
    var label = STAT_DISPLAY[stat.type] || stat.type
    var raw = 0
    var maxRaw = 0

    if (field === '主词条') {
      var fixedValue = (MAIN_STAT_VALUES[cost] && MAIN_STAT_VALUES[cost][stat.type]) || stat.value
      raw = fixedValue * this.getMainWeight(stat.type, cost)
      var mainFixed = MAIN_STAT_CN_VALUES[cost] || {}
      maxRaw = cnKey ? ((mainFixed[cnKey] || 0) * this.getMainWeight(stat.type, cost)) : 0
    } else if (field === '副属性') {
      raw = stat.value * this.getMainWeight(stat.type, cost)
      var secFixed = SEC_STAT_CN_VALUES[cost] || {}
      maxRaw = cnKey ? ((secFixed[cnKey] || 0) * this.getMainWeight(stat.type, cost)) : 0
    } else {
      var weight = this.getSubWeight(stat.type)
      raw = stat.value * weight
      maxRaw = cnKey ? ((MAX_SUB_VALUES[cnKey] || 0) * weight) : 0
    }

    var score = scoreMax ? (raw / scoreMax) * 50 : 0
    var maxScore = scoreMax ? (maxRaw / scoreMax) * 50 : 0
    var pct = maxScore > 0 ? Math.min(100, score / maxScore * 100) : 0
    return {
      scoreKey: field + '-' + label + '-' + stat.value,
      field: field,
      label: label,
      value: stat.value,
      valueDisplay: String(stat.value),
      score: roundScore(score),
      scoreDisplay: roundScore(score).toFixed(2),
      maxScore: roundScore(maxScore),
      maxDisplay: roundScore(maxScore).toFixed(2),
      pct: Math.round(pct),
      scoreClass: pct >= 80 ? 'detail-high' : (pct >= 60 ? 'detail-mid' : 'detail-low'),
    }
  },

  scoreEchoDetailed(echo) {
    var scoreMax = this.getScoreMax(echo)
    if (!scoreMax) return { total: 0, scoreMax: 0, details: [] }

    var details = []
    var mainDetail = this.buildScoreDetail('主词条', echo.mainStat, echo.cost, scoreMax)
    if (mainDetail) details.push(mainDetail)

    var secondaryDetail = this.buildScoreDetail('副属性', echo.secondaryStat, echo.cost, scoreMax)
    if (secondaryDetail) details.push(secondaryDetail)

    var substats = echo.substats || []
    for (var i = 0; i < substats.length; i++) {
      var subDetail = this.buildScoreDetail('副词条', substats[i], echo.cost, scoreMax)
      if (subDetail) details.push(subDetail)
    }

    var total = details.reduce(function (sum, detail) {
      return sum + detail.score
    }, 0)
    return {
      total: roundScore(total),
      scoreMax: scoreMax,
      details: details,
    }
  },

  collectDamageEchoStats(echoes) {
    var stats = {
      atkPct: 0,
      flatAtk: 0,
      hpPct: 0,
      flatHp: 0,
      defPct: 0,
      flatDef: 0,
      critRate: 0,
      critDmg: 0,
      elemDmg: 0,
      skillDmg: { normalAtk: 0, heavyAtk: 0, resonanceSkill: 0, resonanceLiberation: 0, phantom: 0 },
    }
    for (var i = 0; i < echoes.length; i++) {
      var echo = echoes[i]
      var entries = [echo.mainStat, echo.secondaryStat].concat(echo.substats || []).filter(Boolean)
      for (var j = 0; j < entries.length; j++) {
        var entry = entries[j]
        var value = entry.value
        if (entry.type === 'ATK_PCT') stats.atkPct += value / 100
        else if (entry.type === 'FLAT_ATK') stats.flatAtk += value
        else if (entry.type === 'HP_PCT') stats.hpPct += value / 100
        else if (entry.type === 'FLAT_HP') stats.flatHp += value
        else if (entry.type === 'DEF_PCT') stats.defPct += value / 100
        else if (entry.type === 'FLAT_DEF') stats.flatDef += value
        else if (entry.type === 'CRIT_RATE') stats.critRate += value / 100
        else if (entry.type === 'CRIT_DMG') stats.critDmg += value / 100
        else if (entry.type === 'ELEM_DMG') stats.elemDmg += value / 100
        else {
          var skillKey = SKILL_DMG_MAP[entry.type]
          if (skillKey) stats.skillDmg[skillKey] += value / 100
        }
      }

      if (echo.nightmareBonus) {
        if (echo.nightmareBonus.elemDmg) stats.elemDmg += echo.nightmareBonus.elemDmg
        if (echo.nightmareBonus.secondValue > 0) {
          if (echo.nightmareBonus.secondType === 'critRate') {
            stats.critRate += echo.nightmareBonus.secondValue
          } else {
            var nmKey = BUFF_TO_DMG_KEY[echo.nightmareBonus.secondType]
            if (nmKey && stats.skillDmg[nmKey] != null) {
              stats.skillDmg[nmKey] += echo.nightmareBonus.secondValue
            }
          }
        }
      }
    }
    return stats
  },

  collectSonataBuffs(echoes) {
    var counts = {}
    for (var i = 0; i < echoes.length; i++) {
      var sonata = echoes[i].sonata
      if (sonata) counts[sonata] = (counts[sonata] || 0) + 1
    }

    var buff = {
      atkPct: 0,
      hpPct: 0,
      defPct: 0,
      elemDmg: 0,
      critRate: 0,
      critDmg: 0,
      skillDmg: {},
    }
    var applyBuff = function (type, value) {
      if (type === 'atkPct') buff.atkPct += value
      else if (type === 'hpPct') buff.hpPct += value
      else if (type === 'defPct') buff.defPct += value
      else if (type === 'elemDmg') buff.elemDmg += value
      else if (type === 'critRate') buff.critRate += value
      else if (type === 'critDmg') buff.critDmg += value
      else {
        var key = BUFF_TO_DMG_KEY[type]
        if (key) buff.skillDmg[key] = (buff.skillDmg[key] || 0) + value
      }
    }

    Object.keys(counts).forEach(function (sonata) {
      var effect = SONATA_EFFECTS[sonata]
      var count = counts[sonata]
      if (!effect) return
      var groups = []
      if (count >= 2 && effect.set2) groups = groups.concat(effect.set2)
      if (count >= 3 && effect.set3) groups = groups.concat(effect.set3)
      if (count >= 5 && effect.set5) groups = groups.concat(effect.set5)
      for (var j = 0; j < groups.length; j++) {
        var eff = groups[j]
        var val = eff.stacks ? eff.value * eff.stacks : eff.value
        applyBuff(eff.type, val)
      }
    })
    return buff
  },

  isBuffEnabled(buff) {
    return buff.enabled !== false
  },

  buffMatchesSkill(buff, skillName) {
    if (!buff.targetSkill) return true
    try {
      return new RegExp(buff.targetSkill).test(skillName)
    } catch (e) {
      return skillName.indexOf(buff.targetSkill) >= 0
    }
  },

  calcDamageForLoadout(echoes) {
    var character = this._charBase
    if (!character || !character.skills || character.skills.length === 0) return { totalExpected: 0, skills: [] }
    var weapon = this._weapons[this.data.weaponIndex] || this._weapons[0]
    if (!weapon) return { totalExpected: 0, skills: [] }

    var echoStats = this.collectDamageEchoStats(echoes)
    var sonataBuff = this.collectSonataBuffs(echoes)
    var refineIdx = Math.max(0, Math.min(4, this.data.weaponRefine - 1))
    var levelIdx = 9
    var baseAtk = (character.baseAtk || 0) + (weapon.baseAtk || 0)
    var baseHp = character.baseHp || 0
    var baseDef = character.baseDef || 0
    var totalAtkPct = echoStats.atkPct + sonataBuff.atkPct
    var totalHpPct = echoStats.hpPct + sonataBuff.hpPct
    var totalDefPct = echoStats.defPct + sonataBuff.defPct
    var totalCritRate = 0.05 + echoStats.critRate + sonataBuff.critRate
    var totalCritDmg = 1.5 + echoStats.critDmg + sonataBuff.critDmg
    var baseElemDmg = echoStats.elemDmg + sonataBuff.elemDmg
    var skillDmgBonuses = {
      normalAtk: echoStats.skillDmg.normalAtk + (sonataBuff.skillDmg.normalAtk || 0),
      heavyAtk: echoStats.skillDmg.heavyAtk + (sonataBuff.skillDmg.heavyAtk || 0),
      resonanceSkill: echoStats.skillDmg.resonanceSkill + (sonataBuff.skillDmg.resonanceSkill || 0),
      resonanceLiberation: echoStats.skillDmg.resonanceLiberation + (sonataBuff.skillDmg.resonanceLiberation || 0),
      phantom: echoStats.skillDmg.phantom + (sonataBuff.skillDmg.phantom || 0),
    }
    var totalDefIgnore = 0
    var totalResReduce = 0
    var globalDmgDeepen = 0

    if (weapon.atkPct) totalAtkPct += weapon.atkPct
    if (weapon.critRate) totalCritRate += weapon.critRate
    if (weapon.critDmg) totalCritDmg += weapon.critDmg

    var enabledBuffs = (character.inherentBuffs || []).filter(this.isBuffEnabled)
    for (var i = 0; i < enabledBuffs.length; i++) {
      var buff = enabledBuffs[i]
      if (buff.targetSkill) continue
      if (buff.type === 'atkPct') totalAtkPct += buff.value
      else if (buff.type === 'hpPct') totalHpPct += buff.value
      else if (buff.type === 'defPct') totalDefPct += buff.value
      else if (buff.type === 'critRate') totalCritRate += buff.value
      else if (buff.type === 'critDmg') totalCritDmg += buff.value
      else if (buff.type === 'elemDmg') baseElemDmg += buff.value
      else if (buff.type === 'defIgnore') totalDefIgnore += buff.value
      else if (buff.type === 'resReduce') totalResReduce += buff.value
      else if (buff.type === 'dmgDeepen') globalDmgDeepen += buff.value
      else {
        var buffSkillKey = BUFF_TO_DMG_KEY[buff.type]
        if (buffSkillKey) skillDmgBonuses[buffSkillKey] += buff.value
      }
    }

    var chainEffects = character.chainEffects || []
    var activeChainLevel = Math.min(6, this.data.chainLevel || 0)
    var activeChainEffects = []
    for (var c = 0; c < chainEffects.length; c++) {
      if (chainEffects[c].sequence <= activeChainLevel && chainEffects[c].enabled !== false) {
        activeChainEffects.push(chainEffects[c])
      }
    }
    for (var ce = 0; ce < activeChainEffects.length; ce++) {
      var chain = activeChainEffects[ce]
      if (chain.targetSkill) continue
      if (chain.type === 'atkPct') totalAtkPct += chain.value
      else if (chain.type === 'hpPct') totalHpPct += chain.value
      else if (chain.type === 'defPct') totalDefPct += chain.value
      else if (chain.type === 'critRate') totalCritRate += chain.value
      else if (chain.type === 'critDmg') totalCritDmg += chain.value
      else if (chain.type === 'elemDmg') baseElemDmg += chain.value
      else if (chain.type === 'defIgnore') totalDefIgnore += chain.value
      else if (chain.type === 'resReduce') totalResReduce += chain.value
      else if (chain.type === 'dmgDeepen') globalDmgDeepen += chain.value
      else {
        var chainSkillKey = BUFF_TO_DMG_KEY[chain.type]
        if (chainSkillKey) skillDmgBonuses[chainSkillKey] += chain.value
      }
    }

    var weaponDmgBonuses = {}
    var passiveEffects = weapon.passiveEffects || []
    for (var pe = 0; pe < passiveEffects.length; pe++) {
      var passive = passiveEffects[pe]
      var paramArr = weapon.passive && weapon.passive.param && weapon.passive.param[passive.paramIdx]
      if (!paramArr) continue
      var val = parseParamValue(paramArr[refineIdx] || paramArr[paramArr.length - 1] || '')
      if (passive.stacks) {
        var stackCount = passive.stackParamIdx != null
          ? parseParamValue(weapon.passive.param[passive.stackParamIdx] && weapon.passive.param[passive.stackParamIdx][refineIdx])
          : passive.stacks
        val *= stackCount
      }
      if (passive.type === 'atkPct') totalAtkPct += val
      else if (passive.type === 'hpPct') totalHpPct += val
      else if (passive.type === 'defPct') totalDefPct += val
      else if (passive.type === 'critRate') totalCritRate += val
      else if (passive.type === 'critDmg') totalCritDmg += val
      else if (passive.type === 'elemDmg') baseElemDmg += val
      else {
        var passiveKey = BUFF_TO_DMG_KEY[passive.type]
        if (passiveKey) weaponDmgBonuses[passiveKey] = (weaponDmgBonuses[passiveKey] || 0) + val
      }
    }

    var totalAtk = round5(baseAtk * (1 + totalAtkPct) + echoStats.flatAtk)
    var totalHp = round5(baseHp * (1 + totalHpPct) + echoStats.flatHp)
    var totalDef = round5(baseDef * (1 + totalDefPct) + echoStats.flatDef)
    var defMult = round9(190 / (188 + 190 * (1 - totalDefIgnore)))
    var resMult = round5(1 - Math.max(0, 0.1 - totalResReduce))
    var skills = character.skills.map(function (skill) {
      var multiplierStr = skill.multipliers[levelIdx] || skill.multipliers[skill.multipliers.length - 1] || '0%'
      var multiplier = parseMultiplierStr(multiplierStr)
      var flatBase = parseFlatBaseValue(multiplierStr)
      var dmgBonus = baseElemDmg + (skill.bonusDmg || 0)
      var skillDmgDeepen = globalDmgDeepen
      var skillGuaranteedCrit = false
      var dmgKey = skill.isHeavy ? 'heavyAtk' : (SKILLTYPE_TO_DMG[skill.skillType] || '')
      if (dmgKey) {
        dmgBonus += skillDmgBonuses[dmgKey] || 0
        dmgBonus += weaponDmgBonuses[dmgKey] || 0
      }

      for (var b = 0; b < enabledBuffs.length; b++) {
        var tb = enabledBuffs[b]
        if (!tb.targetSkill || !this.buffMatchesSkill(tb, skill.name)) continue
        if (tb.type === 'dmgDeepen') skillDmgDeepen += tb.value
        else {
          var tbKey = BUFF_TO_DMG_KEY[tb.type]
          if (tbKey) dmgBonus += tb.value
        }
      }

      for (var ac = 0; ac < activeChainEffects.length; ac++) {
        var tc = activeChainEffects[ac]
        if (!tc.targetSkill || !this.buffMatchesSkill(tc, skill.name)) continue
        if (tc.type === 'guaranteedCrit') skillGuaranteedCrit = true
        else if (tc.type === 'dmgDeepen') skillDmgDeepen += tc.value
        else if (tc.type === 'multiplierBoost') multiplier *= (1 + tc.value)
        else {
          var tcKey = BUFF_TO_DMG_KEY[tc.type]
          if (tcKey) dmgBonus += tc.value
          else if (tc.type === 'elemDmg') dmgBonus += tc.value
        }
      }

      var damageStat = normalizeDamageStat(skill.damageStat)
      var baseStat = damageStat === 'hp' ? totalHp : damageStat === 'def' ? totalDef : totalAtk
      var baseDmg = round5(baseStat * multiplier + flatBase)
      var expectedCritMult = skillGuaranteedCrit ? totalCritDmg : round5(totalCritRate * totalCritDmg)
      var expected = round5(round5(round5(round5(baseDmg * round5(1 + dmgBonus)) * round5(1 + skillDmgDeepen)) * expectedCritMult) * defMult) * resMult
      return {
        name: skill.name,
        skillType: skill.skillType,
        damageStat: damageStat,
        expected: Math.round(expected),
      }
    }, this)

    return {
      totalExpected: skills.reduce(function (sum, skill) { return sum + skill.expected }, 0),
      skills: skills,
    }
  },

  calcLoadoutDamage(echoes) {
    var result = this.calcDamageForLoadout(echoes)
    var activeSkillTypes = this.data.activeSkillTypes || {}
    var activeKeys = Object.keys(activeSkillTypes).filter(function (key) { return activeSkillTypes[key] })
    if (activeKeys.length === 0) return result.totalExpected
    return result.skills.filter(function (skill) {
      return activeSkillTypes[skill.skillType]
    }).reduce(function (sum, skill) {
      return sum + skill.expected
    }, 0)
  },

  /** 保存套装 */
  onSaveLoadout(e) {
    var self = this
    var idx = e.currentTarget.dataset.index
    var result = this._results[idx]
    if (!result) return

    wx.showModal({
      title: '保存套装',
      editable: true,
      placeholderText: '输入套装名称',
      success: async function (res) {
        if (res.confirm && res.content) {
          var loadout = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            name: res.content,
            characterName: self.data.selectedChar.name,
            echoes: result.echoes.map(function (e) { return {
              id: e.id,
              monsterId: e.monsterId,
              monsterName: e.monsterName,
              cost: e.cost,
              rarity: e.rarity,
              level: e.level,
              tuneLevel: e.tuneLevel,
              sonata: e.sonata,
              mainStat: e.mainStat,
              secondaryStat: e.secondaryStat,
              substats: e.substats,
              nightmareBonus: e.nightmareBonus,
            } }),
            score: result.score,
            savedAt: Date.now(),
          }

          try {
            var loadouts = await getStorage('loadouts', [])
            loadouts.unshift(loadout)
            await setStorage('loadouts', loadouts)
            self.loadSavedLoadouts()
            wx.showToast({ title: '已保存', icon: 'success' })
          } catch (e) {
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        }
      }
    })
  },
})
