// Auto-generated from src/lib/damage.ts. Do not edit directly.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEY_SKILL_DAMAGE_LIMIT = void 0;
exports.selectKeySkills = selectKeySkills;
exports.parseMultiplierStr = parseMultiplierStr;
exports.calcDamage = calcDamage;
const SONATA_EFFECTS = require("../data/sonata-effects.js");
const nightmare_bonuses_js_1 = require("../data/nightmare-bonuses.js");
const sonataEffects = SONATA_EFFECTS;
const SKILL_DMG_MAP = {
    NORMAL_ATK_DMG: 'normalAtk',
    HEAVY_ATK_DMG: 'heavyAtk',
    RESONANCE_SKILL_DMG: 'resonanceSkill',
    RESONANCE_LIBERATION_DMG: 'resonanceLiberation',
};
const SKILLTYPE_TO_DMG = {
    '常态攻击': 'normalAtk',
    '共鸣技能': 'resonanceSkill',
    '共鸣解放': 'resonanceLiberation',
    '共鸣回路': 'resonanceSkill',
};
const BUFF_TO_DMG_KEY = {
    normalAtkDmg: 'normalAtk',
    heavyAtkDmg: 'heavyAtk',
    resonanceSkillDmg: 'resonanceSkill',
    resonanceLiberationDmg: 'resonanceLiberation',
    phantomDmg: 'phantom',
};
exports.KEY_SKILL_DAMAGE_LIMIT = 5;
/** Keep the most representative damage rows for compact loadout presentation. */
function selectKeySkills(skills, limit = exports.KEY_SKILL_DAMAGE_LIMIT) {
    if (limit <= 0)
        return [];
    return skills
        .map((skill, index) => ({ skill, index }))
        .sort((a, b) => b.skill.expected - a.skill.expected || b.skill.crit - a.skill.crit || a.index - b.index)
        .slice(0, limit)
        .map(item => item.skill);
}
/** Round to 5 decimal places (ATK and all multipliers) */
const round5 = (v) => Math.round(v * 1e5) / 1e5;
/** Round to 9 decimal places (defense multiplier) */
const round9 = (v) => Math.round(v * 1e9) / 1e9;
function collectEchoStats(echoes, characterName) {
    var _a, _b;
    const stats = {
        atkPct: 0, flatAtk: 0, hpPct: 0, flatHp: 0, defPct: 0, flatDef: 0,
        critRate: 0, critDmg: 0, elemDmg: 0, energyRegen: 0,
        skillDmg: { normalAtk: 0, heavyAtk: 0, resonanceSkill: 0, resonanceLiberation: 0, phantom: 0 },
        nightmareElemDmg: 0,
        nightmareSecondType: '',
        nightmareSecondValue: 0,
    };
    for (const echo of echoes) {
        const allEntries = [
            echo.mainStat,
            echo.secondaryStat,
            ...echo.substats,
        ].filter(Boolean);
        for (const entry of allEntries) {
            if (!entry)
                continue;
            const { type, value } = entry;
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
                    const key = SKILL_DMG_MAP[type];
                    if (key)
                        stats.skillDmg[key] += value / 100;
                }
            }
        }
        // Nightmare bonus: use stored field or auto-match by name (with character filter)
        const nmBonus = (_a = echo.nightmareBonus) !== null && _a !== void 0 ? _a : (0, nightmare_bonuses_js_1.getNightmareBonus)(echo.monsterName, characterName);
        if (nmBonus) {
            stats.nightmareElemDmg += (_b = nmBonus.elemDmg) !== null && _b !== void 0 ? _b : 0;
            if (nmBonus.secondValue > 0) {
                stats.nightmareSecondType = nmBonus.secondType;
                stats.nightmareSecondValue += nmBonus.secondValue;
            }
        }
    }
    return stats;
}
function collectSonataBuffs(echoes) {
    var _a;
    const counts = {};
    for (const e of echoes) {
        if (e.sonata)
            counts[e.sonata] = ((_a = counts[e.sonata]) !== null && _a !== void 0 ? _a : 0) + 1;
    }
    let atkPct = 0;
    let hpPct = 0;
    let defPct = 0;
    let elemDmg = 0;
    let critRate = 0;
    let critDmg = 0;
    const skillDmg = {};
    for (const [sonata, count] of Object.entries(counts)) {
        const effect = sonataEffects[sonata];
        if (!effect)
            continue;
        if (count >= 2 && effect.set2) {
            const effects = Array.isArray(effect.set2) ? effect.set2 : [effect.set2];
            for (const eff of effects) {
                const val = eff.stacks ? eff.value * eff.stacks : eff.value;
                applyBuff(eff.type, val);
            }
        }
        if (count >= 3 && effect.set3) {
            const effects = Array.isArray(effect.set3) ? effect.set3 : [effect.set3];
            for (const eff of effects) {
                const val = eff.stacks ? eff.value * eff.stacks : eff.value;
                applyBuff(eff.type, val);
            }
        }
        if (count >= 5 && effect.set5) {
            const effects = Array.isArray(effect.set5) ? effect.set5 : [effect.set5];
            for (const eff of effects) {
                const val = eff.stacks ? eff.value * eff.stacks : eff.value;
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
            const key = BUFF_TO_DMG_KEY[type];
            if (key)
                skillDmg[key] = ((_a = skillDmg[key]) !== null && _a !== void 0 ? _a : 0) + value;
        }
    }
    return { atkPct, hpPct, defPct, elemDmg, critRate, critDmg, skillDmg };
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
    const match = paramStr.match(/^([0-9.]+)(%?)$/);
    if (!match)
        return 0;
    const val = parseFloat(match[1]);
    return match[2] === '%' ? val / 100 : val;
}
function parseMultiplierStr(str) {
    if (!str || !str.includes('%'))
        return 0;
    const parts = str.split('+');
    let total = 0;
    for (const part of parts) {
        const trimmed = part.trim();
        const match = trimmed.match(/^([0-9.]+)%+(?:\*(\d+))?(?:生命|防御|攻击)?$/);
        if (match) {
            const pct = parseFloat(match[1]) / 100;
            const count = match[2] ? parseInt(match[2]) : 1;
            total += pct * count;
        }
    }
    return total;
}
function parseFlatBaseValue(str) {
    if (!str)
        return 0;
    const parts = str.split('+');
    let total = 0;
    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('%'))
            continue;
        const match = trimmed.match(/^([0-9.]+)(?:\*(\d+))?$/);
        if (match) {
            const value = parseFloat(match[1]);
            const count = match[2] ? parseInt(match[2]) : 1;
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
    catch {
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
    if (effect.targetTreeId && !new RegExp(`^(?:${effect.targetTreeId})$`).test(skill.treeId))
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
function calcDamage(character, weapon, weaponRefine, echoes, _chainNodes = -1, skillLevel = 10, charLevel = 90, enemyLevel = 89, enemyResist = 0.1, chainLevel = 0, characterName) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    void _chainNodes;
    const echoStats = collectEchoStats(echoes, characterName);
    const sonataBuff = collectSonataBuffs(echoes);
    const refineIdx = Math.max(0, Math.min(4, weaponRefine - 1));
    const levelIdx = Math.max(0, Math.min(18, skillLevel - 1));
    const baseAtk = character.baseAtk + weapon.baseAtk;
    const enabledBuffs = character.inherentBuffs.filter(isBuffEnabled);
    const activeChainLevel = Math.min(6, chainLevel);
    const activeChainEffects = [];
    if (character.chainEffects) {
        for (const eff of character.chainEffects) {
            if (eff.sequence <= activeChainLevel && eff.enabled !== false) {
                activeChainEffects.push(eff);
            }
        }
    }
    const src = {
        atk: [], hp: [], def: [], critRate: [], critDmg: [], elemDmg: [],
        normalAtk: [], heavyAtk: [], resonanceSkill: [], resonanceLiberation: [],
    };
    function addSrc(cat, label, value) {
        if (value)
            src[cat].push({ label, value });
    }
    // --- Collect global buffs with source tracking ---
    let totalAtkPct = 0;
    let totalHpPct = 0;
    let totalDefPct = 0;
    let totalCritRate = 0.05;
    let totalCritDmg = 1.50;
    let baseElemDmg = 0;
    let totalDefIgnore = 0;
    let totalResReduce = 0;
    let globalDmgDeepen = 0;
    let globalMultiplierFactor = 1;
    // Weapon secondary stat
    if (weapon.atkPct) {
        totalAtkPct += weapon.atkPct;
        addSrc('atk', `${weapon.name}副属性`, weapon.atkPct);
    }
    if (weapon.critRate) {
        totalCritRate += weapon.critRate;
        addSrc('critRate', `${weapon.name}副属性`, weapon.critRate);
    }
    if (weapon.critDmg) {
        totalCritDmg += weapon.critDmg;
        addSrc('critDmg', `${weapon.name}副属性`, weapon.critDmg);
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
    const skillDmgBonuses = { normalAtk: 0, heavyAtk: 0, resonanceSkill: 0, resonanceLiberation: 0, phantom: 0 };
    // Echo skill dmg substats
    for (const [k, v] of Object.entries(echoStats.skillDmg)) {
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
            const nmKey = BUFF_TO_DMG_KEY[echoStats.nightmareSecondType];
            if (nmKey && skillDmgBonuses[nmKey] !== undefined) {
                skillDmgBonuses[nmKey] += echoStats.nightmareSecondValue;
                addSrc(nmKey, '梦魇声骸技能增伤', echoStats.nightmareSecondValue);
            }
        }
    }
    // Sonata skill dmg
    for (const [k, v] of Object.entries(sonataBuff.skillDmg)) {
        if (v) {
            skillDmgBonuses[k] += v;
            addSrc(k, '套装效果', v);
        }
    }
    // ascensionStat: 90级满突后已包含在baseAtk/基础暴击中，不再额外计算
    // Inherent buffs
    for (const buff of enabledBuffs) {
        if (isScopedEffect(buff))
            continue;
        const lbl = (_a = buff.condition) !== null && _a !== void 0 ? _a : '固有技能';
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
                const key = BUFF_TO_DMG_KEY[buff.type];
                if (key) {
                    skillDmgBonuses[key] += buff.value;
                    addSrc(key, lbl, buff.value);
                }
            }
        }
    }
    // Chain effects — global
    for (const eff of activeChainEffects) {
        if (isScopedEffect(eff))
            continue;
        const lbl = `S${eff.sequence} ${(_b = eff.condition) !== null && _b !== void 0 ? _b : '命座'}`;
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
                const key = BUFF_TO_DMG_KEY[eff.type];
                if (key) {
                    skillDmgBonuses[key] += eff.value;
                    addSrc(key, lbl, eff.value);
                }
            }
        }
    }
    // Weapon passive effects
    const weaponDmgBonuses = {};
    const targetedWeaponEffects = [];
    if (weapon.passiveEffects) {
        for (const eff of weapon.passiveEffects) {
            if (eff.enabled === false)
                continue;
            const paramArr = (_d = (_c = weapon.passive) === null || _c === void 0 ? void 0 : _c.param) === null || _d === void 0 ? void 0 : _d[eff.paramIdx];
            if (!paramArr)
                continue;
            let val = parseParamValue((_f = (_e = paramArr[refineIdx]) !== null && _e !== void 0 ? _e : paramArr[paramArr.length - 1]) !== null && _f !== void 0 ? _f : '');
            if (eff.valueScale)
                val *= eff.valueScale;
            if (eff.stacks) {
                const stackCount = eff.stackParamIdx != null
                    ? parseParamValue((_k = (_j = (_h = (_g = weapon.passive) === null || _g === void 0 ? void 0 : _g.param) === null || _h === void 0 ? void 0 : _h[eff.stackParamIdx]) === null || _j === void 0 ? void 0 : _j[refineIdx]) !== null && _k !== void 0 ? _k : '')
                    : eff.stacks;
                val *= stackCount;
            }
            const lbl = `${weapon.name}被动`;
            if (isScopedEffect(eff)) {
                targetedWeaponEffects.push({ ...eff, value: val });
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
                    const key = BUFF_TO_DMG_KEY[eff.type];
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
    const totalAtk = round5(baseAtk * (1 + totalAtkPct) + echoStats.flatAtk);
    const baseHp = (_m = character.baseHp) !== null && _m !== void 0 ? _m : 0;
    const baseDef = (_o = character.baseDef) !== null && _o !== void 0 ? _o : 0;
    const totalHp = round5(baseHp * (1 + totalHpPct) + echoStats.flatHp);
    const totalDef = round5(baseDef * (1 + totalDefPct) + echoStats.flatDef);
    const calcDefMult = (defIgnore) => round9((100 + charLevel) / ((99 + enemyLevel) + (100 + charLevel) * (1 - defIgnore)));
    const calcResMult = (resReduce) => round5(1 - Math.max(0, enemyResist - resReduce));
    const defMult = calcDefMult(totalDefIgnore);
    const resMult = calcResMult(totalResReduce);
    // Damage calculation log
    console.log('[伤害计算] 基础参数', {
        baseAtk,
        weapon: weapon.name,
        totalAtkPct: round5(totalAtkPct),
        totalHpPct: round5(totalHpPct),
        totalDefPct: round5(totalDefPct),
        flatAtk: echoStats.flatAtk,
        flatHp: echoStats.flatHp,
        flatDef: echoStats.flatDef,
        totalAtk,
        totalHp,
        totalDef,
        critRate: totalCritRate,
        critDmg: totalCritDmg,
        baseElemDmg,
        nightmare: echoStats.nightmareElemDmg > 0 ? { elemDmg: echoStats.nightmareElemDmg, secondType: echoStats.nightmareSecondType, secondValue: echoStats.nightmareSecondValue } : null,
        defMult,
        resMult,
    });
    const skills = character.skills.map(skill => {
        var _a, _b;
        const multiplierStr = (_b = (_a = skill.multipliers[levelIdx]) !== null && _a !== void 0 ? _a : skill.multipliers[skill.multipliers.length - 1]) !== null && _b !== void 0 ? _b : '0%';
        let multiplier = parseMultiplierStr(multiplierStr) * globalMultiplierFactor;
        const flatBase = parseFlatBaseValue(multiplierStr);
        let dmgBonus = baseElemDmg + skill.bonusDmg;
        let skillDmgDeepen = globalDmgDeepen;
        let skillGuaranteedCrit = false;
        let skillCritRate = totalCritRate;
        let skillCritDmg = totalCritDmg;
        let skillDefIgnore = totalDefIgnore;
        let skillResReduce = totalResReduce;
        let skillAtkPct = 0;
        let skillHpPct = 0;
        let skillDefPct = 0;
        // Per-skillType echo/sonata/global-inherent dmg bonuses
        const dmgKey = getSkillDamageType(skill);
        if (dmgKey && skillDmgBonuses[dmgKey]) {
            dmgBonus += skillDmgBonuses[dmgKey];
        }
        // Weapon passive per-skill dmg
        if (dmgKey && weaponDmgBonuses[dmgKey]) {
            dmgBonus += weaponDmgBonuses[dmgKey];
        }
        // Targeted inherent buffs (with targetSkill)
        for (const buff of enabledBuffs) {
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
                    const buffKey = BUFF_TO_DMG_KEY[buff.type];
                    if (buffKey) {
                        dmgBonus += buff.value;
                    }
                }
            }
        }
        // Targeted chain effects (with targetSkill)
        for (const eff of activeChainEffects) {
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
                    const effKey = BUFF_TO_DMG_KEY[eff.type];
                    if (effKey) {
                        dmgBonus += eff.value;
                    }
                }
            }
        }
        for (const eff of targetedWeaponEffects) {
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
        const damageStat = normalizeDamageStat(skill.damageStat);
        const baseStat = damageStat === 'hp'
            ? totalHp + baseHp * skillHpPct
            : damageStat === 'def'
                ? totalDef + baseDef * skillDefPct
                : totalAtk + baseAtk * skillAtkPct;
        const baseDmg = round5(baseStat * multiplier + flatBase);
        const deepenMult = round5(1 + skillDmgDeepen);
        const dmgBonusTotal = round5(1 + dmgBonus);
        const effectiveCritRate = Math.max(0, Math.min(1, skillCritRate));
        const expectedCritMult = skillGuaranteedCrit
            ? skillCritDmg
            : round5(1 + effectiveCritRate * (skillCritDmg - 1));
        const skillDefMult = calcDefMult(skillDefIgnore);
        const skillResMult = calcResMult(skillResReduce);
        const crit = round5(round5(round5(round5(baseDmg * dmgBonusTotal) * deepenMult) * skillCritDmg) * skillDefMult) * skillResMult;
        const expected = skillGuaranteedCrit
            ? crit
            : round5(round5(round5(round5(baseDmg * dmgBonusTotal) * deepenMult) * expectedCritMult) * skillDefMult) * skillResMult;
        console.log(`[伤害计算] ${skill.name}`, {
            multiplier: `${multiplierStr} → ${multiplier}`,
            damageStat,
            baseStat,
            flatBase,
            baseDmg,
            dmgBonus: round5(dmgBonus),
            dmgBonusTotal,
            deepenMult,
            critMult: skillGuaranteedCrit ? `${skillCritDmg}(必暴)` : expectedCritMult,
            defMult: skillDefMult,
            resMult: skillResMult,
            expected: Math.round(expected),
            crit: Math.round(crit),
        });
        return {
            name: skill.name,
            tag: skill.tag,
            skillType: skill.skillType,
            multiplierStr,
            multiplier,
            damageStat,
            expected: Math.round(expected),
            crit: Math.round(crit),
        };
    });
    const totalExpected = skills.reduce((s, sk) => s + sk.expected, 0);
    const rSkill = ((_p = skillDmgBonuses.resonanceSkill) !== null && _p !== void 0 ? _p : 0) + ((_q = weaponDmgBonuses.resonanceSkill) !== null && _q !== void 0 ? _q : 0);
    const rLib = ((_r = skillDmgBonuses.resonanceLiberation) !== null && _r !== void 0 ? _r : 0) + ((_s = weaponDmgBonuses.resonanceLiberation) !== null && _s !== void 0 ? _s : 0);
    const nAtk = ((_t = skillDmgBonuses.normalAtk) !== null && _t !== void 0 ? _t : 0) + ((_u = weaponDmgBonuses.normalAtk) !== null && _u !== void 0 ? _u : 0);
    const hAtk = ((_v = skillDmgBonuses.heavyAtk) !== null && _v !== void 0 ? _v : 0) + ((_w = weaponDmgBonuses.heavyAtk) !== null && _w !== void 0 ? _w : 0);
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
            atk: { total: parseFloat(totalAtk.toFixed(1)), baseAtk, sources: src.atk },
            hp: { total: parseFloat(totalHp.toFixed(1)), baseHp, sources: src.hp },
            def: { total: parseFloat(totalDef.toFixed(1)), baseDef, sources: src.def },
            critRate: { total: totalCritRate, sources: src.critRate },
            critDmg: { total: totalCritDmg, sources: src.critDmg },
            elemDmg: { total: baseElemDmg, sources: src.elemDmg },
            normalAtkDmg: { total: nAtk, sources: src.normalAtk },
            heavyAtkDmg: { total: hAtk, sources: src.heavyAtk },
            resonanceSkillDmg: { total: rSkill, sources: src.resonanceSkill },
            resonanceLiberationDmg: { total: rLib, sources: src.resonanceLiberation },
        },
        skills,
        totalExpected,
    };
}
