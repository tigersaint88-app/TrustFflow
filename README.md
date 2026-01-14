# TrustFlow - 去中心化租赁支付系统

## 系统架构概述

本项目是一个基于区块链智能合约的去中心化租赁支付系统（TrustFlow Escrow Layer），实现去中心化的订单管理和支付功能。初始落地场景为租车服务。

## 核心部件

### 1. 智能合约层 (Blockchain Layer)

#### 1.1 支付托管合约 (TrustFlowEscrow.sol)
- **功能**: 
  - 资金托管：乘客下单时锁定资金
  - 自动释放：行程完成后自动支付给司机
  - 退款机制：取消订单时退款给乘客
  - 手续费收取：平台抽成管理

#### 1.2 订单管理合约 (TrustFlowRide.sol)
- **功能**:
  - 订单创建：记录起点、终点、预估费用
  - 订单状态管理：待接单、进行中、已完成、已取消
  - 订单匹配：司机接单逻辑
  - 行程验证：起点/终点确认

#### 1.3 用户管理合约 (TrustFlowUserRegistry.sol)
- **功能**:
  - 用户注册：司机和乘客身份认证
  - 信用评分：基于历史记录的评分系统
  - 黑名单管理：违规用户管理
  - KYC验证：身份验证状态

#### 1.4 评价系统合约 (TrustFlowRating.sol)
- **功能**:
  - 双向评价：乘客评价司机，司机评价乘客
  - 评分统计：计算平均评分
  - 评价激励：评价奖励机制
  - 防刷单：一单一评

#### 1.5 争议处理合约 (TrustFlowDispute.sol)
- **功能**:
  - 争议提交：乘客或司机提出争议
  - 仲裁机制：多签仲裁或DAO投票
  - 证据提交：上传争议证据哈希
  - 赔付处理：根据仲裁结果处理资金

### 2. 后端服务层 (Backend Services)

#### 2.1 订单匹配服务 (OrderMatchingService)
- 实时订单广播
- 智能匹配算法（距离、评分）
- 订单队列管理

#### 2.2 位置跟踪服务 (LocationTrackingService)
- GPS实时追踪
- 行程路径记录
- 到达验证

#### 2.3 通知服务 (NotificationService)
- 推送通知（订单状态变更）
- 短信/邮件通知
- 应用内消息

#### 2.4 链下存储服务 (OffChainStorageService)
- IPFS存储行程详情
- GPS轨迹存储
- 图片/视频证据存储

#### 2.5 区块链监听服务 (BlockchainListenerService)
- 监听智能合约事件
- 同步链上数据到数据库
- 触发后端业务逻辑

### 3. 前端应用层 (Frontend Applications)

#### 3.1 乘客端 (Passenger App)
- 地图选择起止点
- 下单并锁定资金
- 实时追踪行程
- 支付和评价

#### 3.2 司机端 (Driver App)
- 接单界面
- 导航功能
- 确认到达和完成订单
- 收款和评价

#### 3.3 管理后台 (Admin Dashboard)
- 订单监控
- 争议处理
- 数据统计
- 系统配置

### 4. 数据存储层 (Data Storage)

#### 4.1 链上数据
- 订单关键信息
- 支付记录
- 用户信用分
- 评价记录

#### 4.2 链下数据库
- 用户详细信息
- GPS轨迹
- 订单详情
- 聊天记录

#### 4.3 分布式存储 (IPFS)
- 大文件存储
- 证据材料
- 行程快照

### 5. 集成接口层 (Integration Layer)

#### 5.1 支付网关
- 法币充值（支付宝、微信、银行卡）
- 加密货币兑换
- 提现服务

#### 5.2 地图服务
- 地图显示（高德、百度地图）
- 路线规划
- 距离计算

#### 5.3 身份验证
- 实名认证
- 驾照验证
- 车辆信息验证

## 技术栈

### 区块链
- Solidity (智能合约开发)
- Hardhat / Truffle (开发框架)
- Ethereum / Polygon / BSC (区块链网络)
- Web3.js / Ethers.js (区块链交互)

### 后端
- Node.js / Python
- Express.js / FastAPI
- WebSocket (实时通信)
- Redis (缓存)
- PostgreSQL / MongoDB (数据库)

### 前端
- React / React Native / Flutter
- Web3Modal (钱包连接)
- Mapbox / 高德地图 SDK
- Socket.io Client (实时更新)

### 基础设施
- IPFS (分布式存储)
- AWS / 阿里云 (云服务)
- Docker (容器化)
- Nginx (负载均衡)

## 项目结构

```
TrustFlow/
├── contracts/              # 智能合约
│   ├── TrustFlowEscrow.sol
│   ├── TrustFlowRide.sol
│   ├── TrustFlowUserRegistry.sol
│   ├── TrustFlowRating.sol
│   └── TrustFlowDispute.sol
├── backend/               # 后端服务
│   ├── services/
│   │   ├── TF_orderMatching.js
│   │   ├── TF_locationTracking.js
│   │   ├── notification.js
│   │   └── blockchainListener.js
│   ├── api/
│   └── config/
├── frontend/              # 前端应用
│   ├── passenger-app/     # 乘客端
│   ├── driver-app/        # 司机端
│   └── admin-dashboard/   # 管理后台
├── scripts/               # 部署脚本
├── test/                  # 测试文件
└── docs/                  # 文档
```

## 工作流程

### 完整订单流程

1. **乘客下单**
   - 乘客在App选择起止点
   - 系统计算预估费用
   - 乘客确认并调用智能合约锁定资金

2. **司机接单**
   - 司机收到订单推送
   - 司机接单，订单状态更新

3. **行程开始**
   - 司机到达上车点
   - 确认乘客上车，开始计费
   - 后端开始记录GPS轨迹

4. **行程结束**
   - 到达目的地
   - 司机确认完成订单
   - 智能合约自动释放资金给司机
   - 平台抽取手续费

5. **双向评价**
   - 乘客和司机互相评价
   - 更新信用评分

6. **争议处理（如需要）**
   - 任何一方提交争议
   - 提供证据（GPS轨迹、聊天记录）
   - 仲裁员处理
   - 执行仲裁结果

## 安全考虑

1. **智能合约安全**
   - 重入攻击防护
   - 权限控制
   - 紧急暂停机制
   - 审计验证

2. **数据隐私**
   - 个人信息加密
   - GPS数据脱敏
   - 链上最小化存储

3. **支付安全**
   - 资金托管
   - 多签钱包
   - 异常交易监控

## 部署指南

参见 [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## 许可证

MIT License


