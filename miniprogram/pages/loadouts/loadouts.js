// pages/loadouts/loadouts.js
const SONATA_EFFECTS = require('../../data/sonata-effects.json')

const SONATA_NAMES = {}
for (const [key, val] of Object.entries(SONATA_EFFECTS)) {
  SONATA_NAMES[key] = val.name
}

const STAT_DISPLAY = {
  FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
  FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害', HEAL_BONUS: '治疗加成',
  NORMAL_ATK_DMG: '普攻伤害', HEAVY_ATK_DMG: '重击伤害',
  RESONANCE_SKILL_DMG: '共鸣技能伤害', RESONANCE_LIBERATION_DMG: '共鸣解放伤害',
}

const SKILL_TYPE_LABELS = {
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
    const app = getApp()
    if (app.globalData.selectedCharacter) {
      const c = app.globalData.selectedCharacter
      this._charBaseMap[c.name] = c.base
      this._calcMap[c.name] = c.weights
    }
  },

  /** 加载套装列表 */
  loadLoadouts() {
    try {
      const loadouts = wx.getStorageSync('loadouts') || []

      // 构建角色筛选选项
      const charNames = [...new Set(loadouts.map(l => l.characterName))].sort()
      const charOptions = [{ key: 'all', label: `全部角色 (${loadouts.length})` }]
      for (const n of charNames) {
        const count = loadouts.filter(l => l.characterName === n).length
        charOptions.push({ key: n, label: `${n} (${count})` })
      }

      // 格式化套装
      const formatted = loadouts.map(l => this.formatLoadout(l))

      this.setData({ loadouts: formatted, charOptions })
      this.applyFilter()
    } catch (e) {
      console.error('加载套装失败:', e)
    }
  },

  /** 格式化单个套装 */
  formatLoadout(l) {
    const { grade, gradeClass } = getGrade(l.score)
    const hasDamageData = l.characterName in this._charBaseMap

    return {
      ...l,
      _scoreDisplay: l.score.toFixed(2),
      _grade: grade,
      _gradeClass: gradeClass,
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
      echoes: l.echoes.map(e => ({
        ...e,
        _shortName: e.monsterName.length > 4 ? e.monsterName.substring(0, 4) + '..' : e.monsterName,
        _sonataName: SONATA_NAMES[e.sonata] || e.sonata || '',
        _mainLabel: e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : '',
        _subLabels: (e.substats || []).map(s => `${STAT_DISPLAY[s.type] || s.type} ${s.value}`),
      })),
    }
  },

  /** 应用角色筛选 */
  applyFilter() {
    const { loadouts, filterCharIdx, charOptions } = this.data
    const key = charOptions[filterCharIdx]?.key || 'all'
    const filtered = key === 'all' ? loadouts : loadouts.filter(l => l.characterName === key)
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
    const id = e.currentTarget.dataset.id
    const name = this.data.editName.trim()
    if (name) {
      try {
        const loadouts = wx.getStorageSync('loadouts') || []
        const idx = loadouts.findIndex(l => l.id === id)
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
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认', content: '删除该套装？',
      success: (res) => {
        if (res.confirm) {
          try {
            const loadouts = wx.getStorageSync('loadouts') || []
            wx.setStorageSync('loadouts', loadouts.filter(l => l.id !== id))
            this.loadLoadouts()
          } catch (e) {}
        }
      }
    })
  },

  // ====== 伤害计算 ======
  toggleDamage(e) {
    const id = e.currentTarget.dataset.id
    const idx = this.data.filtered.findIndex(l => l.id === id)
    if (idx < 0) return

    const loadout = this.data.filtered[idx]
    const showDamage = !loadout._showDamage

    if (showDamage && !loadout._damageResult) {
      // 首次展开，计算伤害
      this.calcDamageForLoadout(idx)
    }

    this.setData({ [`filtered[${idx}]._showDamage`]: showDamage })
  },

  calcDamageForLoadout(idx) {
    const loadout = this.data.filtered[idx]
    const charBase = this._charBaseMap[loadout.characterName]
    if (!charBase) return

    // 提取技能类型
    const skillTypeSet = new Set()
    if (charBase.skills) {
      charBase.skills.forEach(s => { if (s.skillType) skillTypeSet.add(s.skillType) })
    }
    const skillTypes = Array.from(skillTypeSet)

    // 模拟伤害结果 (TODO: 接入真实 calcDamage)
    const mockSkills = (charBase.skills || []).slice(0, 5).map(s => ({
      name: s.name,
      tag: s.tag || 'E',
      skillType: s.skillType || '',
      multiplierStr: (s.multipliers && s.multipliers[9]) || '100%',
      _expectedDisplay: '—',
      _critDisplay: '—',
    }))

    const damageResult = {
      panel: { atk: 0, critRate: 0, critDmg: 0, elemDmg: 0, energyRegen: 0 },
      _critRateDisplay: '0%',
      _critDmgDisplay: '0%',
      _elemDmgDisplay: '0%',
      _energyDisplay: '0%',
      _filteredSkills: mockSkills,
    }

    this.setData({
      [`filtered[${idx}]._damageResult`]: damageResult,
      [`filtered[${idx}]._hasChainEffects`]: (charBase.chainEffects || []).length > 0,
      [`filtered[${idx}]._skillTypes`]: skillTypes,
      [`filtered[${idx}]._filteredTotalDisplay`]: '—',
    })
  },

  setChainLevel(e) {
    const { id, level } = e.currentTarget.dataset
    const idx = this.data.filtered.findIndex(l => l.id === id)
    if (idx >= 0) this.setData({ [`filtered[${idx}]._chainLevel`]: level })
  },

  toggleSkillType(e) {
    const { id, type } = e.currentTarget.dataset
    const idx = this.data.filtered.findIndex(l => l.id === id)
    if (idx < 0) return
    const active = { ...this.data.filtered[idx]._activeSkillTypes }
    if (active[type]) delete active[type]; else active[type] = true
    this.setData({
      [`filtered[${idx}]._activeSkillTypes`]: active,
      [`filtered[${idx}]._activeSkillTypeCount`]: Object.keys(active).length,
    })
  },

  clearSkillTypes(e) {
    const idx = this.data.filtered.findIndex(l => l.id === e.currentTarget.dataset.id)
    if (idx >= 0) {
      this.setData({
        [`filtered[${idx}]._activeSkillTypes`]: {},
        [`filtered[${idx}]._activeSkillTypeCount`]: 0,
      })
    }
  },

  onWeaponChange(e) {
    const idx = this.data.filtered.findIndex(l => l.id === e.currentTarget.dataset.id)
    if (idx >= 0) this.setData({ [`filtered[${idx}]._weaponIndex`]: parseInt(e.detail.value) })
  },

  setRefine(e) {
    const { id, refine } = e.currentTarget.dataset
    const idx = this.data.filtered.findIndex(l => l.id === id)
    if (idx >= 0) this.setData({ [`filtered[${idx}]._refine`]: refine })
  },

  // ====== 替换声骸 ======
  onStartReplace(e) {
    const { loadoutId, slot } = e.currentTarget.dataset
    const loadout = this.data.filtered.find(l => l.id === loadoutId)
    if (!loadout) return

    const cost = loadout.echoes[slot].cost
    const echoes = wx.getStorageSync('echoes') || []
    const candidates = echoes.filter(e => e.cost === cost).map(e => ({
      ...e,
      _sonataName: SONATA_NAMES[e.sonata] || e.sonata || '',
      _mainLabel: e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : '',
      _subLabels: (e.substats || []).map(s => `${STAT_DISPLAY[s.type] || s.type} ${s.value}`),
      _score: '',
    }))

    // 构建套装筛选选项
    const sonataOptions = [{ key: '', label: '全部套装' }]
    for (const [k, v] of Object.entries(SONATA_NAMES)) {
      sonataOptions.push({ key: k, label: v })
    }

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
    const idx = parseInt(e.detail.value)
    const key = this.data.replaceSonataOptions[idx]?.key || ''
    const echoes = wx.getStorageSync('echoes') || []
    let candidates = echoes.filter(e => e.cost === this.data.replaceCost)
    if (key) candidates = candidates.filter(e => e.sonata === key)

    candidates = candidates.map(e => ({
      ...e,
      _sonataName: SONATA_NAMES[e.sonata] || e.sonata || '',
      _mainLabel: e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : '',
      _subLabels: (e.substats || []).map(s => `${STAT_DISPLAY[s.type] || s.type} ${s.value}`),
    }))

    this.setData({ replaceSonataIdx: idx, replaceEchoes: candidates })
  },

  onPickEcho(e) {
    const echoIdx = e.currentTarget.dataset.index
    const echo = this.data.replaceEchoes[echoIdx]
    if (!echo) return

    const { replaceLoadoutId, replaceSlot } = this.data

    try {
      const loadouts = wx.getStorageSync('loadouts') || []
      const idx = loadouts.findIndex(l => l.id === replaceLoadoutId)
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
