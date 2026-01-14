# 快速修复网络连接错误

## 错误信息
```
Error: could not detect network (event="noNetwork", code=NETWORK_ERROR)
```

## 快速解决步骤

### 方法 1: 一键诊断和修复

```bash
# 1. 运行网络诊断工具
npm run check:network

# 2. 如果诊断显示节点未运行，启动节点
npm run node
```

### 方法 2: 手动排查

**步骤 1: 检查节点是否运行**

打开新的终端窗口，运行：

```bash
npm run node
```

**步骤 2: 等待节点启动**

看到以下消息表示节点已启动：
```
Started HTTP and WebSocket server on http://127.0.0.1:8545/
```

**步骤 3: 保持节点运行**

⚠️ **重要**: 不要关闭运行节点的终端窗口！

**步骤 4: 在另一个终端运行你的服务**

```bash
npm run server
```

### 方法 3: 使用启动脚本（推荐）

Windows:

```bash
start-dev.bat
```

Linux/Mac:

```bash
./start-dev.sh
```

这些脚本会自动启动 Hardhat 节点和后端服务。

## 常见问题

### Q: 节点启动后立即关闭？

**解决**: 检查端口是否被占用

Windows:
```bash
netstat -ano | findstr :8545
```

如果端口被占用，结束进程：
```bash
taskkill /PID <PID号> /F
```

### Q: 连接成功但 Chain ID 不匹配？

**解决**: 检查 `hardhat.config.js` 中的 chainId 配置，应该是 1337

### Q: 仍然无法连接？

运行完整诊断：

```bash
npm run check:network
```

查看详细文档：

```
docs/网络连接错误排查指南.md
```

## 预防措施

1. **使用启动脚本**: 使用 `start-dev.bat` 自动启动所有服务
2. **先启动节点**: 在任何服务启动前，确保 Hardhat 节点已运行
3. **保持节点运行**: 节点必须持续运行，关闭节点会导致连接失败

