import unittest

from scripts.merge_kuro_character_skills import merge


def official_skill(rows, branches=None):
    return {
        "skillType": "常态攻击",
        "title": "常态攻击",
        "damageRows": rows,
        "healingRows": [],
        "branchEnhancements": branches or [],
    }


class MergeKuroCharacterSkillsTest(unittest.TestCase):
    def test_updates_official_levels_and_preserves_levels_above_ten(self):
        base = {
            "测试角色": {
                "skills": [
                    {
                        "name": "第一段伤害",
                        "skillType": "常态攻击",
                        "multipliers": ["1%"] * 10 + ["11%", "12%"],
                    }
                ]
            }
        }
        official = [
            {
                "name": "测试角色",
                "skills": [
                    official_skill(
                        [
                            {
                                "label": "第一段伤害",
                                "levels": {
                                    str(level): f"{level}%"
                                    for level in range(1, 11)
                                },
                            }
                        ]
                    )
                ],
            }
        ]

        merged, report = merge(base, official)

        self.assertEqual(
            merged["测试角色"]["skills"][0]["multipliers"],
            [f"{level}%" for level in range(1, 13)],
        )
        self.assertEqual(report["summary"]["updated_by_name"], 1)

    def test_unique_level_sequence_maps_renamed_skill(self):
        levels = {str(level): f"{level}%" for level in range(1, 11)}
        base = {
            "测试角色": {
                "skills": [
                    {
                        "name": "本地技能名",
                        "skillType": "常态攻击",
                        "multipliers": list(levels.values()),
                    }
                ]
            }
        }
        official = [
            {
                "name": "测试角色",
                "skills": [
                    official_skill(
                        [{"label": "官方技能名", "levels": levels}]
                    )
                ],
            }
        ]

        merged, report = merge(base, official)

        self.assertEqual(
            merged["测试角色"]["skills"][0]["name"], "本地技能名"
        )
        self.assertEqual(report["summary"]["updated_by_sequence"], 1)

    def test_composite_skill_is_not_replaced_by_one_component(self):
        base = {
            "漂泊者·气动": {
                "skills": [
                    {
                        "name": "第三段伤害",
                        "skillType": "常态攻击",
                        "multipliers": ["10%+2%*2"] * 10,
                    }
                ]
            }
        }
        official = [
            {
                "name": "漂泊者-女-气动",
                "skills": [
                    official_skill(
                        [
                            {
                                "label": "第三段伤害",
                                "levels": {
                                    str(level): "10%"
                                    for level in range(1, 11)
                                },
                            },
                            {
                                "label": "飞刃伤害",
                                "levels": {
                                    str(level): "2%*2"
                                    for level in range(1, 11)
                                },
                            },
                        ]
                    )
                ],
            }
        ]

        merged, report = merge(base, official)

        self.assertEqual(
            merged["漂泊者·气动"]["skills"][0]["multipliers"][0],
            "10%+2%*2",
        )
        self.assertEqual(
            report["summary"]["preserved_composite_skill"], 1
        )
        self.assertEqual(
            report["auditRows"][0]["status"], "preserved_composite"
        )

    def test_empty_character_gets_damage_skills_and_branches(self):
        levels = {str(level): f"{level}%" for level in range(1, 11)}
        base = {"测试角色": {"skills": []}}
        official = [
            {
                "name": "测试角色",
                "skills": [
                    official_skill(
                        [{"label": "重击伤害", "levels": levels}],
                        [
                            {
                                "name": "攻击提升",
                                "valueText": "攻击提升1.80%",
                                "valuePercent": 1.8,
                            }
                        ],
                    )
                ],
            }
        ]

        merged, report = merge(base, official)

        skill = merged["测试角色"]["skills"][0]
        self.assertEqual(skill["treeId"], "1")
        self.assertEqual(skill["source"], "kuro-official")
        self.assertTrue(skill["isHeavy"])
        self.assertEqual(
            merged["测试角色"]["branchEnhancements"][0]["skillType"],
            "常态攻击",
        )
        self.assertEqual(report["summary"]["created_skill"], 1)


if __name__ == "__main__":
    unittest.main()
