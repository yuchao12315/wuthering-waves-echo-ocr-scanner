#!/usr/bin/env python3
"""Compare characters-base Lv10 values with Kuro Wiki official detail data."""

from __future__ import annotations

import argparse
import ast
import csv
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any


DEFAULT_BASE = Path("src/data/characters-base.json")
DEFAULT_OFFICIAL = Path("outputs/kuro-character-skill-details.json")
DEFAULT_JSON = Path("outputs/kuro-character-lv10-comparison.json")
DEFAULT_CSV = Path("outputs/kuro-character-lv10-comparison.csv")


def project_character_name(name: str) -> str:
    rover_match = re.fullmatch(r"漂泊者-[男女]-(.+)", name)
    return f"漂泊者·{rover_match.group(1)}" if rover_match else name


def normalize_label(value: str) -> str:
    value = re.sub(r"\s+", "", value)
    for source, target in (
        ("：", ":"),
        ("·", ""),
        ("・", ""),
        ("「", ""),
        ("」", ""),
        ("【", ""),
        ("】", ""),
    ):
        value = value.replace(source, target)
    return re.sub(
        r"^(普攻|共鸣技能|共鸣回路|共鸣解放|变奏技能)[:：]?",
        "",
        value,
    )


def normalize_value(value: str) -> str:
    value = re.sub(r"\s+", "", value)
    for source, target in (
        ("×", "*"),
        ("＋", "+"),
        ("生命值", ""),
        ("生命", ""),
        ("防御", ""),
        ("攻击", ""),
        ("偏谐系数", ""),
        ("(", ""),
        (")", ""),
    ):
        value = value.replace(source, target)

    def trim_number(match: re.Match[str]) -> str:
        number = match.group(0)
        if "." not in number:
            return number
        return number.rstrip("0").rstrip(".")

    return re.sub(r"\d+(?:\.\d+)?", trim_number, value)


def evaluate_percent_expression(value: str) -> float | None:
    normalized = normalize_value(value)
    if not normalized or re.search(r"[^0-9.%+*/-]", normalized):
        return None
    expression = re.sub(r"(\d+(?:\.\d+)?)%", r"\1", normalized)
    if "%" in expression:
        return None

    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError:
        return None

    def evaluate(node: ast.AST) -> float:
        if isinstance(node, ast.Expression):
            return evaluate(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
            return -evaluate(node.operand)
        if isinstance(node, ast.BinOp):
            left = evaluate(node.left)
            right = evaluate(node.right)
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Div):
                return left / right
        raise ValueError("unsupported expression")

    try:
        return evaluate(tree)
    except (ValueError, ZeroDivisionError):
        return None


def classify_values(base_value: str, official_value: str) -> str:
    if re.sub(r"\s+", "", base_value) == re.sub(r"\s+", "", official_value):
        return "same"
    if normalize_value(base_value) == normalize_value(official_value):
        return "equivalent"

    base_number = evaluate_percent_expression(base_value)
    official_number = evaluate_percent_expression(official_value)
    if (
        base_number is not None
        and official_number is not None
        and abs(base_number - official_number) <= 0.021
    ):
        return "rounding_equivalent"
    return "different"


def official_rows(skill: dict[str, Any]) -> list[dict[str, str]]:
    rows: dict[tuple[str, str], dict[str, str]] = {}
    for row_type, field in (
        ("damage", "lv10DamageRows"),
        ("healing", "lv10HealingRows"),
    ):
        for row in skill.get(field, []):
            rows[(row["label"], row["lv10"])] = {"type": row_type, **row}
    return list(rows.values())


def official_signature(result: dict[str, Any]) -> list[tuple[str, str, str, str]]:
    return sorted(
        (
            skill["skillType"],
            row["label"],
            row["lv10"],
            row["type"],
        )
        for skill in result.get("skills", [])
        for row in official_rows(skill)
    )


def compare(
    base: dict[str, Any], official_results: list[dict[str, Any]]
) -> dict[str, Any]:
    official_by_character: dict[str, dict[str, Any]] = {}
    duplicate_character_issues: list[dict[str, str]] = []

    for result in official_results:
        character = project_character_name(result["name"])
        previous = official_by_character.get(character)
        if previous is not None:
            if official_signature(previous) != official_signature(result):
                duplicate_character_issues.append(
                    {
                        "character": character,
                        "first": previous["name"],
                        "second": result["name"],
                    }
                )
            continue
        official_by_character[character] = result

    rows: list[dict[str, Any]] = []
    matched_base_skills: set[tuple[str, int]] = set()
    status_counts: Counter[str] = Counter()

    for character, result in official_by_character.items():
        character_base = base.get(character)
        if character_base is None:
            status_counts["missing_base_character"] += 1
            continue
        if not character_base.get("skills"):
            status_counts["empty_base_character"] += 1
            rows.append(
                {
                    "status": "empty_base_character",
                    "character": character,
                    "skillType": "",
                    "officialLabel": "",
                    "baseLabel": "",
                    "baseLv10": "",
                    "officialLv10": "",
                    "rowType": "",
                }
            )
            continue

        for official_skill in result.get("skills", []):
            skill_type = official_skill["skillType"]
            skill_rows = official_rows(official_skill)
            candidates = [
                (index, skill)
                for index, skill in enumerate(character_base["skills"])
                if skill.get("skillType") == skill_type
            ]
            for official_row in skill_rows:
                matches = [
                    (index, skill)
                    for index, skill in candidates
                    if normalize_label(skill["name"])
                    == normalize_label(official_row["label"])
                ]
                if len(matches) != 1:
                    status = "unmapped_official"
                    status_counts[status] += 1
                    rows.append(
                        {
                            "status": status,
                            "character": character,
                            "skillType": skill_type,
                            "officialLabel": official_row["label"],
                            "baseLabel": "",
                            "baseLv10": "",
                            "officialLv10": official_row["lv10"],
                            "rowType": official_row["type"],
                        }
                    )
                    continue

                index, base_skill = matches[0]
                matched_base_skills.add((character, index))
                multipliers = base_skill.get("multipliers", [])
                if len(multipliers) < 10:
                    status = "missing_base_lv10"
                    base_lv10 = ""
                else:
                    base_lv10 = multipliers[9]
                    status = classify_values(base_lv10, official_row["lv10"])
                composite_row = None
                if status == "different":
                    composite_matches = [
                        other
                        for other in skill_rows
                        if other is not official_row
                        and classify_values(
                            base_lv10,
                            f"{official_row['lv10']}+{other['lv10']}",
                        )
                        in {"same", "equivalent", "rounding_equivalent"}
                    ]
                    if len(composite_matches) == 1:
                        status = "composite_equivalent"
                        composite_row = composite_matches[0]
                status_counts[status] += 1
                rows.append(
                    {
                        "status": status,
                        "character": character,
                        "skillType": skill_type,
                        "officialLabel": official_row["label"],
                        "baseLabel": base_skill["name"],
                        "baseLv10": base_lv10,
                        "officialLv10": official_row["lv10"],
                        "rowType": official_row["type"],
                        "multiplierCount": len(multipliers),
                        "compositeOfficialLabel": (
                            composite_row["label"] if composite_row else ""
                        ),
                    }
                )

    for character, character_base in base.items():
        for index, skill in enumerate(character_base.get("skills", [])):
            if (character, index) in matched_base_skills:
                continue
            status_counts["unmapped_base"] += 1
            multipliers = skill.get("multipliers", [])
            rows.append(
                {
                    "status": "unmapped_base",
                    "character": character,
                    "skillType": skill.get("skillType", ""),
                    "officialLabel": "",
                    "baseLabel": skill.get("name", ""),
                    "baseLv10": multipliers[9] if len(multipliers) >= 10 else "",
                    "officialLv10": "",
                    "rowType": "",
                    "multiplierCount": len(multipliers),
                }
            )

    multiplier_lengths = Counter(
        len(skill.get("multipliers", []))
        for character in base.values()
        for skill in character.get("skills", [])
    )
    return {
        "summary": {
            "baseCharacters": len(base),
            "officialCharactersRaw": len(official_results),
            "officialCharactersNormalized": len(official_by_character),
            "baseSkills": sum(
                len(character.get("skills", [])) for character in base.values()
            ),
            "statusCounts": dict(sorted(status_counts.items())),
            "multiplierLengthCounts": {
                str(length): count
                for length, count in sorted(multiplier_lengths.items())
            },
            "duplicateCharacterIssues": duplicate_character_issues,
        },
        "differences": [
            row for row in rows if row["status"] == "different"
        ],
        "roundingEquivalent": [
            row for row in rows if row["status"] == "rounding_equivalent"
        ],
        "rows": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", type=Path, default=DEFAULT_BASE)
    parser.add_argument("--official", type=Path, default=DEFAULT_OFFICIAL)
    parser.add_argument("--json", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    args = parser.parse_args()

    base = json.loads(args.base.read_text(encoding="utf-8"))
    official = json.loads(args.official.read_text(encoding="utf-8"))
    result = compare(base, official["results"])

    args.json.parent.mkdir(parents=True, exist_ok=True)
    args.json.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    with args.csv.open("w", encoding="utf-8-sig", newline="") as file:
        fieldnames = [
            "status",
            "character",
            "skillType",
            "rowType",
            "officialLabel",
            "baseLabel",
            "baseLv10",
            "officialLv10",
            "multiplierCount",
            "compositeOfficialLabel",
        ]
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(
            {field: row.get(field, "") for field in fieldnames}
            for row in result["rows"]
        )

    print(json.dumps(result["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
