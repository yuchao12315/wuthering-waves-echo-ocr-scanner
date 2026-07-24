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


if __name__ == '__main__':
    unittest.main()
