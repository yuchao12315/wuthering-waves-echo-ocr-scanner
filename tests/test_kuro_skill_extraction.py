import unittest

from scripts.fetch_kuro_character_skills import (
    parse_level_rows,
    parse_lv10_rows,
    select_effective_rows,
)


class KuroSkillExtractionTest(unittest.TestCase):
    def test_parse_lv10_supports_level_header_variants(self):
        for level_header in ("Lv 10", "LV10", "LV.10"):
            with self.subTest(level_header=level_header):
                content = f"""
                    <table>
                      <tr><th>技能等级</th><th>Lv 1</th><th>{level_header}</th></tr>
                      <tr><td>治疗量</td><td>10</td><td>100+5%生命</td></tr>
                    </table>
                """
                self.assertEqual(
                    parse_lv10_rows(content),
                    [{"label": "治疗量", "lv10": "100+5%生命"}],
                )

    def test_parse_lv10_prefers_precise_sheet_value_over_rounded_display(self):
        content = """
            <table>
              <tr><th>等级</th><th>Lv 10</th></tr>
              <tr>
                <td>第一段伤害</td>
                <td data-sheet-value="0.4635" data-formatter="0%">46%</td>
              </tr>
            </table>
        """

        self.assertEqual(
            parse_lv10_rows(content),
            [{"label": "第一段伤害", "lv10": "46.35%"}],
        )

    def test_parse_all_available_skill_levels(self):
        content = """
            <table>
              <tr><th>技能等级</th><th>Lv 1</th><th>LV.10</th></tr>
              <tr><td>技能伤害</td><td>10%</td><td>20%</td></tr>
            </table>
        """

        self.assertEqual(
            parse_level_rows(content),
            [
                {
                    "label": "技能伤害",
                    "levels": {"1": "10%", "10": "20%"},
                }
            ],
        )

    def test_damage_rows_take_priority_over_healing_rows(self):
        row_type, selected, damage_rows, healing_rows = select_effective_rows(
            [
                {"label": "技能伤害", "lv10": "200%"},
                {"label": "技能治疗量", "lv10": "100+5%生命"},
            ]
        )

        self.assertEqual(row_type, "damage")
        self.assertEqual(selected, damage_rows)
        self.assertEqual(len(healing_rows), 1)

    def test_healing_rows_are_used_when_damage_rows_are_absent(self):
        healing = {"label": "周期治疗倍率", "lv10": "6%生命"}
        row_type, selected, damage_rows, healing_rows = select_effective_rows(
            [healing]
        )

        self.assertEqual(row_type, "healing")
        self.assertEqual(selected, [healing])
        self.assertEqual(damage_rows, [])
        self.assertEqual(healing_rows, [healing])


if __name__ == "__main__":
    unittest.main()
