@echo off
chcp 65001 >nul
echo ========================================
echo 合约部署问题一键修复工具
echo ========================================
echo.

echo 此工具将：
echo   1. 检查 Hardhat 节点是否运行
echo   2. 检查合约部署状态
echo   3. 如果合约未部署，自动部署
echo   4. 更新前端配置
echo.

pause

echo.
echo [步骤 1/4] 检查 Hardhat 节点...
echo.

netstat -ano | findstr :8545 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Hardhat 节点未运行
    echo.
    echo 是否要启动 Hardhat 节点？(Y/N)
    set /p start_node=
    if /i "!start_node!"=="Y" (
        echo 正在启动 Hardhat 节点...
        start "Hardhat Node" cmd /k "npm run node"
        echo 等待节点启动（10秒）...
        timeout /t 10 /nobreak >nul
        echo 节点应该已启动
    ) else (
        echo 请先启动 Hardhat 节点: npm run node
        echo 然后重新运行此脚本
        pause
        exit /b 1
    )
) else (
    echo ✅ Hardhat 节点正在运行
)

echo.
echo [步骤 2/4] 检查合约部署状态...
echo.

node scripts/check-contract-deployment.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  发现合约部署问题
    echo.
    echo 是否要重新部署合约？(Y/N)
    set /p redeploy=
    if /i "!redeploy!"=="Y" (
        echo.
        echo [步骤 3/4] 重新部署合约...
        echo.
        call npm run deploy:local
        if %ERRORLEVEL% NEQ 0 (
            echo.
            echo ❌ 合约部署失败
            echo 请检查错误信息并手动部署: npm run deploy:local
            pause
            exit /b 1
        )
        echo.
        echo ✅ 合约部署完成
    ) else (
        echo 跳过部署步骤
        echo 如果你手动部署了合约，可以继续下一步
        pause
    )
) else (
    echo ✅ 所有合约都已正确部署
)

echo.
echo [步骤 4/5] 更新环境变量...
echo.

node scripts/update-env-from-deployment.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 更新环境变量失败
    echo 请检查错误信息
    pause
    exit /b 1
) else (
    echo ✅ 环境变量已更新
)

echo.
echo [步骤 5/5] 更新前端配置...
echo.

node scripts/fix-contract-address.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 更新前端配置失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ 修复完成！
echo ========================================
echo.
echo 下一步：
echo   1. 重启后端服务（如果正在运行）
echo   2. 刷新前端页面
echo   3. 重新连接钱包
echo   4. 如果问题仍然存在，检查浏览器控制台的错误信息
echo.
pause

