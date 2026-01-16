# 快速启动指南 - 在服务中运行前端

## 🚀 最简单的方法（推荐）

### Windows用户
双击运行：
```
start-dev.bat
```

### Linux/Mac用户
```bash
chmod +x start-dev.sh
./start-dev.sh
```

这将自动启动：
- ✅ Hardhat本地节点 (端口 8545)
- ✅ 后端API服务 (端口 3000)
- ✅ 前端应用 (端口 3001)

## 📋 手动启动（分步）

### 方法1: 独立前端服务器（开发推荐）

**终端1 - 启动后端API**:
```bash
npm run server:dev
```

**终端2 - 启动前端**:
```bash
npm run frontend
```

**访问**:
- 前端: http://localhost:3001
- API: http://localhost:3000

### 方法2: 集成服务（生产推荐）

**单个命令启动所有服务**:
```bash
npm run server:full
```

**访问**:
- 前端和API都在: http://localhost:3000

## 🔧 其他方法

### 使用Python（如果已安装）
```bash
cd frontend/passenger-app
python -m http.server 8080
```

### 使用Node.js http-server
```bash
npm install -g http-server
cd frontend/passenger-app
http-server -p 8080
```

## 📖 详细文档

查看完整文档: `docs/SERVING_FRONTEND.md`

---

**提示**: 首次运行前，请确保：
1. ✅ 已安装依赖: `npm install`
2. ✅ 已编译合约: `npm run compile`
3. ✅ 已部署合约: `npm run deploy:local` (如果需要)

