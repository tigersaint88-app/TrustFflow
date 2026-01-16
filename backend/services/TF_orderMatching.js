/**
 * 订单匹配服务
 * 负责实时订单广播和智能匹配算法
 */

const { ethers } = require('ethers');
const WebSocket = require('ws');
const redis = require('redis');

class TF_OrderMatchingService {
    constructor(config) {
        this.config = config;
        this.redisClient = redis.createClient(config.redis);
        this.redisEnabled = false; // Redis连接状态
        this.wss = null; // WebSocket服务器（延迟初始化）
        this.wsPort = config.wsPort || 8080;
        this.wsEnabled = false;
        
        // 连接区块链
        this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        this.rideOrderContract = new ethers.Contract(
            config.contracts.rideOrder,
            config.abis.rideOrder,
            this.provider
        );
        
        // 在线司机列表 { driverId: { location, socket, info } }
        this.onlineDrivers = new Map();
        
        // 待处理订单队列
        this.pendingOrders = [];
        
        // 内存存储（当Redis不可用时使用）
        this.memoryStore = {
            online_drivers: new Map(),
            pending_orders: new Map()
        };
        
        // Redis错误处理（仅在已连接后监听运行时错误）
        this.redisClient.on('error', (err) => {
            // 只记录已连接后的运行时错误，连接错误在 init() 中处理
            if (this.redisEnabled) {
                console.warn('Redis运行时错误:', err.message);
            }
        });
        
        this.init();
    }
    
    /**
     * 初始化服务
     */
    async init() {
        console.log('订单匹配服务启动...');
        
        // 尝试连接Redis（可选）
        try {
            await this.redisClient.connect();
            this.redisEnabled = true;
            console.log('✅ Redis连接成功，数据将持久化存储');
        } catch (error) {
            // Redis连接失败是正常的（Redis是可选的）
            this.redisEnabled = false;
            console.log('ℹ️  Redis未启用，使用内存存储模式');
            console.log('   提示: Redis是可选的。如需启用Redis，请启动Redis服务器');
            console.log('   当前模式: 数据存储在内存中（服务器重启后会丢失）');
        }
        
        // 初始化WebSocket服务器
        try {
            this.wss = new WebSocket.Server({ port: this.wsPort });
            this.wsEnabled = true;
            
            // 监听WebSocket错误
            this.wss.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`❌ 端口 ${this.wsPort} 已被占用`);
                    console.error(`   提示: 请终止占用该端口的进程或修改 WS_PORT 环境变量`);
                    console.error(`   命令: netstat -ano | findstr :${this.wsPort}`);
                    this.wsEnabled = false;
                } else {
                    console.error('WebSocket服务器错误:', error.message);
                }
            });
            
            console.log(`✅ WebSocket服务器已启动，监听端口 ${this.wsPort}`);
            
            // 监听WebSocket连接
            this.setupWebSocket();
        } catch (error) {
            console.error(`❌ WebSocket服务器启动失败:`, error.message);
            if (error.code === 'EADDRINUSE') {
                console.error(`   端口 ${this.wsPort} 已被占用`);
                console.error(`   提示: 请终止占用该端口的进程或修改 WS_PORT 环境变量`);
                console.error(`   命令: netstat -ano | findstr :${this.wsPort}`);
            }
            this.wsEnabled = false;
        }
        
        // 监听区块链订单事件
        this.listenToOrderEvents();
        
        // 启动匹配算法循环
        this.startMatchingLoop();
    }
    
    /**
     * 设置WebSocket
     */
    setupWebSocket() {
        if (!this.wss || !this.wsEnabled) {
            console.warn('⚠️  WebSocket未启用，跳过WebSocket连接设置');
            return;
        }
        
        this.wss.on('connection', (ws, req) => {
            console.log('新的WebSocket连接');
            
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    await this.handleMessage(ws, data);
                } catch (error) {
                    console.error('处理消息错误:', error);
                    ws.send(JSON.stringify({ error: '消息处理失败' }));
                }
            });
            
            ws.on('close', () => {
                // 从在线司机列表中移除
                this.removeDriver(ws);
            });
        });
    }
    
    /**
     * 处理WebSocket消息
     */
    async handleMessage(ws, data) {
        const { type, payload } = data;
        
        switch (type) {
            case 'driver_online':
                // 司机上线
                await this.addDriver(ws, payload);
                break;
                
            case 'driver_location_update':
                // 更新司机位置
                await this.updateDriverLocation(payload.driverId, payload.location);
                break;
                
            case 'driver_offline':
                // 司机下线
                this.removeDriver(ws);
                break;
                
            case 'get_available_orders':
                // 获取可用订单
                const orders = await this.getAvailableOrders(payload.driverId);
                ws.send(JSON.stringify({
                    type: 'available_orders',
                    data: orders
                }));
                break;
                
            default:
                console.log('未知消息类型:', type);
        }
    }
    
    /**
     * 添加在线司机
     */
    async addDriver(ws, driverInfo) {
        const { driverId, location } = driverInfo;
        
        this.onlineDrivers.set(driverId, {
            socket: ws,
            location,
            info: driverInfo,
            lastUpdate: Date.now()
        });
        
        // 存储到Redis或内存
        const driverData = {
            location,
            timestamp: Date.now()
        };
        if (this.redisEnabled) {
            await this.redisClient.hSet('online_drivers', driverId, JSON.stringify(driverData));
        } else {
            this.memoryStore.online_drivers.set(driverId, driverData);
        }
        
        console.log(`司机 ${driverId} 上线`);
        
        // 发送确认消息
        ws.send(JSON.stringify({
            type: 'online_success',
            data: { driverId, onlineDriversCount: this.onlineDrivers.size }
        }));
    }
    
    /**
     * 更新司机位置
     */
    async updateDriverLocation(driverId, location) {
        if (this.onlineDrivers.has(driverId)) {
            const driver = this.onlineDrivers.get(driverId);
            driver.location = location;
            driver.lastUpdate = Date.now();
            
            // 更新Redis或内存
            const driverData = {
                location,
                timestamp: Date.now()
            };
            if (this.redisEnabled) {
                await this.redisClient.hSet('online_drivers', driverId, JSON.stringify(driverData));
            } else {
                this.memoryStore.online_drivers.set(driverId, driverData);
            }
        }
    }
    
    /**
     * 移除司机
     */
    async removeDriver(ws) {
        for (const [driverId, driver] of this.onlineDrivers.entries()) {
            if (driver.socket === ws) {
                this.onlineDrivers.delete(driverId);
                if (this.redisEnabled) {
                    await this.redisClient.hDel('online_drivers', driverId);
                } else {
                    this.memoryStore.online_drivers.delete(driverId);
                }
                console.log(`司机 ${driverId} 下线`);
                break;
            }
        }
    }
    
    /**
     * 监听区块链订单事件
     */
    listenToOrderEvents() {
        // 监听订单创建事件
        this.rideOrderContract.on('OrderCreated', async (orderId, passenger, pickupLat, pickupLng, destLat, destLng, estimatedFare) => {
            console.log(`新订单创建: #${orderId.toNumber()}`);
            
            const order = {
                orderId: orderId.toNumber(),
                passenger,
                pickup: {
                    lat: pickupLat.toNumber() / 1e6,
                    lng: pickupLng.toNumber() / 1e6
                },
                destination: {
                    lat: destLat.toNumber() / 1e6,
                    lng: destLng.toNumber() / 1e6
                },
                estimatedFare: ethers.utils.formatEther(estimatedFare),
                createdAt: Date.now(),
                status: 'pending'
            };
            
            // 添加到待处理队列
            this.pendingOrders.push(order);
            
            // 存储到Redis或内存
            if (this.redisEnabled) {
                await this.redisClient.hSet('pending_orders', orderId.toString(), JSON.stringify(order));
            } else {
                this.memoryStore.pending_orders.set(order.orderId.toString(), order);
            }
            
            // 触发匹配
            await this.matchOrder(order);
        });
        
        // 监听订单接受事件
        this.rideOrderContract.on('OrderAccepted', async (orderId, driver) => {
            console.log(`订单 #${orderId.toNumber()} 已被接单`);
            
            // 从待处理队列移除
            this.pendingOrders = this.pendingOrders.filter(o => o.orderId !== orderId.toNumber());
            if (this.redisEnabled) {
                await this.redisClient.hDel('pending_orders', orderId.toString());
            } else {
                this.memoryStore.pending_orders.delete(orderId.toString());
            }
        });
    }
    
    /**
     * 匹配订单
     */
    async matchOrder(order) {
        const suitableDrivers = [];
        
        // 遍历在线司机，计算距离
        for (const [driverId, driver] of this.onlineDrivers.entries()) {
            const distance = this.calculateDistance(
                order.pickup.lat,
                order.pickup.lng,
                driver.location.lat,
                driver.location.lng
            );
            
            // 距离在10公里内的司机
            if (distance <= 10) {
                suitableDrivers.push({
                    driverId,
                    driver,
                    distance,
                    // 可以添加更多匹配因素：评分、接单率等
                });
            }
        }
        
        // 按距离排序
        suitableDrivers.sort((a, b) => a.distance - b.distance);
        
        // 推送给符合条件的司机
        for (const item of suitableDrivers.slice(0, 10)) { // 只推送给最近的10个司机
            item.driver.socket.send(JSON.stringify({
                type: 'new_order',
                data: {
                    ...order,
                    distance: item.distance.toFixed(2)
                }
            }));
        }
        
        console.log(`订单 #${order.orderId} 推送给 ${suitableDrivers.length} 名司机`);
    }
    
    /**
     * 计算两点之间的距离（Haversine公式）
     * @returns 距离（公里）
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // 地球半径（公里）
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        return distance;
    }
    
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
    
    /**
     * 获取可用订单
     */
    async getAvailableOrders(driverId) {
        const driver = this.onlineDrivers.get(driverId);
        if (!driver) return [];
        
        const availableOrders = [];
        
        for (const order of this.pendingOrders) {
            const distance = this.calculateDistance(
                order.pickup.lat,
                order.pickup.lng,
                driver.location.lat,
                driver.location.lng
            );
            
            if (distance <= 10) {
                availableOrders.push({
                    ...order,
                    distance: distance.toFixed(2)
                });
            }
        }
        
        return availableOrders.sort((a, b) => a.distance - b.distance);
    }
    
    /**
     * 启动匹配循环（定期清理过期订单等）
     */
    startMatchingLoop() {
        setInterval(async () => {
            const now = Date.now();
            
            // 清理超过30分钟未接单的订单
            const expiredOrders = this.pendingOrders.filter(order => {
                const age = now - order.createdAt;
                return age > 30 * 60 * 1000;
            });
            
            // 异步删除过期的订单
            for (const order of expiredOrders) {
                console.log(`订单 #${order.orderId} 超时，从队列移除`);
                if (this.redisEnabled) {
                    await this.redisClient.hDel('pending_orders', order.orderId.toString());
                } else {
                    this.memoryStore.pending_orders.delete(order.orderId.toString());
                }
            }
            
            // 从内存中移除过期订单
            this.pendingOrders = this.pendingOrders.filter(order => {
                const age = now - order.createdAt;
                return age <= 30 * 60 * 1000;
            });
            
            // 清理超过5分钟未更新位置的司机
            const expiredDrivers = [];
            for (const [driverId, driver] of this.onlineDrivers.entries()) {
                if (now - driver.lastUpdate > 5 * 60 * 1000) {
                    expiredDrivers.push(driverId);
                }
            }
            
            // 异步删除过期的司机
            for (const driverId of expiredDrivers) {
                console.log(`司机 ${driverId} 超时未更新位置，标记为离线`);
                this.onlineDrivers.delete(driverId);
                if (this.redisEnabled) {
                    await this.redisClient.hDel('online_drivers', driverId);
                } else {
                    this.memoryStore.online_drivers.delete(driverId);
                }
            }
        }, 60000); // 每分钟检查一次
    }
}

module.exports = TF_OrderMatchingService;

