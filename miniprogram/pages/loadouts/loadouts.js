// pages/loadouts/loadouts.js
var SONATA_EFFECTS = require('../../data/sonata-effects.js')

var SONATA_NAMES = {}
Object.keys(SONATA_EFFECTS).forEach(function (key) {
  var val = SONATA_EFFECTS[key]
  SONATA_NAMES[key] = val.name
})

var STAT_DISPLAY = {
  FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
  FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害', HEAL_BONUS: '治疗加成',
  NORMAL_ATK_DMG: '普攻伤害', HEAVY_ATK_DMG: '重击伤害',
  RESONANCE_SKILL_DMG: '共鸣技能伤害', RESONANCE_LIBERATION_DMG: '共鸣解放伤害',
}

var SKILL_TYPE_LABELS = {
  '常态攻击': '普攻', '共鸣技能': '技能', '共鸣解放': '解放',
  '变奏技能': '变奏', '共鸣回路': '回路',
}

function getGrade(score) {
  if (score >= 210) return { grade: 'SSS', gradeClass: 'SSS' }
  if (score >= 195) return { grade: 'SS', gradeClass: 'SS' }
  if (score >= 175) return { grade: 'S', gradeClass: 'S' }
  if (score >= 150) return { grade: 'A', gradeClass: 'A' }
  if (score >= 120) return { grade: 'B', gradeClass: 'B' }
  return { grade: 'C', gradeClass: 'C' }
}

function getSkillTagClass(tag) {
  var map = {
    E: 'skill-e',
    Q: 'skill-q',
    '变奏': 'skill-intro',
  }
  return map[tag] || 'skill-other'
}

Page({
  data: {
    loadouts: [],
    filtered: [],
    charOptions: [],
    filterCharIdx: 0,

    // 编辑
    editingId: null,
    editName: '',

    // 替换弹窗
    replaceSlot: null,
    replaceLoadoutId: null,
    replaceCost: 0,
    replaceSonataOptions: [],
    replaceSonataIdx: 0,
    replaceEchoes: [],
  },

  _charBaseMap: {},  // characterName → base data
  _calcMap: {},      // characterName → weights
  _weaponMap: {},    // weaponType → weapons[]

  onShow() {
    this.loadCharData()
    this.loadLoadouts()
  },

  /** 加载角色数据（从全局或缓存） */
  loadCharData() {
    var app = getApp()
    if (app.globalData.selectedCharacter) {
      var c = app.globalData.selectedCharacter
      this._charBaseMap[c.name] = c.base
      this._calcMap[c.name] = c.weights
    }
  },

  /** 加载套装列表 */
  loadLoadouts() {
    try {
      var loadouts = wx.getStorageSync('loadouts') || []

      // 构建角色筛选选项
      var charNameMap = {}
      loadouts.forEach(function (l) { charNameMap[l.characterName] = true })
      var charNames = Object.keys(charNameMap).sort()
      var charOptions = [{ key: 'all', label: '全部角色 (' + loadouts.length + ')' }]
      charNames.forEach(function (n) {
        var count = loadouts.filter(function (l) { return l.characterName === n }).length
        charOptions.push({ key: n, label: n + ' (' + count + ')' })
      })

      // 格式化套装
      var formatted = loadouts.map(function (l) { return this.formatLoadout(l) }, this)

      this.setData({ loadouts: formatted, charOptions })
      this.applyFilter()
    } catch (e) {
      console.error('加载套装失败:', e)
    }
  },

  /** 格式化单个套装 */
  formatLoadout(l) {
    var gradeInfo = getGrade(l.score)
    var hasDamageData = l.characterName in this._charBaseMap

    return Object.assign({}, l, {
      _scoreDisplay: l.score.toFixed(2),
      _grade: gradeInfo.grade,
      _gradeClass: gradeInfo.gradeClass,
      _hasDamageData: hasDamageData,
      _showDamage: false,
      _chainLevel: 0,
      _hasChainEffects: false,
      _skillTypes: [],
      _skillTypeLabels: SKILL_TYPE_LABELS,
      _activeSkillTypes: {},
      _activeSkillTypeCount: 0,
      _weaponNames: [],
      _weaponIndex: 0,
      _refine: 1,
      _damageResult: null,
      _filteredTotalDisplay: '',
      echoes: l.echoes.map(function (e) {
        return Object.assign({}, e, {
        _shortName: e.monsterName.length > 4 ? e.monsterName.substring(0, 4) + '..' : e.monsterName,
        _sonataName: SONATA_NAMES[e.sonata] || e.sonata || '',
        _mainLabel: e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : '',
        _subLabels: (e.substats || []).map(function (s) { return (STAT_DISPLAY[s.type] || s.type) + ' ' + s.value }),
        })
      }),
    })
  },

  /** 应用角色筛选 */
  applyFilter() {
    var loadouts = this.data.loadouts
    var filterCharIdx = this.data.filterCharIdx
    var charOptions = this.data.charOptions
    var key = (charOptions[filterCharIdx] && charOptions[filterCharIdx].key) || 'all'
    var filtered = key === 'all' ? loadouts : loadouts.filter(function (l) { return l.characterName === key })
    this.setData({ filtered })
  },

  onFilterCharChange(e) {
    this.setData({ filterCharIdx: parseInt(e.detail.value) })
    this.applyFilter()
  },

  // ====== 重命名 ======
  onStartEdit(e) {
    this.setData({ editingId: e.currentTarget.dataset.id, editName: e.currentTarget.dataset.name })
  },

  onEditNameInput(e) {
    this.setData({ editName: e.detail.value })
  },

  onEditConfirm(e) {
    var id = e.currentTarget.dataset.id
    var name = this.data.editName.trim()
    if (name) {
      try {
        var loadouts = wx.getStorageSync('loadouts') || []
        var idx = loadouts.findIndex(function (l) { return l.id === id })
        if (idx >= 0) {
          loadouts[idx].name = name
          wx.setStorageSync('loadouts', loadouts)
        }
      } catch (e) {}
    }
    this.setData({ editingId: null })
    this.loadLoadouts()
  },

  // ====== 删除 ======
  onDeleteLoadout(e) {
    var self = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认', content: '删除该套装？',
      success: function (res) {
        if (res.confirm) {
          try {
            var loadouts = wx.getStorageSync('loadouts') || []
            wx.setStorageSync('loadouts', loadouts.filter(function (l) { return l.id !== id }))
            self.loadLoadouts()
          } catch (e) {}
        }
      }
    })
  },

  // ====== 伤害计算 ======
  toggleDamage(e) {
    var id = e.currentTarget.dataset.id
    var idx = this.data.filtered.findIndex(function (l) { return l.id === id })
    if (idx < 0) return

    var loadout = this.data.filtered[idx]
    var showDamage = !loadout._showDamage

    if (showDamage && !loadout._damageResult) {
      // 首次展开，计算伤害
      this.calcDamageForLoadout(idx)
    }

    var patch = {}
    patch['filtered[' + idx + ']._showDamage'] = showDamage
    this.setData(patch)
  },

  calcDamageForLoadout(idx) {
    var loadout = this.data.filtered[idx]
    var charBase = this._charBaseMap[loadout.characterName]
    if (!charBase) return

    // 提取技能类型
    var skillTypeSet = new Set()
    if (charBase.skills) {
      charBase.skills.forEach(function (s) { if (s.skillType) skillTypeSet.add(s.skillType) })
    }
    var skillTypes = Array.from(skillTypeSet)

    // 模拟伤害结果 (TODO: 接入真实 calcDamage)
    var mockSkills = (charBase.skills || []).slice(0, 5).map(function (s) { return {
      name: s.name,
      tag: s.tag || 'E',
      tagClass: getSkillTagClass(s.tag || 'E'),
      skillType: s.skillType || '',
      multiplierStr: (s.multipliers && s.multipliers[9]) || '100%',
      _expectedDisplay: '—',
      _critDisplay: '—',
    } })

    var damageResult = {
      panel: { atk: 0, critRate: 0, critDmg: 0, elemDmg: 0, energyRegen: 0 },
      _critRateDisplay: '0%',
      _critDmgDisplay: '0%',
      _elemDmgDisplay: '0%',
      _energyDisplay: '0%',
      _filteredSkills: mockSkills,
    }

    var patch = {}
    patch['filtered[' + idx + ']._damageResult'] = damageResult
    patch['filtered[' + idx + ']._hasChainEffects'] = (charBase.chainEffects || []).length > 0
    patch['filtered[' + idx + ']._skillTypes'] = skillTypes
    patch['filtered[' + idx + ']._filteredTotalDisplay'] = '—'
    this.setData(patch)
  },

  setChainLevel(e) {
    var id = e.currentTarget.dataset.id
    var level = e.currentTarget.dataset.level
    var idx = this.data.filtered.findIndex(function (l) { return l.id === id })
    if (idx >= 0) {
      var patch = {}
      patch['filtered[' + idx + ']._chainLevel'] = level
      this.setData(patch)
    }
  },

  toggleSkillType(e) {
    var id = e.currentTarget.dataset.id
    var type = e.currentTarget.dataset.type
    var idx = this.data.filtered.findIndex(function (l) { return l.id === id })
    if (idx < 0) return
    var active = Object.assign({}, this.data.filtered[idx]._activeSkillTypes)
    if (active[type]) delete active[type]; else active[type] = true
    var patch = {}
    patch['filtered[' + idx + ']._activeSkillTypes'] = active
    patch['filtered[' + idx + ']._activeSkillTypeCount'] = Object.keys(active).length
    this.setData(patch)
  },

  clearSkillTypes(e) {
    var targetId = e.currentTarget.dataset.id
    var idx = this.data.filtered.findIndex(function (l) { return l.id === targetId })
    if (idx >= 0) {
      var patch = {}
      patch['filtered[' + idx + ']._activeSkillTypes'] = {}
      patch['filtered[' + idx + ']._activeSkillTypeCount'] = 0
      this.setData(patch)
    }
  },

  onWeaponChange(e) {
    var targetId = e.currentTarget.dataset.id
    var idx = this.data.filtered.findIndex(function (l) { return l.id === targetId })
    if (idx >= 0) {
      var patch = {}
      patch['filtered[' + idx + ']._weaponIndex'] = parseInt(e.detail.value)
      this.setData(patch)
    }
  },

  setRefine(e) {
    var id = e.currentTarget.dataset.id
    var refine = e.currentTarget.dataset.refine
    var idx = this.data.filtered.findIndex(function (l) { return l.id === id })
    if (idx >= 0) {
      var patch = {}
      patch['filtered[' + idx + ']._refine'] = refine
      this.setData(patch)
    }
  },

  // ====== 替换声骸 ======
  onStartReplace(e) {
    var loadoutId = e.currentTarget.dataset.loadoutId
    var slot = e.currentTarget.dataset.slot
    var loadout = this.data.filtered.find(function (l) { return l.id === loadoutId })
    if (!loadout) return

    var cost = loadout.echoes[slot].cost
    var echoes = wx.getStorageSync('echoes') || []
    var candidates = echoes.filter(function (e) { return e.cost === cost }).map(function (e) { return Object.assign({}, e, {
      _sonataName: SONATA_NAMES[e.sonata] || e.sonata || '',
      _mainLabel: e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : '',
      _subLabels: (e.substats || []).map(function (s) { return (STAT_DISPLAY[s.type] || s.type) + ' ' + s.value }),
      _score: '',
    }) })

    // 构建套装筛选选项
    var sonataOptions = [{ key: '', label: '全部套装' }]
    Object.keys(SONATA_NAMES).forEach(function (k) {
      sonataOptions.push({ key: k, label: SONATA_NAMES[k] })
    })

    this.setData({
      replaceSlot: slot,
      replaceLoadoutId: loadoutId,
      replaceCost: cost,
      replaceSonataOptions: sonataOptions,
      replaceSonataIdx: 0,
      replaceEchoes: candidates,
    })
  },

  onReplaceSonataChange(e) {
    var idx = parseInt(e.detail.value)
    var key = (this.data.replaceSonataOptions[idx] && this.data.replaceSonataOptions[idx].key) || ''
    var echoes = wx.getStorageSync('echoes') || []
    var replaceCost = this.data.replaceCost
    var candidates = echoes.filter(function (e) { return e.cost === replaceCost })
    if (key) candidates = candidates.filter(function (e) { return e.sonata === key })

    candidates = candidates.map(function (e) { return Object.assign({}, e, {
      _sonataName: SONATA_NAMES[e.sonata] || e.sonata || '',
      _mainLabel: e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : '',
      _subLabels: (e.substats || []).map(function (s) { return (STAT_DISPLAY[s.type] || s.type) + ' ' + s.value }),
    }) })

    this.setData({ replaceSonataIdx: idx, replaceEchoes: candidates })
  },

  onPickEcho(e) {
    var echoIdx = e.currentTarget.dataset.index
    var echo = this.data.replaceEchoes[echoIdx]
    if (!echo) return

    var replaceLoadoutId = this.data.replaceLoadoutId
    var replaceSlot = this.data.replaceSlot

    try {
      var loadouts = wx.getStorageSync('loadouts') || []
      var idx = loadouts.findIndex(function (l) { return l.id === replaceLoadoutId })
      if (idx >= 0) {
        loadouts[idx].echoes[replaceSlot] = echo
        // TODO: 重新计算评分
        wx.setStorageSync('loadouts', loadouts)
      }
    } catch (e) {}

    this.setData({ replaceSlot: null, replaceLoadoutId: null })
    this.loadLoadouts()
    wx.showToast({ title: '已替换', icon: 'success' })
  },

  onCloseReplace() {
    this.setData({ replaceSlot: null, replaceLoadoutId: null })
  },
})
