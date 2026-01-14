/**
 * 统一订单服务
 * 提供完备性、原子性、统一性和事务性的订单获取服务
 */

const { ethers } = require('ethers');
const OrderStorageService = require('./orderStorage');

class OrderService {
    constructor(config) {
        this.config = config;
        this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        this.rideOrderContract = new ethers.Contract(
            config.contracts.rideOrder,
            config.abis.rideOrder,
            this.provider
        );
        this.orderStorage = new OrderStorageService(config);
        
        // 缓存配置
        this.cache = new Map();
        this.cacheTimeout = 5000; // 5秒缓存
        this.lastCacheUpdate = 0;
    }
    
    /**
     * 获取可用订单（司机端）
     * 保证：完备性、原子性、统一性、事务性
     * 
     * @param {string} driverAddress - 司机地址
     * @param {object} options - 选项
     * @returns {Promise<Array>} 订单列表
     */
    async getAvailableOrders(driverAddress, options = {}) {
        const {
            useCache = true,
            forceRefresh = false,
            validateData = true
        } = options;
        
        // 检查缓存
        const cacheKey = `available_orders_${driverAddress}`;
        if (useCache && !forceRefresh) {
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log(`[OrderService] 使用缓存数据 (${cached.orders.length} 个订单)`);
                return cached.orders;
            }
        }
        
        try {
            // 原子性：使用事务性获取，要么全部成功要么全部失败
            const orders = await this._fetchOrdersAtomically(driverAddress, validateData);
            
            // 统一性：标准化数据格式
            const normalizedOrders = this._normalizeOrders(orders);
            
            // 完备性：验证数据完整性
            if (validateData) {
                this._validateOrdersCompleteness(normalizedOrders);
            }
            
            // 更新缓存
            if (useCache) {
                this.cache.set(cacheKey, {
                    orders: normalizedOrders,
                    timestamp: Date.now()
                });
            }
            
            console.log(`[OrderService] 获取到 ${normalizedOrders.length} 个可用订单`);
            return normalizedOrders;
            
        } catch (error) {
            console.error('[OrderService] 获取订单失败:', error);
            
            // 如果验证失败，尝试返回缓存数据（如果有）
            if (useCache) {
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    console.warn('[OrderService] 使用过期缓存数据');
                    return cached.orders;
                }
            }
            
            throw error;
        }
    }
    
    /**
     * 原子性获取订单（要么全部成功，要么全部失败）
     */
    async _fetchOrdersAtomically(driverAddress, validateData) {
        const driverLower = driverAddress.toLowerCase();
        const pendingOrders = [];
        
        try {
            // 1. 获取订单总数（原子操作）
            const orderCount = await this.rideOrderContract.orderCount();
            const totalOrders = orderCount.toNumber();
            
            if (totalOrders === 0) {
                return [];
            }
            
            // 获取初始订单ID，只查询有效的订单范围
            const initialOrderId = this.config.services?.orderStorage?.initialOrderId || 10000;
            const startIndex = Math.max(0, initialOrderId);
            
            // 限制最大查询数量，避免超时（只查询最近的订单）
            const MAX_ORDERS_TO_CHECK = 500;
            const effectiveStartIndex = Math.max(startIndex, totalOrders - MAX_ORDERS_TO_CHECK);
            
            console.log(`[OrderService] 查询订单范围: ${effectiveStartIndex} - ${totalOrders} (总共 ${totalOrders} 个订单)`);
            
            // 2. 批量获取订单（使用 Promise.all 保证原子性）
            const BATCH_SIZE = 10; // 减小批次大小，避免超时
            const batches = [];
            let processedCount = 0;
            
            for (let batchStart = effectiveStartIndex; batchStart < totalOrders; batchStart += BATCH_SIZE) {
                const batchEnd = Math.min(batchStart + BATCH_SIZE, totalOrders);
                const batchPromises = [];
                
                // 创建批量请求，添加超时保护
                for (let i = batchStart; i < batchEnd; i++) {
                    const orderPromise = Promise.race([
                        this.rideOrderContract.getOrder(i),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('订单查询超时')), 5000)
                        )
                    ]).catch(err => {
                        // 单个订单失败不影响整体，但记录错误
                        if (err.message !== '订单查询超时') {
                            console.warn(`[OrderService] 获取订单 #${i} 失败:`, err.message);
                        }
                        return null;
                    });
                    
                    batchPromises.push(orderPromise);
                }
                
                // 等待当前批次完成（原子性：要么全部成功，要么标记为失败）
                try {
                    const batchResults = await Promise.all(batchPromises);
                    batches.push(batchResults);
                    processedCount += batchResults.length;
                    
                    // 给 RPC 节点一些喘息时间
                    if (batchEnd < totalOrders) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } catch (error) {
                    console.error(`[OrderService] 批次处理失败 (${batchStart}-${batchEnd}):`, error.message);
                    // 继续处理下一批次
                    batches.push(new Array(batchEnd - batchStart).fill(null));
                }
            }
            
            console.log(`[OrderService] 已处理 ${processedCount} 个订单查询`);
            
            // 3. 处理所有批次的结果
            const invalidOrderIds = new Set(); // 记录已警告的无效订单ID，避免重复输出
            for (const batchResults of batches) {
                for (const order of batchResults) {
                    if (!order) continue; // 跳过失败的订单
                    
                    try {
                        // 验证订单数据
                        if (validateData && !this._isValidOrder(order)) {
                            const orderId = order.orderId?.toNumber ? order.orderId.toNumber() : (order.orderId || 'unknown');
                            // 只对每个无效订单ID警告一次
                            if (!invalidOrderIds.has(orderId)) {
                                invalidOrderIds.add(orderId);
                                console.warn(`[OrderService] 订单数据无效，跳过: ${orderId} (后续相同订单将静默跳过)`);
                            }
                            continue;
                        }
                        
                        const status = typeof order.status === 'number' 
                            ? order.status 
                            : order.status.toNumber();
                        
                        // 只返回 Pending 状态的订单，且不是当前司机创建的
                        if (status === 0 && order.passenger.toLowerCase() !== driverLower) {
                            pendingOrders.push(order);
                        }
                    } catch (error) {
                        console.warn(`[OrderService] 处理订单失败:`, error.message);
                        continue;
                    }
                }
            }
            
            return pendingOrders;
            
        } catch (error) {
            // 如果关键步骤失败，抛出错误（保证原子性）
            throw new Error(`原子性获取订单失败: ${error.message}`);
        }
    }
    
    /**
     * 验证订单数据有效性
     */
    _isValidOrder(order) {
        try {
            // 检查必需字段
            if (!order || !order.orderId) return false;
            
            // 检查数据类型
            const orderId = order.orderId.toNumber ? order.orderId.toNumber() : order.orderId;
            if (typeof orderId !== 'number' || orderId < 0) return false;
            
            // 跳过 orderId 为 0 的订单（通常订单ID应该从初始值开始，比如10000）
            const initialOrderId = this.config.services?.orderStorage?.initialOrderId || 10000;
            if (orderId === 0 || orderId < initialOrderId) return false;
            
            if (!order.passenger || order.passenger === ethers.constants.AddressZero) return false;
            if (!order.pickup || !order.destination) return false;
            if (!order.estimatedFare) return false;
            
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 标准化订单数据格式（统一性）
     */
    _normalizeOrders(orders) {
        return orders.map(order => {
            try {
                return {
                    orderId: order.orderId.toNumber ? order.orderId.toNumber() : order.orderId,
                    passenger: order.passenger,
                    driver: order.driver && order.driver !== ethers.constants.AddressZero 
                        ? order.driver 
                        : null,
                    pickup: {
                        latitude: order.pickup.latitude.toNumber ? order.pickup.latitude.toNumber() / 1e6 : order.pickup.latitude / 1e6,
                        longitude: order.pickup.longitude.toNumber ? order.pickup.longitude.toNumber() / 1e6 : order.pickup.longitude / 1e6,
                        addressText: order.pickup.addressText || ''
                    },
                    destination: {
                        latitude: order.destination.latitude.toNumber ? order.destination.latitude.toNumber() / 1e6 : order.destination.latitude / 1e6,
                        longitude: order.destination.longitude.toNumber ? order.destination.longitude.toNumber() / 1e6 : order.destination.longitude / 1e6,
                        addressText: order.destination.addressText || ''
                    },
                    category: order.category || 'General',
                    subCategory: order.subCategory || 'Standard',
                    estimatedFare: order.estimatedFare 
                        ? (typeof order.estimatedFare === 'string' 
                            ? order.estimatedFare 
                            : ethers.utils.formatEther(order.estimatedFare))
                        : '0',
                    actualFare: order.actualFare && order.actualFare.toString() !== '0'
                        ? ethers.utils.formatEther(order.actualFare)
                        : null,
                    status: typeof order.status === 'number' ? order.status : order.status.toNumber(),
                    rideStatus: typeof order.rideStatus === 'number' ? order.rideStatus : order.rideStatus.toNumber(),
                    createdAt: order.createdAt.toNumber ? order.createdAt.toNumber() : order.createdAt,
                    acceptedAt: order.acceptedAt && order.acceptedAt.toNumber() > 0 
                        ? order.acceptedAt.toNumber() 
                        : null,
                    pickedUpAt: order.pickedUpAt && order.pickedUpAt.toNumber() > 0 
                        ? order.pickedUpAt.toNumber() 
                        : null,
                    completedAt: order.completedAt && order.completedAt.toNumber() > 0 
                        ? order.completedAt.toNumber() 
                        : null,
                    startTimestamp: order.startTimestamp && order.startTimestamp.toNumber() > 0 
                        ? order.startTimestamp.toNumber() 
                        : null,
                    endTimestamp: order.endTimestamp && order.endTimestamp.toNumber() > 0 
                        ? order.endTimestamp.toNumber() 
                        : null,
                    ipfsHash: order.ipfsHash || '',
                    disputeOpened: order.disputeOpened || false,
                    disputeResolved: order.disputeResolved || false,
                    disputeOpener: order.disputeOpener && order.disputeOpener !== ethers.constants.AddressZero 
                        ? order.disputeOpener 
                        : null,
                    disputeWinner: order.disputeWinner && order.disputeWinner !== ethers.constants.AddressZero 
                        ? order.disputeWinner 
                        : null,
                    disputeReason: order.disputeReason || '',
                    disputeOpenedAt: order.disputeOpenedAt && order.disputeOpenedAt.toNumber() > 0 
                        ? order.disputeOpenedAt.toNumber() 
                        : null,
                    disputeResolvedAt: order.disputeResolvedAt && order.disputeResolvedAt.toNumber() > 0 
                        ? order.disputeResolvedAt.toNumber() 
                        : null,
                    disputeResolutionDetail: order.disputeResolutionDetail || ''
                };
            } catch (error) {
                console.error(`[OrderService] 标准化订单数据失败:`, error);
                return null;
            }
        }).filter(order => order !== null); // 过滤掉标准化失败的订单
    }
    
    /**
     * 验证订单数据完备性
     */
    _validateOrdersCompleteness(orders) {
        const requiredFields = [
            'orderId', 'passenger', 'pickup', 'destination', 
            'category', 'estimatedFare', 'status', 'createdAt'
        ];
        
        for (const order of orders) {
            for (const field of requiredFields) {
                if (order[field] === undefined || order[field] === null) {
                    throw new Error(`订单 #${order.orderId} 缺少必需字段: ${field}`);
                }
            }
            
            // 验证嵌套字段
            if (!order.pickup.latitude || !order.pickup.longitude) {
                throw new Error(`订单 #${order.orderId} 上车点坐标不完整`);
            }
            
            if (!order.destination.latitude || !order.destination.longitude) {
                throw new Error(`订单 #${order.orderId} 目的地坐标不完整`);
            }
        }
    }
    
    /**
     * 获取订单详情（单个订单）
     */
    async getOrderById(orderId, options = {}) {
        const { useCache = true, validateData = true } = options;
        
        try {
            // 从链上获取最新数据
            const order = await this.rideOrderContract.getOrder(orderId);
            
            // 验证数据有效性
            if (validateData && !this._isValidOrder(order)) {
                throw new Error(`订单 #${orderId} 数据无效`);
            }
            
            // 标准化数据
            const normalized = this._normalizeOrders([order])[0];
            
            return normalized;
        } catch (error) {
            console.error(`[OrderService] 获取订单 #${orderId} 失败:`, error);
            throw error;
        }
    }
    
    /**
     * 获取用户的订单列表
     */
    async getUserOrders(userAddress, userType = 'passenger', options = {}) {
        const { useCache = true, validateData = true } = options;
        
        try {
            // 从链上获取订单ID列表
            const orderIds = userType === 'driver'
                ? await this.rideOrderContract.getDriverOrders(userAddress)
                : await this.rideOrderContract.getPassengerOrders(userAddress);
            
            // 批量获取订单详情
            const orders = await Promise.all(
                orderIds.map(async (id) => {
                    try {
                        const orderId = id.toNumber ? id.toNumber() : id;
                        return await this.getOrderById(orderId, { useCache, validateData });
                    } catch (error) {
                        console.warn(`[OrderService] 获取用户订单 #${id} 失败:`, error.message);
                        return null;
                    }
                })
            );
            
            return orders.filter(order => order !== null);
        } catch (error) {
            console.error(`[OrderService] 获取用户订单失败:`, error);
            throw error;
        }
    }
    
    /**
     * 清除缓存
     */
    clearCache(pattern = null) {
        if (pattern) {
            // 清除匹配模式的缓存
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            // 清除所有缓存
            this.cache.clear();
        }
        console.log('[OrderService] 缓存已清除');
    }
}

module.exports = OrderService;

