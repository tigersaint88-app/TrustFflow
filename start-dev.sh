#!/bin/bash
# TrustFlow 开发环境启动脚本 (Linux/Mac)

echo "============================================================"
echo "TrustFlow Development Environment"
echo "============================================================"
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# 启动Hardhat节点（后台）
echo "[1/4] Starting Hardhat node..."
npm run node > /dev/null 2>&1 &
HARDHAT_PID=$!
sleep 3

# 启动后端API（后台）
echo "[2/4] Starting Backend API server..."
npm run server:dev > logs/backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

# 启动前端服务器（后台）
echo "[3/4] Starting Frontend server..."
npm run frontend > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 2

echo "[4/4] All services started!"
echo ""
echo "============================================================"
echo "Services Running:"
echo "============================================================"
echo "Backend API:  http://localhost:3000 (PID: $BACKEND_PID)"
echo "Frontend:     http://localhost:3001 (PID: $FRONTEND_PID)"
echo "Hardhat Node: http://localhost:8545 (PID: $HARDHAT_PID)"
echo ""
echo "Logs:"
echo "  Backend:  tail -f logs/backend.log"
echo "  Frontend: tail -f logs/frontend.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo "============================================================"

# 创建日志目录
mkdir -p logs

# 等待中断信号
trap "echo ''; echo 'Stopping all services...'; kill $HARDHAT_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# 保持脚本运行
wait

