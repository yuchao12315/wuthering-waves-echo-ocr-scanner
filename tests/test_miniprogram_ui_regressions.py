import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class MiniprogramUiRegressionTest(unittest.TestCase):
    def read(self, relative_path):
        return (ROOT / relative_path).read_text(encoding='utf-8')

    def test_calculator_sonata_highlight_uses_render_state_not_wxml_method_call(self):
        wxml = self.read('miniprogram/pages/calculator/calculator.wxml')
        js = self.read('miniprogram/pages/calculator/calculator.js')

        self.assertNotIn('sonatas.indexOf', wxml)
        self.assertIn("item.selected ? 'sonata-active'", wxml)
        self.assertIn('refreshSonataSelection', js)
        self.assertRegex(js, r'selected:\s*selectedMap\[key\]\s*===\s*true')

    def test_echoes_json_import_button_opens_system_file_picker_directly(self):
        wxml = self.read('miniprogram/pages/echoes/echoes.wxml')
        js = self.read('miniprogram/pages/echoes/echoes.js')

        self.assertRegex(wxml, r'bindtap="chooseSystemImportFile"[^>]*>导入JSON<')
        self.assertIn('chooseSystemImportFile', js)
        self.assertIn('wx.chooseExternalFile', js)
        self.assertIn('onPasteImportConfirm', js)

        direct_import = re.search(r'onImport\(\)\s*\{(?P<body>.*?)\n  \},', js, re.S)
        if direct_import:
            self.assertNotIn('chooseMessageFile', direct_import.group('body'))
            self.assertIn('chooseSystemImportFile', direct_import.group('body'))

    def test_calculator_result_echo_cards_show_per_entry_scores(self):
        wxml = self.read('miniprogram/pages/calculator/calculator.wxml')
        js = self.read('miniprogram/pages/calculator/calculator.js')

        self.assertIn('wx:for="{{echo.scoreDetails}}"', wxml)
        self.assertIn('{{detail.field}}', wxml)
        self.assertIn('{{detail.label}} {{detail.valueDisplay}}', wxml)
        self.assertIn('{{detail.scoreDisplay}}', wxml)
        self.assertIn('wx:key="scoreKey"', wxml)

        self.assertIn('scoreEchoDetailed(echo)', js)
        self.assertIn('buildScoreDetail(field, stat, cost, scoreMax)', js)
        self.assertIn('scoreKey:', js)
        self.assertIn('scoreDetails:', js)

    def test_calculator_cost_filter_is_applied_when_generating_results(self):
        js = self.read('miniprogram/pages/calculator/calculator.js')

        self.assertIn('matchesCostFilter(echoes, costFilter)', js)
        self.assertIn("costFilter === '4+3+3+1+1'", js)
        self.assertRegex(js, r'counts\[1\]\s*===\s*2')
        self.assertRegex(js, r'counts\[3\]\s*===\s*2')
        self.assertRegex(js, r'counts\[4\]\s*===\s*1')
        self.assertIn('var costFilter = this.data.costFilter', js)
        self.assertIn('formatCostPattern(echoes)', js)
        self.assertIn('return b.cost - a.cost', js)

    def test_calculator_all_filters_are_connected_to_loadout_calculation(self):
        js = self.read('miniprogram/pages/calculator/calculator.js')

        self.assertIn('calculateLoadouts(echoes, calc, config, allEchoes)', js)
        self.assertIn('buildExcludedEchoIds()', js)
        self.assertIn('excludeEchoIds: this.buildExcludedEchoIds()', js)
        self.assertIn("sonataConstraint = { type: 'single'", js)
        self.assertIn("sonataConstraint = { type: 'dual'", js)
        self.assertIn('findBestCombinations(bucket1, bucket3, bucket4, distributions, sonataConstraint)', js)
        self.assertIn('hasDuplicateSameCostName(combined)', js)
        self.assertIn('hasDoubleCrit(echo)', js)
        self.assertIn("rankMode === 'damage'", js)
        self.assertIn('calcLoadoutDamage(r.echoes)', js)
        self.assertIn('activeSkillTypes', js)

    def test_loadouts_damage_controls_do_not_render_blank_buttons(self):
        wxml = self.read('miniprogram/pages/loadouts/loadouts.wxml')
        js = self.read('miniprogram/pages/loadouts/loadouts.js')

        self.assertIn('wx:for-item="loadout"', wxml)
        self.assertNotIn('{{this}}', wxml)
        self.assertIn('wx:for-item="level"', wxml)
        self.assertIn('wx:for-item="skillType"', wxml)
        self.assertIn('wx:for-item="refine"', wxml)
        self.assertIn("{{loadout._showDamage ? '收起伤害' : '伤害计算'}}", wxml)

        self.assertIn("require('../../data/characters-base.js')", js)
        self.assertIn("require('../../data/weapons.js')", js)
        self.assertIn('_charBaseMap = CHARACTERS_BASE', js)
        self.assertIn('calcDamageForLoadout(idx)', js)
        self.assertNotIn('模拟伤害结果', js)
        self.assertNotIn("_expectedDisplay: '—'", js)


if __name__ == '__main__':
    unittest.main()
