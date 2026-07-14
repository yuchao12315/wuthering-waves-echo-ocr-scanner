// pages/echoes/echoes.js
var SONATA_EFFECTS = require('../../data/sonata-effects.js')
var NIGHTMARE = require('../../data/nightmare-bonuses.js')
var getNightmareBonus = NIGHTMARE.getNightmareBonus

const STAT_DISPLAY = {
  FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
  FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害', HEAL_BONUS: '治疗加成',
  NORMAL_ATK_DMG: '普攻伤害', HEAVY_ATK_DMG: '重击伤害',
  RESONANCE_SKILL_DMG: '共鸣技能伤害', RESONANCE_LIBERATION_DMG: '共鸣解放伤害',
}

const ALL_SUBSTATS = [
  'FLAT_ATK', 'ATK_PCT', 'FLAT_HP', 'HP_PCT', 'FLAT_DEF', 'DEF_PCT',
  'CRIT_RATE', 'CRIT_DMG', 'ENERGY_REGEN',
  'NORMAL_ATK_DMG', 'HEAVY_ATK_DMG', 'RESONANCE_SKILL_DMG', 'RESONANCE_LIBERATION_DMG',
]

const VALID_MAIN_STATS = {
  1: ['ATK_PCT', 'HP_PCT', 'FLAT_HP'],
  3: ['ATK_PCT', 'HP_PCT', 'DEF_PCT', 'ELEM_DMG', 'ENERGY_REGEN', 'FLAT_ATK'],
  4: ['ATK_PCT', 'HP_PCT', 'DEF_PCT', 'CRIT_RATE', 'CRIT_DMG', 'HEAL_BONUS', 'ELEM_DMG'],
}

const NM_SECOND_LABELS = {
  resonanceSkillDmg: '共鸣技能伤害', resonanceLiberationDmg: '共鸣解放伤害',
  normalAtkDmg: '普攻伤害', heavyAtkDmg: '重击伤害',
  phantomDmg: '声骸技能伤害', coordinatedDmg: '协同攻击伤害',
  aeroDmg: '气动伤害', energyRegen: '共鸣效率', critRate: '暴击率',
}

// 套装 key → 中文名
const SONATA_NAMES = {}
Object.keys(SONATA_EFFECTS).forEach(function(key) {
  SONATA_NAMES[key] = SONATA_EFFECTS[key].name
})

Page({
  data: {
    echoes: [],
    filteredEchoes: [],

    // 表单
    monsterName: '',
    formCost: 4,
    sonataNames: [],
    sonataKeys: [],
    sonataIndex: 0,
    mainStatLabels: [],
    mainStatTypes: [],
    mainStatIndex: 0,
    mainStatValue: '',
    subStatLabels: ALL_SUBSTATS.map(function(s) { return STAT_DISPLAY[s] || s }),
    secStatIndex: 0,
    secStatValue: '',
    substats: [],

    // 梦魇
    nightmareInfo: '',

    // 筛选
    filterSonataOptions: [],
    filterSonataIdx: 0,
    filterCost: 0,
    filterHasMain: false,
    sortIdx: 0,

    // 导入
    importMsg: '',
    importMsgType: '',
    selectedCharName: '',
    showCharacterPicker: false,
  },

  _calc: null,

  onLoad() {
    this.loadEchoes()
    this.initForm()
  },

  onShow() {
    const app = getApp()
    if (app.globalData.selectedCharacter && app.globalData.selectedCharacter.weights) {
      this._calc = app.globalData.selectedCharacter.weights
      this.setData({ selectedCharName: app.globalData.selectedCharacter.name })
    }
    this.loadEchoes()
  },

  openCharacterPicker() {
    this.setData({ showCharacterPicker: true })
  },

  closeCharacterPicker() {
    this.setData({ showCharacterPicker: false })
  },

  onCharacterPicked(e) {
    const detail = e.detail.character
    this._calc = detail.weights
    this.setData({
      selectedCharName: detail.name,
      showCharacterPicker: false,
    })
    this.loadEchoes()
  },

  /** 初始化表单选项 */
  initForm() {
    const sonataKeys = Object.keys(SONATA_NAMES)
    const sonataNames = sonataKeys.map(function(k) { return SONATA_NAMES[k] })
    const mainTypes = VALID_MAIN_STATS[4]
    const mainLabels = mainTypes.map(function(s) { return STAT_DISPLAY[s] || s })
    const subLabels = ALL_SUBSTATS.map(function(s) { return STAT_DISPLAY[s] || s })

    // 筛选套装选项
    const filterOptions = [{ key: '', label: '全部套装' }, { key: '__empty__', label: '未识别套装' }]
    Object.keys(SONATA_NAMES).forEach(function(k) {
      filterOptions.push({ key: k, label: SONATA_NAMES[k] })
    })

    this.setData({
      sonataKeys, sonataNames, sonataIndex: 0,
      mainStatLabels: mainLabels, mainStatTypes: mainTypes, mainStatIndex: 0,
      subStatLabels: subLabels,
      filterSonataOptions: filterOptions, filterSonataIdx: 0,
    })
  },

  /** 加载声骸 */
  loadEchoes() {
    try {
      const echoes = wx.getStorageSync('echoes') || []
      this.formatEchoes(echoes)
    } catch (e) {
      console.error('加载声骸失败:', e)
    }
  },

  /** 格式化声骸列表（添加显示用的辅助字段） */
  formatEchoes(echoes) {
    const self = this
    const formatted = echoes.map(function(e) {
      const item = Object.assign({}, e)
      item._sonataName = SONATA_NAMES[e.sonata] || e.sonata || ''
      item._mainLabel = e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : ''
      item._secLabel = e.secondaryStat ? (STAT_DISPLAY[e.secondaryStat.type] || e.secondaryStat.type) : ''
      item._subLabels = (e.substats || []).map(function(s) {
        return (STAT_DISPLAY[s.type] || s.type) + ' ' + s.value
      })
      item._nightmareLabel = self.formatNightmare(e.nightmareBonus)
      item._score = self._calc ? self.calcScore(e).toFixed(2) : ''
      return item
    })

    this.setData({ echoes: formatted })
    this.applyFilters()
  },

  /** 格式化梦魇显示 */
  formatNightmare(nm) {
    if (!nm) return ''
    const parts = []
    if (nm.elemType && nm.elemDmg) {
      parts.push(nm.elemType + '伤害+' + (nm.elemDmg * 100).toFixed(0) + '%')
    }
    if (nm.secondValue > 0) {
      const label = NM_SECOND_LABELS[nm.secondType] || nm.secondType
      parts.push(label + '+' + (nm.secondValue * 100).toFixed(0) + '%')
    }
    if (nm.requiredCharacters) {
      parts.push('(限' + nm.requiredCharacters.join('/') + ')')
    }
    return parts.join(' ')
  },

  /** 简单评分 */
  calcScore(echo) {
    // TODO: 使用 scoring.ts 的 scoreEcho
    return 20 + Math.random() * 25
  },

  /** 应用筛选和排序 */
  applyFilters() {
    const data = this.data
    const echoes = data.echoes
    const filterSonataIdx = data.filterSonataIdx
    const filterCost = data.filterCost
    const filterHasMain = data.filterHasMain
    const sortIdx = data.sortIdx
    const filterSonataOptions = data.filterSonataOptions
    let list = echoes.slice()

    const sonataOption = filterSonataOptions[filterSonataIdx]
    const sonataKey = sonataOption ? sonataOption.key : ''
    if (sonataKey === '__empty__') {
      list = list.filter(function(e) { return !e.sonata })
    } else if (sonataKey) {
      list = list.filter(function(e) { return e.sonata === sonataKey })
    }

    if (filterCost > 0) {
      list = list.filter(function(e) { return e.cost === filterCost })
    }

    if (filterHasMain) {
      list = list.filter(function(e) { return e.mainStat != null })
    }

    if (sortIdx === 1 && this._calc) {
      list.sort(function(a, b) { return parseFloat(b._score || 0) - parseFloat(a._score || 0) })
    }

    this.setData({ filteredEchoes: list })
  },

  // ====== 表单事件 ======

  onNameInput(e) {
    const monsterName = e.detail.value
    const nm = getNightmareBonus(monsterName)
    this.setData({
      monsterName,
      nightmareInfo: nm ? this.formatNightmare(nm) : '',
    })
  },

  setCost(e) {
    const cost = e.currentTarget.dataset.cost
    const mainTypes = VALID_MAIN_STATS[cost] || VALID_MAIN_STATS[4]
    const mainLabels = mainTypes.map(function(s) { return STAT_DISPLAY[s] || s })
    this.setData({ formCost: cost, mainStatTypes: mainTypes, mainStatLabels: mainLabels, mainStatIndex: 0 })
  },

  onSonataChange(e) {
    this.setData({ sonataIndex: parseInt(e.detail.value) })
  },

  onMainStatChange(e) {
    this.setData({ mainStatIndex: parseInt(e.detail.value) })
  },

  onMainValueInput(e) {
    this.setData({ mainStatValue: e.detail.value })
  },

  onSecStatChange(e) {
    this.setData({ secStatIndex: parseInt(e.detail.value) })
  },

  onSecValueInput(e) {
    this.setData({ secStatValue: e.detail.value })
  },

  onSubTypeChange(e) {
    const idx = e.currentTarget.dataset.idx
    const typeIdx = parseInt(e.detail.value)
    const substats = this.data.substats.slice()
    substats[idx] = Object.assign({}, substats[idx], { typeIdx: typeIdx })
    this.setData({ substats })
  },

  onSubValueInput(e) {
    const idx = e.currentTarget.dataset.idx
    const substats = this.data.substats.slice()
    substats[idx] = Object.assign({}, substats[idx], { value: e.detail.value })
    this.setData({ substats })
  },

  addSub() {
    const substats = this.data.substats.slice()
    substats.push({ typeIdx: 0, value: '' })
    this.setData({ substats })
  },

  removeSub(e) {
    const idx = e.currentTarget.dataset.idx
    const substats = this.data.substats.filter(function(_, i) { return i !== idx })
    this.setData({ substats })
  },

  onSubmit() {
    const data = this.data
    const monsterName = data.monsterName
    const formCost = data.formCost
    const sonataKeys = data.sonataKeys
    const sonataIndex = data.sonataIndex
    const mainStatTypes = data.mainStatTypes
    const mainStatIndex = data.mainStatIndex
    const mainStatValue = data.mainStatValue
    const secStatIndex = data.secStatIndex
    const secStatValue = data.secStatValue
    const substats = data.substats

    const echo = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      monsterId: 0,
      monsterName: monsterName || '未命名',
      cost: formCost,
      rarity: 5,
      level: 25,
      tuneLevel: 0,
      sonata: sonataKeys[sonataIndex] || '',
      mainStat: {
        type: mainStatTypes[mainStatIndex],
        value: parseFloat(mainStatValue) || 0,
      },
      secondaryStat: formCost >= 3
        ? { type: ALL_SUBSTATS[secStatIndex], value: parseFloat(secStatValue) || 0 }
        : null,
      substats: substats.map(function(s) {
        return {
          type: ALL_SUBSTATS[s.typeIdx],
          value: parseFloat(s.value) || 0,
        }
      }),
    }

    // 梦魇加成
    const nm = getNightmareBonus(monsterName)
    if (nm) echo.nightmareBonus = nm

    // 保存到 Storage
    try {
      const echoes = wx.getStorageSync('echoes') || []
      echoes.unshift(echo)
      wx.setStorageSync('echoes', echoes)

      this.setData({
        substats: [], mainStatValue: '', secStatValue: '', monsterName: '', nightmareInfo: '',
      })

      this.loadEchoes()
      wx.showToast({ title: '已添加', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // ====== 筛选事件 ======

  onFilterSonataChange(e) {
    this.setData({ filterSonataIdx: parseInt(e.detail.value) })
    this.applyFilters()
  },

  setFilterCost(e) {
    this.setData({ filterCost: e.currentTarget.dataset.cost })
    this.applyFilters()
  },

  toggleFilterMain() {
    this.setData({ filterHasMain: !this.data.filterHasMain })
    this.applyFilters()
  },

  onSortChange(e) {
    this.setData({ sortIdx: parseInt(e.detail.value) })
    this.applyFilters()
  },

  // ====== 操作 ======

  onRemoveEcho(e) {
    const id = e.currentTarget.dataset.id
    const self = this
    wx.showModal({
      title: '确认', content: '删除该声骸？',
      success: function(res) {
        if (res.confirm) {
          try {
            const echoes = wx.getStorageSync('echoes') || []
            const filtered = echoes.filter(function(e) { return e.id !== id })
            wx.setStorageSync('echoes', filtered)
            self.loadEchoes()
          } catch (e) {}
        }
      }
    })
  },

  onImport() {
    const self = this
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: function(res) {
        const filePath = res.tempFiles[0].path
        const fs = wx.getFileSystemManager()
        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          const data = JSON.parse(content)

          let echoList = []
          if (Array.isArray(data)) {
            echoList = data
          } else if (Array.isArray(data.echoes)) {
            echoList = data.echoes
          } else if (Array.isArray(data.scanned_echoes)) {
            echoList = data.scanned_echoes
          }

          if (echoList.length === 0) {
            self.setData({ importMsg: '文件中未找到声骸数据', importMsgType: 'warn' })
            return
          }

          const valid = echoList.filter(function(e) {
            return e.mainStat || (e.substats && e.substats.length > 0) || e.monsterName
          })
          const echoes = wx.getStorageSync('echoes') || []
          Array.prototype.unshift.apply(echoes, valid)
          wx.setStorageSync('echoes', echoes)

          const skipped = echoList.length - valid.length
          self.setData({
            importMsg: '成功导入 ' + valid.length + ' 个声骸' + (skipped > 0 ? ' (跳过' + skipped + '个无效)' : ''),
            importMsgType: 'success',
          })
          self.loadEchoes()
        } catch (e) {
          self.setData({ importMsg: '导入失败: ' + (e.message || '文件格式错误'), importMsgType: 'error' })
        }
      }
    })
  },

  onExport() {
    const echoes = wx.getStorageSync('echoes') || []
    if (echoes.length === 0) {
      wx.showToast({ title: '无声骸可导出', icon: 'none' })
      return
    }
    const content = JSON.stringify(echoes, null, 2)
    const filePath = wx.env.USER_DATA_PATH + '/echoes.json'
    const fs = wx.getFileSystemManager()
    fs.writeFile({
      filePath,
      data: content,
      encoding: 'utf-8',
      success: function() {
        wx.shareFileMessage({
          filePath,
          fileName: 'echoes.json',
          success: function() {},
          fail: function() { wx.showToast({ title: '分享失败', icon: 'none' }) }
        })
      },
      fail: function() { wx.showToast({ title: '导出失败', icon: 'none' }) }
    })
  },

  onClearAll() {
    const self = this
    wx.showModal({
      title: '确认', content: '确定删除全部 ' + this.data.echoes.length + ' 个声骸？',
      success: function(res) {
        if (res.confirm) {
          wx.setStorageSync('echoes', [])
          self.loadEchoes()
        }
      }
    })
  },
})
