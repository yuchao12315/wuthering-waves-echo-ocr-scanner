// components/echo-card/echo-card.js

const STAT_DISPLAY = {
  FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
  FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害', HEAL_BONUS: '治疗加成',
  NORMAL_ATK_DMG: '普攻伤害', HEAVY_ATK_DMG: '重击伤害',
  RESONANCE_SKILL_DMG: '共鸣技能伤害', RESONANCE_LIBERATION_DMG: '共鸣解放伤害',
}

const SONATA_EFFECTS = require('../../data/sonata-effects.json')
const SONATA_NAMES = {}
for (const [key, val] of Object.entries(SONATA_EFFECTS)) {
  SONATA_NAMES[key] = val.name
}

const NM_SECOND_LABELS = {
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
  let parts = []
  if (nm.elemType && nm.elemDmg) {
    parts.push(`${nm.elemType}伤害+${(nm.elemDmg * 100).toFixed(0)}%`)
  }
  if (nm.secondValue > 0) {
    const label = NM_SECOND_LABELS[nm.secondType] || nm.secondType
    parts.push(`${label}+${(nm.secondValue * 100).toFixed(0)}%`)
  }
  if (nm.requiredCharacters) {
    parts.push(`(限${nm.requiredCharacters.join('/')})`)
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

      const sonataName = SONATA_NAMES[echo.sonata] || echo.sonata || ''
      const mainLabel = echo.mainStat ? (STAT_DISPLAY[echo.mainStat.type] || echo.mainStat.type) : ''
      const secLabel = echo.secondaryStat ? (STAT_DISPLAY[echo.secondaryStat.type] || echo.secondaryStat.type) : ''
      const subLabels = (echo.substats || []).map(s => `${STAT_DISPLAY[s.type] || s.type} ${s.value}`)
      const nightmareLabel = formatNightmare(echo.nightmareBonus)

      // 评分
      let score = null
      let scoreDisplay = ''
      let grade = ''
      let gradeClass = ''
      let detailed = false
      let details = []
      let scoreMaxDisplay = ''
      let totalDisplay = ''

      if (showScore && calc && echo.mainStat) {
        // TODO: 接入 scoring.ts 的 scoreEcho / scoreEchoDetailed
        // 目前用简单估算
        const estimated = 20 + Math.random() * 25
        score = estimated
        scoreDisplay = estimated.toFixed(2)
        const g = getGrade(estimated)
        grade = g.grade
        gradeClass = g.gradeClass
      }

      this.setData({
        sonataName, mainLabel, secLabel, subLabels, nightmareLabel,
        score, scoreDisplay, grade, gradeClass,
        detailed, details, scoreMaxDisplay, totalDisplay,
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
