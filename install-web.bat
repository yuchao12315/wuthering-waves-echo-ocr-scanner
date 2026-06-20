@echo off
chcp 65001 >nul
echo ══════════════════════════════════════════════════
echo   鸣潮声骸计算器 - Web端依赖安装
echo ══════════════════════════════════════════════════
echo.

REM 检查Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Node.js，请先安装Node.js 20+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] 清理旧安装...
if exist node_modules rd /s /q node_modules
if exist package-lock.json del package-lock.json

echo [2/3] 安装依赖（包含native binding）...
npm install

echo [3/3] 验证安装...
npx vite --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [提示] 如果仍报native binding错误，请执行:
    echo   npm install @rolldown/binding-win32-x64-msvc
    echo.
) else (
    echo ✓ Vite 安装成功
)

echo.
echo ══════════════════════════════════════════════════
echo   安装完成！启动命令: npm run dev
echo ══════════════════════════════════════════════════
pause
