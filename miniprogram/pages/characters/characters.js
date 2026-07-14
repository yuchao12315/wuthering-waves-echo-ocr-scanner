// pages/characters/characters.js
const CHARACTER_BASE = require('../../data/characters-base.js')
const CHARACTER_WEIGHTS = require('../../data/character-weights.js')

const CACHE_TTL = 7 * 24 * 3600 * 1000

function buildCharacterList() {
  return Object.keys(CHARACTER_BASE)
    .map(name => {
      const base = CHARACTER_BASE[name]
      const weights = CHARACTER_WEIGHTS[name]
      return {
        name,
        element: base.element,
        weaponType: base.weaponType,
        hasWeights: !!weights,
      }
    })
    .filter(char => char.element && char.weaponType && char.hasWeights)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
}

function getCharacterList() {
  return Promise.resolve(buildCharacterList())
}

function getCharacterDetail(name) {
  if (!name) return Promise.reject(new Error('缺少角色名称'))

  const app = getApp()
  if (app.globalData.characterCache && app.globalData.characterCache[name]) {
    return Promise.resolve(app.globalData.characterCache[name])
  }

  try {
    const cacheKey = 'char_' + name
    const cached = wx.getStorageSync(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (!app.globalData.characterCache) app.globalData.characterCache = {}
      app.globalData.characterCache[name] = cached.data
      return Promise.resolve(cached.data)
    }
  } catch (e) {}

  const base = CHARACTER_BASE[name]
  const weights = CHARACTER_WEIGHTS[name]
  if (!base || !weights) return Promise.reject(new Error('缺少角色数据'))

  const detail = {
    name,
    element: base.element,
    weaponType: base.weaponType,
    base,
    weights,
  }

  if (!app.globalData.characterCache) app.globalData.characterCache = {}
  app.globalData.characterCache[name] = detail

  try {
    wx.setStorageSync('char_' + name, { data: detail, timestamp: Date.now() })
  } catch (e) {}

  return Promise.resolve(detail)
}

// 词条类型中文映射
const STAT_CN = {
  'ATK_PCT': '攻击%', 'FLAT_ATK': '攻击', 'CRIT_RATE': '暴击率', 'CRIT_DMG': '暴击伤害',
  'ENERGY_REGEN': '共鸣效率', 'ELEM_DMG': '属性伤害', 'HP_PCT': '生命%', 'FLAT_HP': '生命',
  'NORMAL_ATK_DMG': '普攻', 'HEAVY_ATK_DMG': '重击',
  'RESONANCE_SKILL_DMG': '技能', 'RESONANCE_LIBERATION_DMG': '解放',
}

// 元素 → 英文CSS class
const ELEM_CLASS_MAP = {
  '热熔': 'tag-elem-fire',
  '导电': 'tag-elem-electric',
  '气动': 'tag-elem-wind',
  '冷凝': 'tag-elem-ice',
  '湮灭': 'tag-elem-dark',
  '衍射': 'tag-elem-light',
}

Page({
  data: {
    characterList: [],   // 完整角色列表（含权重信息）
    filtered: [],        // 搜索过滤后的列表
    selectedChar: '',    // 当前选中角色名
    search: '',
    loading: true,
  },

  onLoad() {
    this.loadCharacters()
  },

  onShow() {
    const app = getApp()
    const selected = app.globalData.selectedCharacter
    if (selected && selected.name) {
      this.setData({ selectedChar: selected.name })
    }
  },

  /** 从云端加载角色列表 */
  async loadCharacters() {
    try {
      const list = await getCharacterList()

      // 合并权重摘要信息
      const characterList = list.map(char => {
        // 尝试从本地缓存获取权重数据
        let topSubs = []
        let gradeSummary = null

        const cached = wx.getStorageSync(`char_${char.name}`)
        if (cached && cached.data && cached.data.weights) {
          const subProps = cached.data.weights.sub_props || {}
          topSubs = Object.entries(subProps)
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([name, weight]) => ({
              name,
              cn: STAT_CN[name] || name,
              weight: weight.toFixed(2),
            }))

          const grade = cached.data.weights.grade
          if (grade) {
            gradeSummary = {
              s: (grade.valid_s || []).map(s => STAT_CN[s] || s).join('/'),
              a: (grade.valid_a || []).map(s => STAT_CN[s] || s).join('/'),
            }
          }
        }

        return { ...char, topSubs, gradeSummary, elemClass: ELEM_CLASS_MAP[char.element] || '' }
      })

      this.setData({
        characterList,
        filtered: characterList,
        loading: false,
      })

      // 自动加载第一个角色的详情
      if (characterList.length > 0) {
        this.preloadCharacter(characterList[0].name)
      }
    } catch (e) {
      console.error('加载角色列表失败:', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  /** 预加载角色详情到缓存 */
  async preloadCharacter(name) {
    try {
      await getCharacterDetail(name)
    } catch (e) {
      console.warn(`预加载 ${name} 失败:`, e)
    }
  },

  /** 搜索输入 */
  onSearchInput(e) {
    const search = e.detail.value.trim()
    const filtered = search
      ? this.data.characterList.filter(c =>
          c.name.includes(search) || c.weaponType.includes(search) || c.element.includes(search)
        )
      : this.data.characterList

    this.setData({ search, filtered })
  },

  /** 选择角色 */
  async onSelectChar(e) {
    const name = e.currentTarget.dataset.name
    this.setData({ selectedChar: name })

    // 加载角色详情
    wx.showLoading({ title: '加载中...' })
    try {
      const detail = await getCharacterDetail(name)
      wx.hideLoading()

      // 存入全局供其他页面使用
      const app = getApp()
      app.globalData.selectedCharacter = detail

      // 更新该角色的权重摘要
      this.refreshCharSummary(name, detail)

      wx.showToast({ title: `已选择 ${name}`, icon: 'none', duration: 1000 })
      wx.switchTab({ url: '/pages/calculator/calculator' })
    } catch (e) {
      wx.hideLoading()
      console.error(`加载 ${name} 失败:`, e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  /** 刷新角色的权重摘要显示 */
  refreshCharSummary(name, detail) {
    if (!detail || !detail.weights) return

    const subProps = detail.weights.sub_props || {}
    const topSubs = Object.entries(subProps)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key, weight]) => ({
        name: key,
        cn: STAT_CN[key] || key,
        weight: weight.toFixed(2),
      }))

    const grade = detail.weights.grade
    const gradeSummary = grade ? {
      s: (grade.valid_s || []).map(s => STAT_CN[s] || s).join('/'),
      a: (grade.valid_a || []).map(s => STAT_CN[s] || s).join('/'),
    } : null

    // 更新列表中对应角色的数据
    const idx = this.data.characterList.findIndex(c => c.name === name)
    if (idx >= 0) {
      const key = `characterList[${idx}]`
      this.setData({
        [`${key}.topSubs`]: topSubs,
        [`${key}.gradeSummary`]: gradeSummary,
      })
    }
  },
})
