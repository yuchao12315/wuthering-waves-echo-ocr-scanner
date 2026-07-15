import unittest

from scanner.config import (
    BASE_RESOLUTION,
    get_config,
    get_resolution_support,
    list_supported_resolutions,
)


class ScannerConfigTest(unittest.TestCase):
    def test_common_resolutions_generate_valid_configs(self):
        for resolution in list_supported_resolutions():
            with self.subTest(resolution=resolution):
                cfg = get_config(resolution)
                self.assertGreater(cfg['card_width'], 0)
                self.assertGreater(cfg['card_height'], 0)
                self.assertGreater(cfg['list_region'][2], 0)
                self.assertGreater(cfg['list_region'][3], 0)
                self.assertGreater(cfg['detail_area'][2], 0)
                self.assertGreater(cfg['detail_area'][3], 0)

                zones = cfg['detail_zones']
                self.assertLess(zones['name'][0], zones['name'][1])
                self.assertLess(zones['main'][0], zones['main'][1])
                self.assertLess(zones['all_subs'][0], zones['all_subs'][1])
                self.assertLess(zones['name'][1], zones['main'][0])
                self.assertLess(zones['main'][1], zones['all_subs'][1])

    def test_base_resolution_is_exact_config(self):
        cfg = get_config(BASE_RESOLUTION)
        self.assertTrue(cfg['_is_exact_config'])
        self.assertEqual(cfg['_scale'], (1.0, 1.0))

    def test_unknown_resolution_uses_auto_scaled_mode(self):
        support = get_resolution_support((2304, 1296))
        self.assertEqual(support['mode'], 'auto-scaled')
        self.assertIn('自动缩放', support['message'])

    def test_2k_and_4k_are_experimental_scaled(self):
        for resolution in ((2560, 1440), (3840, 2160)):
            with self.subTest(resolution=resolution):
                support = get_resolution_support(resolution)
                self.assertEqual(support['mode'], 'experimental-scaled')
                self.assertIn('未实机验证', support['message'])

    def test_non_target_resolution_is_not_built_in(self):
        support = get_resolution_support((1680, 1050))
        self.assertEqual(support['mode'], 'auto-scaled')
        self.assertIn('非内置', support['message'])


if __name__ == '__main__':
    unittest.main()
