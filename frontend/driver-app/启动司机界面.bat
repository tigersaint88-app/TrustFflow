@echo off
chcp 65001 >nul
echo ====================================
echo   TrustFlow 司机界面启动脚本
echo ====================================
echo.

cd /d "%~dp0"

echo 正在检查Python...
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ 找到Python，启动HTTP服务器...
    echo.
    echo 🌐 司机界面将在以下地址启动：
    echo    http://localhost:8080
    echo.
    echo 按 Ctrl+C 停止服务器
    echo.
    python -m http.server 8080
) else (
    echo ✗ 未找到Python
    echo.
    echo 请使用以下方法之一：
    echo 1. 安装Python: https://www.python.org/downloads/
    echo 2. 或直接在浏览器中打开 index.html
    echo 3. 或使用VS Code的Live Server扩展
    echo.
    pause
)
