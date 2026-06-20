@echo off
chcp 65001 >nul
echo ══════════════════════════════════════════════════
echo   鸣潮声骸扫描工具 - 依赖安装
echo ══════════════════════════════════════════════════
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python，请先安装Python 3.9+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] 升级pip...
python -m pip install --upgrade pip

echo.
echo [2/3] 安装基础依赖...
pip install --user mss>=9.0 pyautogui>=0.9 psutil>=5.9 Pillow>=10.0 numpy>=1.24 pywin32>=306

echo.
echo [3/3] 安装PaddlePaddle和PaddleOCR（较大，请耐心等待）...
echo      如果出现权限错误，请以管理员身份运行此脚本
pip install --user "paddlepaddle>=2.5,<3.0" "paddleocr>=2.7,<3.0" -f https://www.paddlepaddle.org.cn/whl/windows/cpu-mkl-avx/stable.html

echo.
if errorlevel 1 (
    echo ──────────────────────────────────────────────────
    echo [提示] 如果安装失败，请尝试以下方法：
    echo.
    echo   方法1: 以管理员身份运行此脚本
    echo          右键 install.bat → 以管理员身份运行
    echo.
    echo   方法2: 手动逐个安装
    echo          pip install --user paddlepaddle
    echo          pip install --user paddleocr
    echo.
    echo   方法3: 如果是路径过长问题，启用Windows长路径支持
    echo          以管理员运行PowerShell执行:
    echo          New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
    echo ──────────────────────────────────────────────────
) else (
    echo ══════════════════════════════════════════════════
    echo   安装完成！运行扫描工具：python -m scanner
    echo ══════════════════════════════════════════════════
)

pause
