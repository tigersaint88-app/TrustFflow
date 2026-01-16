# 修改摘要 - ABI修复和日志增强

## 日期
2026-01-03

## 主要修改

### 1. 修复前端ABI定义问题
- **问题**: 前端手动定义的ABI中`getOrder`返回结构的字段顺序与实际合约不匹配，导致解码失败
- **解决方案**:
  - 后端添加静态文件服务，提供完整的ABI JSON文件 (`/contracts/abi/TrustFlowRide.json`)
  - 前端优先加载完整的ABI文件
  - 如果加载失败，使用修复后的手动定义ABI（字段顺序已修正）
- **文件**: 
  - `backend/api/server.js` - 添加静态文件服务
  - `frontend/platform-dashboard/index.html` - 加载完整ABI并修正手动定义

### 2. 添加日志来源标识
- **后端服务器日志** (`backend/api/server.js`):
  - 添加`[SERVER]`标识
  - 简化请求日志格式，只保留来源、时间、方法、URL(含query参数)、状态码
  - 移除了body、user-agent、referrer等详细信息
  
- **前端平台日志** (`frontend/platform-dashboard/index.html`):
  - 添加`[PLATFORM]`标识到所有日志
  - 优化日志系统：只发送error/warn级别日志，批量发送机制
  - 排除日志API和静态资源的fetch拦截，避免无限循环

- **区块链监听服务日志** (`backend/services/blockchainListener.js`):
  - 添加`[BLOCKCHAIN]`标识
  - 创建独立的日志文件: `backend/logs/blockchain-YYYY-MM-DD.log`
  - 记录关键事件：服务启动、连接、DisputeOpened、DisputeResolved、OrderCreated等
  - 同时写入文件和控制台

### 3. 增强日志详细程度
- **前端getOrder调用**:
  - 显示完整调用信息：合约地址、RPC URL、函数调用
  - 格式: `contract.getOrder(orderId) at address via rpcUrl`

- **后端HTTP API** (`/api/orders/:orderId`):
  - 记录完整URL、请求参数、IP地址、User-Agent
  - 记录调用前后的状态
  - 错误时打印完整stacktrace

### 4. 优化前端日志系统
- 实现批量发送机制（最多累积50条，或每5秒发送一次）
- 添加发送节流（最少2秒间隔）
- 限制日志数据字段大小（最多1000字符）
- 支持批量日志接收（后端）

## 修改的文件

1. `backend/api/server.js`
   - 添加静态文件服务 `/contracts`
   - 简化请求日志格式
   - 增强API端点日志记录
   - 支持批量前端日志接收

2. `backend/services/blockchainListener.js`
   - 添加独立的文件日志系统
   - 添加日志来源标识 `[BLOCKCHAIN]`
   - 在关键位置添加详细日志

3. `frontend/platform-dashboard/index.html`
   - 修复ABI定义问题
   - 添加加载完整ABI功能
   - 优化日志系统（批量发送、节流）
   - 添加详细的getOrder调用日志
   - 添加renderDisputeList日志
   - 添加日志来源标识 `[PLATFORM]`

## 影响

- **性能**: 日志请求数量大幅减少（约减少90%+），避免前端阻塞
- **调试**: 所有关键操作都有详细日志，便于问题追踪
- **稳定性**: 修复了ABI不匹配导致的解码错误
- **可维护性**: 统一的日志格式和来源标识，便于日志分析

## 注意事项

- 需要重启后端服务器以应用更改
- 前端需要刷新页面以加载新的ABI
- 日志文件位置: `backend/logs/`
  - `server-YYYY-MM-DD.log` - 后端API日志
  - `frontend-YYYY-MM-DD.log` - 前端日志
  - `blockchain-YYYY-MM-DD.log` - 区块链监听日志

