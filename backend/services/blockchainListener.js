/**
 * 区块链监听服务
 * 监听智能合约事件并同步到数据库
 */

const { ethers } = require('ethers');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const OrderStorageService = require('./orderStorage');
const UserStorageService = require('./userStorage');
const PlatformStorageService = require('./platformStorage');

class BlockchainListenerService extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        
        // 设置日志目录和文件
        const logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        this.logsDir = logsDir;
        this.getLogFile = () => {
            const today = new Date().toISOString().split('T')[0];
            return path.join(this.logsDir, `blockchain-${today}.log`);
        };
        
        // 连接到区块链
        this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        
        // 初始化合约实例
        this.contracts = {
            paymentEscrow: new ethers.Contract(
                config.contracts.paymentEscrow,
                config.abis.paymentEscrow,
                this.provider
            ),
            rideOrder: new ethers.Contract(
                config.contracts.rideOrder,
                config.abis.rideOrder,
                this.provider
            ),
            userRegistry: new ethers.Contract(
                config.contracts.userRegistry,
                config.abis.userRegistry,
                this.provider
            ),
            ratingSystem: new ethers.Contract(
                config.contracts.ratingSystem,
                config.abis.ratingSystem,
                this.provider
            ),
            disputeResolution: new ethers.Contract(
                config.contracts.disputeResolution,
                config.abis.disputeResolution,
                this.provider
            )
        };
        
        this.lastProcessedBlock = 0;
        this.isRunning = false;
        
        // 初始化存储服务
        this.orderStorage = new OrderStorageService(config);
        this.userStorage = new UserStorageService();
        this.platformStorage = new PlatformStorageService();
        
        // 日志方法
        this.log = (level, message, data = {}) => {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [BLOCKCHAIN] [${level.toUpperCase()}] ${message}`;
            const dataStr = Object.keys(data).length > 0 ? ` | Data: ${JSON.stringify(data)}` : '';
            const logLine = logEntry + dataStr + '\n';
            
            // 写入文件
            try {
                fs.appendFileSync(this.getLogFile(), logLine, 'utf8');
            } catch (error) {
                console.error('[BlockchainListener] 写入日志文件失败:', error);
            }
            
            // 同时输出到控制台
            const consoleMethod = console[level] || console.log;
            consoleMethod(`[BLOCKCHAIN] ${message}`, Object.keys(data).length > 0 ? data : '');
        };
    }
    
    /**
     * 记录订单历史状态到文件（使用新的存储服务）
     */
    async recordOrderHistory(orderId, event, timestamp, blockNumber, transactionHash, description, otherData = {}) {
        try {
            // 添加历史记录
            await this.orderStorage.addOrderHistory(orderId, event, {
                timestamp: parseInt(timestamp),
                blockNumber: blockNumber ? parseInt(blockNumber) : null,
                transactionHash: transactionHash || null,
                description: description || event,
                ...otherData
            });
            
            console.log(`[OrderHistory] 已记录订单 #${orderId} 的 ${event} 事件`);
        } catch (error) {
            console.error(`[OrderHistory] 记录订单历史失败:`, error);
        }
    }
    
    /**
     * 保存订单数据（从链上事件）
     */
    async saveOrderFromEvent(orderId, orderData, event, eventData = {}) {
        try {
            // 确保orderId是数字
            const orderIdNum = typeof orderId === 'number' ? orderId : (orderId.toNumber ? orderId.toNumber() : parseInt(orderId));
            
            // 从链上获取最新订单数据
            const provider = new ethers.providers.JsonRpcProvider(this.config.rpcUrl);
            const rideOrderContract = new ethers.Contract(
                this.config.contracts.rideOrder,
                this.config.abis.rideOrder,
                provider
            );
            
            // 验证订单是否真的存在于链上
            let order;
            try {
                order = await rideOrderContract.getOrder(orderIdNum);
            } catch (error) {
                // 如果订单不存在或获取失败，不保存文件
                console.warn(`订单 #${orderIdNum} 在链上不存在或获取失败，跳过保存:`, error.message);
                return; // 不保存文件，直接返回
            }
            
            // 验证订单数据是否有效（订单ID应该匹配）
            if (!order || order.orderId.toNumber() !== orderIdNum) {
                console.warn(`订单 #${orderIdNum} 数据无效，跳过保存`);
                return; // 不保存文件，直接返回
            }
            
            // 转换为可存储格式
            const orderToSave = {
                orderId: orderIdNum,
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
                category: order.category,
                subCategory: order.subCategory,
                estimatedFare: ethers.utils.formatEther(order.estimatedFare),
                actualFare: order.actualFare && order.actualFare.toString() !== '0' 
                    ? ethers.utils.formatEther(order.actualFare) 
                    : null,
                status: order.status,
                rideStatus: order.rideStatus,
                createdAt: order.createdAt.toNumber(),
                acceptedAt: order.acceptedAt.toNumber() > 0 ? order.acceptedAt.toNumber() : null,
                pickedUpAt: order.pickedUpAt && order.pickedUpAt.toNumber() > 0 ? order.pickedUpAt.toNumber() : null,
                completedAt: order.completedAt && order.completedAt.toNumber() > 0 ? order.completedAt.toNumber() : null,
                startTimestamp: order.startTimestamp && order.startTimestamp.toNumber() > 0 ? order.startTimestamp.toNumber() : null,
                endTimestamp: order.endTimestamp && order.endTimestamp.toNumber() > 0 ? order.endTimestamp.toNumber() : null,
                ipfsHash: order.ipfsHash,
                disputeOpened: order.disputeOpened,
                disputeReason: order.disputeReason,
                disputeResolved: order.disputeResolved,
                disputeWinner: order.disputeWinner && order.disputeWinner !== ethers.constants.AddressZero ? order.disputeWinner : null,
                disputeTimestamp: order.disputeTimestamp && order.disputeTimestamp.toNumber() > 0 ? order.disputeTimestamp.toNumber() : null,
                event: event,
                eventData: eventData
            };
            
            // 保存订单
            await this.orderStorage.saveOrder(orderToSave);
            
            // 如果是新订单，更新平台统计
            if (event === 'OrderCreated') {
                await this.platformStorage.incrementTransactions();
            }
            
            // 如果订单完成，更新平台统计
            if (event === 'OrderCompleted' && orderToSave.actualFare) {
                const fare = parseFloat(orderToSave.actualFare);
                await this.platformStorage.addRevenue(fare);
                await this.platformStorage.addPlatformFee(fare * 0.05);
            }
            
            // 如果争议开启，更新平台统计
            if (event === 'DisputeOpened') {
                await this.platformStorage.incrementDisputes();
            }
            
            // 如果争议解决，更新平台统计
            if (event === 'DisputeResolved') {
                await this.platformStorage.incrementResolvedDisputes();
            }
        } catch (error) {
            this.log('error', `保存订单数据失败 (订单 #${orderId})`, {
                orderId: orderId,
                event: event,
                error: error.message,
                stack: error.stack
            });
            console.error(`保存订单数据失败 (订单 #${orderId}):`, error);
        }
    }
    
    /**
     * 验证合约是否已部署
     */
    async verifyContracts() {
        console.log('\n🔍 验证合约部署状态...');
        const contractNames = {
            paymentEscrow: 'PaymentEscrow',
            rideOrder: 'RideOrder',
            userRegistry: 'UserRegistry',
            ratingSystem: 'RatingSystem',
            disputeResolution: 'DisputeResolution'
        };
        
        const issues = [];
        
        for (const [key, name] of Object.entries(contractNames)) {
            const address = this.config.contracts[key];
            
            if (!address || address.trim() === '') {
                issues.push({
                    contract: name,
                    address: address || '(未配置)',
                    error: '合约地址未配置'
                });
                continue;
            }
            
            try {
                const code = await this.provider.getCode(address);
                
                if (code === '0x' || code === '0x0' || !code) {
                    issues.push({
                        contract: name,
                        address: address,
                        error: '没有部署合约代码'
                    });
                } else {
                    const codeLength = (code.length - 2) / 2;
                    console.log(`  ✅ ${name}: ${address} (${codeLength} 字节)`);
                }
            } catch (error) {
                issues.push({
                    contract: name,
                    address: address,
                    error: `检查失败: ${error.message}`
                });
            }
        }
        
        if (issues.length > 0) {
            console.error('\n❌ 以下合约未部署或配置错误:');
            issues.forEach(issue => {
                console.error(`   - ${issue.contract}: ${issue.address}`);
                console.error(`     错误: ${issue.error}`);
            });
            
            console.error('\n💡 解决方案:');
            console.error('   1. 确保 Hardhat 节点正在运行: npm run node');
            console.error('   2. 重新部署合约: npm run deploy:local');
            console.error('   3. 更新环境变量: python update_env_from_deployment.py');
            console.error('   4. 使用新的合约地址更新配置');
            console.error('   5. 查看文档: docs/合约地址未部署问题解决方案.md\n');
            
            throw new Error(`合约地址未部署: ${issues.map(i => i.contract).join(', ')}`);
        }
        
        console.log('✅ 所有合约验证通过\n');
    }
    
    /**
     * 启动监听
     */
    async start() {
        this.log('info', '区块链监听服务启动', { rpcUrl: this.config.rpcUrl });
        console.log('区块链监听服务启动...');
        console.log(`尝试连接到: ${this.config.rpcUrl}`);
        
        // 先检查连接
        try {
            await this.checkConnection();
        } catch (error) {
            console.error('\n❌ 无法连接到区块链网络!');
            console.error(`错误: ${error.message}\n`);
            console.error('💡 解决方案:');
            console.error('   1. 确保 Hardhat 节点正在运行: npm run node');
            console.error('   2. 检查 RPC URL 配置是否正确');
            console.error('   3. 运行诊断工具: node scripts/check-network-connection.js');
            console.error('   4. 查看详细文档: docs/网络连接错误排查指南.md\n');
            throw error;
        }
        
        // 验证合约是否已部署
        try {
            await this.verifyContracts();
        } catch (error) {
            console.error('\n❌ 合约验证失败!');
            console.error(`错误: ${error.message}\n`);
            throw error;
        }
        
        this.isRunning = true;
        
        // 获取当前区块高度
        try {
            this.lastProcessedBlock = await this.provider.getBlockNumber();
            this.log('info', `连接成功! 从区块 ${this.lastProcessedBlock} 开始监听`, {
                blockNumber: this.lastProcessedBlock,
                rpcUrl: this.config.rpcUrl
            });
            console.log(`✅ 连接成功! 从区块 ${this.lastProcessedBlock} 开始监听`);
        } catch (error) {
            this.log('error', '获取区块高度失败', { error: error.message, stack: error.stack });
            console.error('获取区块高度失败:', error.message);
            throw error;
        }
        
        // 监听各个合约的事件
        this.listenToPaymentEvents();
        this.listenToOrderEvents();
        this.listenToUserEvents();
        this.listenToRatingEvents();
        this.listenToDisputeEvents();
        
        // 定期检查连接状态
        this.startHealthCheck();
    }
    
    /**
     * 检查网络连接
     */
    async checkConnection(maxRetries = 3, retryDelay = 2000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                // 尝试获取网络信息
                const network = await this.provider.getNetwork();
                const chainId = typeof network.chainId === 'object' 
                    ? network.chainId.toNumber() 
                    : parseInt(network.chainId.toString(), 10);
                
                console.log(`✅ 网络连接成功 (Chain ID: ${chainId})`);
                return true;
            } catch (error) {
                if (i < maxRetries - 1) {
                    console.log(`⏳ 连接失败，${retryDelay/1000}秒后重试... (${i + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                } else {
                    throw new Error(`无法连接到网络 ${this.config.rpcUrl}: ${error.message}`);
                }
            }
        }
    }
    
    /**
     * 停止监听
     */
    stop() {
        console.log('停止区块链监听服务...');
        this.isRunning = false;
        
        // 移除所有监听器
        Object.values(this.contracts).forEach(contract => {
            contract.removeAllListeners();
        });
    }
    
    /**
     * 监听支付合约事件
     */
    listenToPaymentEvents() {
        const contract = this.contracts.paymentEscrow;
        
        // 订单创建（资金锁定）
        contract.on('PaymentLocked', async (orderId, passenger, amount, event) => {
            console.log(`[PaymentLocked] 订单 #${orderId} 资金已锁定: ${ethers.utils.formatEther(amount)} ETH`);
            
            this.emit('payment_locked', {
                orderId: orderId.toNumber(),
                passenger,
                amount: ethers.utils.formatEther(amount),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
        
        // 资金释放
        contract.on('PaymentReleased', async (orderId, driver, amount, platformFee, event) => {
            console.log(`[PaymentReleased] 订单 #${orderId} 资金已释放给司机`);
            
            this.emit('payment_released', {
                orderId: orderId.toNumber(),
                driver,
                amount: ethers.utils.formatEther(amount),
                platformFee: ethers.utils.formatEther(platformFee),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
        
        // 订单取消
        contract.on('OrderCancelled', async (orderId, passenger, refundAmount, event) => {
            console.log(`[OrderCancelled] 订单 #${orderId} 已取消，退款: ${ethers.utils.formatEther(refundAmount)} ETH`);
            
            this.emit('order_cancelled', {
                orderId: orderId.toNumber(),
                passenger,
                refundAmount: ethers.utils.formatEther(refundAmount),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
        
        // 争议提起
        contract.on('DisputeRaised', async (orderId, initiator, event) => {
            console.log(`[DisputeRaised] 订单 #${orderId} 发起争议`);
            
            this.emit('dispute_raised', {
                orderId: orderId.toNumber(),
                initiator,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
    }
    
    /**
     * 监听订单合约事件
     */
    listenToOrderEvents() {
        const contract = this.contracts.rideOrder;
        
        // 订单创建
        // 事件参数顺序: orderId, passenger, pickupLat, pickupLng, destLat, destLng, category, subCategory, estimatedFare
        contract.on('OrderCreated', async (orderId, passenger, pickupLat, pickupLng, destLat, destLng, category, subCategory, estimatedFare, event) => {
            const orderIdNum = orderId.toNumber();
            this.log('info', `[OrderCreated] 新订单: #${orderIdNum}`, {
                orderId: orderIdNum,
                passenger: passenger,
                category: category,
                subCategory: subCategory,
                estimatedFare: estimatedFare.toString(),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
            console.log(`[OrderCreated] 新订单: #${orderId}`);
            
            const block = await event.getBlock();
            
            // 验证交易是否成功（检查交易收据）
            try {
                const txReceipt = await this.provider.getTransactionReceipt(event.transactionHash);
                if (!txReceipt || txReceipt.status !== 1) {
                    console.warn(`[OrderCreated] 订单 #${orderIdNum} 交易失败，跳过保存`);
                    return; // 交易失败，不保存文件
                }
            } catch (error) {
                console.warn(`[OrderCreated] 无法验证订单 #${orderIdNum} 交易状态:`, error.message);
                // 继续执行，但会在 saveOrderFromEvent 中再次验证
            }
            
            const orderData = {
                orderId: orderIdNum,
                passenger,
                pickup: {
                    lat: pickupLat.toNumber() / 1e6,
                    lng: pickupLng.toNumber() / 1e6
                },
                destination: {
                    lat: destLat.toNumber() / 1e6,
                    lng: destLng.toNumber() / 1e6
                },
                category: category,
                subCategory: subCategory,
                estimatedFare: ethers.utils.formatEther(estimatedFare),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                timestamp: block.timestamp
            };
            
            // 保存订单数据（内部会再次验证订单是否存在）
            await this.saveOrderFromEvent(orderIdNum, orderData, 'OrderCreated', { passenger: passenger });
            
            // 记录订单历史
            await this.recordOrderHistory(
                orderIdNum,
                'OrderCreated',
                block.timestamp,
                event.blockNumber,
                event.transactionHash,
                '订单创建',
                { passenger: passenger }
            );
            
            this.emit('order_created', orderData);
        });
        
        // 订单接受
        contract.on('OrderAccepted', async (orderId, driver, event) => {
            console.log(`[OrderAccepted] 订单 #${orderId} 被司机接单`);
            
            const block = await event.getBlock();
            const orderIdNum = orderId.toNumber();
            
            // 保存订单数据
            await this.saveOrderFromEvent(orderIdNum, null, 'OrderAccepted', { driver: driver });
            
            // 记录订单历史
            await this.recordOrderHistory(
                orderIdNum,
                'OrderAccepted',
                block.timestamp,
                event.blockNumber,
                event.transactionHash,
                '司机接单',
                { driver: driver }
            );
            
            this.emit('order_accepted', {
                orderId: orderIdNum,
                driver,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                timestamp: block.timestamp
            });
        });
        
        // 乘客上车
        contract.on('PassengerPickedUp', async (orderId, timestamp, event) => {
            console.log(`[PassengerPickedUp] 订单 #${orderId} 乘客已上车`);
            
            const orderIdNum = orderId.toNumber();
            const timestampNum = timestamp.toNumber();
            
            // 保存订单数据
            await this.saveOrderFromEvent(orderIdNum, null, 'PassengerPickedUp', {});
            
            // 记录订单历史
            await this.recordOrderHistory(
                orderIdNum,
                'PassengerPickedUp',
                timestampNum,
                event.blockNumber,
                event.transactionHash,
                '开始接到客人'
            );
            
            this.emit('passenger_picked_up', {
                orderId: orderIdNum,
                timestamp: timestampNum,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
        
        // 开始行程（RideStarted）
        contract.on('RideStarted', async (orderId, timestamp, event) => {
            console.log(`[RideStarted] 订单 #${orderId} 开始行程`);
            
            const orderIdNum = orderId.toNumber();
            const timestampNum = timestamp.toNumber();
            
            // 保存订单数据
            await this.saveOrderFromEvent(orderIdNum, null, 'RideStarted', {});
            
            // 记录订单历史
            await this.recordOrderHistory(
                orderIdNum,
                'RideStarted',
                timestampNum,
                event.blockNumber,
                event.transactionHash,
                '开始接到客人'
            );
            
            this.emit('ride_started', {
                orderId: orderIdNum,
                timestamp: timestampNum,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
        
        // 订单完成
        contract.on('OrderCompleted', async (orderId, actualFare, timestamp, event) => {
            console.log(`[OrderCompleted] 订单 #${orderId} 已完成`);
            
            const orderIdNum = orderId.toNumber();
            const timestampNum = timestamp.toNumber();
            
            // 保存订单数据
            await this.saveOrderFromEvent(orderIdNum, null, 'OrderCompleted', { 
                actualFare: ethers.utils.formatEther(actualFare) 
            });
            
            // 记录订单历史
            await this.recordOrderHistory(
                orderIdNum,
                'OrderCompleted',
                timestampNum,
                event.blockNumber,
                event.transactionHash,
                '订单完成',
                { actualFare: ethers.utils.formatEther(actualFare) }
            );
            
            this.emit('order_completed', {
                orderId: orderIdNum,
                actualFare: ethers.utils.formatEther(actualFare),
                timestamp: timestampNum,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
        
        // 争议开启（DisputeOpened）
        try {
            // 检查事件是否存在于 ABI 中
            const disputeOpenedEvent = contract.interface.getEvent('DisputeOpened');
            if (disputeOpenedEvent) {
                contract.on('DisputeOpened', async (orderId, by, reason, timestamp, event) => {
                    const orderIdNum = orderId.toNumber();
                    const timestampNum = timestamp.toNumber();
                    
                    this.log('info', `[DisputeOpened] 订单 #${orderIdNum} 发起争议`, {
                        orderId: orderIdNum,
                        openedBy: by,
                        reason: reason,
                        timestamp: timestampNum,
                        blockNumber: event.blockNumber,
                        transactionHash: event.transactionHash
                    });
                    
                    console.log(`[BLOCKCHAIN] [DisputeOpened] 订单 #${orderId} 发起争议`);
                    
                    // 记录订单历史
                    // 保存订单数据
                    await this.saveOrderFromEvent(orderIdNum, null, 'DisputeOpened', { 
                        by: by, 
                        reason: reason 
                    });
                    
                    // 记录订单历史
                    await this.recordOrderHistory(
                        orderIdNum,
                        'DisputeOpened',
                        timestampNum,
                        event.blockNumber,
                        event.transactionHash,
                        '争议开启',
                        { by: by, reason: reason }
                    );
                    
                    this.emit('dispute_opened', {
                        orderId: orderIdNum,
                        by: by,
                        reason: reason,
                        timestamp: timestampNum,
                        blockNumber: event.blockNumber,
                        transactionHash: event.transactionHash
                    });
                });
                this.log('info', 'DisputeOpened 事件监听器已启动', {});
                console.log('✅ DisputeOpened 事件监听器已启动');
            }
        } catch (error) {
            this.log('warn', 'DisputeOpened 事件不存在于合约中，跳过监听', { error: error.message });
            console.warn('⚠️ DisputeOpened 事件不存在于合约中，跳过监听:', error.message);
        }
        
        // 争议解决（DisputeResolved）
        try {
            // 检查事件是否存在于 ABI 中
            const disputeResolvedEvent = contract.interface.getEvent('DisputeResolved');
            if (disputeResolvedEvent) {
                contract.on('DisputeResolved', async (orderId, winner, detail, timestamp, event) => {
                    const orderIdNum = orderId.toNumber();
                    const timestampNum = timestamp.toNumber();
                    
                    this.log('info', `[DisputeResolved] 订单 #${orderIdNum} 争议已解决`, {
                        orderId: orderIdNum,
                        winner: winner,
                        detail: detail,
                        timestamp: timestampNum,
                        blockNumber: event.blockNumber,
                        transactionHash: event.transactionHash
                    });
                    
                    console.log(`[BLOCKCHAIN] [DisputeResolved] 订单 #${orderId} 争议已解决`);
                    
                    // 记录订单历史
                    // 保存订单数据
                    await this.saveOrderFromEvent(orderIdNum, null, 'DisputeResolved', { 
                        winner: winner, 
                        detail: detail 
                    });
                    
                    // 记录订单历史
                    await this.recordOrderHistory(
                        orderIdNum,
                        'DisputeResolved',
                        timestampNum,
                        event.blockNumber,
                        event.transactionHash,
                        '争议已解决',
                        { winner: winner, detail: detail }
                    );
                    
                    this.emit('dispute_resolved', {
                        orderId: orderIdNum,
                        winner: winner,
                        detail: detail,
                        timestamp: timestampNum,
                        blockNumber: event.blockNumber,
                        transactionHash: event.transactionHash
                    });
                });
                this.log('info', 'DisputeResolved 事件监听器已启动', {});
                console.log('✅ DisputeResolved 事件监听器已启动');
            }
        } catch (error) {
            this.log('warn', 'DisputeResolved 事件不存在于合约中，跳过监听', { error: error.message });
            console.warn('⚠️ DisputeResolved 事件不存在于合约中，跳过监听:', error.message);
        }
    }
    
    /**
     * 监听用户合约事件
     */
    listenToUserEvents() {
        const contract = this.contracts.userRegistry;
        
        // 用户注册
        contract.on('UserRegistered', async (user, userType, timestamp, event) => {
            console.log(`[UserRegistered] 新用户注册: ${user}`);
            
            this.emit('user_registered', {
                userAddress: user,
                userType: ['None', 'Passenger', 'Driver', 'Both'][userType],
                timestamp: timestamp.toNumber(),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
        
        // KYC状态更新
        contract.on('KYCStatusUpdated', async (user, status, event) => {
            console.log(`[KYCStatusUpdated] 用户 ${user} KYC状态更新`);
            
            this.emit('kyc_status_updated', {
                userAddress: user,
                status: ['Unverified', 'Pending', 'Verified', 'Rejected'][status],
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
        
        // 信用分更新
        contract.on('CreditScoreUpdated', async (user, newScore, event) => {
            console.log(`[CreditScoreUpdated] 用户 ${user} 信用分: ${newScore}`);
            
            this.emit('credit_score_updated', {
                userAddress: user,
                creditScore: newScore.toNumber(),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
    }
    
    /**
     * 监听评价合约事件
     */
    listenToRatingEvents() {
        const contract = this.contracts.ratingSystem;
        
        // 评价提交
        contract.on('RatingSubmitted', async (orderId, rater, ratee, score, timestamp, event) => {
            console.log(`[RatingSubmitted] 订单 #${orderId} 收到评价: ${score}星`);
            
            this.emit('rating_submitted', {
                orderId: orderId.toNumber(),
                rater,
                ratee,
                score,
                timestamp: timestamp.toNumber(),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
    }
    
    /**
     * 监听争议合约事件
     */
    listenToDisputeEvents() {
        const contract = this.contracts.disputeResolution;
        
        // 争议创建
        contract.on('DisputeCreated', async (disputeId, orderId, initiator, disputeType, event) => {
            console.log(`[DisputeCreated] 新争议: #${disputeId} (订单 #${orderId})`);
            
            this.emit('dispute_created', {
                disputeId: disputeId.toNumber(),
                orderId: orderId.toNumber(),
                initiator,
                disputeType,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
        
        // 争议解决
        contract.on('DisputeResolved', async (disputeId, result, passengerRefund, driverPayment, event) => {
            console.log(`[DisputeResolved] 争议 #${disputeId} 已解决`);
            
            this.emit('dispute_resolved', {
                disputeId: disputeId.toNumber(),
                result,
                passengerRefund: ethers.utils.formatEther(passengerRefund),
                driverPayment: ethers.utils.formatEther(driverPayment),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            });
        });
    }
    
    /**
     * 健康检查
     */
    startHealthCheck() {
        setInterval(async () => {
            if (!this.isRunning) return;
            
            try {
                // 设置较短的超时时间，避免长时间等待
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('健康检查超时')), 5000)
                );
                const blockNumberPromise = this.provider.getBlockNumber();
                const currentBlock = await Promise.race([blockNumberPromise, timeoutPromise]);
                
                if (currentBlock > this.lastProcessedBlock) {
                    console.log(`[blockchainListener:779] 当前区块: ${currentBlock}, 已处理: ${this.lastProcessedBlock}`);
                    this.lastProcessedBlock = currentBlock;
                }
            } catch (error) {
                // localhost连接重置通常是临时问题，降低日志级别
                if (error.code === 'ECONNRESET' || error.code === 'SERVER_ERROR') {
                    console.warn(`[blockchainListener:787] 健康检查连接重置 (可能是临时问题):`, error.message);
                } else {
                    console.error(`[blockchainListener:789] 健康检查失败:`, error.message);
                }
                this.emit('connection_error', error);
            }
        }, 30000); // 每30秒检查一次
    }
    
    /**
     * 获取历史事件（用于初始化或重新同步）
     */
    async getHistoricalEvents(contractName, eventName, fromBlock, toBlock) {
        try {
            const contract = this.contracts[contractName];
            const filter = contract.filters[eventName]();
            
            const events = await contract.queryFilter(filter, fromBlock, toBlock);
            
            console.log(`获取到 ${events.length} 个 ${eventName} 事件`);
            return events;
        } catch (error) {
            console.error(`获取历史事件失败:`, error);
            return [];
        }
    }
}

module.exports = BlockchainListenerService;











