// pages/loadouts/loadouts.js
var SONATA_EFFECTS = require('../../data/sonata-effects.js')
var CHARACTERS_BASE = require('../../data/characters-base.js')
var CHARACTER_WEIGHTS = require('../../data/character-weights.js')
var WEAPONS = require('../../data/weapons.js')
var damageEngine = require('../../services/damage.js')
var calcDamage = damageEngine.calcDamage
var selectKeySkills = damageEngine.selectKeySkills
var storageService = require('../../services/storage-service.js')
var getStorage = storageService.getStorage
var setStorage = storageService.setStorage
var scoringService = require('../../services/scoring-service.js')
var scoreEcho = scoringService.scoreEcho
var scoreLoadout = scoringService.scoreLoadout

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

function formatPercent(value) {
  return (value * 100).toFixed(1) + '%'
}

function formatInteger(value) {
  return Math.round(value || 0).toLocaleString()
}

function formatSigned(value, digits, suffix) {
  var rounded = Number(value || 0).toFixed(digits)
  return (value > 0 ? '+' : '') + rounded + (suffix || '')
}

function clampNumber(value, min, max, fallback) {
  var number = Number(value)
  if (!isFinite(number)) return fallback
  return Math.max(min, Math.min(max, number))
}

function sanitizeEcho(echo) {
  return {
    id: echo.id,
    monsterId: echo.monsterId,
    monsterName: echo.monsterName,
    cost: echo.cost,
    rarity: echo.rarity,
    level: echo.level,
    tuneLevel: echo.tuneLevel,
    sonata: echo.sonata,
    mainStat: echo.mainStat,
    secondaryStat: echo.secondaryStat,
    substats: echo.substats,
    nightmareBonus: echo.nightmareBonus,
  }
}

Page({
  data: {
    loadouts: [],
    filtered: [],
    charOptions: [],
    filterCharIdx: 0,
    chainOptions: [0, 1, 2, 3, 4, 5, 6],
    refineOptions: [1, 2, 3, 4, 5],

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
    replacementPreview: null,
  },

  _charBaseMap: CHARACTERS_BASE,  // characterName → base data
  _calcMap: CHARACTER_WEIGHTS,      // characterName → weights
  _weaponMap: {},    // weaponType → weapons[]

  async onShow() {
    this.loadCharData()
    await this.loadLoadouts()
  },

  /** 加载角色数据（从全局或缓存） */
  loadCharData() {
    this._charBaseMap = CHARACTERS_BASE
    this._calcMap = CHARACTER_WEIGHTS
    this._weaponMap = {}
    for (var i = 0; i < WEAPONS.length; i++) {
      var weapon = WEAPONS[i]
      if (!this._weaponMap[weapon.type]) this._weaponMap[weapon.type] = []
      this._weaponMap[weapon.type].push(weapon)
    }

    var app = getApp()
    if (app.globalData.selectedCharacter) {
      var c = app.globalData.selectedCharacter
      this._charBaseMap[c.name] = c.base
      this._calcMap[c.name] = c.weights
    }
  },

  /** 加载套装列表 */
  async loadLoadouts() {
    try {
      var loadouts = await getStorage('loadouts', [])

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
    var charBase = this._charBaseMap[l.characterName]
    var weaponNames = charBase && this._weaponMap[charBase.weaponType]
      ? this._weaponMap[charBase.weaponType].map(function (w) { return w.name })
      : []
    var hasDamageData = !!(charBase && weaponNames.length > 0)

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
      _weaponNames: weaponNames,
      _weaponIndex: 0,
      _refine: 1,
      _skillLevel: 10,
      _charLevel: 90,
      _enemyLevel: 89,
      _enemyResist: 10,
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

  async onEditConfirm(e) {
    var id = e.currentTarget.dataset.id
    var name = this.data.editName.trim()
    if (name) {
      try {
        var loadouts = await getStorage('loadouts', [])
        var idx = loadouts.findIndex(function (l) { return l.id === id })
        if (idx >= 0) {
          loadouts[idx].name = name
          await setStorage('loadouts', loadouts)
        }
      } catch (e) {}
    }
    this.setData({ editingId: null })
    await this.loadLoadouts()
  },

  // ====== 删除 ======
  onDeleteLoadout(e) {
    var self = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认', content: '删除该套装？',
      success: async function (res) {
        if (res.confirm) {
          try {
            var loadouts = await getStorage('loadouts', [])
            await setStorage('loadouts', loadouts.filter(function (l) { return l.id !== id }))
            await self.loadLoadouts()
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

  calculateDamage(loadout) {
    var charBase = this._charBaseMap[loadout.characterName]
    if (!charBase || !charBase.skills || charBase.skills.length === 0) return null
    var weapons = this._weaponMap[charBase.weaponType] || []
    var weapon = weapons[loadout._weaponIndex] || weapons[0]
    if (!weapon) return null
    var result = calcDamage(
      charBase, weapon, loadout._refine || 1, loadout.echoes, -1,
      loadout._skillLevel || 10, loadout._charLevel || 90, loadout._enemyLevel || 89,
      (loadout._enemyResist == null ? 10 : loadout._enemyResist) / 100,
      loadout._chainLevel || 0, loadout.characterName
    )
    result.skills = result.skills.map(function (skill) {
      return Object.assign({}, skill, {
        tagClass: getSkillTagClass(skill.tag || 'E'),
        _expectedDisplay: formatInteger(skill.expected),
        _critDisplay: formatInteger(skill.crit),
      })
    })
    return result
  },

  buildDisplayDamageResult(loadout) {
    var result = this.calculateDamage(loadout)
    if (!result) return null
    var active = loadout._activeSkillTypes || {}
    var activeKeys = Object.keys(active).filter(function (key) { return active[key] })
    var typeFilteredSkills = activeKeys.length === 0 ? result.skills : result.skills.filter(function (skill) {
      return active[skill.skillType]
    })
    var filteredSkills = selectKeySkills(typeFilteredSkills)
    var filteredTotal = filteredSkills.reduce(function (sum, skill) { return sum + skill.expected }, 0)
    result._critRateDisplay = formatPercent(result.panel.critRate)
    result._critDmgDisplay = formatPercent(result.panel.critDmg)
    result._elemDmgDisplay = formatPercent(result.panel.elemDmg)
    result._energyDisplay = formatPercent(result.panel.energyRegen)
    result._filteredSkills = filteredSkills
    result._filteredTotal = filteredTotal
    result._filteredTotalDisplay = formatInteger(filteredTotal)
    return result
  },

  calcDamageForLoadout(idx) {
    var loadout = this.data.filtered[idx]
    var charBase = this._charBaseMap[loadout.characterName]
    if (!charBase) return

    var skillTypeSet = new Set()
    if (charBase.skills) {
      charBase.skills.forEach(function (s) { if (s.skillType) skillTypeSet.add(s.skillType) })
    }
    var skillTypes = Array.from(skillTypeSet)
    var damageResult = this.buildDisplayDamageResult(loadout)
    if (!damageResult) return

    var patch = {}
    patch['filtered[' + idx + ']._damageResult'] = damageResult
    patch['filtered[' + idx + ']._hasChainEffects'] = (charBase.chainEffects || []).length > 0
    patch['filtered[' + idx + ']._skillTypes'] = skillTypes
    patch['filtered[' + idx + ']._filteredTotalDisplay'] = damageResult._filteredTotalDisplay
    this.setData(patch)
  },

  setChainLevel(e) {
    var id = e.currentTarget.dataset.id
    var level = e.currentTarget.dataset.level
    var idx = this.data.filtered.findIndex(function (l) { return l.id === id })
    if (idx >= 0) {
      this.data.filtered[idx]._chainLevel = level
      var patch = {}
      patch['filtered[' + idx + ']._chainLevel'] = level
      this.setData(patch)
      this.calcDamageForLoadout(idx)
    }
  },

  toggleSkillType(e) {
    var id = e.currentTarget.dataset.id
    var type = e.currentTarget.dataset.type
    var idx = this.data.filtered.findIndex(function (l) { return l.id === id })
    if (idx < 0) return
    var active = Object.assign({}, this.data.filtered[idx]._activeSkillTypes)
    if (active[type]) delete active[type]; else active[type] = true
    this.data.filtered[idx]._activeSkillTypes = active
    this.data.filtered[idx]._activeSkillTypeCount = Object.keys(active).length
    var patch = {}
    patch['filtered[' + idx + ']._activeSkillTypes'] = active
    patch['filtered[' + idx + ']._activeSkillTypeCount'] = Object.keys(active).length
    this.setData(patch)
    this.calcDamageForLoadout(idx)
  },

  clearSkillTypes(e) {
    var targetId = e.currentTarget.dataset.id
    var idx = this.data.filtered.findIndex(function (l) { return l.id === targetId })
    if (idx >= 0) {
      this.data.filtered[idx]._activeSkillTypes = {}
      this.data.filtered[idx]._activeSkillTypeCount = 0
      var patch = {}
      patch['filtered[' + idx + ']._activeSkillTypes'] = {}
      patch['filtered[' + idx + ']._activeSkillTypeCount'] = 0
      this.setData(patch)
      this.calcDamageForLoadout(idx)
    }
  },

  onWeaponChange(e) {
    var targetId = e.currentTarget.dataset.id
    var idx = this.data.filtered.findIndex(function (l) { return l.id === targetId })
    if (idx >= 0) {
      this.data.filtered[idx]._weaponIndex = parseInt(e.detail.value)
      var patch = {}
      patch['filtered[' + idx + ']._weaponIndex'] = parseInt(e.detail.value)
      this.setData(patch)
      this.calcDamageForLoadout(idx)
    }
  },

  setRefine(e) {
    var id = e.currentTarget.dataset.id
    var refine = e.currentTarget.dataset.refine
    var idx = this.data.filtered.findIndex(function (l) { return l.id === id })
    if (idx >= 0) {
      this.data.filtered[idx]._refine = refine
      var patch = {}
      patch['filtered[' + idx + ']._refine'] = refine
      this.setData(patch)
      this.calcDamageForLoadout(idx)
    }
  },

  onDamageConditionInput(e) {
    var id = e.currentTarget.dataset.id
    var field = e.currentTarget.dataset.field
    var idx = this.data.filtered.findIndex(function (l) { return l.id === id })
    if (idx < 0) return
    var limits = {
      _skillLevel: [1, 10, 10], _charLevel: [1, 90, 90],
      _enemyLevel: [1, 120, 89], _enemyResist: [-100, 100, 10],
    }
    if (!limits[field]) return
    var rule = limits[field]
    var value = clampNumber(e.detail.value, rule[0], rule[1], rule[2])
    this.data.filtered[idx][field] = value
    var patch = {}
    patch['filtered[' + idx + '].' + field] = value
    this.setData(patch)
    this.calcDamageForLoadout(idx)
  },

  onShareReport(e) {
    var id = e.currentTarget.dataset.id
    var loadout = this.data.filtered.find(function (item) { return item.id === id })
    if (!loadout) return
    var result = loadout._damageResult || this.buildDisplayDamageResult(loadout)
    if (!result) return
    var ctx = wx.createCanvasContext('shareCanvas', this)
    var width = 750
    var height = 1050
    function text(value, x, y, size, color, bold) {
      ctx.setFillStyle(color || '#182033')
      ctx.setFontSize(size || 24)
      ctx.setTextAlign('left')
      ctx.fillText((bold ? '' : '') + String(value), x, y)
    }
    function short(value, max) {
      value = String(value || '')
      return value.length > max ? value.substring(0, max - 1) + '…' : value
    }
    ctx.setFillStyle('#f4f6fb'); ctx.fillRect(0, 0, width, height)
    ctx.setFillStyle('#ffffff'); ctx.fillRect(34, 34, width - 68, height - 68)
    text('鸣潮声骸搭配报告', 64, 92, 34, '#182033', true)
    text(short(loadout.name, 18), 64, 142, 28, '#2563eb', true)
    text(loadout.characterName + '  ·  总评分 ' + loadout._scoreDisplay + ' ' + loadout._grade, 64, 184, 23, '#475467')
    text('角色 Lv.' + loadout._charLevel + '  技能 Lv.' + loadout._skillLevel + '  敌人 Lv.' + loadout._enemyLevel + '  抗性 ' + loadout._enemyResist + '%', 64, 224, 21, '#667085')
    text('攻击 ' + result.panel.atk + '    暴击 ' + result._critRateDisplay + '    暴伤 ' + result._critDmgDisplay, 64, 278, 24)
    text('关键技能期望合计  ' + result._filteredTotalDisplay, 64, 326, 29, '#16794b', true)
    var y = 382
    loadout.echoes.forEach(function (echo, index) {
      ctx.setFillStyle('#f8fafc'); ctx.fillRect(64, y - 28, 622, 74)
      text('C' + echo.cost, 80, y, 21, '#2563eb', true)
      text(short(echo.monsterName, 8), 132, y, 22)
      text(short(echo._sonataName, 9), 350, y, 20, '#667085')
      text(short(echo._mainLabel + ' ' + (echo.mainStat ? echo.mainStat.value : ''), 14), 132, y + 29, 19, '#667085')
      y += 88
    })
    y += 12
    text('关键技能', 64, y, 25, '#182033', true); y += 42
    result._filteredSkills.slice(0, 5).forEach(function (skill) {
      text(short(skill.name, 18), 64, y, 21)
      text(skill._expectedDisplay, 510, y, 21, '#475467')
      text(skill._critDisplay, 615, y, 21, '#b54708')
      y += 38
    })
    text('计算值与游戏实测通常存在约 0%–2% 误差', 64, height - 76, 19, '#7a8499')
    var self = this
    ctx.draw(false, function () {
      wx.canvasToTempFilePath({ canvasId: 'shareCanvas', width: width, height: height, destWidth: 1500, destHeight: 2100, fileType: 'png', success: function (res) {
        if (wx.showShareImageMenu) wx.showShareImageMenu({ path: res.tempFilePath })
        else wx.previewImage({ urls: [res.tempFilePath] })
      }, fail: function () { wx.showToast({ title: '报告生成失败', icon: 'none' }) } }, self)
    })
  },

  // ====== 替换声骸 ======
  async onStartReplace(e) {
    var loadoutId = e.currentTarget.dataset.loadoutId
    var slot = e.currentTarget.dataset.slot
    var loadout = this.data.filtered.find(function (l) { return l.id === loadoutId })
    if (!loadout) return

    var cost = loadout.echoes[slot].cost
    var echoes = await getStorage('echoes', [])
    var calc = this._calcMap[loadout.characterName]
    var candidates = echoes.filter(function (e) { return e.cost === cost && e.id !== loadout.echoes[slot].id }).map(function (e) { return Object.assign({}, e, {
      _sonataName: SONATA_NAMES[e.sonata] || e.sonata || '',
      _mainLabel: e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : '',
      _subLabels: (e.substats || []).map(function (s) { return (STAT_DISPLAY[s.type] || s.type) + ' ' + s.value }),
      _score: calc ? scoreEcho(e, calc).toFixed(2) : '',
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
      replacementPreview: null,
    })
  },

  async onReplaceSonataChange(e) {
    var idx = parseInt(e.detail.value)
    var key = (this.data.replaceSonataOptions[idx] && this.data.replaceSonataOptions[idx].key) || ''
    var echoes = await getStorage('echoes', [])
    var replaceCost = this.data.replaceCost
    var loadout = this.data.filtered.find(function (item) { return item.id === this.data.replaceLoadoutId }, this)
    var calc = loadout && this._calcMap[loadout.characterName]
    var candidates = echoes.filter(function (e) { return e.cost === replaceCost })
    if (key) candidates = candidates.filter(function (e) { return e.sonata === key })
    if (loadout) candidates = candidates.filter(function (e) { return e.id !== loadout.echoes[this.data.replaceSlot].id }, this)

    candidates = candidates.map(function (e) { return Object.assign({}, e, {
      _sonataName: SONATA_NAMES[e.sonata] || e.sonata || '',
      _mainLabel: e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : '',
      _subLabels: (e.substats || []).map(function (s) { return (STAT_DISPLAY[s.type] || s.type) + ' ' + s.value }),
      _score: calc ? scoreEcho(e, calc).toFixed(2) : '',
    }) })

    this.setData({ replaceSonataIdx: idx, replaceEchoes: candidates, replacementPreview: null })
  },

  onPreviewReplacement(e) {
    var echoIdx = e.currentTarget.dataset.index
    var echo = this.data.replaceEchoes[echoIdx]
    if (!echo) return

    var replaceLoadoutId = this.data.replaceLoadoutId
    var replaceSlot = this.data.replaceSlot
    var loadout = this.data.filtered.find(function (item) { return item.id === replaceLoadoutId })
    var calc = loadout && this._calcMap[loadout.characterName]
    if (!loadout || !calc) return

    var nextEchoes = loadout.echoes.map(function (item, index) {
      return index === replaceSlot ? sanitizeEcho(echo) : sanitizeEcho(item)
    })
    var beforeScore = scoreLoadout(loadout.echoes, calc)
    var afterScore = scoreLoadout(nextEchoes, calc)
    var beforeDamage = this.buildDisplayDamageResult(loadout)
    var afterDamage = this.buildDisplayDamageResult(Object.assign({}, loadout, { echoes: nextEchoes }))
    var beforeTotal = beforeDamage ? beforeDamage._filteredTotal : 0
    var afterTotal = afterDamage ? afterDamage._filteredTotal : 0

    this.setData({
      replacementPreview: {
        candidateIndex: echoIdx,
        echo: echo,
        scoreAfter: afterScore,
        scoreBeforeDisplay: beforeScore.toFixed(2),
        scoreAfterDisplay: afterScore.toFixed(2),
        scoreDeltaDisplay: formatSigned(afterScore - beforeScore, 2),
        damageBeforeDisplay: formatInteger(beforeTotal),
        damageAfterDisplay: formatInteger(afterTotal),
        damageDeltaDisplay: formatSigned(beforeTotal ? (afterTotal - beforeTotal) / beforeTotal * 100 : 0, 2, '%'),
        critRateDeltaDisplay: formatSigned(((afterDamage ? afterDamage.panel.critRate : 0) - (beforeDamage ? beforeDamage.panel.critRate : 0)) * 100, 1, '%'),
        critDmgDeltaDisplay: formatSigned(((afterDamage ? afterDamage.panel.critDmg : 0) - (beforeDamage ? beforeDamage.panel.critDmg : 0)) * 100, 1, '%'),
        energyDeltaDisplay: formatSigned(((afterDamage ? afterDamage.panel.energyRegen : 0) - (beforeDamage ? beforeDamage.panel.energyRegen : 0)) * 100, 1, '%'),
      },
    })
  },

  async onConfirmReplacement() {
    var preview = this.data.replacementPreview
    if (!preview) return

    var replaceLoadoutId = this.data.replaceLoadoutId
    var replaceSlot = this.data.replaceSlot

    try {
      var loadouts = await getStorage('loadouts', [])
      var idx = loadouts.findIndex(function (l) { return l.id === replaceLoadoutId })
      if (idx >= 0) {
        loadouts[idx].echoes[replaceSlot] = sanitizeEcho(preview.echo)
        loadouts[idx].score = preview.scoreAfter
        await setStorage('loadouts', loadouts)
      }
    } catch (e) {
      wx.showToast({ title: '替换失败', icon: 'none' })
      return
    }

    this.setData({ replaceSlot: null, replaceLoadoutId: null, replacementPreview: null })
    await this.loadLoadouts()
    wx.showToast({ title: '已替换', icon: 'success' })
  },

  onCloseReplace() {
    this.setData({ replaceSlot: null, replaceLoadoutId: null, replacementPreview: null })
  },
})
