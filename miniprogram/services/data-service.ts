// services/data-service.ts
// 本地静态数据优先，Storage/内存缓存加速；云函数仅作为可选兜底。

import CHARACTER_BASE from '../data/characters-base.json'
import CHARACTER_WEIGHTS from '../data/character-weights.json'
import WEAPONS from '../data/weapons.json'

const CACHE_TTL = 7 * 24 * 3600 * 1000

const app = getApp()
const characterBaseMap = CHARACTER_BASE as Record<string, any>
const characterWeightsMap = CHARACTER_WEIGHTS as Record<string, any>
const weapons = WEAPONS as any[]

function readFreshStorage(key: string) {
  try {
    const cached = wx.getStorageSync(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data
  } catch (e) {}
  return null
}

function writeStorage(key: string, data: any) {
  try {
    wx.setStorageSync(key, { data, timestamp: Date.now() })
  } catch (e) {}
}

function canUseCloud() {
  return !!(wx.cloud && typeof wx.cloud.callFunction === 'function')
}

function callCloudFunction(name: string, data?: Record<string, any>) {
  if (!canUseCloud()) return Promise.reject(new Error('未启用云开发'))
  return wx.cloud.callFunction({ name, data: data || {} }).then(res => {
    if (res.result && res.result.code === 0) return res.result.data
    throw new Error((res.result && res.result.msg) || `${name} 调用失败`)
  })
}

function buildCharacterList() {
  return Object.entries(characterBaseMap)
    .map(([name, base]) => {
      const weight = characterWeightsMap[name]
      return {
        name,
        element: base.element,
        weaponType: base.weaponType,
        hasWeights: !!weight,
      }
    })
    .filter(char => char.element && char.weaponType && char.hasWeights)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
}

function buildCharacterDetail(name: string) {
  const base = characterBaseMap[name]
  const weights = characterWeightsMap[name]
  if (!base) throw new Error(`缺少角色基础数据: ${name}`)
  if (!weights) throw new Error(`缺少角色权重数据: ${name}`)

  return {
    name,
    element: base.element,
    weaponType: base.weaponType,
    base,
    weights,
  }
}

/**
 * 获取角色列表。
 * @returns {Promise<Array<{name, element, weaponType}>>}
 */
function getCharacterList() {
  if (app.globalData.characterList) {
    return Promise.resolve(app.globalData.characterList)
  }

  const cached = readFreshStorage('characterList')
  if (cached) {
    app.globalData.characterList = cached
    return Promise.resolve(cached)
  }

  const localList = buildCharacterList()
  if (localList.length > 0) {
    app.globalData.characterList = localList
    writeStorage('characterList', localList)
    return Promise.resolve(localList)
  }

  return callCloudFunction('getCharacterList').then(data => {
    app.globalData.characterList = data
    writeStorage('characterList', data)
    return data
  })
}

/**
 * 获取单个角色的完整数据（base + weights）。
 * @param {string} name 角色名
 * @returns {Promise<Object>} { name, element, weaponType, base, weights }
 */
function getCharacterDetail(name: string) {
  if (!name) return Promise.reject(new Error('缺少角色名称'))

  if (app.globalData.characterCache && app.globalData.characterCache[name]) {
    return Promise.resolve(app.globalData.characterCache[name])
  }

  const cacheKey = 'char_' + name
  const cached = readFreshStorage(cacheKey)
  if (cached) {
    if (!app.globalData.characterCache) app.globalData.characterCache = {}
    app.globalData.characterCache[name] = cached
    return Promise.resolve(cached)
  }

  try {
    const detail = buildCharacterDetail(name)
    if (!app.globalData.characterCache) app.globalData.characterCache = {}
    app.globalData.characterCache[name] = detail
    writeStorage(cacheKey, detail)
    return Promise.resolve(detail)
  } catch {
    return callCloudFunction('getCharacterDetail', { name }).then(data => {
      if (!app.globalData.characterCache) app.globalData.characterCache = {}
      app.globalData.characterCache[name] = data
      writeStorage(cacheKey, data)
      return data
    })
  }
}

/**
 * 获取武器列表（按类型过滤）。
 * @param {string} [weaponType] 武器类型，不传返回全部
 * @returns {Promise<Array>}
 */
function getWeapons(weaponType?: string) {
  const cacheKey = weaponType ? 'weapons_' + weaponType : 'weapons_all'

  if (app.globalData.weaponsCache && app.globalData.weaponsCache[cacheKey]) {
    return Promise.resolve(app.globalData.weaponsCache[cacheKey])
  }

  const cached = readFreshStorage(cacheKey)
  if (cached) {
    if (!app.globalData.weaponsCache) app.globalData.weaponsCache = {}
    app.globalData.weaponsCache[cacheKey] = cached
    return Promise.resolve(cached)
  }

  const localWeapons = weaponType ? weapons.filter(w => w.type === weaponType) : weapons
  if (localWeapons.length > 0) {
    if (!app.globalData.weaponsCache) app.globalData.weaponsCache = {}
    app.globalData.weaponsCache[cacheKey] = localWeapons
    writeStorage(cacheKey, localWeapons)
    return Promise.resolve(localWeapons)
  }

  return callCloudFunction('getWeapons', weaponType ? { type: weaponType } : {}).then(data => {
    if (!app.globalData.weaponsCache) app.globalData.weaponsCache = {}
    app.globalData.weaponsCache[cacheKey] = data
    writeStorage(cacheKey, data)
    return data
  })
}

export { getCharacterList, getCharacterDetail, getWeapons }
