#!/usr/bin/env python3
"""Merge official Kuro skill multipliers and branch enhancements into character data."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from copy import deepcopy
from pathlib import Path
from typing import Any

try:
    from scripts.compare_kuro_lv10 import (
        classify_values,
        normalize_label,
        project_character_name,
    )
except ModuleNotFoundError:
    from compare_kuro_lv10 import (
        classify_values,
        normalize_label,
        project_character_name,
    )


DEFAULT_BASE = Path("src/data/characters-base.json")
DEFAULT_OFFICIAL = Path("outputs/kuro-character-skill-details.json")
DEFAULT_MINIPROGRAM_JSON = Path("miniprogram/data/characters-base.json")
DEFAULT_MINIPROGRAM_JS = Path("miniprogram/data/characters-base.js")
DEFAULT_REPORT = Path("outputs/kuro-character-skill-merge-report.json")

SKILL_METADATA = {
    "常态攻击": {"tag": "E", "treeId": "1"},
    "共鸣技能": {"tag": "E", "treeId": "2"},
    "共鸣解放": {"tag": "Q", "treeId": "3"},
    "变奏技能": {"tag": "变奏", "treeId": "6"},
    "共鸣回路": {"tag": "E", "treeId": "7"},
}


def official_signature(result: dict[str, Any]) -> list[tuple[Any, ...]]:
    return sorted(
        (
            skill.get("skillType", ""),
            row_type,
            row.get("label", ""),
            tuple(sorted(row.get("levels", {}).items())),
        )
        for skill in result.get("skills", [])
        for row_type, field in (
            ("damage", "damageRows"),
            ("healing", "healingRows"),
        )
        for row in skill.get(field, [])
    )


def normalize_official_results(
    results: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    normalized: dict[str, dict[str, Any]] = {}
    for result in results:
        character = project_character_name(result["name"])
        previous = normalized.get(character)
        if previous is not None:
            if official_signature(previous) != official_signature(result):
                raise ValueError(
                    f"official gender variants differ for {character}: "
                    f"{previous['name']} vs {result['name']}"
                )
            continue
        normalized[character] = result
    return normalized


def row_matches_skill(row: dict[str, Any], skill: dict[str, Any]) -> bool:
    multipliers = skill.get("multipliers", [])
    available = [
        (int(level), value)
        for level, value in row.get("levels", {}).items()
        if int(level) <= len(multipliers)
    ]
    return len(available) >= 8 and all(
        classify_values(multipliers[level - 1], value) != "different"
        for level, value in available
    )


def row_composes_skill(
    row: dict[str, Any],
    other_rows: list[dict[str, Any]],
    skill: dict[str, Any],
) -> bool:
    multipliers = skill.get("multipliers", [])
    for other in other_rows:
        available_levels = sorted(
            set(row.get("levels", {})) & set(other.get("levels", {})),
            key=int,
        )
        checks = [
            classify_values(
                multipliers[int(level) - 1],
                f"{row['levels'][level]}+{other['levels'][level]}",
            )
            for level in available_levels
            if int(level) <= len(multipliers)
        ]
        if len(checks) >= 8 and all(status != "different" for status in checks):
            return True
    return False


def replace_official_levels(
    skill: dict[str, Any], levels: dict[str, str]
) -> None:
    multipliers = skill.setdefault("multipliers", [])
    for level, value in sorted(levels.items(), key=lambda item: int(item[0])):
        index = int(level) - 1
        if index >= len(multipliers):
            multipliers.extend([""] * (index + 1 - len(multipliers)))
        multipliers[index] = value


def flatten_branches(result: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "skillType": skill["skillType"],
            "skillTitle": skill.get("title", ""),
            "name": branch["name"],
            "valueText": branch["valueText"],
            "valuePercent": branch["valuePercent"],
        }
        for skill in result.get("skills", [])
        for branch in skill.get("branchEnhancements", [])
    ]


def create_skill(
    skill_type: str, row: dict[str, Any]
) -> dict[str, Any] | None:
    levels = row.get("levels", {})
    if any(str(level) not in levels for level in range(1, 11)):
        return None
    metadata = SKILL_METADATA.get(skill_type)
    if metadata is None:
        return None
    skill = {
        "name": row["label"],
        "multipliers": [levels[str(level)] for level in range(1, 11)],
        "tag": metadata["tag"],
        "bonusDmg": 0,
        "treeId": metadata["treeId"],
        "skillType": skill_type,
        "source": "kuro-official",
    }
    if "重击" in row["label"]:
        skill["isHeavy"] = True
    return skill


def merge_character(
    character_base: dict[str, Any], result: dict[str, Any]
) -> tuple[Counter[str], list[dict[str, str]]]:
    stats: Counter[str] = Counter()
    audit_rows: list[dict[str, str]] = []
    character_base["branchEnhancements"] = flatten_branches(result)
    stats["branches"] = len(character_base["branchEnhancements"])

    skills = character_base.setdefault("skills", [])
    if not skills:
        for official_skill in result.get("skills", []):
            for row in official_skill.get("damageRows", []):
                skill = create_skill(official_skill["skillType"], row)
                if skill is None:
                    stats["skipped_incomplete_new_skill"] += 1
                    continue
                skills.append(skill)
                stats["created_skill"] += 1
            for row in official_skill.get("healingRows", []):
                stats["unmapped_official_row"] += 1
                audit_rows.append(
                    {
                        "status": "unmapped",
                        "skillType": official_skill["skillType"],
                        "officialLabel": row["label"],
                    }
                )
        stats["official_generated_skill"] = sum(
            skill.get("source") == "kuro-official" for skill in skills
        )
        return stats, audit_rows

    assigned: set[int] = set()
    for official_skill in result.get("skills", []):
        skill_type = official_skill["skillType"]
        typed_candidates = [
            (index, skill)
            for index, skill in enumerate(skills)
            if skill.get("skillType") == skill_type
        ]
        all_rows = [
            *official_skill.get("damageRows", []),
            *official_skill.get("healingRows", []),
        ]
        for row in all_rows:
            named = [
                (index, skill)
                for index, skill in typed_candidates
                if normalize_label(skill["name"]) == normalize_label(row["label"])
            ]
            match: tuple[int, dict[str, Any]] | None = (
                named[0] if len(named) == 1 else None
            )
            match_type = "name"

            if match is None:
                sequence_matches = [
                    (index, skill)
                    for index, skill in typed_candidates
                    if index not in assigned and row_matches_skill(row, skill)
                ]
                if len(sequence_matches) == 1:
                    match = sequence_matches[0]
                    match_type = "sequence"

            if match is None:
                stats["unmapped_official_row"] += 1
                audit_rows.append(
                    {
                        "status": "unmapped",
                        "skillType": skill_type,
                        "officialLabel": row["label"],
                    }
                )
                continue

            index, skill = match
            assigned.add(index)
            if row_composes_skill(row, all_rows, skill):
                stats["preserved_composite_skill"] += 1
                audit_rows.append(
                    {
                        "status": "preserved_composite",
                        "skillType": skill_type,
                        "officialLabel": row["label"],
                        "baseLabel": skill["name"],
                    }
                )
                continue

            replace_official_levels(skill, row["levels"])
            stats[f"updated_by_{match_type}"] += 1

    stats["official_generated_skill"] = sum(
        skill.get("source") == "kuro-official" for skill in skills
    )
    return stats, audit_rows


def merge(
    base: dict[str, Any], official_results: list[dict[str, Any]]
) -> tuple[dict[str, Any], dict[str, Any]]:
    merged = deepcopy(base)
    official = normalize_official_results(official_results)
    totals: Counter[str] = Counter()
    missing_characters: list[str] = []
    audit_rows: list[dict[str, str]] = []

    for character, result in official.items():
        character_base = merged.get(character)
        if character_base is None:
            missing_characters.append(character)
            continue
        character_stats, character_audit = merge_character(
            character_base, result
        )
        totals.update(character_stats)
        audit_rows.extend(
            {"character": character, **row} for row in character_audit
        )

    report = {
        "summary": {
            "baseCharacters": len(base),
            "officialCharacters": len(official),
            "mergedCharacters": len(official) - len(missing_characters),
            **dict(sorted(totals.items())),
        },
        "missingBaseCharacters": missing_characters,
        "auditRows": audit_rows,
    }
    return merged, report


def write_outputs(
    merged: dict[str, Any],
    report: dict[str, Any],
    base_path: Path,
    miniprogram_json_path: Path,
    miniprogram_js_path: Path,
    report_path: Path,
) -> None:
    serialized = json.dumps(merged, ensure_ascii=False, indent=2) + "\n"
    base_path.write_text(serialized, encoding="utf-8")
    miniprogram_json_path.write_text(serialized, encoding="utf-8")
    miniprogram_js_path.write_text(
        "// Auto-generated from characters-base.json for miniprogram CommonJS compatibility.\n"
        f"module.exports = {serialized}",
        encoding="utf-8",
    )
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", type=Path, default=DEFAULT_BASE)
    parser.add_argument("--official", type=Path, default=DEFAULT_OFFICIAL)
    parser.add_argument(
        "--miniprogram-json", type=Path, default=DEFAULT_MINIPROGRAM_JSON
    )
    parser.add_argument(
        "--miniprogram-js", type=Path, default=DEFAULT_MINIPROGRAM_JS
    )
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()

    base = json.loads(args.base.read_text(encoding="utf-8"))
    details = json.loads(args.official.read_text(encoding="utf-8"))
    merged, report = merge(base, details["results"])
    write_outputs(
        merged,
        report,
        args.base,
        args.miniprogram_json,
        args.miniprogram_js,
        args.report,
    )
    print(json.dumps(report["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
