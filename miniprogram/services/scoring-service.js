// Shared miniprogram scoring helpers used by loadout editing flows.

var nightmareBonuses = require('../data/nightmare-bonuses.js')

var STAT_TO_CN = {
  FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
  FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击', CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害加成', HEAL_BONUS: '治疗效果加成',
  NORMAL_ATK_DMG: '普攻伤害加成', HEAVY_ATK_DMG: '重击伤害加成',
  RESONANCE_SKILL_DMG: '共鸣技能伤害加成',
  RESONANCE_LIBERATION_DMG: '共鸣解放伤害加成',
}

var MAIN_STAT_VALUES = {
  1: { ATK_PCT: 18, HP_PCT: 22.8, DEF_PCT: 18, FLAT_HP: 2280 },
  3: { ATK_PCT: 30, HP_PCT: 30, DEF_PCT: 38, ELEM_DMG: 30, ENERGY_REGEN: 32, FLAT_ATK: 100 },
  4: { ATK_PCT: 33, HP_PCT: 33, DEF_PCT: 41.5, CRIT_RATE: 22, CRIT_DMG: 44, HEAL_BONUS: 26.4, FLAT_ATK: 150 },
}

var SEC_STAT_VALUES = {
  1: { FLAT_HP: 2280 },
  3: { FLAT_ATK: 100 },
  4: { FLAT_ATK: 150 },
}

var MAX_SUB_VALUES = {
  CRIT_RATE: 10.5, CRIT_DMG: 21,
  ATK_PCT: 11.6, HP_PCT: 11.6, DEF_PCT: 14.7,
  FLAT_ATK: 60, FLAT_HP: 580, FLAT_DEF: 70,
  ENERGY_REGEN: 12.4,
  NORMAL_ATK_DMG: 11.6, HEAVY_ATK_DMG: 11.6,
  RESONANCE_SKILL_DMG: 11.6, RESONANCE_LIBERATION_DMG: 11.6,
}

var SKILL_INDEX = {
  '普攻伤害加成': 0,
  '重击伤害加成': 1,
  '共鸣技能伤害加成': 2,
  '共鸣解放伤害加成': 3,
}

var NIGHTMARE_SECOND_STAT = {
  resonanceSkillDmg: '共鸣技能伤害加成',
  resonanceLiberationDmg: '共鸣解放伤害加成',
  normalAtkDmg: '普攻伤害加成',
  heavyAtkDmg: '重击伤害加成',
}

function costToIndex(cost) {
  if (cost === 1) return 0
  if (cost === 3) return 1
  return 2
}

function getSubWeight(statType, calc) {
  var key = STAT_TO_CN[statType]
  if (!key) return 0
  if (calc.sub_props[key] != null) return calc.sub_props[key]
  var skillIndex = SKILL_INDEX[key]
  if (skillIndex == null) return 0
  return (calc.sub_props['技能伤害加成'] || 0) * ((calc.skill_weight || [])[skillIndex] || 0)
}

function getMainWeight(statType, cost, calc) {
  var key = STAT_TO_CN[statType]
  var mainProps = calc.main_props[String(cost)] || {}
  return key ? (mainProps[key] || 0) : 0
}

function scoreEcho(echo, calc) {
  if (!echo || !calc) return 0
  var scoreMax = (calc.score_max || [])[costToIndex(echo.cost)] || 0
  if (!scoreMax) return 0
  var raw = 0

  if (echo.mainStat) {
    var fixed = (MAIN_STAT_VALUES[echo.cost] || {})[echo.mainStat.type]
    raw += (fixed == null ? echo.mainStat.value : fixed) * getMainWeight(echo.mainStat.type, echo.cost, calc)
  }
  if (echo.secondaryStat) {
    raw += echo.secondaryStat.value * getMainWeight(echo.secondaryStat.type, echo.cost, calc)
  }
  ;(echo.substats || []).forEach(function (stat) {
    if (stat && typeof stat.value === 'number') raw += stat.value * getSubWeight(stat.type, calc)
  })

  var bonus = echo.nightmareBonus || nightmareBonuses.getNightmareBonus(echo.monsterName)
  if (bonus) {
    if (bonus.elemDmg && bonus.elemType) {
      raw += bonus.elemDmg * 100 * (calc.sub_props[bonus.elemType + '伤害加成'] || 0)
    }
    var secondKey = NIGHTMARE_SECOND_STAT[bonus.secondType]
    if (secondKey && bonus.secondValue > 0) {
      raw += bonus.secondValue * 100 * (calc.sub_props[secondKey] || 0)
    }
  }

  var score = raw / scoreMax * 50
  return isNaN(score) ? 0 : Math.round(score * 10000) / 10000
}

function roundScore(value) {
  return Math.round((value || 0) * 10000) / 10000
}

function scoreEchoDetailed(echo, calc) {
  if (!echo || !calc) return { total: 0, scoreMax: 0, details: [] }
  var scoreMax = (calc.score_max || [])[costToIndex(echo.cost)] || 0
  if (!scoreMax) return { total: 0, scoreMax: 0, details: [] }
  var details = []

  function addDetail(field, stat, valueForScore, maxValue, weight) {
    if (!stat || typeof stat.value !== 'number') return
    var score = roundScore(valueForScore * weight / scoreMax * 50)
    var maxScore = roundScore(maxValue * weight / scoreMax * 50)
    details.push({
      scoreKey: field + '-' + stat.type + '-' + stat.value,
      field: field,
      label: STAT_TO_CN[stat.type] || stat.type,
      valueDisplay: String(stat.value),
      score: score,
      scoreDisplay: score.toFixed(2),
      maxDisplay: maxScore.toFixed(2),
    })
  }

  if (echo.mainStat) {
    var mainFixed = (MAIN_STAT_VALUES[echo.cost] || {})[echo.mainStat.type]
    addDetail('主词条', echo.mainStat, mainFixed == null ? echo.mainStat.value : mainFixed, mainFixed == null ? echo.mainStat.value : mainFixed, getMainWeight(echo.mainStat.type, echo.cost, calc))
  }
  if (echo.secondaryStat) {
    var secondaryMax = (SEC_STAT_VALUES[echo.cost] || {})[echo.secondaryStat.type]
    addDetail('副属性', echo.secondaryStat, echo.secondaryStat.value, secondaryMax == null ? echo.secondaryStat.value : secondaryMax, getMainWeight(echo.secondaryStat.type, echo.cost, calc))
  }
  ;(echo.substats || []).forEach(function (stat) {
    addDetail('副词条', stat, stat.value, MAX_SUB_VALUES[stat.type] || stat.value, getSubWeight(stat.type, calc))
  })

  return {
    total: roundScore(details.reduce(function (sum, detail) { return sum + detail.score }, 0)),
    scoreMax: scoreMax,
    details: details,
  }
}

function scoreLoadout(echoes, calc) {
  return (echoes || []).reduce(function (sum, echo) { return sum + scoreEcho(echo, calc) }, 0)
}

module.exports = {
  scoreEcho: scoreEcho,
  scoreEchoDetailed: scoreEchoDetailed,
  scoreLoadout: scoreLoadout,
}
