#!/bin/bash

# 重置 Hardhat 本地节点 - 清除所有交易历史并恢复账户余额

echo "============================================"
echo "重置 Hardhat 本地节点"
echo "============================================"
echo ""

# 检查并停止 Hardhat 节点
echo "[1/4] 检查并停止 Hardhat 节点..."
NODE_PID=$(lsof -ti:8545 2>/dev/null)
if [ ! -z "$NODE_PID" ]; then
    echo "发现 Hardhat 节点进程 (PID: $NODE_PID)，正在停止..."
    kill -9 $NODE_PID 2>/dev/null
    sleep 2
fi

# 等待端口释放
echo "等待端口释放..."
sleep 2

# 清除部署历史（可选）
echo "[2/4] 清除部署历史（可选）..."
read -p "是否要清除所有部署历史？(y/N): " clearHistory

if [[ "$clearHistory" =~ ^[Yy]$ ]]; then
    echo "清除部署历史文件..."
    rm -f deployments/localhost-*.json 2>/dev/null
    echo "已清除部署历史"
else
    echo "保留部署历史"
fi

# 启动 Hardhat 节点
echo "[3/4] 启动 Hardhat 节点..."
npm run node > /dev/null 2>&1 &
NODE_PID=$!

echo "等待节点启动..."
sleep 5

# 验证节点是否运行
echo "[4/4] 验证节点是否运行..."
if lsof -ti:8545 > /dev/null 2>&1; then
    echo "✓ Hardhat 节点已成功启动"
    echo ""
    echo "节点地址: http://127.0.0.1:8545"
    echo ""
    echo "下一步操作:"
    echo "1. 在 MetaMask 中清除交易历史（见下方说明）"
    echo "2. 运行: npm run deploy:local"
    echo "3. 或者运行: ./start-dev-with-deploy.bat"
else
    echo "✗ Hardhat 节点启动失败，请检查错误信息"
fi

echo ""
echo "============================================"
echo "关于清除 MetaMask 交易历史:"
echo "============================================"
echo "MetaMask 无法直接删除交易历史，但您可以:"
echo ""
echo "方法 1 (推荐): 使用新的测试账户"
echo "  - 在 MetaMask 中创建一个新的测试账户"
echo "  - 导入 Hardhat 测试账户的私钥"
echo ""
echo "方法 2: 重置账户"
echo "  - MetaMask -> 设置 -> 高级 -> 重置账户"
echo "  - 警告: 这会清除该账户的所有交易历史"
echo ""
echo "方法 3: 使用不同的网络名称"
echo "  - 在 MetaMask 中添加新的本地网络（不同的 Chain ID）"
echo "  - 这样可以隔离不同测试环境的交易历史"
echo ""

