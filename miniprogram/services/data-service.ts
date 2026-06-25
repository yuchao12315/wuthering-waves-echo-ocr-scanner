// services/data-service.js
// 云端数据拉取 + 三级缓存（内存 → 本地Storage → 云函数）

const CACHE_TTL = 7 * 24 * 3600 * 1000 // 7天缓存有效期

const app = getApp()

/**
 * 获取角色列表（首次从云端拉取，之后用缓存）
 * @returns {Promise<Array<{name, element, weaponType}>>}
 */
function getCharacterList() {
  // 1. 内存缓存
  if (app.globalData.characterList) {
    return Promise.resolve(app.globalData.characterList)
  }

  // 2. 本地Storage缓存
  try {
    const cached = wx.getStorageSync('characterList')
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      app.globalData.characterList = cached.data
      return Promise.resolve(cached.data)
    }
  } catch (e) {}

  // 3. 云函数拉取
  return wx.cloud.callFunction({
    name: 'getCharacterList'
  }).then(res => {
    if (res.result && res.result.code === 0) {
      const data = res.result.data
      app.globalData.characterList = data

      // 写入本地缓存
      wx.setStorageSync('characterList', {
        data: data,
        timestamp: Date.now()
      })

      return data
    }
    throw new Error((res.result && res.result.msg) || '获取角色列表失败')
  })
}

/**
 * 获取单个角色的完整数据（base + weights）
 * @param {string} name 角色名
 * @returns {Promise<Object>} { name, element, weaponType, base, weights }
 */
function getCharacterDetail(name) {
  if (!name) return Promise.reject(new Error('缺少角色名称'))

  // 1. 内存缓存
  if (app.globalData.characterCache && app.globalData.characterCache[name]) {
    return Promise.resolve(app.globalData.characterCache[name])
  }

  // 2. 本地Storage缓存
  try {
    const cacheKey = 'char_' + name
    const cached = wx.getStorageSync(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (!app.globalData.characterCache) app.globalData.characterCache = {}
      app.globalData.characterCache[name] = cached.data
      return Promise.resolve(cached.data)
    }
  } catch (e) {}

  // 3. 云函数拉取
  return wx.cloud.callFunction({
    name: 'getCharacterDetail',
    data: { name: name }
  }).then(res => {
    if (res.result && res.result.code === 0) {
      const data = res.result.data
      if (!app.globalData.characterCache) app.globalData.characterCache = {}
      app.globalData.characterCache[name] = data

      wx.setStorageSync('char_' + name, {
        data: data,
        timestamp: Date.now()
      })

      return data
    }
    throw new Error((res.result && res.result.msg) || '获取角色 ' + name + ' 失败')
  })
}

/**
 * 获取武器列表（按类型过滤）
 * @param {string} [weaponType] 武器类型，不传返回全部
 * @returns {Promise<Array>}
 */
function getWeapons(weaponType) {
  const cacheKey = weaponType ? 'weapons_' + weaponType : 'weapons_all'

  // 1. 内存缓存
  if (app.globalData.weaponsCache && app.globalData.weaponsCache[cacheKey]) {
    return Promise.resolve(app.globalData.weaponsCache[cacheKey])
  }

  // 2. 本地Storage缓存
  try {
    const cached = wx.getStorageSync(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (!app.globalData.weaponsCache) app.globalData.weaponsCache = {}
      app.globalData.weaponsCache[cacheKey] = cached.data
      return Promise.resolve(cached.data)
    }
  } catch (e) {}

  // 3. 云函数拉取
  return wx.cloud.callFunction({
    name: 'getWeapons',
    data: weaponType ? { type: weaponType } : {}
  }).then(res => {
    if (res.result && res.result.code === 0) {
      const data = res.result.data
      if (!app.globalData.weaponsCache) app.globalData.weaponsCache = {}
      app.globalData.weaponsCache[cacheKey] = data

      wx.setStorageSync(cacheKey, {
        data: data,
        timestamp: Date.now()
      })

      return data
    }
    throw new Error('获取武器列表失败')
  })
}

export { getCharacterList, getCharacterDetail, getWeapons }
