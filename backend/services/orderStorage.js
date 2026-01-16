/**
 * 订单持久化存储服务
 * 使用JSON文件存储订单数据，支持订单状态共享
 */

const fs = require('fs').promises;
const path = require('path');

class OrderStorageService {
    constructor(config = null, dataDir = path.join(__dirname, '../data')) {
        this.config = config;
        this.dataDir = dataDir;
        this.ordersDir = path.join(dataDir, 'orders');
        this.configFile = path.join(dataDir, 'order-config.json');
        this.init();
    }

    /**
     * 初始化存储目录
     */
    async init() {
        try {
            // 确保目录存在
            await fs.mkdir(this.ordersDir, { recursive: true });
            
            // 初始化配置文件（如果不存在）
            try {
                await fs.access(this.configFile);
            } catch {
                // 从配置中获取初始订单ID，如果没有配置则使用默认值10000
                const initialOrderId = this.config?.services?.orderStorage?.initialOrderId || 10000;
                await this.saveConfig({
                    nextOrderId: initialOrderId,
                    lastUpdated: Date.now()
                });
            }
            
            // 同步配置：确保nextOrderId至少比现有最大订单ID大1
            await this.syncOrderIdConfig();
        } catch (error) {
            console.error('初始化订单存储目录失败:', error);
            throw error;
        }
    }

    /**
     * 读取配置文件
     */
    async getConfig() {
        try {
            const data = await fs.readFile(this.configFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // 如果文件不存在，返回默认配置（从服务器配置中读取）
            const initialOrderId = this.config?.services?.orderStorage?.initialOrderId || 10000;
            return {
                nextOrderId: initialOrderId,
                lastUpdated: Date.now()
            };
        }
    }

    /**
     * 保存配置文件
     */
    async saveConfig(config) {
        try {
            config.lastUpdated = Date.now();
            await fs.writeFile(this.configFile, JSON.stringify(config, null, 2), 'utf8');
        } catch (error) {
            console.error('保存配置文件失败:', error);
            throw error;
        }
    }

    /**
     * 同步订单ID配置：确保nextOrderId至少比现有最大订单ID大1
     */
    async syncOrderIdConfig() {
        try {
            const config = await this.getConfig();
            const maxOrderId = await this.getMaxOrderId();
            
            // 如果现有最大订单ID + 1 大于配置的nextOrderId，则更新配置
            if (maxOrderId !== null && maxOrderId + 1 > config.nextOrderId) {
                config.nextOrderId = maxOrderId + 1;
                await this.saveConfig(config);
                console.log(`订单ID配置已同步: nextOrderId = ${config.nextOrderId}`);
            }
        } catch (error) {
            console.error('同步订单ID配置失败:', error);
        }
    }

    /**
     * 获取现有订单中的最大订单ID
     */
    async getMaxOrderId() {
        try {
            const files = await fs.readdir(this.ordersDir);
            const orderFiles = files.filter(f => f.startsWith('order-') && f.endsWith('.json'));
            
            if (orderFiles.length === 0) {
                return null;
            }
            
            let maxId = 0;
            for (const file of orderFiles) {
                try {
                    const match = file.match(/order-(\d+)\.json/);
                    if (match) {
                        const orderId = parseInt(match[1]);
                        if (orderId > maxId) {
                            maxId = orderId;
                        }
                    }
                } catch (error) {
                    // 忽略单个文件读取错误
                }
            }
            
            return maxId > 0 ? maxId : null;
        } catch (error) {
            console.error('获取最大订单ID失败:', error);
            return null;
        }
    }

    /**
     * 获取下一个订单ID
     */
    async getNextOrderId() {
        const config = await this.getConfig();
        const nextId = config.nextOrderId;
        config.nextOrderId = nextId + 1;
        await this.saveConfig(config);
        return nextId;
    }

    /**
     * 保存订单
     */
    async saveOrder(order) {
        try {
            const orderId = order.orderId;
            if (!orderId) {
                throw new Error('订单ID不能为空');
            }
            const orderFile = path.join(this.ordersDir, `order-${orderId}.json`);
            
        // 如果订单已存在，读取现有数据并合并
        let existingOrder = null;
        try {
            const existingData = await fs.readFile(orderFile, 'utf8');
            existingOrder = JSON.parse(existingData);
        } catch {
            // 订单不存在，创建新订单
            existingOrder = {
                orderId: orderId,
                createdAt: Date.now(),
                history: []
            };
        }

        // 合并订单数据
        const updatedOrder = {
            ...existingOrder,
            ...order,
            updatedAt: Date.now()
        };

        // 如果状态发生变化，添加到历史记录
        if (existingOrder.status !== order.status || existingOrder.rideStatus !== order.rideStatus) {
            if (!updatedOrder.history) {
                updatedOrder.history = [];
            }
            updatedOrder.history.push({
                timestamp: Date.now(),
                status: order.status,
                rideStatus: order.rideStatus,
                event: order.event || 'StatusChanged',
                data: order.eventData || {}
            });
        }

        // 保存订单
        await fs.writeFile(orderFile, JSON.stringify(updatedOrder, null, 2), 'utf8');
        
        // 如果保存的订单ID大于等于配置的nextOrderId，更新配置
        const config = await this.getConfig();
        if (orderId >= config.nextOrderId) {
            config.nextOrderId = orderId + 1;
            await this.saveConfig(config);
        }
        
        return updatedOrder;
        } catch (error) {
            console.error(`保存订单 ${order.orderId} 失败:`, error);
            throw error;
        }
    }

    /**
     * 读取订单
     */
    async getOrder(orderId) {
        try {
            const orderFile = path.join(this.ordersDir, `order-${orderId}.json`);
            const data = await fs.readFile(orderFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            console.error(`读取订单 ${orderId} 失败:`, error);
            throw error;
        }
    }

    /**
     * 获取所有订单
     */
    async getAllOrders() {
        try {
            const files = await fs.readdir(this.ordersDir);
            const orderFiles = files.filter(f => f.startsWith('order-') && f.endsWith('.json'));
            
            const orders = await Promise.all(
                orderFiles.map(async (file) => {
                    try {
                        const data = await fs.readFile(path.join(this.ordersDir, file), 'utf8');
                        return JSON.parse(data);
                    } catch (error) {
                        console.error(`读取订单文件 ${file} 失败:`, error);
                        return null;
                    }
                })
            );

            return orders.filter(order => order !== null);
        } catch (error) {
            console.error('获取所有订单失败:', error);
            throw error;
        }
    }

    /**
     * 获取订单总数
     */
    async getOrderCount() {
        try {
            const files = await fs.readdir(this.ordersDir);
            return files.filter(f => f.startsWith('order-') && f.endsWith('.json')).length;
        } catch (error) {
            console.error('获取订单总数失败:', error);
            return 0;
        }
    }

    /**
     * 添加订单历史记录
     */
    async addOrderHistory(orderId, event, eventData = {}) {
        try {
            const order = await this.getOrder(orderId);
            if (!order) {
                throw new Error(`订单 ${orderId} 不存在`);
            }

            if (!order.history) {
                order.history = [];
            }

            order.history.push({
                timestamp: Date.now(),
                event: event,
                data: eventData
            });

            await this.saveOrder(order);
            return order;
        } catch (error) {
            console.error(`添加订单历史记录失败:`, error);
            throw error;
        }
    }

    /**
     * 根据状态筛选订单
     */
    async getOrdersByStatus(status) {
        try {
            const allOrders = await this.getAllOrders();
            return allOrders.filter(order => order.status === status);
        } catch (error) {
            console.error('根据状态筛选订单失败:', error);
            throw error;
        }
    }

    /**
     * 根据用户地址获取订单
     */
    async getOrdersByUser(address, type = 'passenger') {
        try {
            const allOrders = await this.getAllOrders();
            return allOrders.filter(order => {
                if (type === 'passenger') {
                    return order.passenger && order.passenger.toLowerCase() === address.toLowerCase();
                } else {
                    return order.driver && order.driver.toLowerCase() === address.toLowerCase();
                }
            });
        } catch (error) {
            console.error('根据用户获取订单失败:', error);
            throw error;
        }
    }

    /**
     * 删除订单（谨慎使用）
     */
    async deleteOrder(orderId) {
        try {
            const orderFile = path.join(this.ordersDir, `order-${orderId}.json`);
            await fs.unlink(orderFile);
            return true;
        } catch (error) {
            console.error(`删除订单 ${orderId} 失败:`, error);
            throw error;
        }
    }
}

module.exports = OrderStorageService;

