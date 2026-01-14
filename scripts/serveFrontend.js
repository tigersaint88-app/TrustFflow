/**
 * 前端静态文件服务器
 * 用于在开发环境中运行前端应用（同时服务乘客端和司机端）
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');

const app = express();
const PORT = process.env.FRONTEND_PORT || 3001;
const API_PORT = process.env.API_PORT || 3000;

// 启用CORS
app.use(cors());

// API 代理：将所有 /api/* 请求转发到后端服务器
// 注意：必须在静态文件服务之前，确保 API 请求优先被代理处理
app.use('/api', express.json(), (req, res) => {
    console.log(`[API Proxy] ${req.method} ${req.originalUrl} -> http://localhost:${API_PORT}${req.originalUrl}`);
    
    // 准备请求体
    let bodyString = '';
    if (req.body && Object.keys(req.body).length > 0) {
        bodyString = JSON.stringify(req.body);
    }
    
    const options = {
        hostname: 'localhost',
        port: API_PORT,
        path: req.originalUrl,
        method: req.method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    // 如果有请求体，设置 Content-Length
    if (bodyString) {
        options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }
    
    // 复制必要的请求头（排除一些不应该传递的头部）
    if (req.headers['user-agent']) {
        options.headers['user-agent'] = req.headers['user-agent'];
    }
    if (req.headers['accept']) {
        options.headers['accept'] = req.headers['accept'];
    }
    if (req.headers['accept-language']) {
        options.headers['accept-language'] = req.headers['accept-language'];
    }
    
    const proxyReq = http.request(options, (proxyRes) => {
        console.log(`[API Proxy] Response: ${proxyRes.statusCode} for ${req.originalUrl}`);
        
        // 复制响应头
        res.status(proxyRes.statusCode);
        Object.keys(proxyRes.headers).forEach(key => {
            // 跳过一些不应该复制的头部
            if (key.toLowerCase() !== 'host' && 
                key.toLowerCase() !== 'connection' &&
                key.toLowerCase() !== 'transfer-encoding') {
                res.setHeader(key, proxyRes.headers[key]);
            }
        });
        
        // 转发响应体
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
        console.error(`[API Proxy Error] ${req.originalUrl}:`, err.message);
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                error: 'API server connection failed',
                message: err.message 
            });
        }
    });
    
    // 转发请求体
    if (bodyString) {
        proxyReq.write(bodyString);
    }
    
    proxyReq.end();
});

// 路径配置
const passengerAppPath = path.join(__dirname, '../frontend/passenger-app');
const driverAppPath = path.join(__dirname, '../frontend/driver-app');
const platformDashboardPath = path.join(__dirname, '../frontend/platform-dashboard');
const deploymentsPath = path.join(__dirname, '../deployments');

// 提供静态文件服务（必须在路由之前）
// 注意：express.static 的顺序很重要，更具体的路径应该放在前面

// 0. 首先提供 deployments 目录的静态文件（用于所有应用访问合约地址）
app.use('/deployments', express.static(deploymentsPath));

// 1. 然后提供平台仪表板的静态文件（最具体的路径）
app.use('/platform', express.static(platformDashboardPath));

// 2. 然后提供司机端的静态文件（更具体的路径）
app.use('/driver', express.static(driverAppPath));

// 3. 然后提供乘客端的静态文件（更具体的路径）
app.use('/passenger', express.static(passengerAppPath));

// 4. 最后提供根路径的静态文件（默认使用乘客端的文件，用于加载 i18n.js, config.js 等）
app.use(express.static(passengerAppPath, {
    // 如果请求的是 HTML 文件，不自动发送（由下面的路由处理）
    index: false
}));

// 路由处理（SPA支持）
// 根路径：返回乘客端的 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(passengerAppPath, 'index.html'));
});

// 乘客端路由：所有 /passenger 开头的路径返回乘客端的 index.html
app.get('/passenger', (req, res) => {
    res.sendFile(path.join(passengerAppPath, 'index.html'));
});

// 司机端路由：所有 /driver 开头的路径返回司机端的 index.html
app.get('/driver', (req, res) => {
    res.sendFile(path.join(driverAppPath, 'index.html'));
});

// 平台仪表板路由：所有 /platform 开头的路径返回平台仪表板的 index.html
app.get('/platform', (req, res) => {
    res.sendFile(path.join(platformDashboardPath, 'index.html'));
});

// SPA 路由支持（必须放在最后）
app.get('*', (req, res, next) => {
    // 如果是静态资源请求，跳过（已经由 express.static 处理）
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
        return next();
    }
    
    // 如果是 /platform 路径，返回平台仪表板的 index.html
    if (req.path.startsWith('/platform')) {
        return res.sendFile(path.join(platformDashboardPath, 'index.html'));
    }
    
    // 如果是 /driver 路径，返回司机端的 index.html
    if (req.path.startsWith('/driver')) {
        return res.sendFile(path.join(driverAppPath, 'index.html'));
    }
    
    // 其他所有路径返回乘客端的 index.html
    res.sendFile(path.join(passengerAppPath, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('Frontend Server Started');
    console.log('='.repeat(60));
    console.log(`\n🌐 乘客端 (Passenger App):`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://localhost:${PORT}/passenger`);
    console.log(`\n🚗 司机端 (Driver App):`);
    console.log(`   http://localhost:${PORT}/driver`);
    console.log(`\n💰 平台仪表板 (Platform Dashboard):`);
    console.log(`   http://localhost:${PORT}/platform`);
    console.log(`\n📡 API 代理配置:`);
    console.log(`   /api/* -> http://localhost:${API_PORT}/api/*`);
    console.log(`   后端服务器: http://localhost:${API_PORT}`);
    console.log(`\n📁 文件路径:`);
    console.log(`   乘客端: ${passengerAppPath}`);
    console.log(`   司机端: ${driverAppPath}`);
    console.log(`   平台仪表板: ${platformDashboardPath}`);
    console.log('\n按 Ctrl+C 停止服务器');
    console.log('='.repeat(60));
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n\nShutting down frontend server...');
    process.exit(0);
});

