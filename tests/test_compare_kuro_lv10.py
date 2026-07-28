import unittest

from scripts.compare_kuro_lv10 import (
    classify_values,
    compare,
    normalize_label,
    project_character_name,
)


class CompareKuroLv10Test(unittest.TestCase):
    def test_rover_gender_names_map_to_project_character(self):
        self.assertEqual(
            project_character_name("漂泊者-女-气动"),
            "漂泊者·气动",
        )

    def test_skill_labels_ignore_presentation_punctuation(self):
        self.assertEqual(
            normalize_label("共鸣技能·剑式流转·苍伤害"),
            normalize_label("剑式流转苍伤害"),
        )
        self.assertEqual(
            normalize_label("强化攻击・弦乐・赫卡忒伤害"),
            normalize_label("强化攻击·弦乐·赫卡忒伤害"),
        )

    def test_stat_basis_annotations_are_equivalent(self):
        self.assertEqual(
            classify_values("15.94%", "15.94%生命"),
            "equivalent",
        )
        self.assertEqual(
            classify_values("1094.19%+68.39%*4", "1094.19%+68.39%*4偏谐系数"),
            "equivalent",
        )

    def test_split_hit_rounding_is_not_a_material_difference(self):
        self.assertEqual(
            classify_values("86.59%+779.24%", "43.30%*2 + 779.24%"),
            "rounding_equivalent",
        )

    def test_material_difference_is_reported(self):
        self.assertEqual(
            classify_values("55.05%+1.99%*25", "55.05%"),
            "different",
        )

    def test_separate_official_component_can_match_composite_base_skill(self):
        base = {
            "漂泊者·气动": {
                "skills": [
                    {
                        "name": "第三段伤害",
                        "skillType": "常态攻击",
                        "multipliers": ["0%"] * 9
                        + ["55.05%+1.99%*25"],
                    }
                ]
            }
        }
        official = [
            {
                "name": "漂泊者-女-气动",
                "skills": [
                    {
                        "skillType": "常态攻击",
                        "lv10DamageRows": [
                            {"label": "第三段伤害", "lv10": "55.05%"},
                            {"label": "飞刃伤害", "lv10": "1.99%*25"},
                        ],
                        "lv10HealingRows": [],
                    }
                ],
            }
        ]

        result = compare(base, official)

        self.assertEqual(
            result["summary"]["statusCounts"]["composite_equivalent"],
            1,
        )
        composite = next(
            row
            for row in result["rows"]
            if row["status"] == "composite_equivalent"
        )
        self.assertEqual(composite["compositeOfficialLabel"], "飞刃伤害")


if __name__ == "__main__":
    unittest.main()
