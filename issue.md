# issue1 ✅ 已修复
## 复现路径 
执行 python -m scanner --debug

## 表现
鸣潮声骸OCR扫描工具 v1.0
================================================== 
✓ 检测到鸣潮进程: Wuthering Waves.exe (PID: 12428)
✓ 管理员权限已确认
正在检测鸣潮游戏进程...
✗ 未检测到鸣潮游戏，请确认游戏已启动 
✗ 无法获取游戏窗口，请确保游戏以全屏或无边框模式运行

## 原因
`Wuthering Waves.exe` 是启动器进程（无游戏窗口），实际游戏窗口属于子进程 `Client-Win64-Shipping.exe`。原代码 `find_game_process()` 先匹配到启动器，`get_game_window()` 用启动器PID找窗口自然找不到。

## 修复方案
修改 `scanner/game_detector.py`:
- `find_game_process()` 优先返回 `Client-Win64-Shipping.exe`
- `get_game_window()` 遍历所有游戏相关进程的PID集合去查找窗口，不再只用单个PID

## 修改文件
- `scanner/game_detector.py`

# issue2 ✅ 已修复
## 复现路径
执行 python -m scanner --debug
## 表现
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

## 原因
`scan_progress.json` 文件为空（之前异常退出导致），`json.load()` 对空文件报错。

## 修复方案
`progress.py` 的 `_load()` 加 try/except，空文件或损坏JSON返回默认值。

## 修改文件
- `scanner/progress.py`

# issue3 ✅ 已修复
## 表现
OCR日志已识别到属性数据（如 y=474 '暴击伤害', y=473 '44.0%'），但JSON输出 mainStat=null, substats=[]。

## 原因
OCR将一行文本拆成两个结果：type和value分别在y=474和y=473。`parse_stat_line` 只处理同一个文本中同时包含type+value的情况，拆分后两边都匹配不到。

## 修复方案
改用"按Y坐标区间收集 → 合并同区间文本 → 再解析"策略。同一区间（如y=440-500）的所有OCR文本合并为一个字符串再调用 `parse_stat_line`，如 `'暴击伤害' + ' ' + '44.0%'` = `'暴击伤害 44.0%'`。

## 修改文件
- `scanner/page_scanner.py`

# issue4 ✅ 已修复
## 复现路径
执行 python -m scanner --debug
## 表现
KeyError: 'scanned_echoes'

## 原因
旧版 `scan_progress.json` 缺少 `scanned_echoes` 键。

## 修复方案
- `main.py` 改用 `data.get('scanned_echoes', [])`
- `progress.py` 的 `add_echo` 增加键不存在时初始化

## 修改文件
- `scanner/main.py`、`scanner/progress.py`

# issue5 ✅ 已修复
## 复现路径
执行 npm run dev
## 表现
Cannot find module '@rolldown/binding-win32-x64-msvc'（Vite 8 的 rolldown native binding 未安装）

## 原因
npm 的 optional dependencies 安装存在已知 bug（npm/cli#4828），导致 rolldown 平台特定的 native binding 包没有被正确下载。

## 修复方案
1. `.npmrc` 增加 `optional=true` 和 `legacy-peer-deps=true`
2. 新增 `install-web.bat` 一键安装脚本（自动清理+重装）
3. 用户执行：
   ```
   rd /s /q node_modules
   del package-lock.json
   npm install
   ```
   如果仍然报错，手动安装: `npm install @rolldown/binding-win32-x64-msvc`

## 修改文件
- `.npmrc`
- `install-web.bat`（新增）

