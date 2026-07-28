#!/usr/bin/env python3
"""Refresh Kuro Wiki character skill text, branches, and Lv 10 values."""

from __future__ import annotations

import argparse
import csv
import html
import json
import re
import time
import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen


API_URL = "https://api.kurobbs.com/wiki/core/catalogue/item/getEntryDetail"
DEFAULT_DETAILS = Path("outputs/kuro-character-skill-details.json")
DEFAULT_DAMAGE_CSV = Path("outputs/kuro-character-skill-lv10.csv")
DEFAULT_EFFECTIVE_CSV = Path("outputs/kuro-character-skill-lv10-effective.csv")
SKILL_TYPES = (
    "常态攻击",
    "共鸣技能",
    "共鸣回路",
    "共鸣解放",
    "变奏技能",
    "延奏技能",
    "谐度破坏",
)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tables: list[list[list[str]]] = []
        self._table_depth = 0
        self._rows: list[list[str]] | None = None
        self._row: list[str] | None = None
        self._cell_parts: list[str] | None = None
        self._cell_attrs: dict[str, str] = {}

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag == "table":
            self._table_depth += 1
            if self._table_depth == 1:
                self._rows = []
        elif self._table_depth == 1 and tag == "tr":
            self._row = []
        elif self._table_depth == 1 and tag in {"td", "th"}:
            self._cell_parts = []
            self._cell_attrs = {
                key: value for key, value in attrs if value is not None
            }
        elif self._cell_parts is not None and tag in {"br", "p", "div"}:
            self._cell_parts.append(" ")

    def handle_data(self, data: str) -> None:
        if self._cell_parts is not None:
            self._cell_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if self._table_depth == 1 and tag in {"td", "th"}:
            if self._row is not None and self._cell_parts is not None:
                text = normalize_text("".join(self._cell_parts))
                sheet_value = self._cell_attrs.get("data-sheet-value")
                formatter = self._cell_attrs.get("data-formatter", "")
                if (
                    sheet_value
                    and "%" in formatter
                    and re.fullmatch(r"-?\d+(?:\.\d+)?%", text)
                ):
                    try:
                        precise = Decimal(sheet_value) * 100
                        text = f"{format(precise, 'f').rstrip('0').rstrip('.')}%"
                    except InvalidOperation:
                        pass
                self._row.append(text)
            self._cell_parts = None
            self._cell_attrs = {}
        elif self._table_depth == 1 and tag == "tr":
            if self._rows is not None and self._row:
                self._rows.append(self._row)
            self._row = None
        elif tag == "table":
            if self._table_depth == 1 and self._rows:
                self.tables.append(self._rows)
                self._rows = None
            self._table_depth -= 1


def normalize_level_header(value: str) -> int | None:
    normalized = re.sub(r"[\s.]", "", value).lower()
    match = re.fullmatch(r"lv(\d+)", normalized)
    return int(match.group(1)) if match else None


def parse_level_rows(content: str) -> list[dict[str, Any]]:
    parser = TableParser()
    parser.feed(content)
    parsed: list[dict[str, Any]] = []

    for table in parser.tables:
        for header_index, header in enumerate(table):
            if not header or not any("等级" in cell for cell in header[:1]):
                continue
            level_columns = {
                column_index: level
                for column_index, cell in enumerate(header)
                if (level := normalize_level_header(cell)) is not None
            }
            if 10 not in level_columns.values():
                continue

            for row in table[header_index + 1 :]:
                if not row or not row[0]:
                    continue
                levels = {
                    str(level): row[column_index]
                    for column_index, level in level_columns.items()
                    if len(row) > column_index and row[column_index]
                }
                if levels:
                    parsed.append({"label": row[0], "levels": levels})
            break

    return parsed


def parse_lv10_rows(content: str) -> list[dict[str, str]]:
    return [
        {"label": row["label"], "lv10": row["levels"]["10"]}
        for row in parse_level_rows(content)
        if row["levels"].get("10")
    ]


def is_damage_row(label: str) -> bool:
    return "伤害" in label and "伤害加成" not in label


def is_healing_row(label: str) -> bool:
    compact = re.sub(r"\s+", "", label)
    return "治疗倍率" in compact or "治疗量" in compact


def select_effective_rows(
    all_rows: list[dict[str, str]],
) -> tuple[
    str | None,
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, str]],
]:
    damage_rows = [row for row in all_rows if is_damage_row(row["label"])]
    healing_rows = [row for row in all_rows if is_healing_row(row["label"])]
    if damage_rows:
        return "damage", damage_rows, damage_rows, healing_rows
    if healing_rows:
        return "healing", healing_rows, damage_rows, healing_rows
    return None, [], damage_rows, healing_rows


def fetch_character(item_id: str, referer: str, retries: int = 3) -> dict[str, Any]:
    body = urlencode({"id": item_id}).encode()
    headers = {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Origin": "https://wiki.kurobbs.com",
        "Referer": referer,
        "wiki_type": "9",
        "source": "h5",
        "devcode": uuid.uuid4().hex,
        "User-Agent": "Mozilla/5.0",
    }
    last_error: Exception | None = None

    for attempt in range(retries):
        try:
            with urlopen(Request(API_URL, body, headers), timeout=30) as response:
                payload = json.load(response)
            if payload.get("code") not in (0, 200):
                raise RuntimeError(
                    f"API returned code={payload.get('code')}: {payload.get('msg')}"
                )
            return payload
        except Exception as error:  # Retry transient official API failures.
            last_error = error
            if attempt + 1 < retries:
                time.sleep(attempt + 1)

    raise RuntimeError(f"failed after {retries} attempts: {last_error}")


def find_skill_tabs(payload: dict[str, Any]) -> list[dict[str, Any]]:
    content = payload.get("data", {}).get("content", {})
    for module in content.get("modules", []):
        for component in module.get("components", []):
            if component.get("title") == "技能介绍":
                return component.get("tabs", [])
    return []


def update_skill_rows(
    result: dict[str, Any], tabs: list[dict[str, Any]]
) -> None:
    skills = result.get("skills", [])
    if len(tabs) != len(skills):
        raise ValueError(f"expected {len(skills)} skill tabs, got {len(tabs)}")

    for index, (skill, tab) in enumerate(zip(skills, tabs)):
        tab_type = normalize_text(str(tab.get("title", "")))
        expected_type = skill.get("skillType") or SKILL_TYPES[index]
        if tab_type and tab_type != expected_type:
            raise ValueError(
                f"tab {index} type mismatch: expected {expected_type}, got {tab_type}"
            )

        content = str(tab.get("content", ""))
        level_rows = parse_level_rows(content)
        all_rows = [
            {"label": row["label"], "lv10": row["levels"]["10"]}
            for row in level_rows
            if row["levels"].get("10")
        ]
        (
            effective_type,
            effective_rows,
            damage_rows,
            healing_rows,
        ) = select_effective_rows(all_rows)
        skill["damageRows"] = [
            row for row in level_rows if is_damage_row(row["label"])
        ]
        skill["healingRows"] = [
            row for row in level_rows if is_healing_row(row["label"])
        ]

        skill["lv10DamageRows"] = damage_rows
        skill["lv10HealingRows"] = healing_rows
        skill["lv10Type"] = effective_type
        skill["lv10Rows"] = [
            {"type": effective_type, **row} for row in effective_rows
        ]


def ensure_compatible_rows(result: dict[str, Any]) -> None:
    """Keep outputs usable when an individual official API request fails."""
    for skill in result.get("skills", []):
        damage_rows = skill.setdefault("lv10DamageRows", [])
        skill.setdefault("lv10HealingRows", [])
        if "lv10Rows" not in skill:
            skill["lv10Type"] = "damage" if damage_rows else None
            skill["lv10Rows"] = [
                {"type": "damage", **row} for row in damage_rows
            ]


def write_csvs(
    details: dict[str, Any], damage_path: Path, effective_path: Path
) -> None:
    damage_path.parent.mkdir(parents=True, exist_ok=True)
    with damage_path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(
            ["character", "skillType", "skillTitle", "damageLabel", "lv10"]
        )
        for result in details["results"]:
            for skill in result["skills"]:
                for row in skill["lv10DamageRows"]:
                    writer.writerow(
                        [
                            result["name"],
                            skill["skillType"],
                            skill["title"],
                            row["label"],
                            row["lv10"],
                        ]
                    )

    with effective_path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(
            ["character", "skillType", "skillTitle", "type", "label", "lv10"]
        )
        for result in details["results"]:
            for skill in result["skills"]:
                for row in skill["lv10Rows"]:
                    writer.writerow(
                        [
                            result["name"],
                            skill["skillType"],
                            skill["title"],
                            row["type"],
                            row["label"],
                            row["lv10"],
                        ]
                    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--details", type=Path, default=DEFAULT_DETAILS)
    parser.add_argument("--damage-csv", type=Path, default=DEFAULT_DAMAGE_CSV)
    parser.add_argument(
        "--effective-csv", type=Path, default=DEFAULT_EFFECTIVE_CSV
    )
    args = parser.parse_args()

    details = json.loads(args.details.read_text(encoding="utf-8"))
    errors: list[dict[str, str]] = []

    for result in details["results"]:
        try:
            payload = fetch_character(
                str(result["id"]),
                result.get("url")
                or f"https://wiki.kurobbs.com/mc/item/{result['id']}",
            )
            update_skill_rows(result, find_skill_tabs(payload))
        except Exception as error:
            errors.append({"name": result["name"], "error": str(error)})
        ensure_compatible_rows(result)

    details["source"] = API_URL
    details["generatedAt"] = datetime.now().astimezone().isoformat(timespec="seconds")
    details["errors"] = errors
    args.details.write_text(
        json.dumps(details, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    write_csvs(details, args.damage_csv, args.effective_csv)

    skill_count = sum(len(result["skills"]) for result in details["results"])
    damage_count = sum(
        len(skill["lv10DamageRows"])
        for result in details["results"]
        for skill in result["skills"]
    )
    healing_fallback_count = sum(
        len(skill["lv10Rows"])
        for result in details["results"]
        for skill in result["skills"]
        if skill["lv10Type"] == "healing"
    )
    print(
        json.dumps(
            {
                "characters": len(details["results"]),
                "skills": skill_count,
                "damageRows": damage_count,
                "healingFallbackRows": healing_fallback_count,
                "errors": errors,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
