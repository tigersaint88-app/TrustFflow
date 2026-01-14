/**
 * API服务器主文件
 * 提供RESTful API接口
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');

const TF_OrderMatchingService = require('../services/TF_orderMatching');
const TF_LocationTrackingService = require('../services/TF_locationTracking');
const BlockchainListenerService = require('../services/blockchainListener');
const OrderService = require('../services/orderService');
const UserStorageService = require('../services/userStorage');
const PlatformStorageService = require('../services/platformStorage');

const app = express();

// 中间件
app.use(helmet({
    contentSecurityPolicy: false // 允许内联脚本（用于ethers.js）
}));

// CORS 配置 - 允许所有来源（开发环境）
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

// 增加请求体大小限制（从默认100kb增加到10mb，用于处理日志数据）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 设置日志目录
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// 创建日志文件流（按天轮转）
const getLogStream = () => {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `server-${today}.log`);
    return fs.createWriteStream(logFile, { flags: 'a' });
};

// 自定义morgan格式，只包含URL和查询参数（不包含body）
morgan.token('req-query', (req) => {
    const queryString = Object.keys(req.query).length > 0 
        ? '?' + new URLSearchParams(req.query).toString()
        : '';
    return queryString;
});

morgan.token('full-url', (req) => {
    // 构建完整的URL，包括查询参数
    const baseUrl = req.originalUrl || req.url;
    const queryString = Object.keys(req.query).length > 0 
        ? '?' + new URLSearchParams(req.query).toString()
        : '';
    return baseUrl + queryString;
});

// 文件日志格式（添加来源标识，只保留来源和URL）
const fileLogFormat = '[SERVER] [:date[iso]] :method :full-url :status';

// 控制台日志（简化）
app.use(morgan('combined'));

// 文件日志（详细）
const logStream = getLogStream();
app.use(morgan(fileLogFormat, { stream: logStream }));

// 静态文件服务 - 提供合约ABI和部署信息
app.use('/contracts', express.static(path.join(__dirname, '../../contracts')));

// 配置
const config = require('../config/config.js');

// 初始化服务
const orderMatchingService = new TF_OrderMatchingService(config);
const locationTrackingService = new TF_LocationTrackingService(config);
const blockchainListenerService = new BlockchainListenerService(config);
const orderService = new OrderService(config);
const userStorageService = new UserStorageService();

// 启动区块链监听
blockchainListenerService.start();

// ==================== 订单相关API ====================

/**
 * 计算预估费用
 */
app.post('/api/calculate-fare', async (req, res) => {
    try {
        const { pickup, destination } = req.body;
        
        // 计算距离
        const distance = calculateDistance(
            pickup.lat, pickup.lng,
            destination.lat, destination.lng
        );
        
        // 费用计算逻辑（基础费用 + 距离费用）
        const baseFare = 0.005; // ETH
        const perKmFare = 0.001; // ETH per km
        const fare = baseFare + (distance * perKmFare);
        
        res.json({
            success: true,
            data: {
                distance: distance.toFixed(2),
                fare: fare.toFixed(6),
                estimatedTime: Math.ceil(distance / 40 * 60) // 假设平均40km/h
            }
        });
    } catch (error) {
        console.error('计算费用错误:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取可用订单（司机）
 * 使用统一的订单服务，保证完备性、原子性、统一性和事务性
 */
app.get('/api/available-orders', async (req, res) => {
    // 设置较长的超时时间（30秒）
    req.setTimeout(30000);
    
    try {
        const { driver, forceRefresh = false } = req.query;
        
        if (!driver) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少司机地址' 
            });
        }
        
        // 验证地址格式
        if (!ethers.utils.isAddress(driver)) {
            return res.status(400).json({ 
                success: false, 
                error: '无效的地址格式' 
            });
        }
        
        // 使用 Promise.race 添加超时保护
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('请求超时：获取订单列表时间过长')), 25000);
        });
        
        const ordersPromise = orderService.getAvailableOrders(driver, {
            useCache: true,
            forceRefresh: forceRefresh === 'true',
            validateData: true
        });
        
        const orders = await Promise.race([ordersPromise, timeoutPromise]);
        
        res.json({
            success: true,
            data: orders,
            count: orders.length,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('[API] 获取可用订单错误:', error);
        
        // 确保响应头还没有发送
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                error: error.message,
                timestamp: Date.now()
            });
        }
    }
});

/**
 * 获取订单详情
 * 使用统一订单服务
 */
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderIdNum = parseInt(orderId);
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        
        console.log(`[SERVER] [API] GET ${fullUrl} - 请求订单详情`, {
            orderId: orderId,
            orderIdNum: orderIdNum,
            ip: req.ip,
            timestamp: new Date().toISOString(),
            userAgent: req.get('user-agent')
        });
        
        if (isNaN(orderIdNum) || orderIdNum < 0) {
            console.warn(`[SERVER] [API] GET ${fullUrl} - 无效的订单ID: ${orderId}`);
            return res.status(400).json({ 
                success: false, 
                error: '无效的订单ID' 
            });
        }
        
        // 使用统一订单服务获取订单
        console.log(`[SERVER] [API] GET ${fullUrl} - 调用orderService.getOrderById(${orderIdNum})`);
        const order = await orderService.getOrderById(orderIdNum, {
            useCache: true,
            validateData: true
        });
        console.log(`[SERVER] [API] GET ${fullUrl} - 获取订单成功`, {
            orderId: orderIdNum,
            hasOrder: !!order,
            orderStatus: order?.status
        });
        
        res.json({
            success: true,
            data: order,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error(`[SERVER] [API] GET /api/orders/${req.params.orderId} - 获取订单详情错误:`, error);
        console.error(`[SERVER] [API] 错误堆栈:`, error.stack);
        console.error(`[SERVER] [API] 错误详情:`, {
            message: error.message,
            name: error.name,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: Date.now()
        });
    }
});

/**
 * 获取用户订单历史
 * 使用统一订单服务
 */
app.get('/api/users/:address/orders', async (req, res) => {
    try {
        const { address } = req.params;
        const { type = 'passenger' } = req.query; // 'passenger' or 'driver'
        
        // 验证地址格式
        if (!ethers.utils.isAddress(address)) {
            return res.status(400).json({ 
                success: false, 
                error: '无效的地址格式' 
            });
        }
        
        // 验证类型
        if (type !== 'passenger' && type !== 'driver') {
            return res.status(400).json({ 
                success: false, 
                error: '无效的类型，必须是 passenger 或 driver' 
            });
        }
        
        // 使用统一订单服务获取用户订单
        const orders = await orderService.getUserOrders(address, type, {
            useCache: true,
            validateData: true
        });
        
        res.json({ 
            success: true, 
            data: orders,
            count: orders.length,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('[API] 获取用户订单历史错误:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: Date.now()
        });
    }
});

/**
 * 同步订单ID（用于前端通知后端新订单已创建）
 * 注意：这只是一个通知端点，不实际更新配置
 * 订单ID由智能合约管理，后端通过监听事件自动同步
 */
app.post('/api/orders/sync/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderIdNum = parseInt(orderId);
        
        if (isNaN(orderIdNum) || orderIdNum < 0) {
            return res.status(400).json({ 
                success: false, 
                error: '无效的订单ID' 
            });
        }
        
        // 记录订单创建通知（用于调试和监控）
        console.log(`[API] 收到订单同步通知: orderId=${orderIdNum}`);
        
        // 注意：订单ID由智能合约管理，后端通过区块链监听服务自动同步
        // 这里只是确认收到通知，不实际更新任何配置
        
        res.json({
            success: true,
            data: {
                orderId: orderIdNum,
                message: '订单同步通知已收到，后端将通过区块链监听自动同步订单数据',
                timestamp: Date.now()
            }
        });
    } catch (error) {
        console.error('[API] 同步订单ID错误:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: Date.now()
        });
    }
});

// ==================== 位置追踪API ====================

/**
 * 开始追踪
 */
app.post('/api/tracking/start', async (req, res) => {
    try {
        const { orderId, driverAddress, passengerAddress } = req.body;
        
        const trip = await locationTrackingService.startTracking(
            orderId,
            driverAddress,
            passengerAddress
        );
        
        res.json({ success: true, data: trip });
    } catch (error) {
        console.error('开始追踪错误:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 更新位置
 */
app.post('/api/tracking/location', async (req, res) => {
    try {
        const { orderId, location } = req.body;
        
        const point = await locationTrackingService.addLocationPoint(orderId, location);
        
        res.json({ success: true, data: point });
    } catch (error) {
        console.error('更新位置错误:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 停止追踪
 */
app.post('/api/tracking/stop', async (req, res) => {
    try {
        const { orderId } = req.body;
        
        const result = await locationTrackingService.stopTracking(orderId);
        
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('停止追踪错误:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取当前位置
 */
app.get('/api/tracking/:orderId/current', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const location = await locationTrackingService.getCurrentLocation(parseInt(orderId));
        
        res.json({ success: true, data: location });
    } catch (error) {
        console.error('获取位置错误:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取行程详情
 */
app.get('/api/tracking/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const trip = await locationTrackingService.getTripDetails(parseInt(orderId));
        
        res.json({ success: true, data: trip });
    } catch (error) {
        console.error('获取行程详情错误:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 用户相关API ====================

/**
 * 批量获取用户信息
 */
app.post('/api/user-info/batch', async (req, res) => {
    try {
        const { addresses } = req.body;
        
        if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
            return res.status(400).json({
                success: false,
                error: '缺少地址数组或地址数组为空'
            });
        }
        
        // 验证地址格式并去重
        const validAddresses = [...new Set(addresses)]
            .filter(addr => {
                if (!addr || typeof addr !== 'string') {
                    return false;
                }
                try {
                    return ethers.utils.isAddress(addr);
                } catch (e) {
                    return false;
                }
            })
            .map(addr => addr.toLowerCase());
        
        if (validAddresses.length === 0) {
            return res.status(400).json({
                success: false,
                error: '没有有效的地址'
            });
        }
        
        // 批量获取用户信息
        const userProfiles = await userStorageService.getUserProfilesBatch(validAddresses);
        
        // 构建地址到用户信息的映射
        const userInfoMap = {};
        userProfiles.forEach(profile => {
            if (profile && profile.address) {
                userInfoMap[profile.address.toLowerCase()] = {
                    id: profile.id || null,
                    nickname: profile.nickname || null,
                    contact: profile.contact || null
                };
            }
        });
        
        // 对于没有找到的用户，也添加到映射中（值为 null）
        validAddresses.forEach(addr => {
            if (!userInfoMap[addr]) {
                userInfoMap[addr] = {
                    id: null,
                    nickname: null,
                    contact: null
                };
            }
        });
        
        res.json({
            success: true,
            data: userInfoMap
        });
    } catch (error) {
        console.error('[API] 批量获取用户信息错误:', error);
        console.error('[API] 错误堆栈:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message || '批量获取用户信息失败'
        });
    }
});

/**
 * 获取单个用户信息（从存储服务）
 */
app.get('/api/user-info/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        if (!ethers.utils.isAddress(address)) {
            return res.status(400).json({
                success: false,
                error: '无效的地址格式'
            });
        }
        
        const profile = await userStorageService.getUserProfile(address);
        
        if (!profile) {
            return res.json({
                success: true,
                data: {
                    id: null,
                    nickname: null,
                    contact: null
                }
            });
        }
        
        res.json({
            success: true,
            data: {
                id: profile.id || null,
                nickname: profile.nickname || null,
                contact: profile.contact || null
            }
        });
    } catch (error) {
        console.error('[API] 获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 获取用户信息（从链上）
 */
app.get('/api/users/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        const userRegistryContract = new ethers.Contract(
            config.contracts.userRegistry,
            config.abis.userRegistry,
            provider
        );
        
        const user = await userRegistryContract.getUser(address);
        
        res.json({
            success: true,
            data: {
                address: user.userAddress,
                userType: user.userType,
                name: user.name,
                kycStatus: user.kycStatus,
                creditScore: user.creditScore.toNumber(),
                totalRides: user.totalRides.toNumber(),
                isBlacklisted: user.isBlacklisted
            }
        });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取司机信息
 */
app.get('/api/drivers/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        const userRegistryContract = new ethers.Contract(
            config.contracts.userRegistry,
            config.abis.userRegistry,
            provider
        );
        
        const driver = await userRegistryContract.getDriverInfo(address);
        
        res.json({
            success: true,
            data: {
                vehiclePlate: driver.vehiclePlate,
                vehicleModel: driver.vehicleModel,
                isActive: driver.isActive,
                totalEarnings: ethers.utils.formatEther(driver.totalEarnings)
            }
        });
    } catch (error) {
        console.error('获取司机信息错误:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取用户评价
 */
app.get('/api/users/:address/ratings', async (req, res) => {
    try {
        const { address } = req.params;
        
        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        const ratingSystemContract = new ethers.Contract(
            config.contracts.ratingSystem,
            config.abis.ratingSystem,
            provider
        );
        
        const rating = await ratingSystemContract.getUserRating(address);
        const receivedRatings = await ratingSystemContract.getReceivedRatings(address);
        
        res.json({
            success: true,
            data: {
                totalRatings: rating.totalRatings.toNumber(),
                averageScore: rating.averageScore.toNumber() / 100,
                fiveStars: rating.fiveStars.toNumber(),
                fourStars: rating.fourStars.toNumber(),
                threeStars: rating.threeStars.toNumber(),
                twoStars: rating.twoStars.toNumber(),
                oneStar: rating.oneStar.toNumber(),
                recentRatings: receivedRatings.slice(-10).map(r => ({
                    orderId: r.orderId.toNumber(),
                    rater: r.rater,
                    score: r.score,
                    comment: r.comment,
                    timestamp: r.timestamp.toNumber()
                }))
            }
        });
    } catch (error) {
        console.error('获取评价错误:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 平台相关API ====================

/**
 * 获取订单统计数据（优化版本，避免前端遍历所有订单）
 * 只查询最近的订单，减少 eth_call 调用
 */
app.get('/api/platform/order-statistics', async (req, res) => {
    try {
        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        const rideOrderContract = new ethers.Contract(
            config.contracts.rideOrder,
            config.abis.rideOrder,
            provider
        );
        
        // 获取订单总数
        const orderCount = await rideOrderContract.orderCount();
        const orderCountNum = orderCount.toNumber();
        
        // 如果订单数量很大，只查询最近的订单（比如最近1000个）
        const MAX_ORDERS_TO_CHECK = 1000;
        const startIndex = Math.max(0, orderCountNum - MAX_ORDERS_TO_CHECK);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Math.floor(today.getTime() / 1000);
        
        let todayTotalOrders = 0;
        let todayTotalAmount = ethers.BigNumber.from(0);
        let activeOrdersCount = 0;
        let activeOrdersAmount = ethers.BigNumber.from(0);
        let disputeOrdersCount = 0;
        let disputeOrdersAmount = ethers.BigNumber.from(0);
        
        // 只遍历最近的订单
        for (let i = startIndex; i < orderCountNum; i++) {
            try {
                console.log(`[server.js:618] 查询订单 #${i} (订单总数: ${orderCountNum}, 起始索引: ${startIndex})`);
                const order = await rideOrderContract.getOrder(i);
                console.log(`[server.js:620] 订单 #${i} 查询成功`);
                const orderCreatedAt = order.createdAt.toNumber();
                const rideStatus = order.rideStatus;
                const estimatedFare = order.estimatedFare;
                const disputeOpened = order.disputeOpened;
                
                // 当日总订单数
                if (orderCreatedAt >= todayTimestamp) {
                    todayTotalOrders++;
                    todayTotalAmount = todayTotalAmount.add(estimatedFare);
                }
                
                // 活跃订单：ACCEPTED (2), IN_PROGRESS (3) 或 AWAITING_SETTLEMENT (5)
                if (rideStatus === 2 || rideStatus === 3 || rideStatus === 5) {
                    activeOrdersCount++;
                    activeOrdersAmount = activeOrdersAmount.add(estimatedFare);
                }
                
                // 争议订单（只查询有争议的订单的详细状态）
                if (disputeOpened) {
                    const disputeStatus = await rideOrderContract.getDisputeStatus(i);
                    if (!disputeStatus.disputeResolved) {
                        disputeOrdersCount++;
                        disputeOrdersAmount = disputeOrdersAmount.add(estimatedFare);
                    }
                }
            } catch (error) {
                // 跳过不存在的订单
                console.warn(`[server.js:647] 订单 ${i} 查询失败:`, error.message);
                console.warn(`[server.js:648] 错误详情:`, {
                    code: error.code,
                    reason: error.reason,
                    method: error.method,
                    data: error.data ? error.data.substring(0, 100) + '...' : undefined
                });
            }
        }
        
        res.json({
            success: true,
            data: {
                totalOrders: orderCountNum,
                checkedOrders: orderCountNum - startIndex,
                todayTotalOrders,
                todayTotalAmount: ethers.utils.formatEther(todayTotalAmount),
                activeOrdersCount,
                activeOrdersAmount: ethers.utils.formatEther(activeOrdersAmount),
                disputeOrdersCount,
                disputeOrdersAmount: ethers.utils.formatEther(disputeOrdersAmount)
            }
        });
    } catch (error) {
        console.error('获取订单统计数据失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取活跃订单列表（优化版本，只查询最近的订单）
 */
app.get('/api/platform/active-orders', async (req, res) => {
    try {
        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        const rideOrderContract = new ethers.Contract(
            config.contracts.rideOrder,
            config.abis.rideOrder,
            provider
        );
        
        const orderCount = await rideOrderContract.orderCount();
        const orderCountNum = orderCount.toNumber();
        
        // 只查询最近的订单（比如最近500个）
        const MAX_ORDERS_TO_CHECK = 500;
        const startIndex = Math.max(0, orderCountNum - MAX_ORDERS_TO_CHECK);
        
        const activeOrders = [];
        
        for (let i = startIndex; i < orderCountNum; i++) {
            try {
                console.log(`[server.js:693] 查询活跃订单 #${i} (订单总数: ${orderCountNum}, 起始索引: ${startIndex})`);
                const order = await rideOrderContract.getOrder(i);
                console.log(`[server.js:695] 活跃订单 #${i} 查询成功`);
                const rideStatus = order.rideStatus;
                
                // 活跃订单：ACCEPTED (2), IN_PROGRESS (3) 或 AWAITING_SETTLEMENT (5)
                if (rideStatus === 2 || rideStatus === 3 || rideStatus === 5) {
                    const statusNames = {
                        2: 'ACCEPTED',
                        3: 'IN_PROGRESS',
                        5: 'AWAITING_SETTLEMENT'
                    };
                    
                    activeOrders.push({
                        orderId: i,
                        passenger: order.passenger,
                        driver: order.driver && order.driver !== ethers.constants.AddressZero ? order.driver : null,
                        pickup: {
                            latitude: order.pickup.latitude.toNumber(),
                            longitude: order.pickup.longitude.toNumber(),
                            addressText: order.pickup.addressText
                        },
                        destination: {
                            latitude: order.destination.latitude.toNumber(),
                            longitude: order.destination.longitude.toNumber(),
                            addressText: order.destination.addressText
                        },
                        estimatedFare: ethers.utils.formatEther(order.estimatedFare),
                        rideStatus: rideStatus,
                        createdAt: order.createdAt.toNumber(),
                        status: statusNames[rideStatus] || 'UNKNOWN'
                    });
                }
            } catch (error) {
                console.warn(`[server.js:725] 活跃订单 ${i} 查询失败:`, error.message);
                console.warn(`[server.js:726] 错误详情:`, {
                    code: error.code,
                    reason: error.reason,
                    method: error.method,
                    data: error.data ? error.data.substring(0, 100) + '...' : undefined
                });
            }
        }
        
        // 按创建时间倒序排列
        activeOrders.sort((a, b) => b.createdAt - a.createdAt);
        
        res.json({
            success: true,
            data: {
                orders: activeOrders,
                totalChecked: orderCountNum - startIndex,
                totalOrders: orderCountNum
            }
        });
    } catch (error) {
        console.error('获取活跃订单失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取平台统计摘要
 */
app.get('/api/platform/summary', async (req, res) => {
    try {
        const platformStorage = new PlatformStorageService();
        const summary = await platformStorage.getSummary();
        
        res.json({
            success: true,
            data: {
                totalTransactions: summary.totalTransactions || 0,
                totalRevenue: summary.totalRevenue || '0',
                totalPlatformFee: summary.totalPlatformFee || '0',
                totalDisputes: summary.totalDisputes || 0,
                resolvedDisputes: summary.resolvedDisputes || 0,
                updatedAt: summary.updatedAt || Date.now()
            }
        });
    } catch (error) {
        console.error('获取平台统计摘要失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 前端日志API ====================

/**
 * 接收前端日志
 */
app.post('/api/logs/frontend', (req, res) => {
    try {
        // 支持批量日志（logs数组）和单条日志（兼容旧格式）
        const logs = req.body.logs || [req.body];
        
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `frontend-${today}.log`);
        const userAgent = req.get('user-agent');
        const ip = req.ip || req.connection.remoteAddress;
        
        // 批量写入日志
        const logLines = logs.map(logEntry => {
            const entry = {
                timestamp: logEntry.timestamp || new Date().toISOString(),
                level: logEntry.level || 'info',
                message: logEntry.message || '',
                data: logEntry.data || {},
                source: logEntry.source || 'frontend', // 来源标识
                userAgent: userAgent,
                ip: ip
            };
            
            return `[${entry.timestamp}] [${entry.source.toUpperCase()}] [${entry.level.toUpperCase()}] ${entry.message} | Data: ${JSON.stringify(entry.data)} | IP: ${entry.ip} | UA: ${entry.userAgent}\n`;
        }).join('');
        
        fs.appendFileSync(logFile, logLines, 'utf8');
        
        res.json({ success: true, count: logs.length });
    } catch (error) {
        console.error('[server.js] 写入前端日志失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 合约地址API ====================

/**
 * 获取合约地址
 * 前端使用此端点获取最新的合约地址
 */
app.get('/api/contracts/addresses', (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                rideOrder: config.contracts.rideOrder,
                paymentEscrow: config.contracts.paymentEscrow,
                userRegistry: config.contracts.userRegistry,
                ratingSystem: config.contracts.ratingSystem,
                disputeResolution: config.contracts.disputeResolution
            }
        });
    } catch (error) {
        console.error('获取合约地址错误:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 健康检查 ====================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        services: {
            api: 'running',
            blockchain: blockchainListenerService.isRunning ? 'running' : 'stopped',
            orderMatching: 'running',
            locationTracking: 'running'
        }
    });
});

// ==================== 辅助函数 ====================

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// ==================== 错误处理 ====================

app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        error: '服务器内部错误'
    });
});

// ==================== 前端静态文件服务 ====================

// 提供前端静态文件服务（必须在所有API路由之后）
if (process.env.SERVE_FRONTEND === 'true' || process.argv.includes('--serve-frontend')) {
    const frontendPath = path.join(__dirname, '../../frontend/passenger-app');
    app.use(express.static(frontendPath));
    
    // SPA路由支持：所有非API路由返回index.html
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(frontendPath, 'index.html'));
        } else {
            res.status(404).json({ success: false, error: 'API endpoint not found' });
        }
    });
    
    console.log(`📁 Serving frontend from: ${frontendPath}`);
}

// ==================== 启动服务器 ====================

const PORT = process.env.PORT || config.apiPort || 3000;

const server = app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('TrustFlow Server Started');
    console.log('='.repeat(60));
    console.log(`\n🌐 Server running at: http://localhost:${PORT}`);
    if (process.env.SERVE_FRONTEND === 'true' || process.argv.includes('--serve-frontend')) {
        console.log(`📱 Frontend: http://localhost:${PORT}`);
        console.log(`🔌 API: http://localhost:${PORT}/api`);
    } else {
        console.log(`🔌 API: http://localhost:${PORT}/api`);
    }
    console.log('\nPress Ctrl+C to stop the server');
    console.log('='.repeat(60));
});

// 错误处理
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error('\n❌ 错误: 端口已被占用');
        console.error(`   端口 ${PORT} 正在被其他进程使用`);
        console.error('\n解决方案:');
        console.error(`   1. 终止占用端口的进程:`);
        console.error(`      Windows: netstat -ano | findstr :${PORT}`);
        console.error(`      然后: taskkill /F /PID <进程ID>`);
        console.error(`   2. 或使用其他端口:`);
        console.error(`      set API_PORT=3001`);
        console.error(`      然后重新启动服务器`);
        console.error(`   3. 或修改环境变量 PORT 或 API_PORT`);
        process.exit(1);
    } else {
        console.error('服务器启动错误:', error);
        process.exit(1);
    }
});

module.exports = app;







