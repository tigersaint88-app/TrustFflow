/**
 * 用户信息持久化存储服务
 * 分别存储userprofile和receiverprofile
 */

const fs = require('fs').promises;
const path = require('path');

class UserStorageService {
    constructor(dataDir = path.join(__dirname, '../data')) {
        this.dataDir = dataDir;
        this.userProfileDir = path.join(dataDir, 'userprofile');
        this.receiverProfileDir = path.join(dataDir, 'receiverprofile');
        this.userIdFile = path.join(dataDir, 'user-id-counter.json');
        this.receiverIdFile = path.join(dataDir, 'receiver-id-counter.json');
        this._initPromise = this.init();
    }

    /**
     * 确保初始化完成
     */
    async ensureInitialized() {
        await this._initPromise;
    }

    /**
     * 初始化存储目录
     */
    async init() {
        try {
            // 确保目录存在
            await fs.mkdir(this.userProfileDir, { recursive: true });
            await fs.mkdir(this.receiverProfileDir, { recursive: true });
            
            // 初始化ID计数器（如果不存在）
            try {
                await fs.access(this.userIdFile);
            } catch {
                await this.saveIdCounter(this.userIdFile, { nextId: 1 });
            }

            try {
                await fs.access(this.receiverIdFile);
            } catch {
                await this.saveIdCounter(this.receiverIdFile, { nextId: 1 });
            }
        } catch (error) {
            console.error('初始化用户存储目录失败:', error);
            throw error;
        }
    }

    /**
     * 读取ID计数器
     */
    async getIdCounter(counterFile) {
        try {
            const data = await fs.readFile(counterFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return { nextId: 1 };
        }
    }

    /**
     * 保存ID计数器
     */
    async saveIdCounter(counterFile, counter) {
        try {
            await fs.writeFile(counterFile, JSON.stringify(counter, null, 2), 'utf8');
        } catch (error) {
            console.error('保存ID计数器失败:', error);
            throw error;
        }
    }

    /**
     * 获取下一个用户ID
     */
    async getNextUserId() {
        const counter = await this.getIdCounter(this.userIdFile);
        const nextId = counter.nextId;
        counter.nextId = nextId + 1;
        await this.saveIdCounter(this.userIdFile, counter);
        return nextId;
    }

    /**
     * 获取下一个接收者ID
     */
    async getNextReceiverId() {
        const counter = await this.getIdCounter(this.receiverIdFile);
        const nextId = counter.nextId;
        counter.nextId = nextId + 1;
        await this.saveIdCounter(this.receiverIdFile, counter);
        return nextId;
    }

    /**
     * 保存用户信息（乘客）
     */
    async saveUserProfile(address, userInfo) {
        try {
            // 确保初始化完成
            await this.ensureInitialized();
            
            // 检查是否已存在
            const existing = await this.getUserProfile(address);
            let userId = existing ? existing.id : null;

            // 如果不存在，分配新ID
            if (!userId) {
                userId = await this.getNextUserId();
            }

            const profile = {
                id: userId,
                address: address.toLowerCase(),
                ...userInfo,
                updatedAt: Date.now(),
                createdAt: existing ? existing.createdAt : Date.now()
            };

            const profileFile = path.join(this.userProfileDir, `${address.toLowerCase()}.json`);
            await fs.writeFile(profileFile, JSON.stringify(profile, null, 2), 'utf8');
            
            return profile;
        } catch (error) {
            console.error(`保存用户信息失败 (${address}):`, error);
            throw error;
        }
    }

    /**
     * 获取用户信息（乘客）
     */
    async getUserProfile(address) {
        try {
            // 确保初始化完成
            await this.ensureInitialized();
            
            const profileFile = path.join(this.userProfileDir, `${address.toLowerCase()}.json`);
            const data = await fs.readFile(profileFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            console.error(`读取用户信息失败 (${address}):`, error);
            throw error;
        }
    }

    /**
     * 保存接收者信息（司机）
     */
    async saveReceiverProfile(address, receiverInfo) {
        try {
            // 确保初始化完成
            await this.ensureInitialized();
            
            // 检查是否已存在
            const existing = await this.getReceiverProfile(address);
            let receiverId = existing ? existing.id : null;

            // 如果不存在，分配新ID
            if (!receiverId) {
                receiverId = await this.getNextReceiverId();
            }

            const profile = {
                id: receiverId,
                address: address.toLowerCase(),
                ...receiverInfo,
                updatedAt: Date.now(),
                createdAt: existing ? existing.createdAt : Date.now()
            };

            const profileFile = path.join(this.receiverProfileDir, `${address.toLowerCase()}.json`);
            await fs.writeFile(profileFile, JSON.stringify(profile, null, 2), 'utf8');
            
            return profile;
        } catch (error) {
            console.error(`保存接收者信息失败 (${address}):`, error);
            throw error;
        }
    }

    /**
     * 获取接收者信息（司机）
     */
    async getReceiverProfile(address) {
        try {
            // 确保初始化完成
            await this.ensureInitialized();
            
            const profileFile = path.join(this.receiverProfileDir, `${address.toLowerCase()}.json`);
            const data = await fs.readFile(profileFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            console.error(`读取接收者信息失败 (${address}):`, error);
            throw error;
        }
    }

    /**
     * 批量获取用户信息
     */
    async getUserProfilesBatch(addresses) {
        try {
            // 确保初始化完成
            await this.ensureInitialized();
            
            const profiles = await Promise.all(
                addresses.map(addr => this.getUserProfile(addr).catch(err => {
                    // 如果单个地址读取失败，记录错误但继续处理其他地址
                    console.warn(`读取用户信息失败 (${addr}):`, err.message);
                    return null;
                }))
            );
            return profiles.filter(p => p !== null);
        } catch (error) {
            console.error('批量获取用户信息失败:', error);
            throw error;
        }
    }

    /**
     * 批量获取接收者信息
     */
    async getReceiverProfilesBatch(addresses) {
        try {
            // 确保初始化完成
            await this.ensureInitialized();
            
            const profiles = await Promise.all(
                addresses.map(addr => this.getReceiverProfile(addr).catch(err => {
                    // 如果单个地址读取失败，记录错误但继续处理其他地址
                    console.warn(`读取接收者信息失败 (${addr}):`, err.message);
                    return null;
                }))
            );
            return profiles.filter(p => p !== null);
        } catch (error) {
            console.error('批量获取接收者信息失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有用户信息
     */
    async getAllUserProfiles() {
        try {
            // 确保初始化完成
            await this.ensureInitialized();
            
            const files = await fs.readdir(this.userProfileDir);
            const profileFiles = files.filter(f => f.endsWith('.json'));
            
            const profiles = await Promise.all(
                profileFiles.map(async (file) => {
                    try {
                        const data = await fs.readFile(path.join(this.userProfileDir, file), 'utf8');
                        return JSON.parse(data);
                    } catch (error) {
                        console.error(`读取用户文件 ${file} 失败:`, error);
                        return null;
                    }
                })
            );

            return profiles.filter(profile => profile !== null);
        } catch (error) {
            console.error('获取所有用户信息失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有接收者信息
     */
    async getAllReceiverProfiles() {
        try {
            // 确保初始化完成
            await this.ensureInitialized();
            
            const files = await fs.readdir(this.receiverProfileDir);
            const profileFiles = files.filter(f => f.endsWith('.json'));
            
            const profiles = await Promise.all(
                profileFiles.map(async (file) => {
                    try {
                        const data = await fs.readFile(path.join(this.receiverProfileDir, file), 'utf8');
                        return JSON.parse(data);
                    } catch (error) {
                        console.error(`读取接收者文件 ${file} 失败:`, error);
                        return null;
                    }
                })
            );

            return profiles.filter(profile => profile !== null);
        } catch (error) {
            console.error('获取所有接收者信息失败:', error);
            throw error;
        }
    }
}

module.exports = UserStorageService;

