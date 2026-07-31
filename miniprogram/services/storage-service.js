// services/storage-service.js
// Async storage with an in-memory read-through cache to avoid blocking the JS thread.

var cache = Object.create(null)
var loaded = Object.create(null)
var pendingReads = Object.create(null)

function readRaw(key) {
  if (loaded[key]) return Promise.resolve(cache[key])
  if (pendingReads[key]) return pendingReads[key]

  pendingReads[key] = new Promise(function (resolve) {
    wx.getStorage({
      key: key,
      success: function (res) {
        cache[key] = res.data
        loaded[key] = true
        resolve(res.data)
      },
      fail: function () {
        cache[key] = undefined
        loaded[key] = true
        resolve(undefined)
      },
      complete: function () {
        delete pendingReads[key]
      },
    })
  })
  return pendingReads[key]
}

function getStorage(key, fallback) {
  return readRaw(key).then(function (value) {
    return value === undefined ? fallback : value
  })
}

function setStorage(key, value) {
  cache[key] = value
  loaded[key] = true
  return new Promise(function (resolve, reject) {
    wx.setStorage({
      key: key,
      data: value,
      success: function () { resolve(value) },
      fail: reject,
    })
  })
}

function removeStorage(key) {
  delete cache[key]
  delete loaded[key]
  delete pendingReads[key]
  return new Promise(function (resolve, reject) {
    wx.removeStorage({
      key: key,
      success: resolve,
      fail: reject,
    })
  })
}

module.exports = {
  getStorage: getStorage,
  setStorage: setStorage,
  removeStorage: removeStorage,
}
