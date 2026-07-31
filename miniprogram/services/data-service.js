// services/data-service.js
// 本地静态数据优先，全局内存缓存加速；云函数仅作为可选兜底。

var CHARACTER_BASE = require('../data/characters-base.js')
var CHARACTER_WEIGHTS = require('../data/character-weights.js')
var WEAPONS = require('../data/weapons.js')

var app = getApp()
var characterBaseMap = CHARACTER_BASE
var characterWeightsMap = CHARACTER_WEIGHTS
var weapons = WEAPONS

function canUseCloud() {
  return !!(wx.cloud && typeof wx.cloud.callFunction === 'function')
}

function callCloudFunction(name, data) {
  if (!canUseCloud()) return Promise.reject(new Error('未启用云开发'))
  return wx.cloud.callFunction({ name: name, data: data || {} }).then(function (res) {
    if (res.result && res.result.code === 0) return res.result.data
    throw new Error((res.result && res.result.msg) || name + ' 调用失败')
  })
}

function buildCharacterList() {
  return Object.keys(characterBaseMap)
    .map(function (name) {
      var base = characterBaseMap[name]
      var weight = characterWeightsMap[name]
      return {
        name: name,
        element: base.element,
        weaponType: base.weaponType,
        hasWeights: !!weight,
      }
    })
    .filter(function (char) { return char.element && char.weaponType && char.hasWeights })
    .sort(function (a, b) { return a.name.localeCompare(b.name, 'zh-Hans-CN') })
}

function buildCharacterDetail(name) {
  var base = characterBaseMap[name]
  var weights = characterWeightsMap[name]
  if (!base) throw new Error('缺少角色基础数据: ' + name)
  if (!weights) throw new Error('缺少角色权重数据: ' + name)

  return {
    name: name,
    element: base.element,
    weaponType: base.weaponType,
    base: base,
    weights: weights,
  }
}

function getCharacterList() {
  if (app.globalData.characterList) {
    return Promise.resolve(app.globalData.characterList)
  }

  var localList = buildCharacterList()
  if (localList.length > 0) {
    app.globalData.characterList = localList
    return Promise.resolve(localList)
  }

  return callCloudFunction('getCharacterList').then(function (data) {
    app.globalData.characterList = data
    return data
  })
}

function getCharacterDetail(name) {
  if (!name) return Promise.reject(new Error('缺少角色名称'))

  if (app.globalData.characterCache && app.globalData.characterCache[name]) {
    return Promise.resolve(app.globalData.characterCache[name])
  }

  try {
    var detail = buildCharacterDetail(name)
    if (!app.globalData.characterCache) app.globalData.characterCache = {}
    app.globalData.characterCache[name] = detail
    return Promise.resolve(detail)
  } catch (e) {
    return callCloudFunction('getCharacterDetail', { name: name }).then(function (data) {
      if (!app.globalData.characterCache) app.globalData.characterCache = {}
      app.globalData.characterCache[name] = data
      return data
    })
  }
}

function getWeapons(weaponType) {
  var cacheKey = weaponType ? 'weapons_' + weaponType : 'weapons_all'

  if (app.globalData.weaponsCache && app.globalData.weaponsCache[cacheKey]) {
    return Promise.resolve(app.globalData.weaponsCache[cacheKey])
  }

  var localWeapons = weaponType ? weapons.filter(function (w) { return w.type === weaponType }) : weapons
  if (localWeapons.length > 0) {
    if (!app.globalData.weaponsCache) app.globalData.weaponsCache = {}
    app.globalData.weaponsCache[cacheKey] = localWeapons
    return Promise.resolve(localWeapons)
  }

  return callCloudFunction('getWeapons', weaponType ? { type: weaponType } : {}).then(function (data) {
    if (!app.globalData.weaponsCache) app.globalData.weaponsCache = {}
    app.globalData.weaponsCache[cacheKey] = data
    return data
  })
}

module.exports = {
  getCharacterList: getCharacterList,
  getCharacterDetail: getCharacterDetail,
  getWeapons: getWeapons,
}
