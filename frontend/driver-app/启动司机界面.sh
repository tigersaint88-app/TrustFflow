#!/bin/bash
echo "===================================="
echo "  TrustFlow 司机界面启动脚本"
echo "===================================="
echo ""

cd "$(dirname "$0")"

echo "正在检查Python..."
if command -v python3 &> /dev/null; then
    echo "✓ 找到Python3，启动HTTP服务器..."
    echo ""
    echo "🌐 司机界面将在以下地址启动："
    echo "   http://localhost:8080"
    echo ""
    echo "按 Ctrl+C 停止服务器"
    echo ""
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    echo "✓ 找到Python，启动HTTP服务器..."
    echo ""
    echo "🌐 司机界面将在以下地址启动："
    echo "   http://localhost:8080"
    echo ""
    echo "按 Ctrl+C 停止服务器"
    echo ""
    python -m http.server 8080
else
    echo "✗ 未找到Python"
    echo ""
    echo "请使用以下方法之一："
    echo "1. 安装Python: https://www.python.org/downloads/"
    echo "2. 或使用Node.js http-server:"
    echo "   npm install -g http-server"
    echo "   http-server -p 8080"
    echo "3. 或使用VS Code的Live Server扩展"
    echo ""
    exit 1
fi
