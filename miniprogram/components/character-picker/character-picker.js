// components/character-picker/character-picker.js
const CHARACTER_BASE = require('../../data/characters-base.js')
const CHARACTER_WEIGHTS = require('../../data/character-weights.js')

const ELEM_CLASS_MAP = {
  '热熔': 'elem-fire',
  '导电': 'elem-electric',
  '气动': 'elem-wind',
  '冷凝': 'elem-ice',
  '湮灭': 'elem-dark',
  '衍射': 'elem-light',
}

function buildCharacterList() {
  return Object.keys(CHARACTER_BASE)
    .map(name => {
      const base = CHARACTER_BASE[name]
      const weights = CHARACTER_WEIGHTS[name]
      return {
        name,
        element: base.element,
        weaponType: base.weaponType,
        elemClass: ELEM_CLASS_MAP[base.element] || '',
        hasWeights: !!weights,
      }
    })
    .filter(char => char.element && char.weaponType && char.hasWeights)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
}

function buildCharacterDetail(name) {
  const base = CHARACTER_BASE[name]
  const weights = CHARACTER_WEIGHTS[name]
  if (!base || !weights) return null
  return {
    name,
    element: base.element,
    weaponType: base.weaponType,
    base,
    weights,
  }
}

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    selectedName: {
      type: String,
      value: '',
    },
  },

  data: {
    search: '',
    characters: [],
    filtered: [],
  },

  lifetimes: {
    attached() {
      const characters = buildCharacterList()
      this.setData({ characters, filtered: characters })
    },
  },

  methods: {
    noop() {},

    onSearchInput(e) {
      const search = e.detail.value.trim()
      const filtered = search
        ? this.data.characters.filter(c =>
            c.name.includes(search) || c.weaponType.includes(search) || c.element.includes(search)
          )
        : this.data.characters

      this.setData({ search, filtered })
    },

    onClose() {
      this.triggerEvent('close')
    },

    onMaskTap() {
      this.triggerEvent('close')
    },

    onSelect(e) {
      const name = e.currentTarget.dataset.name
      const detail = buildCharacterDetail(name)
      if (!detail) {
        wx.showToast({ title: '角色数据缺失', icon: 'none' })
        return
      }

      const app = getApp()
      app.globalData.selectedCharacter = detail
      if (!app.globalData.characterCache) app.globalData.characterCache = {}
      app.globalData.characterCache[name] = detail

      try {
        wx.setStorageSync('char_' + name, { data: detail, timestamp: Date.now() })
      } catch (err) {}

      this.triggerEvent('select', { character: detail })
    },
  },
})
