/**
 * 配置文件
 * 所有服务的配置参数
 */

require('dotenv').config();

module.exports = {
    // 区块链配置
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    chainId: parseInt(process.env.CHAIN_ID || '1337'),
    
    // 合约地址
    contracts: {
        paymentEscrow: process.env.PAYMENT_ESCROW_ADDRESS || '',
        rideOrder: process.env.RIDE_ORDER_ADDRESS || '',
        userRegistry: process.env.USER_REGISTRY_ADDRESS || '',
        ratingSystem: process.env.RATING_SYSTEM_ADDRESS || '',
        disputeResolution: process.env.DISPUTE_RESOLUTION_ADDRESS || ''
    },
    
    // 合约ABI路径
    abis: {
        paymentEscrow: require('../../contracts/abi/TrustFlowEscrow.json'),
        rideOrder: require('../../contracts/abi/TrustFlowRide.json'),
        userRegistry: require('../../contracts/abi/TrustFlowUserRegistry.json'),
        ratingSystem: require('../../contracts/abi/TrustFlowRating.json'),
        disputeResolution: require('../../contracts/abi/TrustFlowDispute.json')
    },
    
    // Redis配置
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined
    },
    
    // IPFS配置
    ipfsUrl: process.env.IPFS_URL || 'http://localhost:5001',
    
    // WebSocket配置
    wsPort: parseInt(process.env.WS_PORT || '8080'),
    
    // API配置
    apiPort: parseInt(process.env.API_PORT || '3000'),
    
    // 服务配置
    services: {
        orderMatching: {
            maxDistance: parseFloat(process.env.MAX_MATCHING_DISTANCE || '10'), // 最大匹配距离（公里）
            maxDrivers: parseInt(process.env.MAX_MATCHED_DRIVERS || '10'), // 最多推送司机数
            orderTimeout: parseInt(process.env.ORDER_TIMEOUT || '1800000') // 订单超时时间（毫秒，默认30分钟）
        },
        locationTracking: {
            updateInterval: parseInt(process.env.LOCATION_UPDATE_INTERVAL || '5000'), // 位置更新间隔（毫秒）
            arrivalTolerance: parseFloat(process.env.ARRIVAL_TOLERANCE || '0.2') // 到达容忍距离（公里）
        },
        orderStorage: {
            initialOrderId: parseInt(process.env.INITIAL_ORDER_ID || '10000') // 初始订单ID（默认从10000开始）
        }
    },
    
    // 安全配置
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    
    // 日志配置
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/app.log'
    }
};







