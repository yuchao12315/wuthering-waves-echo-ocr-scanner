"""
分辨率坐标配置 — 基于技术方案中的游戏界面布局规则
坐标单位：像素，左上角(0,0)
"""

CONFIGS = {
    (1920, 1080): {
        # ═══ 整体屏幕分区 ═══
        # 列表区: 左上(150,125) 右下(1220,910) → 宽1070 高785
        'sidebar': (0, 0, 150, 1080),              # 侧边导航栏
        'top_bar': (150, 0, 1070, 125),            # 顶部无效区域 y:0~125
        'list_area': (150, 125, 1070, 785),        # 声骸卡片列表 x:150~1220, y:125~910
        'list_scrollbar': (1220, 125, 20, 785),    # 列表滚动条
        'bottom_bar': (150, 910, 1070, 170),       # 底部控制栏(排序等) y:910~1080
        'detail_area': (1235, 0, 685, 1080),       # 右侧详情区 x:1235~1920

        # ═══ 列表卡片网格 ═══
        # calibrate日志(commit fc59de6): 行y=[175,385,598] 间距=[210,213] → card_height=211
        # 列x=[142,317,493,670,847,1023] 间距=[175,176,177,177,176] → card_width=176
        # card_grid_origin: calibrate推荐=(163,125)
        'card_cols': 6,
        'card_rows': 4,
        'card_width': 176,
        'card_height': 211,
        'card_grid_origin': (163, 125),

        # 卡片内等级文字ROI — 右下角"+N", 相对卡片左上角
        'level_roi_offset': (125, 170, 45, 25),  # (x, y, w, h)

        # 卡片内Cost文字ROI — 左下角, 相对卡片左上角
        'cost_roi_offset': (5, 170, 35, 25),

        # 列表区域截图(用于滚动检测)
        'list_region': (150, 125, 1070, 785),

        # ═══ 右侧详情区 ═══
        # 整区域OCR后按Y坐标zone分配，zone配置见page_scanner.py
        # calibrate日志实测y坐标:
        #   名称 y≈143, COST y≈264, 主词条 y≈474, 副属性 y≈519
        #   副词条1 y≈564, 副词条2 y≈609, 副词条3 y≈654, 副词条4 y≈699, 副词条5 y≈743
        'detail_area': (1235, 0, 685, 1080),       # 右侧详情区 x:1235~1920

        # 右侧详情区滚动（鼠标须在详情区内，用SetCursorPos真移光标）
        'detail_scroll_pos': (1580, 540),          # 详情区中央 x=1235+685/2≈1580
        'detail_scroll_down_steps': 25,            # 向下滚动次数（约800-1000px，确保一轮就能滚过技能描述）
        'detail_scroll_up_steps': 30,              # 向上滚回顶部次数（多滚确保到顶）

        # 底部排序按钮区域
        'sort_button': (250, 1010, 120, 40),
        'sort_menu_area': (200, 850, 200, 150),

        # 操作坐标 — 列表滚动（鼠标须在声骸列表区域内，用SetCursorPos真移光标）
        'list_scroll_pos': (685, 518),             # 列表区中央 x≈150+1070/2=685, y≈125+785/2=518
        'list_scroll_amount': -12,                 # 约2-3行，靠去重处理重叠；不够时images_similar检测到会再滚

        # 选中态检测
        'selection_border_color': (255, 215, 0),
        'selection_check_offset': (0, 0, 3, 210),
    }
}

# 操作时序常量
TIMING = {
    'scroll_wait': 0.5,        # 滚动后等待稳定
    'click_wait': 0.3,         # 点击后等待加载
    'sort_wait': 1.0,          # 排序切换后等待重排
    'detail_scroll_wait': 0.3, # 详情区滚动后等待
}


def get_config(resolution):
    """Get config for a resolution, scaling from 1080p if needed."""
    if resolution in CONFIGS:
        return CONFIGS[resolution]

    base = CONFIGS[(1920, 1080)]
    sx = resolution[0] / 1920
    sy = resolution[1] / 1080
    return _scale_config(base, sx, sy)


def _scale_config(cfg, sx, sy):
    """Recursively scale a config dict."""
    scaled = {}
    for key, value in cfg.items():
        if isinstance(value, tuple):
            if len(value) == 4:
                scaled[key] = (
                    int(value[0] * sx), int(value[1] * sy),
                    int(value[2] * sx), int(value[3] * sy)
                )
            elif len(value) == 2:
                scaled[key] = (int(value[0] * sx), int(value[1] * sy))
            elif len(value) == 3:
                # RGB color, don't scale
                scaled[key] = value
            else:
                scaled[key] = value
        elif isinstance(value, dict):
            scaled[key] = _scale_config(value, sx, sy)
        elif isinstance(value, int) and key in ('card_width', 'card_height', 'card_cols', 'card_rows'):
            if key in ('card_width',):
                scaled[key] = int(value * sx)
            elif key in ('card_height',):
                scaled[key] = int(value * sy)
            else:
                scaled[key] = value
        else:
            scaled[key] = value
    return scaled
