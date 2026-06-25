// app.js
App({
  onLaunch() {
    // 初始化云开发（替换为你的环境 ID）
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-env-id',  // TODO: 替换为实际云开发环境 ID
        traceUser: true,
      })
    }
  },

  globalData: {
    selectedCharacter: null,    // 当前选中角色 { name, element, weaponType, base, weights }
    characterList: null,        // 角色列表缓存
    characterCache: {},         // 角色详情缓存 { name: detail }
    weaponsCache: {},           // 武器缓存 { cacheKey: weapons[] }
  }
})
