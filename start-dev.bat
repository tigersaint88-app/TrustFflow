@echo off
setlocal enabledelayedexpansion

REM TrustFlow Development Environment Startup Script (Windows) - ETH Mode
REM This script starts the three required services:
REM   1. Hardhat Node (port 8545)
REM   2. Backend API Server (port 3000)
REM   3. Frontend Server (port 3001)

echo ============================================================
echo TrustFlow Development Environment (ETH Mode)
echo ============================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Starting services...
echo.

REM [1/3] Start Hardhat Node
echo [1/3] Starting Hardhat node...
netstat -ano | findstr ":8545" >nul 2>&1
if errorlevel 1 (
    echo   Starting Hardhat node...
    start "Hardhat Node" cmd /k "npm run node"
    echo   Waiting for Hardhat node to start...
    timeout /t 5 /nobreak >nul
    
    REM Wait for node to be ready
    set /a retry=0
    :check_node
    node scripts\check-node-ready.js >nul 2>&1
    if errorlevel 1 (
        set /a retry+=1
        if !retry! lss 60 (
            echo   Still waiting for Hardhat node... (!retry!/60)
            timeout /t 2 /nobreak >nul
            goto check_node
        )
        echo   [ERROR] Hardhat node failed to start after 120 seconds
        echo   Note: If the node is already running, you can continue manually.
        pause
        exit /b 1
    )
    echo   Hardhat node is ready!
    timeout /t 2 /nobreak >nul
) else (
    echo   Hardhat node is already running.
    REM Verify node is actually ready
    node scripts\check-node-ready.js >nul 2>&1
    if errorlevel 1 (
        echo   [WARNING] Node is running but not responding, waiting...
        set /a retry=0
        :wait_existing_node
        node scripts\check-node-ready.js >nul 2>&1
        if errorlevel 1 (
            set /a retry+=1
            if !retry! lss 10 (
                timeout /t 1 /nobreak >nul
                goto wait_existing_node
            )
            echo   [WARNING] Node may not be fully ready, continuing anyway...
        )
    )
)

echo.
echo [2/3] Starting Backend API server...
echo   Backend will automatically load contract addresses from .env
echo   Frontend will fetch addresses from backend API
start "Backend API" cmd /k "npm run server:dev"

echo.
echo [3/3] Starting Frontend server...
timeout /t 3 /nobreak >nul
start "Frontend" cmd /k "npm run frontend"

echo.
echo ============================================================
echo Services Started Successfully!
echo ============================================================
echo.
echo Hardhat Node: http://localhost:8545
echo Backend API:  http://localhost:3000
echo Frontend:     http://localhost:3001
echo.
echo Frontend Applications:
echo   - Passenger App: http://localhost:3001
echo   - Driver App:     http://localhost:3001/driver
echo   - Platform:       http://localhost:3001/platform
echo.
echo ============================================================
echo ETH Mode Information
echo ============================================================
echo.
echo This system uses ETH (Ethereum) for all transactions.
echo Gas fees are paid separately in ETH.
echo.
echo IMPORTANT:
echo - Contract addresses are automatically synced from deployment files
echo - Frontend automatically fetches addresses from backend API
echo - Initial order ID is set via INITIAL_ORDER_ID in .env
echo.
echo TIPS:
echo - To reset everything: reset.bat
echo - To deploy contracts: npm run deploy:local
echo - To verify deployment: npm run verify:env
echo - To check order count: npx hardhat run scripts/check-order-count.js --network localhost
echo.
echo IMPORTANT: If you just ran reset.bat:
echo   - Make sure you cleared browser cache (Ctrl+Shift+Delete)
echo   - Close all browser tabs with the application
echo   - Then refresh the page to load new contract addresses
echo.
echo All services are running in separate windows.
echo Close the windows or press Ctrl+C in each window to stop.
echo.
pause
exit /b 0
