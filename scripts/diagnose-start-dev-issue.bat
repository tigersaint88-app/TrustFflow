@echo off
chcp 65001 >nul
echo ========================================
echo start-dev.bat 问题诊断工具
echo ========================================
echo.

echo [检查 1] 检查端口 8545 状态...
netstat -ano | findstr :8545 >nul
if %ERRORLEVEL% == 0 (
    echo ⚠️  端口 8545 已被占用！
    echo.
    echo 查找占用端口的进程...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8545') do (
        echo   进程 PID: %%a
        tasklist /FI "PID eq %%a" 2>nul | findstr /V "INFO:" | findstr /V "="
    )
    echo.
    echo 这可能意味着:
    echo   1. Hardhat 节点已在运行（这是正常的）
    echo   2. 其他程序占用了端口
    echo.
) else (
    echo ✅ 端口 8545 未被占用
    echo   这意味着 Hardhat 节点没有运行
)
echo.

echo [检查 2] 检查是否有 Node.js 进程在运行...
tasklist | findstr /I "node.exe" >nul
if %ERRORLEVEL% == 0 (
    echo ⚠️  发现 Node.js 进程正在运行
    echo.
    echo Node.js 进程列表:
    tasklist | findstr /I "node.exe"
    echo.
) else (
    echo ✅ 没有发现 Node.js 进程
    echo   这意味着没有 Node.js 服务在运行
)
echo.

echo [检查 3] 测试是否可以启动新窗口...
echo 正在测试启动新窗口命令...
start "测试窗口" cmd /k "echo 如果看到这个窗口，说明可以正常启动新窗口 && timeout /t 3"
timeout /t 2 /nobreak >nul
echo ✅ 测试窗口应该已经打开
echo.

echo [检查 4] 检查 curl 命令是否可用...
where curl >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ✅ curl 命令可用
) else (
    echo ⚠️  curl 命令不可用
    echo   这会影响节点启动检测
    echo   建议安装 curl 或使用 Windows 10 自带的版本
)
echo.

echo [检查 5] 检查 npm 命令是否可用...
where npm >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ✅ npm 命令可用
    npm --version
) else (
    echo ❌ npm 命令不可用！
    echo   请确保 Node.js 已正确安装
)
echo.

echo [检查 6] 检查项目目录...
cd /d %~dp0..
if exist package.json (
    echo ✅ 项目目录正确
    echo   当前目录: %CD%
) else (
    echo ❌ 无法找到 package.json
    echo   请确保在项目根目录运行此脚本
)
echo.

echo ========================================
echo 诊断结果和建议
echo ========================================
echo.

netstat -ano | findstr :8545 >nul
if %ERRORLEVEL% == 0 (
    echo 📋 结论: Hardhat 节点可能已在运行
    echo.
    echo 💡 建议:
    echo   1. 检查是否有名为 "Hardhat Node" 的窗口已打开
    echo   2. 如果节点已在运行，这是正常的
    echo   3. 如果不想使用现有节点，请先结束进程:
    echo      netstat -ano ^| findstr :8545
    echo      taskkill /PID ^<PID号^> /F
    echo.
) else (
    echo 📋 结论: Hardhat 节点没有运行
    echo.
    echo 💡 建议:
    echo   1. 手动启动节点测试:
    echo      start "Hardhat Node 测试" cmd /k "npm run node"
    echo   2. 如果手动启动失败，检查错误信息
    echo   3. 如果手动启动成功，说明 start-dev.bat 的检测逻辑有问题
    echo.
)

echo ========================================
echo 下一步操作
echo ========================================
echo.
echo 选项 1: 手动启动节点（用于测试）
echo   start "Hardhat Node" cmd /k "npm run node"
echo.
echo 选项 2: 查看 start-dev.bat 的详细输出
echo   直接运行 start-dev.bat，查看每一步的输出
echo.
echo 选项 3: 强制重新启动所有服务
echo   先结束所有 Node.js 进程，然后重新运行 start-dev.bat
echo.
pause

