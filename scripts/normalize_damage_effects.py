#!/usr/bin/env python3
"""Normalize damage categories and structured effects across Web and miniprogram data."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHARACTERS_PATH = ROOT / "src/data/characters-base.json"
WEAPONS_PATH = ROOT / "src/data/weapons.json"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sync_characters(characters) -> None:
    write_json(CHARACTERS_PATH, characters)
    write_json(ROOT / "miniprogram/data/characters-base.json", characters)
    body = json.dumps(characters, ensure_ascii=False, indent=2)
    (ROOT / "miniprogram/data/characters-base.js").write_text(
        "// Auto-generated from characters-base.json for miniprogram CommonJS compatibility.\n"
        f"module.exports = {body}\n",
        encoding="utf-8",
    )


def sync_weapons(weapons) -> None:
    write_json(WEAPONS_PATH, weapons)
    write_json(ROOT / "miniprogram/data/weapons.json", weapons)
    body = json.dumps(weapons, ensure_ascii=False, indent=2)
    (ROOT / "miniprogram/data/weapons.js").write_text(
        "// Auto-generated from weapons.json for miniprogram CommonJS compatibility.\n"
        f"module.exports = {body}\n",
        encoding="utf-8",
    )


def find_effect(character, sequence: int, condition_part: str):
    return next(
        effect for effect in character.get("chainEffects", [])
        if effect["sequence"] == sequence and condition_part in effect.get("condition", "")
    )


def normalize_characters(characters) -> None:
    # Named heavy attacks use the heavy damage pool unless official text explicitly overrides it.
    for character in characters.values():
        for skill in character.get("skills", []):
            if "重击" in skill.get("name", "") or "重斩" in skill.get("name", ""):
                skill["damageType"] = "heavyAtk"
                skill.pop("isHeavy", None)

    official_overrides = {
        "爱弥斯": {
            "重击·爱弥斯·一段蓄力伤害": "resonanceLiberation",
            "重击·爱弥斯·二段蓄力伤害": "resonanceLiberation",
            "重击·机兵·一段蓄力伤害": "resonanceLiberation",
            "重击·机兵·二段蓄力伤害": "resonanceLiberation",
        },
        "卡提希娅": {
            "重击伤害": "normalAtk",
            "强化重击伤害": "normalAtk",
        },
        "琳奈": {
            "绮彩巡游·地面重击伤害": "normalAtk",
            "绮彩巡游·空中重击伤害": "normalAtk",
        },
    }
    for character_name, overrides in official_overrides.items():
        for skill in characters[character_name]["skills"]:
            if skill["name"] in overrides:
                skill["damageType"] = overrides[skill["name"]]

    # Screenshot-verified active combat states used by the max-condition calculator.
    aemeath_buffs = characters["爱弥斯"].setdefault("inherentBuffs", [])
    additions = [
        {
            "type": "critDmg",
            "value": 0.2,
            "condition": "附加震谐·偏移或聚爆效应后暴击伤害+20%",
            "targetSkill": ".",
        },
        {
            "type": "dmgDeepen",
            "value": 2,
            "condition": "即刻响应状态下自身重击伤害加深200%",
            "targetSkill": "^重击·爱弥斯",
        },
    ]
    existing = {(item["type"], item.get("condition")) for item in aemeath_buffs}
    for item in additions:
        if (item["type"], item["condition"]) not in existing:
            aemeath_buffs.append(item)

    # Correct targets that drifted after official skill rows were split or renamed.
    find_effect(characters["散华"], 5, "冰绽")["targetSkill"] = "^(爆裂伤害|冰川爆炸伤害|冰棱爆炸伤害|冰棘爆炸伤害)$"
    find_effect(characters["凌阳"], 6, "普攻伤害加成").pop("targetSkill", None)
    find_effect(characters["桃祈"], 5, "攻防转换")["targetSkill"] = "^御反之隙.*伤害$"
    for condition in ("倍率+60%", "无视60%防御"):
        effect = find_effect(characters["洛可可"], 4 if "倍率" in condition else 6, condition)
        effect.pop("targetSkill", None)
        effect["targetTreeId"] = "7"

    # Previously global multiplier boosts actually target documented skill subsets.
    find_effect(characters["嘉贝莉娜"], 6, "永恒位格")["targetSkill"] = "普攻|重击|空中攻击|闪避反击"
    find_effect(characters["奥古斯塔"], 3, "相关倍率")["targetSkill"] = "重击|共鸣技能|共鸣解放|赫日威临"
    find_effect(characters["丽贝卡"], 1, "猎手/铁胆")["targetSkill"] = "猎手|铁胆"
    cathexis = find_effect(characters["卡提希娅"], 2, "普攻/重击")
    cathexis["targetTreeId"] = "1|6"
    cathexis["targetSkill"] = "^(?!空中攻击).*$"
    rococo = find_effect(characters["洛可可"], 5, "重击倍率")
    rococo["damageType"] = "heavyAtk"


def effect(effect_type: str, param_idx: int, condition: str, **scope):
    return {"type": effect_type, "paramIdx": param_idx, "condition": condition, **scope}


def normalize_weapons(weapons) -> None:
    by_name = {weapon["name"]: weapon for weapon in weapons}

    additions = {
        "驭冕铸雷之权": [
            effect("defIgnore", 3, "shieldMaxStacks", damageType="heavyAtk", stacks=5, stackParamIdx=4),
        ],
        "灼霜": [
            effect("dmgDeepen", 1, "afterFrostApplication", targetElement="冷凝"),
            effect("defIgnore", 2, "afterFrostApplication", damageType="resonanceLiberation"),
            effect("dmgDeepen", 3, "frostEffectDamage", damageType="effect"),
        ],
        "永远的启明星": [
            effect("defIgnore", 1, "afterResonanceEffect", damageType="resonanceLiberation"),
            effect("resReduce", 2, "afterResonanceEffect", damageType="resonanceLiberation", targetElement="热熔"),
        ],
        "血誓盟约": [
            effect("resonanceSkillDmg", 0, "afterHealing"),
            effect("dmgDeepen", 2, "afterAeroRoverSkill", targetElement="气动"),
        ],
        "不屈命定之冠": [
            effect("hpPct", 0, "always"),
            effect("defIgnore", 1, "afterIntroOrNormalAttack"),
            effect("dmgDeepen", 2, "targetHasAeroErosion"),
        ],
        "白昼之脊": [
            effect("elemDmg", 1, "afterNormalAttack", targetElement="衍射"),
            effect("dmgDeepen", 3, "afterTuningOffset", damageType="normalAtk"),
            effect("defIgnore", 4, "afterTuningOffset", damageType="normalAtk"),
        ],
        "万物持存的注释": [
            effect("resonanceLiberationDmg", 1, "afterIntroOrLiberation"),
            effect("defIgnore", 3, "shieldMaxStacks", damageType="resonanceLiberation", stacks=5, stackParamIdx=5),
        ],
        "焰光裁定": [
            effect("defIgnore", 1, "afterNormalAttack"),
            effect("dmgDeepen", 2, "spectroFrazzleDamage", damageType="effect"),
        ],
        "昭日译注": [
            effect("dmgDeepen", 1, "afterIntroOrEchoSkill", damageType="phantom"),
            effect("defIgnore", 3, "afterEchoSkillDamage", targetElement="气动"),
        ],
        "蜃影": [
            effect("elemDmg", 1, "afterResonanceSkillMaxStacks", targetElement="衍射", stacks=2, stackParamIdx=2),
            effect("dmgDeepen", 4, "afterHavocTuningOffset", damageType="heavyAtk"),
            effect("defIgnore", 5, "afterHavocTuningOffset", damageType="heavyAtk", valueScale=0.01),
        ],
        "光影双生": [
            effect("dmgDeepen", 1, "afterEchoSkillDamage", damageType="heavyAtk"),
            effect("dmgDeepen", 3, "afterHeavyAttackDamage", damageType="phantom"),
            effect("defIgnore", 6, "bothEffectsActive"),
        ],
        "幽冥的忘忧章": [
            effect("resonanceSkillDmg", 2, "afterEchoSkillDamage"),
            effect("dmgDeepen", 3, "afterEchoSkillDamage", damageType="phantom"),
            effect("defIgnore", 4, "afterEchoSkillDamage"),
        ],
        "和光回唱": [
            effect("normalAtkDmg", 1, "targetHasSpectroFrazzleMaxStacks", stacks=3, stackParamIdx=2),
            effect("heavyAtkDmg", 1, "targetHasSpectroFrazzleMaxStacks", stacks=3, stackParamIdx=2),
            effect("dmgDeepen", 4, "afterOutroSpectroFrazzleDamage", damageType="effect"),
        ],
        "海的呢喃": [
            effect("normalAtkDmg", 6, "softDreamStack1"),
            effect("resReduce", 8, "softDreamStack2", targetElement="湮灭"),
        ],
    }

    for name, new_effects in additions.items():
        weapon = by_name[name]
        existing = weapon.setdefault("passiveEffects", [])
        keys = {(item["type"], item["paramIdx"], item.get("condition")) for item in existing}
        for item in new_effects:
            key = (item["type"], item["paramIdx"], item.get("condition"))
            if key not in keys:
                existing.append(item)
                keys.add(key)


def main() -> None:
    characters = load(CHARACTERS_PATH)
    weapons = load(WEAPONS_PATH)
    normalize_characters(characters)
    normalize_weapons(weapons)
    sync_characters(characters)
    sync_weapons(weapons)


if __name__ == "__main__":
    main()
