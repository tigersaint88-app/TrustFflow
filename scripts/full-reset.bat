@echo off
chcp 65001 >nul
echo ========================================
echo 完整系统重置
echo ========================================
echo.
echo 此操作将：
echo   1. 停止所有运行中的服务
echo   2. 清除所有订单缓存
echo   3. 清除部署历史
echo   4. 重启Hardhat节点（重置账户余额）
echo   5. 重新部署智能合约
echo   6. 重启后端和前端服务
echo.
echo 警告: 此操作将清除所有本地数据！
echo.
pause

echo.
echo [1/6] 停止所有服务...
echo.

REM 停止Hardhat节点 (端口8545)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8545 ^| findstr LISTENING') do (
    echo 停止Hardhat节点 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

REM 停止后端服务器 (端口3000)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo 停止后端服务器 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

REM 停止前端服务器 (端口3001)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    echo 停止前端服务器 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 >nul
echo 服务已停止
echo.

echo [2/6] 运行重置脚本...
node scripts/full-reset.js
if errorlevel 1 (
    echo.
    echo 重置脚本执行失败，请检查错误信息
    pause
    exit /b 1
)

echo.
echo ========================================
echo 重置完成！
echo ========================================
echo.
pause

