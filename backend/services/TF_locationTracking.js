/**
 * 位置跟踪服务
 * 负责GPS实时追踪和行程路径记录
 */

const redis = require('redis');

// IPFS客户端导入（v56.0.3 支持 CommonJS）
let ipfsClient = null;
try {
    const { create } = require('ipfs-http-client');
    ipfsClient = create;
} catch (error) {
    console.warn('IPFS客户端加载失败:', error.message);
    console.warn('IPFS功能将被禁用，轨迹将不会上传到IPFS');
}

class TF_LocationTrackingService {
    constructor(config) {
        this.config = config;
        this.redisClient = redis.createClient(config.redis);
        this.redisEnabled = false; // Redis连接状态
        
        // IPFS客户端（延迟初始化，只有在实际使用时才连接）
        this.ipfs = null;
        this.ipfsUrl = config.ipfsUrl || 'http://localhost:5001';
        this.ipfsEnabled = ipfsClient !== null;
        
        // 活跃行程追踪 { orderId: { points: [], startTime, ... } }
        this.activeTrips = new Map();
        
        // 内存存储（当Redis不可用时使用）
        this.memoryStore = {
            active_trips: new Map(),
            trip_history: new Map()
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
     * 初始化IPFS客户端（延迟加载）
     */
    async initIPFS() {
        if (this.ipfs) {
            return this.ipfs;
        }
        
        if (!this.ipfsEnabled || !ipfsClient) {
            console.warn('IPFS功能未启用，跳过IPFS客户端初始化');
            return null;
        }
        
        try {
            this.ipfs = ipfsClient({ url: this.ipfsUrl });
            console.log(`IPFS客户端已初始化: ${this.ipfsUrl}`);
            return this.ipfs;
        } catch (error) {
            console.error('IPFS客户端初始化失败:', error.message);
            console.warn('IPFS功能将被禁用');
            this.ipfsEnabled = false;
            return null;
        }
    }
    
    async init() {
        console.log('位置跟踪服务启动...');
        
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
    }
    
    /**
     * 开始追踪行程
     */
    async startTracking(orderId, driverAddress, passengerAddress) {
        console.log(`开始追踪订单 #${orderId}`);
        
        const trip = {
            orderId,
            driverAddress,
            passengerAddress,
            startTime: Date.now(),
            points: [],
            distance: 0,
            status: 'active'
        };
        
        this.activeTrips.set(orderId, trip);
        
        // 存储到Redis或内存
        if (this.redisEnabled) {
            await this.redisClient.hSet('active_trips', orderId.toString(), JSON.stringify(trip));
        } else {
            this.memoryStore.active_trips.set(orderId.toString(), trip);
        }
        
        return trip;
    }
    
    /**
     * 添加位置点
     */
    async addLocationPoint(orderId, locationData) {
        const trip = this.activeTrips.get(orderId);
        
        if (!trip) {
            throw new Error(`订单 #${orderId} 未在追踪中`);
        }
        
        const point = {
            lat: locationData.lat,
            lng: locationData.lng,
            timestamp: Date.now(),
            speed: locationData.speed || 0,
            accuracy: locationData.accuracy || 0,
            heading: locationData.heading || 0
        };
        
        trip.points.push(point);
        
        // 计算距离增量（如果不是第一个点）
        if (trip.points.length > 1) {
            const prevPoint = trip.points[trip.points.length - 2];
            const distance = this.calculateDistance(
                prevPoint.lat,
                prevPoint.lng,
                point.lat,
                point.lng
            );
            trip.distance += distance;
        }
        
        // 更新Redis或内存（每10个点更新一次以减少IO）
        if (trip.points.length % 10 === 0) {
            if (this.redisEnabled) {
                await this.redisClient.hSet('active_trips', orderId.toString(), JSON.stringify(trip));
            } else {
                this.memoryStore.active_trips.set(orderId.toString(), trip);
            }
        }
        
        // 实时推送给乘客和司机（通过WebSocket）
        this.broadcastLocation(orderId, point);
        
        return point;
    }
    
    /**
     * 停止追踪
     */
    async stopTracking(orderId) {
        const trip = this.activeTrips.get(orderId);
        
        if (!trip) {
            throw new Error(`订单 #${orderId} 未在追踪中`);
        }
        
        trip.endTime = Date.now();
        trip.duration = trip.endTime - trip.startTime;
        trip.status = 'completed';
        
        console.log(`订单 #${orderId} 追踪结束，总距离: ${trip.distance.toFixed(2)} km`);
        
        // 将完整轨迹上传到IPFS
        const ipfsHash = await this.uploadToIPFS(trip);
        trip.ipfsHash = ipfsHash;
        
        // 存储到数据库（持久化）
        await this.saveTripToDatabase(trip);
        
        // 从活跃列表移除
        this.activeTrips.delete(orderId);
        if (this.redisEnabled) {
            await this.redisClient.hDel('active_trips', orderId.toString());
        } else {
            this.memoryStore.active_trips.delete(orderId.toString());
        }
        
        return {
            orderId,
            distance: trip.distance,
            duration: trip.duration,
            ipfsHash
        };
    }
    
    /**
     * 获取行程详情
     */
    async getTripDetails(orderId) {
        // 先检查活跃行程
        if (this.activeTrips.has(orderId)) {
            return this.activeTrips.get(orderId);
        }
        
        // 从Redis或内存获取
        let tripData = null;
        if (this.redisEnabled) {
            tripData = await this.redisClient.hGet('active_trips', orderId.toString());
            if (tripData) {
                return JSON.parse(tripData);
            }
        } else {
            tripData = this.memoryStore.active_trips.get(orderId.toString());
            if (tripData) {
                return tripData;
            }
        }
        
        // 从数据库获取历史记录
        return await this.getTripFromDatabase(orderId);
    }
    
    /**
     * 获取当前位置
     */
    async getCurrentLocation(orderId) {
        const trip = this.activeTrips.get(orderId);
        
        if (!trip || trip.points.length === 0) {
            return null;
        }
        
        return trip.points[trip.points.length - 1];
    }
    
    /**
     * 验证到达
     */
    async verifyArrival(orderId, targetLocation, tolerance = 0.2) {
        const currentLocation = await this.getCurrentLocation(orderId);
        
        if (!currentLocation) {
            return false;
        }
        
        const distance = this.calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            targetLocation.lat,
            targetLocation.lng
        );
        
        // 如果距离小于容忍值（默认200米），认为已到达
        return distance <= tolerance;
    }
    
    /**
     * 计算两点距离（公里）
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
    }
    
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
    
    /**
     * 上传到IPFS
     */
    async uploadToIPFS(trip) {
        if (!this.ipfsEnabled) {
            console.warn('IPFS功能未启用，跳过上传');
            return null;
        }
        
        try {
            const ipfs = await this.initIPFS();
            if (!ipfs) {
                return null;
            }
            
            // 准备上传数据（移除大对象，只保留必要信息）
            const uploadData = {
                orderId: trip.orderId,
                startTime: trip.startTime,
                endTime: trip.endTime,
                duration: trip.duration,
                distance: trip.distance,
                points: trip.points,
                driverAddress: trip.driverAddress,
                passengerAddress: trip.passengerAddress
            };
            
            const result = await ipfs.add(JSON.stringify(uploadData));
            
            if (result && result.path) {
                console.log(`订单 #${trip.orderId} 轨迹已上传到IPFS: ${result.path}`);
                return result.path;
            } else {
                console.warn(`订单 #${trip.orderId} IPFS上传返回空路径`);
                return null;
            }
        } catch (error) {
            console.error('IPFS上传失败:', error.message);
            return null;
        }
    }
    
    /**
     * 从IPFS获取
     */
    async getFromIPFS(ipfsHash) {
        if (!this.ipfsEnabled) {
            console.warn('IPFS功能未启用，跳过读取');
            return null;
        }
        
        try {
            const ipfs = await this.initIPFS();
            if (!ipfs) {
                return null;
            }
            
            const stream = ipfs.cat(ipfsHash);
            const chunks = [];
            
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            
            if (chunks.length === 0) {
                return null;
            }
            
            const data = Buffer.concat(chunks).toString();
            return JSON.parse(data);
        } catch (error) {
            console.error('IPFS读取失败:', error.message);
            return null;
        }
    }
    
    /**
     * 广播位置更新
     */
    broadcastLocation(orderId, point) {
        // 这里应该通过WebSocket或消息队列推送
        // 实际实现需要集成WebSocket服务
        console.log(`广播订单 #${orderId} 位置更新:`, point);
        
        // 发布到Redis频道（如果启用）
        if (this.redisEnabled) {
            this.redisClient.publish('location_updates', JSON.stringify({
                orderId,
                location: point
            })).catch(err => {
                // 忽略发布错误，不影响主要功能
            });
        }
    }
    
    /**
     * 保存到数据库
     */
    async saveTripToDatabase(trip) {
        // 这里应该集成实际的数据库（MongoDB、PostgreSQL等）
        // 保存到Redis或内存
        const tripSummary = {
            orderId: trip.orderId,
            driverAddress: trip.driverAddress,
            passengerAddress: trip.passengerAddress,
            startTime: trip.startTime,
            endTime: trip.endTime,
            duration: trip.duration,
            distance: trip.distance,
            ipfsHash: trip.ipfsHash,
            pointsCount: trip.points.length
        };
        
        if (this.redisEnabled) {
            await this.redisClient.hSet('trip_history', trip.orderId.toString(), JSON.stringify(tripSummary));
        } else {
            this.memoryStore.trip_history.set(trip.orderId.toString(), tripSummary);
        }
        
        console.log(`订单 #${trip.orderId} 已保存到数据库`);
    }
    
    /**
     * 从数据库获取
     */
    async getTripFromDatabase(orderId) {
        let tripData = null;
        
        if (this.redisEnabled) {
            tripData = await this.redisClient.hGet('trip_history', orderId.toString());
            if (tripData) {
                tripData = JSON.parse(tripData);
            }
        } else {
            tripData = this.memoryStore.trip_history.get(orderId.toString());
        }
        
        if (!tripData) {
            return null;
        }
        
        const trip = tripData;
        
        // 如果需要完整轨迹，从IPFS加载
        if (trip.ipfsHash) {
            const fullData = await this.getFromIPFS(trip.ipfsHash);
            if (fullData) {
                trip.points = fullData.points;
            }
        }
        
        return trip;
    }
    
    /**
     * 获取行程统计
     */
    async getTripStats(orderId) {
        const trip = await this.getTripDetails(orderId);
        
        if (!trip) {
            return null;
        }
        
        const stats = {
            orderId: trip.orderId,
            distance: trip.distance,
            duration: trip.duration,
            averageSpeed: trip.distance / (trip.duration / 1000 / 3600), // km/h
            pointsCount: trip.points.length,
            startTime: trip.startTime,
            endTime: trip.endTime
        };
        
        return stats;
    }
}

module.exports = TF_LocationTrackingService;

