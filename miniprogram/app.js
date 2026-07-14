// app.js
App({
  onLaunch() {
    // 如需云函数兜底，可把 cloudEnvId 改成真实云开发环境 ID。
    if (wx.cloud && this.globalData.cloudEnvId) {
      wx.cloud.init({
        env: this.globalData.cloudEnvId,
        traceUser: true,
      })
    }
  },

  globalData: {
    cloudEnvId: '',
    selectedCharacter: null,    // 当前选中角色 { name, element, weaponType, base, weights }
    characterList: null,        // 角色列表缓存
    characterCache: {},         // 角色详情缓存 { name: detail }
    weaponsCache: {},           // 武器缓存 { cacheKey: weapons[] }
  }
})
