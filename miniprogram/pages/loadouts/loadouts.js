// pages/loadouts/loadouts.js
var SONATA_EFFECTS = require('../../data/sonata-effects.js')
var CHARACTERS_BASE = require('../../data/characters-base.js')
var CHARACTER_WEIGHTS = require('../../data/character-weights.js')
var WEAPONS = require('../../data/weapons.js')

var SONATA_NAMES = {}
Object.keys(SONATA_EFFECTS).forEach(function (key) {
  var val = SONATA_EFFECTS[key]
  SONATA_NAMES[key] = val.name
})

var STAT_DISPLAY = {
  FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
  FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害', HEAL_BONUS: '治疗加成',
  NORMAL_ATK_DMG: '普攻伤害', HEAVY_ATK_DMG: '重击伤害',
  RESONANCE_SKILL_DMG: '共鸣技能伤害', RESONANCE_LIBERATION_DMG: '共鸣解放伤害',
}

var SKILL_TYPE_LABELS = {
  '常态攻击': '普攻', '共鸣技能': '技能', '共鸣解放': '解放',
  '变奏技能': '变奏', '共鸣回路': '回路',
}

var SKILL_DMG_MAP = {
  NORMAL_ATK_DMG: 'normalAtk',
  HEAVY_ATK_DMG: 'heavyAtk',
  RESONANCE_SKILL_DMG: 'resonanceSkill',
  RESONANCE_LIBERATION_DMG: 'resonanceLiberation',
}

var SKILLTYPE_TO_DMG = {
  '常态攻击': 'normalAtk',
  '共鸣技能': 'resonanceSkill',
  '共鸣解放': 'resonanceLiberation',
  '共鸣回路': 'resonanceSkill',
}

var BUFF_TO_DMG_KEY = {
  normalAtkDmg: 'normalAtk',
  heavyAtkDmg: 'heavyAtk',
  resonanceSkillDmg: 'resonanceSkill',
  resonanceLiberationDmg: 'resonanceLiberation',
  phantomDmg: 'phantom',
}

function getGrade(score) {
  if (score >= 210) return { grade: 'SSS', gradeClass: 'SSS' }
  if (score >= 195) return { grade: 'SS', gradeClass: 'SS' }
  if (score >= 175) return { grade: 'S', gradeClass: 'S' }
  if (score >= 150) return { grade: 'A', gradeClass: 'A' }
  if (score >= 120) return { grade: 'B', gradeClass: 'B' }
  return { grade: 'C', gradeClass: 'C' }
}

function getSkillTagClass(tag) {
  var map = {
    E: 'skill-e',
    Q: 'skill-q',
    '变奏': 'skill-intro',
  }
  return map[tag] || 'skill-other'
}

function round5(value) {
  return Math.round(value * 100000) / 100000
}

function round9(value) {
  return Math.round(value * 1000000000) / 1000000000
}

function parseParamValue(paramStr) {
  if (!paramStr) return 0
  var match = String(paramStr).match(/^([0-9.]+)(%?)$/)
  if (!match) return 0
  var val = parseFloat(match[1])
  return match[2] === '%' ? val / 100 : val
}

function parseMultiplierStr(str) {
  if (!str || String(str).indexOf('%') < 0) return 0
  var parts = String(str).split('+')
  var total = 0
  for (var i = 0; i < parts.length; i++) {
    var trimmed = parts[i].trim()
    var match = trimmed.match(/^([0-9.]+)%(?:\*(\d+))?$/)
    if (match) {
      var pct = parseFloat(match[1]) / 100
      var count = match[2] ? parseInt(match[2]) : 1
      total += pct * count
    }
  }
  return total
}

function formatPercent(value) {
  return (value * 100).toFixed(1) + '%'
}

function formatInteger(value) {
  return Math.round(value || 0).toLocaleString()
}

Page({
  data: {
    loadouts: [],
    filtered: [],
    charOptions: [],
    filterCharIdx: 0,
    chainOptions: [0, 1, 2, 3, 4, 5, 6],
    refineOptions: [1, 2, 3, 4, 5],

    // 编辑
    editingId: null,
    editName: '',

    // 替换弹窗
    replaceSlot: null,
    replaceLoadoutId: null,
    replaceCost: 0,
    replaceSonataOptions: [],
    replaceSonataIdx: 0,
    replaceEchoes: [],
  },

  _charBaseMap: CHARACTERS_BASE,  // characterName → base data
  _calcMap: CHARACTER_WEIGHTS,      // characterName → weights
  _weaponMap: {},    // weaponType → weapons[]

  onShow() {
    this.loadCharData()
    this.loadLoadouts()
  },

  /** 加载角色数据（从全局或缓存） */
  loadCharData() {
    this._charBaseMap = CHARACTERS_BASE
    this._calcMap = CHARACTER_WEIGHTS
    this._weaponMap = {}
    for (var i = 0; i < WEAPONS.length; i++) {
      var weapon = WEAPONS[i]
      if (!this._weaponMap[weapon.type]) this._weaponMap[weapon.type] = []
      this._weaponMap[weapon.type].push(weapon)
    }

    var app = getApp()
    if (app.globalData.selectedCharacter) {
      var c = app.globalData.selectedCharacter
      this._charBaseMap[c.name] = c.base
      this._calcMap[c.name] = c.weights
    }
  },

  /** 加载套装列表 */
  loadLoadouts() {
    try {
      var loadouts = wx.getStorageSync('loadouts') || []

      // 构建角色筛选选项
      var charNameMap = {}
      loadouts.forEach(function (l) { charNameMap[l.characterName] = true })
      var charNames = Object.keys(charNameMap).sort()
      var charOptions = [{ key: 'all', label: '全部角色 (' + loadouts.length + ')' }]
      charNames.forEach(function (n) {
        var count = loadouts.filter(function (l) { return l.characterName === n }).length
        charOptions.push({ key: n, label: n + ' (' + count + ')' })
      })

      // 格式化套装
      var formatted = loadouts.map(function (l) { return this.formatLoadout(l) }, this)

      this.setData({ loadouts: formatted, charOptions })
      this.applyFilter()
    } catch (e) {
      console.error('加载套装失败:', e)
    }
  },

  /** 格式化单个套装 */
  formatLoadout(l) {
    var gradeInfo = getGrade(l.score)
    var charBase = this._charBaseMap[l.characterName]
    var weaponNames = charBase && this._weaponMap[charBase.weaponType]
      ? this._weaponMap[charBase.weaponType].map(function (w) { return w.name })
      : []
    var hasDamageData = !!(charBase && weaponNames.length > 0)

    return Object.assign({}, l, {
      _scoreDisplay: l.score.toFixed(2),
      _grade: gradeInfo.grade,
      _gradeClass: gradeInfo.gradeClass,
      _hasDamageData: hasDamageData,
      _showDamage: false,
      _chainLevel: 0,
      _hasChainEffects: false,
      _skillTypes: [],
      _skillTypeLabels: SKILL_TYPE_LABELS,
      _activeSkillTypes: {},
      _activeSkillTypeCount: 0,
      _weaponNames: weaponNames,
      _weaponIndex: 0,
      _refine: 1,
      _damageResult: null,
      _filteredTotalDisplay: '',
      echoes: l.echoes.map(function (e) {
        return Object.assign({}, e, {
        _shortName: e.monsterName.length > 4 ? e.monsterName.substring(0, 4) + '..' : e.monsterName,
        _sonataName: SONATA_NAMES[e.sonata] || e.sonata || '',
        _mainLabel: e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : '',
        _subLabels: (e.substats || []).map(function (s) { return (STAT_DISPLAY[s.type] || s.type) + ' ' + s.value }),
        })
      }),
    })
  },

  /** 应用角色筛选 */
  applyFilter() {
    var loadouts = this.data.loadouts
    var filterCharIdx = this.data.filterCharIdx
    var charOptions = this.data.charOptions
    var key = (charOptions[filterCharIdx] && charOptions[filterCharIdx].key) || 'all'
    var filtered = key === 'all' ? loadouts : loadouts.filter(function (l) { return l.characterName === key })
    this.setData({ filtered })
  },

  onFilterCharChange(e) {
    this.setData({ filterCharIdx: parseInt(e.detail.value) })
    this.applyFilter()
  },

  // ====== 重命名 ======
  onStartEdit(e) {
    this.setData({ editingId: e.currentTarget.dataset.id, editName: e.currentTarget.dataset.name })
  },

  onEditNameInput(e) {
    this.setData({ editName: e.detail.value })
  },

  onEditConfirm(e) {
    var id = e.currentTarget.dataset.id
    var name = this.data.editName.trim()
    if (name) {
      try {
        var loadouts = wx.getStorageSync('loadouts') || []
        var idx = loadouts.findIndex(function (l) { return l.id === id })
        if (idx >= 0) {
          loadouts[idx].name = name
          wx.setStorageSync('loadouts', loadouts)
        }
      } catch (e) {}
    }
    this.setData({ editingId: null })
    this.loadLoadouts()
  },

  // ====== 删除 ======
  onDeleteLoadout(e) {
    var self = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认', content: '删除该套装？',
      success: function (res) {
        if (res.confirm) {
          try {
            var loadouts = wx.getStorageSync('loadouts') || []
            wx.setStorageSync('loadouts', loadouts.filter(function (l) { return l.id !== id }))
            self.loadLoadouts()
          } catch (e) {}
        }
      }
    })
  },

  // ====== 伤害计算 ======
  toggleDamage(e) {
    var id = e.currentTarget.dataset.id
    var idx = this.data.filtered.findIndex(function (l) { return l.id === id })
    if (idx < 0) return

    var loadout = this.data.filtered[idx]
    var showDamage = !loadout._showDamage

    if (showDamage && !loadout._damageResult) {
      // 首次展开，计算伤害
      this.calcDamageForLoadout(idx)
    }

    var patch = {}
    patch['filtered[' + idx + ']._showDamage'] = showDamage
    this.setData(patch)
  },

  collectDamageEchoStats(echoes) {
    var stats = {
      atkPct: 0,
      flatAtk: 0,
      critRate: 0,
      critDmg: 0,
      elemDmg: 0,
      energyRegen: 0,
      skillDmg: { normalAtk: 0, heavyAtk: 0, resonanceSkill: 0, resonanceLiberation: 0, phantom: 0 },
    }
    for (var i = 0; i < echoes.length; i++) {
      var echo = echoes[i]
      var entries = [echo.mainStat, echo.secondaryStat].concat(echo.substats || []).filter(Boolean)
      for (var j = 0; j < entries.length; j++) {
        var entry = entries[j]
        var value = entry.value
        if (entry.type === 'ATK_PCT') stats.atkPct += value / 100
        else if (entry.type === 'FLAT_ATK') stats.flatAtk += value
        else if (entry.type === 'CRIT_RATE') stats.critRate += value / 100
        else if (entry.type === 'CRIT_DMG') stats.critDmg += value / 100
        else if (entry.type === 'ELEM_DMG') stats.elemDmg += value / 100
        else if (entry.type === 'ENERGY_REGEN') stats.energyRegen += value / 100
        else {
          var skillKey = SKILL_DMG_MAP[entry.type]
          if (skillKey) stats.skillDmg[skillKey] += value / 100
        }
      }

      if (echo.nightmareBonus) {
        if (echo.nightmareBonus.elemDmg) stats.elemDmg += echo.nightmareBonus.elemDmg
        if (echo.nightmareBonus.secondValue > 0) {
          if (echo.nightmareBonus.secondType === 'critRate') {
            stats.critRate += echo.nightmareBonus.secondValue
          } else if (echo.nightmareBonus.secondType === 'energyRegen') {
            stats.energyRegen += echo.nightmareBonus.secondValue
          } else {
            var nmKey = BUFF_TO_DMG_KEY[echo.nightmareBonus.secondType]
            if (nmKey && stats.skillDmg[nmKey] != null) stats.skillDmg[nmKey] += echo.nightmareBonus.secondValue
          }
        }
      }
    }
    return stats
  },

  collectSonataBuffs(echoes) {
    var counts = {}
    for (var i = 0; i < echoes.length; i++) {
      var sonata = echoes[i].sonata
      if (sonata) counts[sonata] = (counts[sonata] || 0) + 1
    }

    var buff = {
      atkPct: 0,
      elemDmg: 0,
      critRate: 0,
      critDmg: 0,
      skillDmg: {},
    }
    var applyBuff = function (type, value) {
      if (type === 'atkPct') buff.atkPct += value
      else if (type === 'elemDmg') buff.elemDmg += value
      else if (type === 'critRate') buff.critRate += value
      else if (type === 'critDmg') buff.critDmg += value
      else {
        var key = BUFF_TO_DMG_KEY[type]
        if (key) buff.skillDmg[key] = (buff.skillDmg[key] || 0) + value
      }
    }

    Object.keys(counts).forEach(function (sonata) {
      var effect = SONATA_EFFECTS[sonata]
      var count = counts[sonata]
      if (!effect) return
      var groups = []
      if (count >= 2 && effect.set2) groups = groups.concat(effect.set2)
      if (count >= 3 && effect.set3) groups = groups.concat(effect.set3)
      if (count >= 5 && effect.set5) groups = groups.concat(effect.set5)
      for (var j = 0; j < groups.length; j++) {
        var eff = groups[j]
        var val = eff.stacks ? eff.value * eff.stacks : eff.value
        applyBuff(eff.type, val)
      }
    })
    return buff
  },

  buffMatchesSkill(buff, skillName) {
    if (!buff.targetSkill) return true
    try {
      return new RegExp(buff.targetSkill).test(skillName)
    } catch (e) {
      return skillName.indexOf(buff.targetSkill) >= 0
    }
  },

  calculateDamage(loadout) {
    var charBase = this._charBaseMap[loadout.characterName]
    if (!charBase || !charBase.skills || charBase.skills.length === 0) return null

    var weapons = this._weaponMap[charBase.weaponType] || []
    var weapon = weapons[loadout._weaponIndex] || weapons[0]
    if (!weapon) return null

    var echoStats = this.collectDamageEchoStats(loadout.echoes)
    var sonataBuff = this.collectSonataBuffs(loadout.echoes)
    var refineIdx = Math.max(0, Math.min(4, (loadout._refine || 1) - 1))
    var levelIdx = 9
    var baseAtk = (charBase.baseAtk || 0) + (weapon.baseAtk || 0)
    var totalAtkPct = echoStats.atkPct + sonataBuff.atkPct
    var totalCritRate = 0.05 + echoStats.critRate + sonataBuff.critRate
    var totalCritDmg = 1.5 + echoStats.critDmg + sonataBuff.critDmg
    var baseElemDmg = echoStats.elemDmg + sonataBuff.elemDmg
    var skillDmgBonuses = {
      normalAtk: echoStats.skillDmg.normalAtk + (sonataBuff.skillDmg.normalAtk || 0),
      heavyAtk: echoStats.skillDmg.heavyAtk + (sonataBuff.skillDmg.heavyAtk || 0),
      resonanceSkill: echoStats.skillDmg.resonanceSkill + (sonataBuff.skillDmg.resonanceSkill || 0),
      resonanceLiberation: echoStats.skillDmg.resonanceLiberation + (sonataBuff.skillDmg.resonanceLiberation || 0),
      phantom: echoStats.skillDmg.phantom + (sonataBuff.skillDmg.phantom || 0),
    }
    var totalDefIgnore = 0
    var totalResReduce = 0
    var globalDmgDeepen = 0

    if (weapon.atkPct) totalAtkPct += weapon.atkPct
    if (weapon.critRate) totalCritRate += weapon.critRate
    if (weapon.critDmg) totalCritDmg += weapon.critDmg

    var enabledBuffs = (charBase.inherentBuffs || []).filter(function (buff) { return buff.enabled !== false })
    for (var i = 0; i < enabledBuffs.length; i++) {
      var buff = enabledBuffs[i]
      if (buff.targetSkill) continue
      if (buff.type === 'atkPct') totalAtkPct += buff.value
      else if (buff.type === 'critRate') totalCritRate += buff.value
      else if (buff.type === 'critDmg') totalCritDmg += buff.value
      else if (buff.type === 'elemDmg') baseElemDmg += buff.value
      else if (buff.type === 'defIgnore') totalDefIgnore += buff.value
      else if (buff.type === 'resReduce') totalResReduce += buff.value
      else if (buff.type === 'dmgDeepen') globalDmgDeepen += buff.value
      else {
        var buffSkillKey = BUFF_TO_DMG_KEY[buff.type]
        if (buffSkillKey) skillDmgBonuses[buffSkillKey] += buff.value
      }
    }

    var activeChainLevel = Math.min(6, loadout._chainLevel || 0)
    var activeChainEffects = []
    var chainEffects = charBase.chainEffects || []
    for (var ce = 0; ce < chainEffects.length; ce++) {
      if (chainEffects[ce].sequence <= activeChainLevel && chainEffects[ce].enabled !== false) activeChainEffects.push(chainEffects[ce])
    }
    for (var ac = 0; ac < activeChainEffects.length; ac++) {
      var chain = activeChainEffects[ac]
      if (chain.targetSkill) continue
      if (chain.type === 'atkPct') totalAtkPct += chain.value
      else if (chain.type === 'critRate') totalCritRate += chain.value
      else if (chain.type === 'critDmg') totalCritDmg += chain.value
      else if (chain.type === 'elemDmg') baseElemDmg += chain.value
      else if (chain.type === 'defIgnore') totalDefIgnore += chain.value
      else if (chain.type === 'resReduce') totalResReduce += chain.value
      else if (chain.type === 'dmgDeepen') globalDmgDeepen += chain.value
      else {
        var chainSkillKey = BUFF_TO_DMG_KEY[chain.type]
        if (chainSkillKey) skillDmgBonuses[chainSkillKey] += chain.value
      }
    }

    var weaponDmgBonuses = {}
    var passiveEffects = weapon.passiveEffects || []
    for (var pe = 0; pe < passiveEffects.length; pe++) {
      var passive = passiveEffects[pe]
      var paramArr = weapon.passive && weapon.passive.param && weapon.passive.param[passive.paramIdx]
      if (!paramArr) continue
      var val = parseParamValue(paramArr[refineIdx] || paramArr[paramArr.length - 1] || '')
      if (passive.stacks) {
        var stackCount = passive.stackParamIdx != null
          ? parseParamValue(weapon.passive.param[passive.stackParamIdx] && weapon.passive.param[passive.stackParamIdx][refineIdx])
          : passive.stacks
        val *= stackCount
      }
      if (passive.type === 'atkPct') totalAtkPct += val
      else if (passive.type === 'critRate') totalCritRate += val
      else if (passive.type === 'critDmg') totalCritDmg += val
      else if (passive.type === 'elemDmg') baseElemDmg += val
      else {
        var passiveKey = BUFF_TO_DMG_KEY[passive.type]
        if (passiveKey) weaponDmgBonuses[passiveKey] = (weaponDmgBonuses[passiveKey] || 0) + val
      }
    }

    var totalAtk = round5(baseAtk * (1 + totalAtkPct) + echoStats.flatAtk)
    var defMult = round9(190 / (188 + 190 * (1 - totalDefIgnore)))
    var resMult = round5(1 - Math.max(0, 0.1 - totalResReduce))
    var skills = (charBase.skills || []).map(function (skill) {
      var multiplierStr = (skill.multipliers && (skill.multipliers[levelIdx] || skill.multipliers[skill.multipliers.length - 1])) || '0%'
      var multiplier = parseMultiplierStr(multiplierStr)
      var dmgBonus = baseElemDmg + (skill.bonusDmg || 0)
      var skillDmgDeepen = globalDmgDeepen
      var skillGuaranteedCrit = false
      var dmgKey = skill.isHeavy ? 'heavyAtk' : (SKILLTYPE_TO_DMG[skill.skillType] || '')
      if (dmgKey) {
        dmgBonus += skillDmgBonuses[dmgKey] || 0
        dmgBonus += weaponDmgBonuses[dmgKey] || 0
      }

      for (var b = 0; b < enabledBuffs.length; b++) {
        var targetBuff = enabledBuffs[b]
        if (!targetBuff.targetSkill || !this.buffMatchesSkill(targetBuff, skill.name)) continue
        if (targetBuff.type === 'dmgDeepen') skillDmgDeepen += targetBuff.value
        else {
          var targetBuffKey = BUFF_TO_DMG_KEY[targetBuff.type]
          if (targetBuffKey) dmgBonus += targetBuff.value
        }
      }

      for (var c = 0; c < activeChainEffects.length; c++) {
        var targetChain = activeChainEffects[c]
        if (!targetChain.targetSkill || !this.buffMatchesSkill(targetChain, skill.name)) continue
        if (targetChain.type === 'guaranteedCrit') skillGuaranteedCrit = true
        else if (targetChain.type === 'dmgDeepen') skillDmgDeepen += targetChain.value
        else if (targetChain.type === 'multiplierBoost') multiplier *= (1 + targetChain.value)
        else {
          var targetChainKey = BUFF_TO_DMG_KEY[targetChain.type]
          if (targetChainKey) dmgBonus += targetChain.value
          else if (targetChain.type === 'elemDmg') dmgBonus += targetChain.value
        }
      }

      var baseDmg = round5(totalAtk * multiplier)
      var dmgBonusTotal = round5(1 + dmgBonus)
      var deepenMult = round5(1 + skillDmgDeepen)
      var critMult = skillGuaranteedCrit ? totalCritDmg : round5(totalCritRate * totalCritDmg)
      var expected = round5(round5(round5(round5(baseDmg * dmgBonusTotal) * deepenMult) * critMult) * defMult) * resMult
      var crit = round5(round5(round5(round5(baseDmg * dmgBonusTotal) * deepenMult) * totalCritDmg) * defMult) * resMult
      return {
        name: skill.name,
        tag: skill.tag || 'E',
        tagClass: getSkillTagClass(skill.tag || 'E'),
        skillType: skill.skillType || '',
        multiplierStr: multiplierStr,
        expected: Math.round(expected),
        crit: Math.round(crit),
        _expectedDisplay: formatInteger(expected),
        _critDisplay: formatInteger(crit),
      }
    }, this)

    return {
      panel: {
        atk: parseFloat(totalAtk.toFixed(1)),
        critRate: totalCritRate,
        critDmg: totalCritDmg,
        elemDmg: baseElemDmg,
        energyRegen: echoStats.energyRegen,
      },
      skills: skills,
      totalExpected: skills.reduce(function (sum, skill) { return sum + skill.expected }, 0),
    }
  },

  buildDisplayDamageResult(loadout) {
    var result = this.calculateDamage(loadout)
    if (!result) return null
    var active = loadout._activeSkillTypes || {}
    var activeKeys = Object.keys(active).filter(function (key) { return active[key] })
    var filteredSkills = activeKeys.length === 0 ? result.skills : result.skills.filter(function (skill) {
      return active[skill.skillType]
    })
    var filteredTotal = filteredSkills.reduce(function (sum, skill) { return sum + skill.expected }, 0)
    result._critRateDisplay = formatPercent(result.panel.critRate)
    result._critDmgDisplay = formatPercent(result.panel.critDmg)
    result._elemDmgDisplay = formatPercent(result.panel.elemDmg)
    result._energyDisplay = formatPercent(result.panel.energyRegen)
    result._filteredSkills = filteredSkills
    result._filteredTotalDisplay = formatInteger(filteredTotal)
    return result
  },

  calcDamageForLoadout(idx) {
    var loadout = this.data.filtered[idx]
    var charBase = this._charBaseMap[loadout.characterName]
    if (!charBase) return

    var skillTypeSet = new Set()
    if (charBase.skills) {
      charBase.skills.forEach(function (s) { if (s.skillType) skillTypeSet.add(s.skillType) })
    }
    var skillTypes = Array.from(skillTypeSet)
    var damageResult = this.buildDisplayDamageResult(loadout)
    if (!damageResult) return

    var patch = {}
    patch['filtered[' + idx + ']._damageResult'] = damageResult
    patch['filtered[' + idx + ']._hasChainEffects'] = (charBase.chainEffects || []).length > 0
    patch['filtered[' + idx + ']._skillTypes'] = skillTypes
    patch['filtered[' + idx + ']._filteredTotalDisplay'] = damageResult._filteredTotalDisplay
    this.setData(patch)
  },

  setChainLevel(e) {
    var id = e.currentTarget.dataset.id
    var level = e.currentTarget.dataset.level
    var idx = this.data.filtered.findIndex(function (l) { return l.id === id })
    if (idx >= 0) {
      this.data.filtered[idx]._chainLevel = level
      var patch = {}
      patch['filtered[' + idx + ']._chainLevel'] = level
      this.setData(patch)
      this.calcDamageForLoadout(idx)
    }
  },

  toggleSkillType(e) {
    var id = e.currentTarget.dataset.id
    var type = e.currentTarget.dataset.type
    var idx = this.data.filtered.findIndex(function (l) { return l.id === id })
    if (idx < 0) return
    var active = Object.assign({}, this.data.filtered[idx]._activeSkillTypes)
    if (active[type]) delete active[type]; else active[type] = true
    this.data.filtered[idx]._activeSkillTypes = active
    this.data.filtered[idx]._activeSkillTypeCount = Object.keys(active).length
    var patch = {}
    patch['filtered[' + idx + ']._activeSkillTypes'] = active
    patch['filtered[' + idx + ']._activeSkillTypeCount'] = Object.keys(active).length
    this.setData(patch)
    this.calcDamageForLoadout(idx)
  },

  clearSkillTypes(e) {
    var targetId = e.currentTarget.dataset.id
    var idx = this.data.filtered.findIndex(function (l) { return l.id === targetId })
    if (idx >= 0) {
      this.data.filtered[idx]._activeSkillTypes = {}
      this.data.filtered[idx]._activeSkillTypeCount = 0
      var patch = {}
      patch['filtered[' + idx + ']._activeSkillTypes'] = {}
      patch['filtered[' + idx + ']._activeSkillTypeCount'] = 0
      this.setData(patch)
      this.calcDamageForLoadout(idx)
    }
  },

  onWeaponChange(e) {
    var targetId = e.currentTarget.dataset.id
    var idx = this.data.filtered.findIndex(function (l) { return l.id === targetId })
    if (idx >= 0) {
      this.data.filtered[idx]._weaponIndex = parseInt(e.detail.value)
      var patch = {}
      patch['filtered[' + idx + ']._weaponIndex'] = parseInt(e.detail.value)
      this.setData(patch)
      this.calcDamageForLoadout(idx)
    }
  },

  setRefine(e) {
    var id = e.currentTarget.dataset.id
    var refine = e.currentTarget.dataset.refine
    var idx = this.data.filtered.findIndex(function (l) { return l.id === id })
    if (idx >= 0) {
      this.data.filtered[idx]._refine = refine
      var patch = {}
      patch['filtered[' + idx + ']._refine'] = refine
      this.setData(patch)
      this.calcDamageForLoadout(idx)
    }
  },

  // ====== 替换声骸 ======
  onStartReplace(e) {
    var loadoutId = e.currentTarget.dataset.loadoutId
    var slot = e.currentTarget.dataset.slot
    var loadout = this.data.filtered.find(function (l) { return l.id === loadoutId })
    if (!loadout) return

    var cost = loadout.echoes[slot].cost
    var echoes = wx.getStorageSync('echoes') || []
    var candidates = echoes.filter(function (e) { return e.cost === cost }).map(function (e) { return Object.assign({}, e, {
      _sonataName: SONATA_NAMES[e.sonata] || e.sonata || '',
      _mainLabel: e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : '',
      _subLabels: (e.substats || []).map(function (s) { return (STAT_DISPLAY[s.type] || s.type) + ' ' + s.value }),
      _score: '',
    }) })

    // 构建套装筛选选项
    var sonataOptions = [{ key: '', label: '全部套装' }]
    Object.keys(SONATA_NAMES).forEach(function (k) {
      sonataOptions.push({ key: k, label: SONATA_NAMES[k] })
    })

    this.setData({
      replaceSlot: slot,
      replaceLoadoutId: loadoutId,
      replaceCost: cost,
      replaceSonataOptions: sonataOptions,
      replaceSonataIdx: 0,
      replaceEchoes: candidates,
    })
  },

  onReplaceSonataChange(e) {
    var idx = parseInt(e.detail.value)
    var key = (this.data.replaceSonataOptions[idx] && this.data.replaceSonataOptions[idx].key) || ''
    var echoes = wx.getStorageSync('echoes') || []
    var replaceCost = this.data.replaceCost
    var candidates = echoes.filter(function (e) { return e.cost === replaceCost })
    if (key) candidates = candidates.filter(function (e) { return e.sonata === key })

    candidates = candidates.map(function (e) { return Object.assign({}, e, {
      _sonataName: SONATA_NAMES[e.sonata] || e.sonata || '',
      _mainLabel: e.mainStat ? (STAT_DISPLAY[e.mainStat.type] || e.mainStat.type) : '',
      _subLabels: (e.substats || []).map(function (s) { return (STAT_DISPLAY[s.type] || s.type) + ' ' + s.value }),
    }) })

    this.setData({ replaceSonataIdx: idx, replaceEchoes: candidates })
  },

  onPickEcho(e) {
    var echoIdx = e.currentTarget.dataset.index
    var echo = this.data.replaceEchoes[echoIdx]
    if (!echo) return

    var replaceLoadoutId = this.data.replaceLoadoutId
    var replaceSlot = this.data.replaceSlot

    try {
      var loadouts = wx.getStorageSync('loadouts') || []
      var idx = loadouts.findIndex(function (l) { return l.id === replaceLoadoutId })
      if (idx >= 0) {
        loadouts[idx].echoes[replaceSlot] = echo
        // TODO: 重新计算评分
        wx.setStorageSync('loadouts', loadouts)
      }
    } catch (e) {}

    this.setData({ replaceSlot: null, replaceLoadoutId: null })
    this.loadLoadouts()
    wx.showToast({ title: '已替换', icon: 'success' })
  },

  onCloseReplace() {
    this.setData({ replaceSlot: null, replaceLoadoutId: null })
  },
})
