// pages/echoes/echoes.js
const SONATA_EFFECTS = require('../../data/sonata-effects.json')
const { getNightmareBonus } = require('../../data/nightmare-bonuses')

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
for (const [key, val] of Object.entries(SONATA_EFFECTS)) {
  SONATA_NAMES[key] = val.name
}

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
    subStatLabels: ALL_SUBSTATS.map(s => STAT_DISPLAY[s] || s),
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
    }
    this.loadEchoes()
  },

  /** 初始化表单选项 */
  initForm() {
    const sonataKeys = Object.keys(SONATA_NAMES)
    const sonataNames = sonataKeys.map(k => SONATA_NAMES[k])
    const mainTypes = VALID_MAIN_STATS[4]
    const mainLabels = mainTypes.map(s => STAT_DISPLAY[s] || s)
    const subLabels = ALL_SUBSTATS.map(s => STAT_DISPLAY[s] || s)

    // 筛选套装选项
    const filterOptions = [{ key: '', label: '全部套装' }, { key: '__empty__', label: '未识别套装' }]
    for (const [k, v] of Object.entries(SONATA_NAMES)) {
      filterOptions.push({ key: k, label: v })
    }

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
    const formatted = echoes.map(e => ({
      ...e,
      _sonataName: SONATA_NAMES[e.sonata] || e.sonata || '',
      _mainLabel: e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : '',
      _secLabel: e.secondaryStat ? (STAT_DISPLAY[e.secondaryStat.type] || e.secondaryStat.type) : '',
      _subLabels: (e.substats || []).map(s => `${STAT_DISPLAY[s.type] || s.type} ${s.value}`),
      _nightmareLabel: this.formatNightmare(e.nightmareBonus),
      _score: this._calc ? this.calcScore(e).toFixed(2) : '',
    }))

    this.setData({ echoes: formatted })
    this.applyFilters()
  },

  /** 格式化梦魇显示 */
  formatNightmare(nm) {
    if (!nm) return ''
    let parts = []
    if (nm.elemType && nm.elemDmg) {
      parts.push(`${nm.elemType}伤害+${(nm.elemDmg * 100).toFixed(0)}%`)
    }
    if (nm.secondValue > 0) {
      const label = NM_SECOND_LABELS[nm.secondType] || nm.secondType
      parts.push(`${label}+${(nm.secondValue * 100).toFixed(0)}%`)
    }
    if (nm.requiredCharacters) {
      parts.push(`(限${nm.requiredCharacters.join('/')})`)
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
    const { echoes, filterSonataIdx, filterCost, filterHasMain, sortIdx, filterSonataOptions } = this.data
    let list = [...echoes]

    const sonataKey = filterSonataOptions[filterSonataIdx]?.key || ''
    if (sonataKey === '__empty__') {
      list = list.filter(e => !e.sonata)
    } else if (sonataKey) {
      list = list.filter(e => e.sonata === sonataKey)
    }

    if (filterCost > 0) {
      list = list.filter(e => e.cost === filterCost)
    }

    if (filterHasMain) {
      list = list.filter(e => e.mainStat != null)
    }

    if (sortIdx === 1 && this._calc) {
      list.sort((a, b) => parseFloat(b._score || 0) - parseFloat(a._score || 0))
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
    const mainLabels = mainTypes.map(s => STAT_DISPLAY[s] || s)
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
    const substats = [...this.data.substats]
    substats[idx] = { ...substats[idx], typeIdx }
    this.setData({ substats })
  },

  onSubValueInput(e) {
    const idx = e.currentTarget.dataset.idx
    const substats = [...this.data.substats]
    substats[idx] = { ...substats[idx], value: e.detail.value }
    this.setData({ substats })
  },

  addSub() {
    const substats = [...this.data.substats, { typeIdx: 0, value: '' }]
    this.setData({ substats })
  },

  removeSub(e) {
    const idx = e.currentTarget.dataset.idx
    const substats = this.data.substats.filter((_, i) => i !== idx)
    this.setData({ substats })
  },

  onSubmit() {
    const { monsterName, formCost, sonataKeys, sonataIndex, mainStatTypes, mainStatIndex,
            mainStatValue, secStatIndex, secStatValue, substats } = this.data

    const echo = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      substats: substats.map(s => ({
        type: ALL_SUBSTATS[s.typeIdx],
        value: parseFloat(s.value) || 0,
      })),
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
    wx.showModal({
      title: '确认', content: '删除该声骸？',
      success: (res) => {
        if (res.confirm) {
          try {
            const echoes = wx.getStorageSync('echoes') || []
            const filtered = echoes.filter(e => e.id !== id)
            wx.setStorageSync('echoes', filtered)
            this.loadEchoes()
          } catch (e) {}
        }
      }
    })
  },

  onImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: (res) => {
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
            this.setData({ importMsg: '文件中未找到声骸数据', importMsgType: 'warn' })
            return
          }

          const valid = echoList.filter(e => e.mainStat || (e.substats && e.substats.length > 0) || e.monsterName)
          const echoes = wx.getStorageSync('echoes') || []
          echoes.unshift(...valid)
          wx.setStorageSync('echoes', echoes)

          this.setData({
            importMsg: `成功导入 ${valid.length} 个声骸${valid.length < echoList.length ? ` (跳过${echoList.length - valid.length}个无效)` : ''}`,
            importMsgType: 'success',
          })
          this.loadEchoes()
        } catch (e) {
          this.setData({ importMsg: `导入失败: ${e.message || '文件格式错误'}`, importMsgType: 'error' })
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
    const filePath = `${wx.env.USER_DATA_PATH}/echoes.json`
    const fs = wx.getFileSystemManager()
    fs.writeFile({
      filePath,
      data: content,
      encoding: 'utf-8',
      success: () => {
        wx.shareFileMessage({
          filePath,
          fileName: 'echoes.json',
          success: () => {},
          fail: (e) => { wx.showToast({ title: '分享失败', icon: 'none' }) }
        })
      },
      fail: () => { wx.showToast({ title: '导出失败', icon: 'none' }) }
    })
  },

  onClearAll() {
    wx.showModal({
      title: '确认', content: `确定删除全部 ${this.data.echoes.length} 个声骸？`,
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('echoes', [])
          this.loadEchoes()
        }
      }
    })
  },
})
