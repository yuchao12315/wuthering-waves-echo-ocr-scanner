// services/ad-quota-service.js
// 本地广告配额管理。正式发布前把 AD_UNIT_ID 替换为真实激励视频广告位 ID。

const STORAGE_KEY = 'adQuota'
const AD_UNIT_ID = ''

const DAILY_CALCULATE_FREE = 3
const REWARD_CALCULATE_COUNT = 5
const REWARD_ADVANCED_THRESHOLD_COUNT = 1
const UNLIMITED_QUOTA = 9999

let rewardedVideoAd = null
let loadingReward = false

function todayKey() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function defaultQuota() {
  return {
    date: todayKey(),
    calculateLeft: isAdQuotaEnabled() ? DAILY_CALCULATE_FREE : UNLIMITED_QUOTA,
    advancedThresholdLeft: isAdQuotaEnabled() ? 0 : UNLIMITED_QUOTA,
  }
}

function isAdQuotaEnabled() {
  return !!AD_UNIT_ID
}

function normalizeQuota(raw) {
  const fresh = defaultQuota()
  if (!raw || raw.date !== fresh.date) return fresh
  return {
    ...fresh,
    ...raw,
    calculateLeft: Math.max(0, Number(raw.calculateLeft) || 0),
    advancedThresholdLeft: Math.max(0, Number(raw.advancedThresholdLeft) || 0),
  }
}

function getQuota() {
  try {
    return normalizeQuota(wx.getStorageSync(STORAGE_KEY))
  } catch (e) {
    return defaultQuota()
  }
}

function saveQuota(quota) {
  const normalized = normalizeQuota(quota)
  try {
    wx.setStorageSync(STORAGE_KEY, normalized)
  } catch (e) {}
  return normalized
}

function getQuotaSummary() {
  if (!isAdQuotaEnabled()) {
    return {
      ...defaultQuota(),
      unlimited: true,
    }
  }
  return {
    ...getQuota(),
    unlimited: false,
  }
}

function useCalculateQuota() {
  if (!isAdQuotaEnabled()) return { ok: true, quota: getQuotaSummary() }

  const quota = getQuota()
  if (quota.calculateLeft <= 0) return { ok: false, quota }
  quota.calculateLeft -= 1
  return { ok: true, quota: saveQuota(quota) }
}

function useAdvancedThresholdQuota() {
  if (!isAdQuotaEnabled()) return { ok: true, quota: getQuotaSummary() }

  const quota = getQuota()
  if (quota.advancedThresholdLeft <= 0) return { ok: false, quota }
  quota.advancedThresholdLeft -= 1
  return { ok: true, quota: saveQuota(quota) }
}

function addCalculateReward() {
  const quota = getQuota()
  quota.calculateLeft += REWARD_CALCULATE_COUNT
  return saveQuota(quota)
}

function addAdvancedThresholdReward() {
  const quota = getQuota()
  quota.advancedThresholdLeft += REWARD_ADVANCED_THRESHOLD_COUNT
  return saveQuota(quota)
}

function refundAdvancedThresholdQuota() {
  if (!isAdQuotaEnabled()) return getQuotaSummary()

  const quota = getQuota()
  quota.advancedThresholdLeft += 1
  return saveQuota(quota)
}

function showConfirm(title, content) {
  return new Promise(resolve => {
    wx.showModal({
      title,
      content,
      confirmText: '看视频',
      cancelText: '取消',
      success: res => resolve(!!res.confirm),
      fail: () => resolve(false),
    })
  })
}

function getRewardedVideoAd() {
  if (!AD_UNIT_ID || !wx.createRewardedVideoAd) return null
  if (!rewardedVideoAd) {
    rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: AD_UNIT_ID })
    rewardedVideoAd.onError(err => {
      console.warn('激励视频广告错误:', err)
    })
  }
  return rewardedVideoAd
}

function showRewardedVideo() {
  const ad = getRewardedVideoAd()

  if (!ad) {
    console.warn('未配置激励视频广告位 ID，开发环境直接发放广告奖励')
    return Promise.resolve(true)
  }

  if (loadingReward) return Promise.resolve(false)
  loadingReward = true

  return new Promise(resolve => {
    let settled = false
    const finish = ok => {
      if (settled) return
      settled = true
      loadingReward = false
      ad.offClose(onClose)
      resolve(ok)
    }
    const onClose = res => {
      finish(!!(res && res.isEnded))
    }

    ad.onClose(onClose)
    ad.show().catch(() => ad.load().then(() => ad.show())).catch(() => finish(false))
  })
}

async function unlockCalculateByAd() {
  if (!isAdQuotaEnabled()) return { ok: true, quota: getQuotaSummary() }

  const confirmed = await showConfirm('计算次数已用完', `看完视频可解锁 ${REWARD_CALCULATE_COUNT} 次基础计算。`)
  if (!confirmed) return { ok: false, quota: getQuota() }

  wx.showLoading({ title: '加载广告...' })
  const completed = await showRewardedVideo()
  wx.hideLoading()

  if (!completed) {
    wx.showToast({ title: '完整观看后才可解锁', icon: 'none' })
    return { ok: false, quota: getQuota() }
  }

  const quota = addCalculateReward()
  wx.showToast({ title: `已解锁 ${REWARD_CALCULATE_COUNT} 次`, icon: 'none' })
  return { ok: true, quota }
}

async function unlockAdvancedThresholdByAd() {
  if (!isAdQuotaEnabled()) return { ok: true, quota: getQuotaSummary() }

  const confirmed = await showConfirm('高级筛选需解锁', '自定义暴击率/共鸣效率阈值每次看视频解锁 1 次使用。')
  if (!confirmed) return { ok: false, quota: getQuota() }

  wx.showLoading({ title: '加载广告...' })
  const completed = await showRewardedVideo()
  wx.hideLoading()

  if (!completed) {
    wx.showToast({ title: '完整观看后才可解锁', icon: 'none' })
    return { ok: false, quota: getQuota() }
  }

  const quota = addAdvancedThresholdReward()
  wx.showToast({ title: '已解锁高级筛选 1 次', icon: 'none' })
  return { ok: true, quota }
}

export {
  isAdQuotaEnabled,
  getQuotaSummary,
  useCalculateQuota,
  useAdvancedThresholdQuota,
  refundAdvancedThresholdQuota,
  unlockCalculateByAd,
  unlockAdvancedThresholdByAd,
}
