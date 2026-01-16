@echo off
chcp 65001 >nul
echo ========================================
echo 计算机重启后快速设置脚本
echo ========================================
echo.

echo 此脚本将帮助你快速恢复开发环境：
echo   1. 启动 Hardhat 节点
echo   2. 部署合约
echo   3. 更新前端配置
echo   4. 启动所有服务
echo.

pause

echo.
echo [步骤 1/4] 启动 Hardhat 节点...
echo.

netstat -ano | findstr :8545 >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ✅ Hardhat 节点已在运行
    echo.
) else (
    echo 正在启动 Hardhat 节点...
    start "Hardhat Node" cmd /k "npm run node"
    echo.
    echo ⏳ 等待节点启动（15秒）...
    echo 提示: 看到 "Started HTTP and WebSocket server" 表示节点已启动
    timeout /t 15 /nobreak >nul
    echo.
)

echo [步骤 2/4] 检查合约部署状态...
echo.

node scripts/check-contract-deployment.js >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  合约未部署或需要重新部署
    echo.
    echo 正在部署合约...
    call npm run deploy:local
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ❌ 合约部署失败
        echo 请检查错误信息
        pause
        exit /b 1
    )
    echo.
    echo ✅ 合约部署完成
) else (
    echo ✅ 合约已正确部署
)

echo.
echo [步骤 3/4] 更新前端配置...
echo.

node scripts/fix-contract-address.js
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  更新前端配置失败，但可以继续
) else (
    echo ✅ 前端配置已更新
)

echo.
echo [步骤 4/4] 启动服务...
echo.

echo 是否要启动后端和前端服务？(Y/N)
set /p start_services=
if /i "!start_services!"=="Y" (
    echo.
    echo 启动后端服务...
    start "Backend API" cmd /k "npm run server:dev"
    timeout /t 2 /nobreak >nul
    
    echo 启动前端服务...
    start "Frontend" cmd /k "npm run frontend"
    echo.
    echo ✅ 所有服务已启动
) else (
    echo 跳过服务启动
)

echo.
echo ========================================
echo ✅ 设置完成！
echo ========================================
echo.
echo 📋 下一步：
echo   1. 等待 Hardhat 节点完全启动（看到 "Started..." 消息）
echo   2. 如果启动了服务，等待它们就绪
echo   3. 刷新前端页面（硬刷新：Ctrl+Shift+R）
echo   4. 在 MetaMask 中切换到本地网络（Chain ID: 1337）
echo   5. 连接钱包并测试
echo.
echo 💡 提示：
echo   - Hardhat 节点窗口必须保持打开
echo   - 如果重启了计算机，需要重新运行此脚本
echo.
pause

