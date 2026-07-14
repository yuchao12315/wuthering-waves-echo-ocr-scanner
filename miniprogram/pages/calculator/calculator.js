// pages/calculator/calculator.js
var adQuotaService = require('../../services/ad-quota-service.js')
var isAdQuotaEnabled = adQuotaService.isAdQuotaEnabled
var getQuotaSummary = adQuotaService.getQuotaSummary
var useCalculateQuota = adQuotaService.useCalculateQuota
var useAdvancedThresholdQuota = adQuotaService.useAdvancedThresholdQuota
var refundAdvancedThresholdQuota = adQuotaService.refundAdvancedThresholdQuota
var unlockCalculateByAd = adQuotaService.unlockCalculateByAd
var unlockAdvancedThresholdByAd = adQuotaService.unlockAdvancedThresholdByAd

// 套装数据（本地打包）
var SONATA_EFFECTS = require('../../data/sonata-effects.js')
var WEAPONS = require('../../data/weapons.js')

// 技能类型中文映射
var SKILL_TYPE_LABELS = {
  '常态攻击': '普攻', '共鸣技能': '技能', '共鸣解放': '解放',
  '变奏技能': '变奏', '共鸣回路': '回路',
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

  onShow() {
    // 每次显示时检查全局角色选择
    var app = getApp()
    if (app.globalData.selectedCharacter) {
      this.setCharacter(app.globalData.selectedCharacter)
    }

    // 加载声骸库存
    try {
      const echoes = wx.getStorageSync('echoes')
      if (echoes) this._echoes = echoes
    } catch (e) {}
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
  loadSavedLoadouts() {
    try {
      const loadouts = wx.getStorageSync('loadouts') || []
      this.setData({ savedLoadouts: loadouts })
    } catch (e) {}
  },

  /** 刷新本地广告配额 */
  refreshQuota() {
    var quota = getQuotaSummary()
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
    this.setData({ sonatas })
  },

  clearSonatas() {
    this.setData({ sonatas: [] })
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
      let advancedQuota = useAdvancedThresholdQuota()
      if (!advancedQuota.ok) {
        var unlocked = await unlockAdvancedThresholdByAd()
        if (!unlocked.ok) {
          this.refreshQuota()
          return false
        }

        advancedQuota = useAdvancedThresholdQuota()
        if (!advancedQuota.ok) {
          this.refreshQuota()
          return false
        }
      }
      usedAdvancedQuota = true
    }

    let calcQuota = useCalculateQuota()
    if (!calcQuota.ok) {
      var unlocked = await unlockCalculateByAd()
      if (!unlocked.ok) {
        if (usedAdvancedQuota) refundAdvancedThresholdQuota()
        this.refreshQuota()
        return false
      }

      calcQuota = useCalculateQuota()
      if (!calcQuota.ok) {
        if (usedAdvancedQuota) refundAdvancedThresholdQuota()
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
      // TODO: 实际计算逻辑需要从 loadout-worker.ts 移植
      // 这里先用模拟数据演示 UI 结构
      var mockResults = this.generateMockResults()
      this._results = mockResults

      // 处理结果
      this.processResults(mockResults)

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
    var activeSkillTypeCount = this.data.activeSkillTypeCount
    var minCritRate = this.data.minCritRate
    var minEnergyRegen = this.data.minEnergyRegen
    var hasThresholds = this.data.hasThresholds

    var critThreshold = minCritRate ? parseFloat(minCritRate) / 100 : 0
    var energyThreshold = minEnergyRegen ? parseFloat(minEnergyRegen) / 100 : 0

    // 排序
    var sorted = results.slice()
    if (rankMode === 'damage' && this._charBase) {
      // TODO: 按伤害排序需要调用 calcDamage
      // 这里保留真实伤害排序接入点。
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
        costPattern: r.echoes.map(function (e) { return 'C' + e.cost }).join('+'),
        damage: r.damage || 0,
        damageDisplay: r.damage ? r.damage.toLocaleString() : '',
        damageLabel: activeSkillTypeCount > 0 ? '筛选' : '总',
        echoes: r.echoes.map(function (echo) {
          return Object.assign({}, echo, {
          shortName: echo.monsterName.length > 4
            ? echo.monsterName.substring(0, 4) + '..'
            : echo.monsterName,
          scoreDisplay: echo._score ? echo._score.toFixed(2) : '',
          })
        }),
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

  /** 生成模拟结果（TODO: 替换为真实计算） */
  generateMockResults() {
    var results = []
    var echoes = this._echoes

    if (echoes.length < 5) return results

    // 随机组合5个声骸作为演示
    for (let i = 0; i < Math.min(10, Math.floor(echoes.length / 5)); i++) {
      var selected = []
      var used = new Set()
      while (selected.length < 5 && used.size < echoes.length) {
        var idx = Math.floor(Math.random() * echoes.length)
        if (!used.has(idx)) {
          used.add(idx)
          selected.push(Object.assign({}, echoes[idx], { _score: 20 + Math.random() * 25 }))
        }
      }
      var totalScore = selected.reduce(function (s, e) { return s + (e._score || 0) }, 0)
      results.push({
        echoes: selected,
        score: totalScore,
        damage: 0,
      })
    }

    results.sort(function (a, b) { return b.score - a.score })
    return results
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
      success: function (res) {
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
            var loadouts = wx.getStorageSync('loadouts') || []
            loadouts.unshift(loadout)
            wx.setStorageSync('loadouts', loadouts)
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
