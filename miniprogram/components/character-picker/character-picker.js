// components/character-picker/character-picker.js
var CHARACTER_BASE = require('../../data/characters-base.js')
var CHARACTER_WEIGHTS = require('../../data/character-weights.js')

var ELEM_CLASS_MAP = {
  '热熔': 'elem-fire',
  '导电': 'elem-electric',
  '气动': 'elem-wind',
  '冷凝': 'elem-ice',
  '湮灭': 'elem-dark',
  '衍射': 'elem-light',
}

function buildCharacterList() {
  return Object.keys(CHARACTER_BASE)
    .map(function (name) {
      var base = CHARACTER_BASE[name]
      var weights = CHARACTER_WEIGHTS[name]
      return {
        name: name,
        element: base.element,
        weaponType: base.weaponType,
        elemClass: ELEM_CLASS_MAP[base.element] || '',
        hasWeights: !!weights,
      }
    })
    .filter(function (char) { return char.element && char.weaponType && char.hasWeights })
    .sort(function (a, b) { return a.name.localeCompare(b.name, 'zh-Hans-CN') })
}

function buildCharacterDetail(name) {
  var base = CHARACTER_BASE[name]
  var weights = CHARACTER_WEIGHTS[name]
  if (!base || !weights) return null
  return {
    name: name,
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
      var characters = buildCharacterList()
      this.setData({ characters: characters, filtered: characters })
    },
  },

  methods: {
    noop() {},

    onSearchInput(e) {
      var search = e.detail.value.trim()
      var filtered = search
        ? this.data.characters.filter(function (c) {
            return c.name.includes(search) || c.weaponType.includes(search) || c.element.includes(search)
          })
        : this.data.characters

      this.setData({ search: search, filtered: filtered })
    },

    onClose() {
      this.triggerEvent('close')
    },

    onMaskTap() {
      this.triggerEvent('close')
    },

    onSelect(e) {
      var name = e.currentTarget.dataset.name
      var detail = buildCharacterDetail(name)
      if (!detail) {
        wx.showToast({ title: '角色数据缺失', icon: 'none' })
        return
      }

      var app = getApp()
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
