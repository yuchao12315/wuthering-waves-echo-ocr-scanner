// Auto-generated as ES5 from src/lib/damage.ts. Do not edit directly.
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var SONATA_EFFECTS = require("../data/sonata-effects.js");
var nightmare_bonuses_js_1 = require("../data/nightmare-bonuses.js");
var sonataEffects = SONATA_EFFECTS;
var SKILL_DMG_MAP = {
    NORMAL_ATK_DMG: 'normalAtk',
    HEAVY_ATK_DMG: 'heavyAtk',
    RESONANCE_SKILL_DMG: 'resonanceSkill',
    RESONANCE_LIBERATION_DMG: 'resonanceLiberation',
};
var SKILLTYPE_TO_DMG = {
    '常态攻击': 'normalAtk',
    '共鸣技能': 'resonanceSkill',
    '共鸣解放': 'resonanceLiberation',
    '共鸣回路': 'resonanceSkill',
};
var BUFF_TO_DMG_KEY = {
    normalAtkDmg: 'normalAtk',
    heavyAtkDmg: 'heavyAtk',
    resonanceSkillDmg: 'resonanceSkill',
    resonanceLiberationDmg: 'resonanceLiberation',
    phantomDmg: 'phantom',
};
var KEY_SKILL_DAMAGE_LIMIT = 5;
/** Keep the most representative damage rows for compact loadout presentation. */
function selectKeySkills(skills, limit) {
    if (limit === void 0) { limit = KEY_SKILL_DAMAGE_LIMIT; }
    if (limit <= 0)
        return [];
    return skills
        .map(function (skill, index) { return ({ skill: skill, index: index }); })
        .sort(function (a, b) { return b.skill.expected - a.skill.expected || b.skill.crit - a.skill.crit || a.index - b.index; })
        .slice(0, limit)
        .map(function (item) { return item.skill; });
}
/** Round to 5 decimal places (ATK and all multipliers) */
var round5 = function (v) { return Math.round(v * 1e5) / 1e5; };
/** Round to 9 decimal places (defense multiplier) */
var round9 = function (v) { return Math.round(v * 1e9) / 1e9; };
function collectEchoStats(echoes, characterName, characterElement) {
    var _a, _b, _c;
    var stats = {
        atkPct: 0, flatAtk: 0, hpPct: 0, flatHp: 0, defPct: 0, flatDef: 0,
        critRate: 0, critDmg: 0, elemDmg: 0, energyRegen: 0,
        skillDmg: { normalAtk: 0, heavyAtk: 0, resonanceSkill: 0, resonanceLiberation: 0, phantom: 0 },
        nightmareElemDmg: 0,
        nightmareSecondType: '',
        nightmareSecondValue: 0,
    };
    for (var echoIndex = 0; echoIndex < echoes.length; echoIndex += 1) {
        var echo = echoes[echoIndex];
        var allEntries = __spreadArray([
            echo.mainStat,
            echo.secondaryStat
        ], echo.substats, true).filter(Boolean);
        for (var _i = 0, allEntries_1 = allEntries; _i < allEntries_1.length; _i++) {
            var entry = allEntries_1[_i];
            if (!entry)
                continue;
            var type = entry.type, value = entry.value;
            switch (type) {
                case 'ATK_PCT':
                    stats.atkPct += value / 100;
                    break;
                case 'FLAT_ATK':
                    stats.flatAtk += value;
                    break;
                case 'HP_PCT':
                    stats.hpPct += value / 100;
                    break;
                case 'FLAT_HP':
                    stats.flatHp += value;
                    break;
                case 'DEF_PCT':
                    stats.defPct += value / 100;
                    break;
                case 'FLAT_DEF':
                    stats.flatDef += value;
                    break;
                case 'CRIT_RATE':
                    stats.critRate += value / 100;
                    break;
                case 'CRIT_DMG':
                    stats.critDmg += value / 100;
                    break;
                case 'ELEM_DMG':
                    stats.elemDmg += value / 100;
                    break;
                case 'ENERGY_REGEN':
                    stats.energyRegen += value / 100;
                    break;
                default: {
                    var key = SKILL_DMG_MAP[type];
                    if (key)
                        stats.skillDmg[key] += value / 100;
                }
            }
        }
        // Fixed Echo Skill bonuses only apply to the Echo equipped in the main slot.
        if (echoIndex !== 0)
            continue;
        var nmBonus = (_a = echo.nightmareBonus) !== null && _a !== void 0 ? _a : (0, nightmare_bonuses_js_1.getNightmareBonus)(echo.monsterName, characterName);
        if (nmBonus) {
            if (!nmBonus.elemType || nmBonus.elemType === characterElement) {
                stats.nightmareElemDmg += (_b = nmBonus.elemDmg) !== null && _b !== void 0 ? _b : 0;
            }
            var secondAllowed = !((_c = nmBonus.secondRequiredCharacters) === null || _c === void 0 ? void 0 : _c.length)
                || Boolean(characterName && nmBonus.secondRequiredCharacters.includes(characterName));
            if (secondAllowed && nmBonus.secondType === 'aeroDmg' && characterElement === '气动') {
                stats.nightmareElemDmg += nmBonus.secondValue;
            }
            else if (secondAllowed && nmBonus.secondValue > 0) {
                stats.nightmareSecondType = nmBonus.secondType;
                stats.nightmareSecondValue += nmBonus.secondValue;
            }
        }
    }
    return stats;
}
function collectSonataBuffs(echoes) {
    var _a;
    var counts = {};
    for (var _i = 0, echoes_1 = echoes; _i < echoes_1.length; _i++) {
        var e = echoes_1[_i];
        if (e.sonata)
            counts[e.sonata] = ((_a = counts[e.sonata]) !== null && _a !== void 0 ? _a : 0) + 1;
    }
    var atkPct = 0;
    var hpPct = 0;
    var defPct = 0;
    var elemDmg = 0;
    var critRate = 0;
    var critDmg = 0;
    var skillDmg = {};
    for (var _b = 0, _c = Object.entries(counts); _b < _c.length; _b++) {
        var _d = _c[_b], sonata = _d[0], count = _d[1];
        var effect = sonataEffects[sonata];
        if (!effect)
            continue;
        if (count >= 2 && effect.set2) {
            var effects = Array.isArray(effect.set2) ? effect.set2 : [effect.set2];
            for (var _e = 0, effects_1 = effects; _e < effects_1.length; _e++) {
                var eff = effects_1[_e];
                var val = eff.stacks ? eff.value * eff.stacks : eff.value;
                applyBuff(eff.type, val);
            }
        }
        if (count >= 3 && effect.set3) {
            var effects = Array.isArray(effect.set3) ? effect.set3 : [effect.set3];
            for (var _f = 0, effects_2 = effects; _f < effects_2.length; _f++) {
                var eff = effects_2[_f];
                var val = eff.stacks ? eff.value * eff.stacks : eff.value;
                applyBuff(eff.type, val);
            }
        }
        if (count >= 5 && effect.set5) {
            var effects = Array.isArray(effect.set5) ? effect.set5 : [effect.set5];
            for (var _g = 0, effects_3 = effects; _g < effects_3.length; _g++) {
                var eff = effects_3[_g];
                var val = eff.stacks ? eff.value * eff.stacks : eff.value;
                applyBuff(eff.type, val);
            }
        }
    }
    function applyBuff(type, value) {
        var _a;
        if (type === 'atkPct')
            atkPct += value;
        else if (type === 'hpPct')
            hpPct += value;
        else if (type === 'defPct')
            defPct += value;
        else if (type === 'elemDmg')
            elemDmg += value;
        else if (type === 'critRate')
            critRate += value;
        else if (type === 'critDmg')
            critDmg += value;
        else {
            var key = BUFF_TO_DMG_KEY[type];
            if (key)
                skillDmg[key] = ((_a = skillDmg[key]) !== null && _a !== void 0 ? _a : 0) + value;
        }
    }
    return { atkPct: atkPct, hpPct: hpPct, defPct: defPct, elemDmg: elemDmg, critRate: critRate, critDmg: critDmg, skillDmg: skillDmg };
}
function normalizeDamageStat(stat) {
    if (stat === 'hp' || stat === '生命')
        return 'hp';
    if (stat === 'def' || stat === '防御')
        return 'def';
    return 'atk';
}
function parseParamValue(paramStr) {
    if (!paramStr)
        return 0;
    var match = paramStr.match(/^([0-9.]+)(%?)$/);
    if (!match)
        return 0;
    var val = parseFloat(match[1]);
    return match[2] === '%' ? val / 100 : val;
}
function parseMultiplierStr(str) {
    if (!str || !str.includes('%'))
        return 0;
    var parts = str.split('+');
    var total = 0;
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var part = parts_1[_i];
        var trimmed = part.trim();
        var match = trimmed.match(/^([0-9.]+)%+(?:\*(\d+))?(?:生命|防御|攻击)?$/);
        if (match) {
            var pct = parseFloat(match[1]) / 100;
            var count = match[2] ? parseInt(match[2]) : 1;
            total += pct * count;
        }
    }
    return total;
}
function parseFlatBaseValue(str) {
    if (!str)
        return 0;
    var parts = str.split('+');
    var total = 0;
    for (var _i = 0, parts_2 = parts; _i < parts_2.length; _i++) {
        var part = parts_2[_i];
        var trimmed = part.trim();
        if (trimmed.includes('%'))
            continue;
        var match = trimmed.match(/^([0-9.]+)(?:\*(\d+))?$/);
        if (match) {
            var value = parseFloat(match[1]);
            var count = match[2] ? parseInt(match[2]) : 1;
            total += value * count;
        }
    }
    return total;
}
function isBuffEnabled(buff) {
    return buff.enabled !== false;
}
function buffMatchesSkill(buff, skillName) {
    if (!buff.targetSkill)
        return true;
    try {
        return new RegExp(buff.targetSkill).test(skillName);
    }
    catch (_a) {
        return skillName.includes(buff.targetSkill);
    }
}
function getSkillDamageType(skill) {
    var _a;
    if (skill.damageType)
        return skill.damageType;
    if (skill.isHeavy)
        return 'heavyAtk';
    return (_a = SKILLTYPE_TO_DMG[skill.skillType]) !== null && _a !== void 0 ? _a : '';
}
function effectMatchesSkill(effect, skill, damageType, characterElement) {
    if (effect.targetSkill && !buffMatchesSkill(effect, skill.name))
        return false;
    if (effect.targetTreeId && !new RegExp("^(?:".concat(effect.targetTreeId, ")$")).test(skill.treeId))
        return false;
    if (effect.damageType && effect.damageType !== damageType)
        return false;
    if (effect.targetElement && effect.targetElement !== characterElement)
        return false;
    return true;
}
function isScopedEffect(effect) {
    return Boolean(effect.targetSkill || effect.targetTreeId || effect.damageType || effect.targetElement);
}
function calcDamage(character, weapon, weaponRefine, echoes, _chainNodes, skillLevel, charLevel, enemyLevel, enemyResist, chainLevel, characterName) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    if (_chainNodes === void 0) { _chainNodes = -1; }
    if (skillLevel === void 0) { skillLevel = 10; }
    if (charLevel === void 0) { charLevel = 90; }
    if (enemyLevel === void 0) { enemyLevel = 89; }
    if (enemyResist === void 0) { enemyResist = 0.1; }
    if (chainLevel === void 0) { chainLevel = 0; }
    void _chainNodes;
    var echoStats = collectEchoStats(echoes, characterName, character.element);
    var sonataBuff = collectSonataBuffs(echoes);
    var refineIdx = Math.max(0, Math.min(4, weaponRefine - 1));
    var levelIdx = Math.max(0, Math.min(18, skillLevel - 1));
    var baseAtk = character.baseAtk + weapon.baseAtk;
    var enabledBuffs = character.inherentBuffs.filter(isBuffEnabled);
    var activeChainLevel = Math.min(6, chainLevel);
    var activeChainEffects = [];
    if (character.chainEffects) {
        for (var _i = 0, _x = character.chainEffects; _i < _x.length; _i++) {
            var eff = _x[_i];
            if (eff.sequence <= activeChainLevel && eff.enabled !== false) {
                activeChainEffects.push(eff);
            }
        }
    }
    var src = {
        atk: [], hp: [], def: [], critRate: [], critDmg: [], elemDmg: [],
        normalAtk: [], heavyAtk: [], resonanceSkill: [], resonanceLiberation: [],
    };
    function addSrc(cat, label, value) {
        if (value)
            src[cat].push({ label: label, value: value });
    }
    // --- Collect global buffs with source tracking ---
    var totalAtkPct = 0;
    var totalHpPct = 0;
    var totalDefPct = 0;
    var totalCritRate = 0.05;
    var totalCritDmg = 1.50;
    var baseElemDmg = 0;
    var totalDefIgnore = 0;
    var totalResReduce = 0;
    var globalDmgDeepen = 0;
    var globalMultiplierFactor = 1;
    // Weapon secondary stat
    if (weapon.atkPct) {
        totalAtkPct += weapon.atkPct;
        addSrc('atk', "".concat(weapon.name, "\u526F\u5C5E\u6027"), weapon.atkPct);
    }
    if (weapon.hpPct) {
        totalHpPct += weapon.hpPct;
        addSrc('hp', "".concat(weapon.name, "\u526F\u5C5E\u6027"), weapon.hpPct);
    }
    if (weapon.critRate) {
        totalCritRate += weapon.critRate;
        addSrc('critRate', "".concat(weapon.name, "\u526F\u5C5E\u6027"), weapon.critRate);
    }
    if (weapon.critDmg) {
        totalCritDmg += weapon.critDmg;
        addSrc('critDmg', "".concat(weapon.name, "\u526F\u5C5E\u6027"), weapon.critDmg);
    }
    // Echo stats
    if (echoStats.atkPct) {
        totalAtkPct += echoStats.atkPct;
        addSrc('atk', '声骸攻击%', echoStats.atkPct);
    }
    if (echoStats.hpPct) {
        totalHpPct += echoStats.hpPct;
        addSrc('hp', '声骸生命%', echoStats.hpPct);
    }
    if (echoStats.defPct) {
        totalDefPct += echoStats.defPct;
        addSrc('def', '声骸防御%', echoStats.defPct);
    }
    if (echoStats.critRate) {
        totalCritRate += echoStats.critRate;
        addSrc('critRate', '声骸暴击率', echoStats.critRate);
    }
    if (echoStats.critDmg) {
        totalCritDmg += echoStats.critDmg;
        addSrc('critDmg', '声骸暴击伤害', echoStats.critDmg);
    }
    if (echoStats.elemDmg) {
        baseElemDmg += echoStats.elemDmg;
        addSrc('elemDmg', '声骸属性伤害', echoStats.elemDmg);
    }
    // Sonata
    if (sonataBuff.atkPct) {
        totalAtkPct += sonataBuff.atkPct;
        addSrc('atk', '套装效果', sonataBuff.atkPct);
    }
    if (sonataBuff.hpPct) {
        totalHpPct += sonataBuff.hpPct;
        addSrc('hp', '套装效果', sonataBuff.hpPct);
    }
    if (sonataBuff.defPct) {
        totalDefPct += sonataBuff.defPct;
        addSrc('def', '套装效果', sonataBuff.defPct);
    }
    if (sonataBuff.elemDmg) {
        baseElemDmg += sonataBuff.elemDmg;
        addSrc('elemDmg', '套装效果', sonataBuff.elemDmg);
    }
    if (sonataBuff.critRate) {
        totalCritRate += sonataBuff.critRate;
        addSrc('critRate', '套装效果', sonataBuff.critRate);
    }
    if (sonataBuff.critDmg) {
        totalCritDmg += sonataBuff.critDmg;
        addSrc('critDmg', '套装效果', sonataBuff.critDmg);
    }
    var skillDmgBonuses = { normalAtk: 0, heavyAtk: 0, resonanceSkill: 0, resonanceLiberation: 0, phantom: 0 };
    // Echo skill dmg substats
    for (var _y = 0, _z = Object.entries(echoStats.skillDmg); _y < _z.length; _y++) {
        var _0 = _z[_y], k = _0[0], v = _0[1];
        if (v) {
            skillDmgBonuses[k] += v;
            addSrc(k, '声骸技能增伤', v);
        }
    }
    // Nightmare echo fixed bonus: elemDmg to baseElemDmg, secondType to specific pool
    if (echoStats.nightmareElemDmg) {
        baseElemDmg += echoStats.nightmareElemDmg;
        addSrc('elemDmg', '梦魇声骸属性伤害', echoStats.nightmareElemDmg);
    }
    if (echoStats.nightmareSecondValue > 0) {
        if (echoStats.nightmareSecondType === 'critRate') {
            totalCritRate += echoStats.nightmareSecondValue;
            addSrc('critRate', '梦魇声骸暴击率', echoStats.nightmareSecondValue);
        }
        else if (echoStats.nightmareSecondType === 'energyRegen') {
            // energyRegen doesn't affect damage calculation, tracked in panel only
        }
        else {
            var nmKey = BUFF_TO_DMG_KEY[echoStats.nightmareSecondType];
            if (nmKey && skillDmgBonuses[nmKey] !== undefined) {
                skillDmgBonuses[nmKey] += echoStats.nightmareSecondValue;
                addSrc(nmKey, '梦魇声骸技能增伤', echoStats.nightmareSecondValue);
            }
        }
    }
    // Sonata skill dmg
    for (var _1 = 0, _2 = Object.entries(sonataBuff.skillDmg); _1 < _2.length; _1++) {
        var _3 = _2[_1], k = _3[0], v = _3[1];
        if (v) {
            skillDmgBonuses[k] += v;
            addSrc(k, '套装效果', v);
        }
    }
    // ascensionStat: 90级满突后已包含在baseAtk/基础暴击中，不再额外计算
    // Inherent buffs
    for (var _4 = 0, enabledBuffs_1 = enabledBuffs; _4 < enabledBuffs_1.length; _4++) {
        var buff = enabledBuffs_1[_4];
        if (isScopedEffect(buff))
            continue;
        var lbl = (_a = buff.condition) !== null && _a !== void 0 ? _a : '固有技能';
        switch (buff.type) {
            case 'atkPct':
                totalAtkPct += buff.value;
                addSrc('atk', lbl, buff.value);
                break;
            case 'hpPct':
                totalHpPct += buff.value;
                addSrc('hp', lbl, buff.value);
                break;
            case 'defPct':
                totalDefPct += buff.value;
                addSrc('def', lbl, buff.value);
                break;
            case 'critRate':
                totalCritRate += buff.value;
                addSrc('critRate', lbl, buff.value);
                break;
            case 'critDmg':
                totalCritDmg += buff.value;
                addSrc('critDmg', lbl, buff.value);
                break;
            case 'elemDmg':
                baseElemDmg += buff.value;
                addSrc('elemDmg', lbl, buff.value);
                break;
            case 'defIgnore':
                totalDefIgnore += buff.value;
                break;
            case 'resReduce':
                totalResReduce += buff.value;
                break;
            case 'dmgDeepen':
                globalDmgDeepen += buff.value;
                break;
            default: {
                var key = BUFF_TO_DMG_KEY[buff.type];
                if (key) {
                    skillDmgBonuses[key] += buff.value;
                    addSrc(key, lbl, buff.value);
                }
            }
        }
    }
    // Chain effects — global
    for (var _5 = 0, activeChainEffects_1 = activeChainEffects; _5 < activeChainEffects_1.length; _5++) {
        var eff = activeChainEffects_1[_5];
        if (isScopedEffect(eff))
            continue;
        var lbl = "S".concat(eff.sequence, " ").concat((_b = eff.condition) !== null && _b !== void 0 ? _b : '命座');
        switch (eff.type) {
            case 'atkPct':
                totalAtkPct += eff.value;
                addSrc('atk', lbl, eff.value);
                break;
            case 'hpPct':
                totalHpPct += eff.value;
                addSrc('hp', lbl, eff.value);
                break;
            case 'defPct':
                totalDefPct += eff.value;
                addSrc('def', lbl, eff.value);
                break;
            case 'critRate':
                totalCritRate += eff.value;
                addSrc('critRate', lbl, eff.value);
                break;
            case 'critDmg':
                totalCritDmg += eff.value;
                addSrc('critDmg', lbl, eff.value);
                break;
            case 'elemDmg':
                baseElemDmg += eff.value;
                addSrc('elemDmg', lbl, eff.value);
                break;
            case 'defIgnore':
                totalDefIgnore += eff.value;
                break;
            case 'resReduce':
                totalResReduce += eff.value;
                break;
            case 'dmgDeepen':
                globalDmgDeepen += eff.value;
                break;
            case 'multiplierBoost':
                globalMultiplierFactor *= (1 + eff.value);
                break;
            default: {
                var key = BUFF_TO_DMG_KEY[eff.type];
                if (key) {
                    skillDmgBonuses[key] += eff.value;
                    addSrc(key, lbl, eff.value);
                }
            }
        }
    }
    // Weapon passive effects
    var weaponDmgBonuses = {};
    var targetedWeaponEffects = [];
    if (weapon.passiveEffects) {
        for (var _6 = 0, _7 = weapon.passiveEffects; _6 < _7.length; _6++) {
            var eff = _7[_6];
            if (eff.enabled === false)
                continue;
            var paramArr = (_d = (_c = weapon.passive) === null || _c === void 0 ? void 0 : _c.param) === null || _d === void 0 ? void 0 : _d[eff.paramIdx];
            if (!paramArr)
                continue;
            var val = parseParamValue((_f = (_e = paramArr[refineIdx]) !== null && _e !== void 0 ? _e : paramArr[paramArr.length - 1]) !== null && _f !== void 0 ? _f : '');
            if (eff.valueScale)
                val *= eff.valueScale;
            if (eff.stacks) {
                var stackCount = eff.stackParamIdx != null
                    ? parseParamValue((_k = (_j = (_h = (_g = weapon.passive) === null || _g === void 0 ? void 0 : _g.param) === null || _h === void 0 ? void 0 : _h[eff.stackParamIdx]) === null || _j === void 0 ? void 0 : _j[refineIdx]) !== null && _k !== void 0 ? _k : '')
                    : eff.stacks;
                val *= stackCount;
            }
            var lbl = "".concat(weapon.name, "\u88AB\u52A8");
            if (isScopedEffect(eff)) {
                targetedWeaponEffects.push(__assign(__assign({}, eff), { value: val }));
                continue;
            }
            switch (eff.type) {
                case 'atkPct':
                    totalAtkPct += val;
                    addSrc('atk', lbl, val);
                    break;
                case 'hpPct':
                    totalHpPct += val;
                    addSrc('hp', lbl, val);
                    break;
                case 'defPct':
                    totalDefPct += val;
                    addSrc('def', lbl, val);
                    break;
                case 'critRate':
                    totalCritRate += val;
                    addSrc('critRate', lbl, val);
                    break;
                case 'critDmg':
                    totalCritDmg += val;
                    addSrc('critDmg', lbl, val);
                    break;
                case 'elemDmg':
                    baseElemDmg += val;
                    addSrc('elemDmg', lbl, val);
                    break;
                case 'defIgnore':
                    totalDefIgnore += val;
                    break;
                case 'resReduce':
                    totalResReduce += val;
                    break;
                case 'dmgDeepen':
                    globalDmgDeepen += val;
                    break;
                case 'multiplierBoost':
                    globalMultiplierFactor *= (1 + val);
                    break;
                case 'guaranteedCrit': break;
                default: {
                    var key = BUFF_TO_DMG_KEY[eff.type];
                    if (key) {
                        weaponDmgBonuses[key] = ((_l = weaponDmgBonuses[key]) !== null && _l !== void 0 ? _l : 0) + val;
                        addSrc(key, lbl, val);
                    }
                }
            }
        }
    }
    if (echoStats.flatAtk)
        addSrc('atk', '声骸固定攻击', echoStats.flatAtk);
    if (echoStats.flatHp)
        addSrc('hp', '声骸固定生命', echoStats.flatHp);
    if (echoStats.flatDef)
        addSrc('def', '声骸固定防御', echoStats.flatDef);
    var totalAtk = round5(baseAtk * (1 + totalAtkPct) + echoStats.flatAtk);
    var baseHp = (_m = character.baseHp) !== null && _m !== void 0 ? _m : 0;
    var baseDef = (_o = character.baseDef) !== null && _o !== void 0 ? _o : 0;
    var totalHp = round5(baseHp * (1 + totalHpPct) + echoStats.flatHp);
    var totalDef = round5(baseDef * (1 + totalDefPct) + echoStats.flatDef);
    var calcDefMult = function (defIgnore) { return round9((100 + charLevel) / ((99 + enemyLevel) + (100 + charLevel) * (1 - defIgnore))); };
    var calcResMult = function (resReduce) { return round5(1 - Math.max(0, enemyResist - resReduce)); };
    var defMult = calcDefMult(totalDefIgnore);
    var resMult = calcResMult(totalResReduce);
    // Damage calculation log
    console.log('[伤害计算] 基础参数', {
        baseAtk: baseAtk,
        weapon: weapon.name,
        totalAtkPct: round5(totalAtkPct),
        totalHpPct: round5(totalHpPct),
        totalDefPct: round5(totalDefPct),
        flatAtk: echoStats.flatAtk,
        flatHp: echoStats.flatHp,
        flatDef: echoStats.flatDef,
        totalAtk: totalAtk,
        totalHp: totalHp,
        totalDef: totalDef,
        critRate: totalCritRate,
        critDmg: totalCritDmg,
        baseElemDmg: baseElemDmg,
        nightmare: echoStats.nightmareElemDmg > 0 ? { elemDmg: echoStats.nightmareElemDmg, secondType: echoStats.nightmareSecondType, secondValue: echoStats.nightmareSecondValue } : null,
        defMult: defMult,
        resMult: resMult,
    });
    var skills = character.skills.map(function (skill) {
        var _a, _b;
        var multiplierStr = (_b = (_a = skill.multipliers[levelIdx]) !== null && _a !== void 0 ? _a : skill.multipliers[skill.multipliers.length - 1]) !== null && _b !== void 0 ? _b : '0%';
        var multiplier = parseMultiplierStr(multiplierStr) * globalMultiplierFactor;
        var flatBase = parseFlatBaseValue(multiplierStr);
        var dmgBonus = baseElemDmg + skill.bonusDmg;
        var skillDmgDeepen = globalDmgDeepen;
        var skillGuaranteedCrit = false;
        var skillCritRate = totalCritRate;
        var skillCritDmg = totalCritDmg;
        var skillDefIgnore = totalDefIgnore;
        var skillResReduce = totalResReduce;
        var skillAtkPct = 0;
        var skillHpPct = 0;
        var skillDefPct = 0;
        // Per-skillType echo/sonata/global-inherent dmg bonuses
        var dmgKey = getSkillDamageType(skill);
        if (dmgKey && skillDmgBonuses[dmgKey]) {
            dmgBonus += skillDmgBonuses[dmgKey];
        }
        // Weapon passive per-skill dmg
        if (dmgKey && weaponDmgBonuses[dmgKey]) {
            dmgBonus += weaponDmgBonuses[dmgKey];
        }
        // Targeted inherent buffs (with targetSkill)
        for (var _i = 0, enabledBuffs_2 = enabledBuffs; _i < enabledBuffs_2.length; _i++) {
            var buff = enabledBuffs_2[_i];
            if (!isScopedEffect(buff))
                continue;
            if (!effectMatchesSkill(buff, skill, dmgKey, character.element))
                continue;
            switch (buff.type) {
                case 'dmgDeepen':
                    skillDmgDeepen += buff.value;
                    break;
                case 'critRate':
                    skillCritRate += buff.value;
                    break;
                case 'critDmg':
                    skillCritDmg += buff.value;
                    break;
                case 'defIgnore':
                    skillDefIgnore += buff.value;
                    break;
                case 'resReduce':
                    skillResReduce += buff.value;
                    break;
                case 'atkPct':
                    skillAtkPct += buff.value;
                    break;
                case 'hpPct':
                    skillHpPct += buff.value;
                    break;
                case 'defPct':
                    skillDefPct += buff.value;
                    break;
                case 'elemDmg':
                    dmgBonus += buff.value;
                    break;
                default: {
                    var buffKey = BUFF_TO_DMG_KEY[buff.type];
                    if (buffKey) {
                        dmgBonus += buff.value;
                    }
                }
            }
        }
        // Targeted chain effects (with targetSkill)
        for (var _c = 0, activeChainEffects_2 = activeChainEffects; _c < activeChainEffects_2.length; _c++) {
            var eff = activeChainEffects_2[_c];
            if (!isScopedEffect(eff))
                continue;
            if (!effectMatchesSkill(eff, skill, dmgKey, character.element))
                continue;
            switch (eff.type) {
                case 'guaranteedCrit':
                    skillGuaranteedCrit = true;
                    break;
                case 'dmgDeepen':
                    skillDmgDeepen += eff.value;
                    break;
                case 'multiplierBoost':
                    multiplier *= (1 + eff.value);
                    break;
                case 'critRate':
                    skillCritRate += eff.value;
                    break;
                case 'critDmg':
                    skillCritDmg += eff.value;
                    break;
                case 'defIgnore':
                    skillDefIgnore += eff.value;
                    break;
                case 'resReduce':
                    skillResReduce += eff.value;
                    break;
                case 'atkPct':
                    skillAtkPct += eff.value;
                    break;
                case 'hpPct':
                    skillHpPct += eff.value;
                    break;
                case 'defPct':
                    skillDefPct += eff.value;
                    break;
                case 'elemDmg':
                    dmgBonus += eff.value;
                    break;
                default: {
                    var effKey = BUFF_TO_DMG_KEY[eff.type];
                    if (effKey) {
                        dmgBonus += eff.value;
                    }
                }
            }
        }
        for (var _d = 0, targetedWeaponEffects_1 = targetedWeaponEffects; _d < targetedWeaponEffects_1.length; _d++) {
            var eff = targetedWeaponEffects_1[_d];
            if (!effectMatchesSkill(eff, skill, dmgKey, character.element))
                continue;
            switch (eff.type) {
                case 'guaranteedCrit':
                    skillGuaranteedCrit = true;
                    break;
                case 'dmgDeepen':
                    skillDmgDeepen += eff.value;
                    break;
                case 'multiplierBoost':
                    multiplier *= (1 + eff.value);
                    break;
                case 'critRate':
                    skillCritRate += eff.value;
                    break;
                case 'critDmg':
                    skillCritDmg += eff.value;
                    break;
                case 'defIgnore':
                    skillDefIgnore += eff.value;
                    break;
                case 'resReduce':
                    skillResReduce += eff.value;
                    break;
                case 'atkPct':
                    skillAtkPct += eff.value;
                    break;
                case 'hpPct':
                    skillHpPct += eff.value;
                    break;
                case 'defPct':
                    skillDefPct += eff.value;
                    break;
                case 'elemDmg':
                    dmgBonus += eff.value;
                    break;
                default: dmgBonus += eff.value;
            }
        }
        var damageStat = normalizeDamageStat(skill.damageStat);
        var baseStat = damageStat === 'hp'
            ? totalHp + baseHp * skillHpPct
            : damageStat === 'def'
                ? totalDef + baseDef * skillDefPct
                : totalAtk + baseAtk * skillAtkPct;
        var baseDmg = round5(baseStat * multiplier + flatBase);
        var deepenMult = round5(1 + skillDmgDeepen);
        var dmgBonusTotal = round5(1 + dmgBonus);
        var effectiveCritRate = Math.max(0, Math.min(1, skillCritRate));
        var expectedCritMult = skillGuaranteedCrit
            ? skillCritDmg
            : round5(1 + effectiveCritRate * (skillCritDmg - 1));
        var skillDefMult = calcDefMult(skillDefIgnore);
        var skillResMult = calcResMult(skillResReduce);
        var crit = round5(round5(round5(round5(baseDmg * dmgBonusTotal) * deepenMult) * skillCritDmg) * skillDefMult) * skillResMult;
        var expected = skillGuaranteedCrit
            ? crit
            : round5(round5(round5(round5(baseDmg * dmgBonusTotal) * deepenMult) * expectedCritMult) * skillDefMult) * skillResMult;
        console.log("[\u4F24\u5BB3\u8BA1\u7B97] ".concat(skill.name), {
            multiplier: "".concat(multiplierStr, " \u2192 ").concat(multiplier),
            damageStat: damageStat,
            baseStat: baseStat,
            flatBase: flatBase,
            baseDmg: baseDmg,
            dmgBonus: round5(dmgBonus),
            dmgBonusTotal: dmgBonusTotal,
            deepenMult: deepenMult,
            critMult: skillGuaranteedCrit ? "".concat(skillCritDmg, "(\u5FC5\u66B4)") : expectedCritMult,
            defMult: skillDefMult,
            resMult: skillResMult,
            expected: Math.round(expected),
            crit: Math.round(crit),
        });
        return {
            name: skill.name,
            tag: skill.tag,
            skillType: skill.skillType,
            multiplierStr: multiplierStr,
            multiplier: multiplier,
            damageStat: damageStat,
            expected: Math.round(expected),
            crit: Math.round(crit),
        };
    });
    var totalExpected = skills.reduce(function (s, sk) { return s + sk.expected; }, 0);
    var rSkill = ((_p = skillDmgBonuses.resonanceSkill) !== null && _p !== void 0 ? _p : 0) + ((_q = weaponDmgBonuses.resonanceSkill) !== null && _q !== void 0 ? _q : 0);
    var rLib = ((_r = skillDmgBonuses.resonanceLiberation) !== null && _r !== void 0 ? _r : 0) + ((_s = weaponDmgBonuses.resonanceLiberation) !== null && _s !== void 0 ? _s : 0);
    var nAtk = ((_t = skillDmgBonuses.normalAtk) !== null && _t !== void 0 ? _t : 0) + ((_u = weaponDmgBonuses.normalAtk) !== null && _u !== void 0 ? _u : 0);
    var hAtk = ((_v = skillDmgBonuses.heavyAtk) !== null && _v !== void 0 ? _v : 0) + ((_w = weaponDmgBonuses.heavyAtk) !== null && _w !== void 0 ? _w : 0);
    return {
        panel: {
            atk: parseFloat(totalAtk.toFixed(1)),
            hp: parseFloat(totalHp.toFixed(1)),
            def: parseFloat(totalDef.toFixed(1)),
            critRate: totalCritRate,
            critDmg: totalCritDmg,
            elemDmg: baseElemDmg,
            energyRegen: echoStats.energyRegen,
            resonanceSkillDmg: rSkill,
            resonanceLiberationDmg: rLib,
            normalAtkDmg: nAtk,
            heavyAtkDmg: hAtk,
        },
        breakdown: {
            atk: { total: parseFloat(totalAtk.toFixed(1)), baseAtk: baseAtk, sources: src.atk },
            hp: { total: parseFloat(totalHp.toFixed(1)), baseHp: baseHp, sources: src.hp },
            def: { total: parseFloat(totalDef.toFixed(1)), baseDef: baseDef, sources: src.def },
            critRate: { total: totalCritRate, sources: src.critRate },
            critDmg: { total: totalCritDmg, sources: src.critDmg },
            elemDmg: { total: baseElemDmg, sources: src.elemDmg },
            normalAtkDmg: { total: nAtk, sources: src.normalAtk },
            heavyAtkDmg: { total: hAtk, sources: src.heavyAtk },
            resonanceSkillDmg: { total: rSkill, sources: src.resonanceSkill },
            resonanceLiberationDmg: { total: rLib, sources: src.resonanceLiberation },
        },
        skills: skills,
        totalExpected: totalExpected,
    };
}

module.exports = { KEY_SKILL_DAMAGE_LIMIT: KEY_SKILL_DAMAGE_LIMIT, selectKeySkills: selectKeySkills, parseMultiplierStr: parseMultiplierStr, calcDamage: calcDamage }
