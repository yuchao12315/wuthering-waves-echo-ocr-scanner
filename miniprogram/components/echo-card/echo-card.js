// components/echo-card/echo-card.js
var SONATA_EFFECTS = require('../../data/sonata-effects.js')

var STAT_DISPLAY = {
  FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
  FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害', HEAL_BONUS: '治疗加成',
  NORMAL_ATK_DMG: '普攻伤害', HEAVY_ATK_DMG: '重击伤害',
  RESONANCE_SKILL_DMG: '共鸣技能伤害', RESONANCE_LIBERATION_DMG: '共鸣解放伤害',
}

var SONATA_NAMES = {}
Object.keys(SONATA_EFFECTS).forEach(function (key) {
  var val = SONATA_EFFECTS[key]
  SONATA_NAMES[key] = val.name
})

var NM_SECOND_LABELS = {
  resonanceSkillDmg: '共鸣技能伤害', resonanceLiberationDmg: '共鸣解放伤害',
  normalAtkDmg: '普攻伤害', heavyAtkDmg: '重击伤害',
  phantomDmg: '声骸技能伤害', coordinatedDmg: '协同攻击伤害',
  aeroDmg: '气动伤害', energyRegen: '共鸣效率', critRate: '暴击率',
}

function getGrade(score) {
  if (score >= 42) return { grade: 'SSS', gradeClass: 'g-sss' }
  if (score >= 39) return { grade: 'SS', gradeClass: 'g-ss' }
  if (score >= 35) return { grade: 'S', gradeClass: 'g-s' }
  if (score >= 30) return { grade: 'A', gradeClass: 'g-a' }
  if (score >= 24) return { grade: 'B', gradeClass: 'g-b' }
  return { grade: 'C', gradeClass: 'g-c' }
}

function formatNightmare(nm) {
  if (!nm) return ''
  var parts = []
  if (nm.elemType && nm.elemDmg) {
    parts.push(nm.elemType + '伤害+' + (nm.elemDmg * 100).toFixed(0) + '%')
  }
  if (nm.secondValue > 0) {
    var label = NM_SECOND_LABELS[nm.secondType] || nm.secondType
    parts.push(label + '+' + (nm.secondValue * 100).toFixed(0) + '%')
  }
  if (nm.requiredCharacters) {
    parts.push('(限' + nm.requiredCharacters.join('/') + ')')
  }
  return parts.join(' ')
}

Component({
  properties: {
    echo: { type: Object, value: {} },
    calc: { type: Object, value: null },  // CalcJson or null
    showScore: { type: Boolean, value: true },
  },

  observers: {
    'echo, calc, showScore': function (echo, calc, showScore) {
      if (!echo || !echo.cost) return

      var sonataName = SONATA_NAMES[echo.sonata] || echo.sonata || ''
      var mainLabel = echo.mainStat ? (STAT_DISPLAY[echo.mainStat.type] || echo.mainStat.type) : ''
      var secLabel = echo.secondaryStat ? (STAT_DISPLAY[echo.secondaryStat.type] || echo.secondaryStat.type) : ''
      var subLabels = (echo.substats || []).map(function (s) { return (STAT_DISPLAY[s.type] || s.type) + ' ' + s.value })
      var nightmareLabel = formatNightmare(echo.nightmareBonus)

      // 评分
      var score = null
      var scoreDisplay = ''
      var grade = ''
      var gradeClass = ''
      var detailed = false
      var details = []
      var scoreMaxDisplay = ''
      var totalDisplay = ''

      if (showScore && calc && echo.mainStat) {
        // TODO: 接入 scoring.ts 的 scoreEcho / scoreEchoDetailed
        // 目前用简单估算
        var estimated = 20 + Math.random() * 25
        score = estimated
        scoreDisplay = estimated.toFixed(2)
        var g = getGrade(estimated)
        grade = g.grade
        gradeClass = g.gradeClass
      }

      this.setData({
        sonataName: sonataName,
        mainLabel: mainLabel,
        secLabel: secLabel,
        subLabels: subLabels,
        nightmareLabel: nightmareLabel,
        score: score,
        scoreDisplay: scoreDisplay,
        grade: grade,
        gradeClass: gradeClass,
        detailed: detailed,
        details: details,
        scoreMaxDisplay: scoreMaxDisplay,
        totalDisplay: totalDisplay,
      })
    }
  },

  data: {
    sonataName: '',
    mainLabel: '',
    secLabel: '',
    subLabels: [],
    nightmareLabel: '',
    score: null,
    scoreDisplay: '',
    grade: '',
    gradeClass: '',
    detailed: false,
    details: [],
    scoreMaxDisplay: '',
    totalDisplay: '',
  },
})
