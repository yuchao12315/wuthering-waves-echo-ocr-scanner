// services/data-service.js
// 本地静态数据优先，Storage/内存缓存加速；云函数仅作为可选兜底。

var CHARACTER_BASE = require('../data/characters-base.js')
var CHARACTER_WEIGHTS = require('../data/character-weights.js')
var WEAPONS = require('../data/weapons.js')

var CACHE_TTL = 7 * 24 * 3600 * 1000

var app = getApp()
var characterBaseMap = CHARACTER_BASE
var characterWeightsMap = CHARACTER_WEIGHTS
var weapons = WEAPONS

function readFreshStorage(key) {
  try {
    var cached = wx.getStorageSync(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data
  } catch (e) {}
  return null
}

function writeStorage(key, data) {
  try {
    wx.setStorageSync(key, { data, timestamp: Date.now() })
  } catch (e) {}
}

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

  var cached = readFreshStorage('characterList')
  if (cached) {
    app.globalData.characterList = cached
    return Promise.resolve(cached)
  }

  var localList = buildCharacterList()
  if (localList.length > 0) {
    app.globalData.characterList = localList
    writeStorage('characterList', localList)
    return Promise.resolve(localList)
  }

  return callCloudFunction('getCharacterList').then(function (data) {
    app.globalData.characterList = data
    writeStorage('characterList', data)
    return data
  })
}

function getCharacterDetail(name) {
  if (!name) return Promise.reject(new Error('缺少角色名称'))

  if (app.globalData.characterCache && app.globalData.characterCache[name]) {
    return Promise.resolve(app.globalData.characterCache[name])
  }

  var cacheKey = 'char_' + name
  var cached = readFreshStorage(cacheKey)
  if (cached) {
    if (!app.globalData.characterCache) app.globalData.characterCache = {}
    app.globalData.characterCache[name] = cached
    return Promise.resolve(cached)
  }

  try {
    var detail = buildCharacterDetail(name)
    if (!app.globalData.characterCache) app.globalData.characterCache = {}
    app.globalData.characterCache[name] = detail
    writeStorage(cacheKey, detail)
    return Promise.resolve(detail)
  } catch (e) {
    return callCloudFunction('getCharacterDetail', { name: name }).then(function (data) {
      if (!app.globalData.characterCache) app.globalData.characterCache = {}
      app.globalData.characterCache[name] = data
      writeStorage(cacheKey, data)
      return data
    })
  }
}

function getWeapons(weaponType) {
  var cacheKey = weaponType ? 'weapons_' + weaponType : 'weapons_all'

  if (app.globalData.weaponsCache && app.globalData.weaponsCache[cacheKey]) {
    return Promise.resolve(app.globalData.weaponsCache[cacheKey])
  }

  var cached = readFreshStorage(cacheKey)
  if (cached) {
    if (!app.globalData.weaponsCache) app.globalData.weaponsCache = {}
    app.globalData.weaponsCache[cacheKey] = cached
    return Promise.resolve(cached)
  }

  var localWeapons = weaponType ? weapons.filter(function (w) { return w.type === weaponType }) : weapons
  if (localWeapons.length > 0) {
    if (!app.globalData.weaponsCache) app.globalData.weaponsCache = {}
    app.globalData.weaponsCache[cacheKey] = localWeapons
    writeStorage(cacheKey, localWeapons)
    return Promise.resolve(localWeapons)
  }

  return callCloudFunction('getWeapons', weaponType ? { type: weaponType } : {}).then(function (data) {
    if (!app.globalData.weaponsCache) app.globalData.weaponsCache = {}
    app.globalData.weaponsCache[cacheKey] = data
    writeStorage(cacheKey, data)
    return data
  })
}

module.exports = {
  getCharacterList: getCharacterList,
  getCharacterDetail: getCharacterDetail,
  getWeapons: getWeapons,
}
