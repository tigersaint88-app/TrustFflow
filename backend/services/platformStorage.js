/**
 * 平台统计持久化存储服务
 * 存储平台总体统计数据
 */

const fs = require('fs').promises;
const path = require('path');

class PlatformStorageService {
    constructor(dataDir = path.join(__dirname, '../data')) {
        this.dataDir = dataDir;
        this.platformDir = path.join(dataDir, 'platform');
        this.summaryFile = path.join(this.platformDir, 'summary.json');
        this._initialized = false;
        this._initPromise = this.init().catch(error => {
            console.error('初始化平台存储目录失败:', error);
            // 不抛出错误，允许服务继续运行
            this._initialized = false;
        });
    }

    /**
     * 初始化存储目录
     */
    async init() {
        try {
            // 确保目录存在
            await fs.mkdir(this.platformDir, { recursive: true });
            
            // 初始化summary文件（如果不存在）
            try {
                await fs.access(this.summaryFile);
            } catch {
                await this.saveSummary({
                    totalTransactions: 0,
                    totalRevenue: '0',
                    totalPlatformFee: '0',
                    totalDisputes: 0,
                    resolvedDisputes: 0,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
            
            this._initialized = true;
        } catch (error) {
            console.error('初始化平台存储目录失败:', error);
            this._initialized = false;
            // 不抛出错误，允许服务继续运行
        }
    }
    
    /**
     * 确保已初始化
     */
    async ensureInitialized() {
        if (!this._initialized && this._initPromise) {
            await this._initPromise;
        }
        if (!this._initialized) {
            // 如果初始化失败，尝试重新初始化
            await this.init();
        }
    }

    /**
     * 读取平台统计摘要
     */
    async getSummary() {
        try {
            // 确保已初始化
            await this.ensureInitialized();
            
            const data = await fs.readFile(this.summaryFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // 如果文件不存在或读取失败，返回默认摘要
            console.warn('读取平台统计摘要失败，返回默认值:', error.message);
            return {
                totalTransactions: 0,
                totalRevenue: '0',
                totalPlatformFee: '0',
                totalDisputes: 0,
                resolvedDisputes: 0,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
        }
    }

    /**
     * 保存平台统计摘要
     */
    async saveSummary(summary) {
        try {
            // 确保已初始化
            await this.ensureInitialized();
            
            summary.updatedAt = Date.now();
            await fs.writeFile(this.summaryFile, JSON.stringify(summary, null, 2), 'utf8');
        } catch (error) {
            console.error('保存平台统计摘要失败:', error);
            // 如果保存失败，尝试重新初始化目录
            try {
                await fs.mkdir(this.platformDir, { recursive: true });
                await fs.writeFile(this.summaryFile, JSON.stringify(summary, null, 2), 'utf8');
            } catch (retryError) {
                console.error('重试保存平台统计摘要失败:', retryError);
                throw retryError;
            }
        }
    }

    /**
     * 更新平台统计（增量更新）
     */
    async updateSummary(updates) {
        try {
            const summary = await this.getSummary();
            const updated = {
                ...summary,
                ...updates,
                updatedAt: Date.now()
            };
            await this.saveSummary(updated);
            return updated;
        } catch (error) {
            console.error('更新平台统计失败:', error);
            throw error;
        }
    }

    /**
     * 增加交易计数
     */
    async incrementTransactions(count = 1) {
        const summary = await this.getSummary();
        summary.totalTransactions = (summary.totalTransactions || 0) + count;
        await this.saveSummary(summary);
        return summary;
    }

    /**
     * 增加收入
     */
    async addRevenue(amount) {
        const summary = await this.getSummary();
        const currentRevenue = parseFloat(summary.totalRevenue || '0');
        const newRevenue = currentRevenue + parseFloat(amount);
        summary.totalRevenue = newRevenue.toString();
        await this.saveSummary(summary);
        return summary;
    }

    /**
     * 增加平台费用
     */
    async addPlatformFee(amount) {
        const summary = await this.getSummary();
        const currentFee = parseFloat(summary.totalPlatformFee || '0');
        const newFee = currentFee + parseFloat(amount);
        summary.totalPlatformFee = newFee.toString();
        await this.saveSummary(summary);
        return summary;
    }

    /**
     * 增加争议计数
     */
    async incrementDisputes(count = 1) {
        const summary = await this.getSummary();
        summary.totalDisputes = (summary.totalDisputes || 0) + count;
        await this.saveSummary(summary);
        return summary;
    }

    /**
     * 增加已解决争议计数
     */
    async incrementResolvedDisputes(count = 1) {
        const summary = await this.getSummary();
        summary.resolvedDisputes = (summary.resolvedDisputes || 0) + count;
        await this.saveSummary(summary);
        return summary;
    }

    /**
     * 从订单文件重新计算统计（用于修复数据不一致）
     */
    async recalculateFromOrders(orderStorage) {
        try {
            const allOrders = await orderStorage.getAllOrders();
            
            let totalTransactions = allOrders.length;
            let totalRevenue = 0;
            let totalPlatformFee = 0;
            let totalDisputes = 0;
            let resolvedDisputes = 0;

            allOrders.forEach(order => {
                if (order.actualFare) {
                    const fare = parseFloat(order.actualFare);
                    totalRevenue += fare;
                    // 假设平台费为5%
                    totalPlatformFee += fare * 0.05;
                }
                
                if (order.disputeOpened) {
                    totalDisputes++;
                    if (order.disputeResolved) {
                        resolvedDisputes++;
                    }
                }
            });

            const summary = {
                totalTransactions,
                totalRevenue: totalRevenue.toString(),
                totalPlatformFee: totalPlatformFee.toString(),
                totalDisputes,
                resolvedDisputes,
                updatedAt: Date.now()
            };

            await this.saveSummary(summary);
            return summary;
        } catch (error) {
            console.error('从订单重新计算统计失败:', error);
            throw error;
        }
    }
}

module.exports = PlatformStorageService;

