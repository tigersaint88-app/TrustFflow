/**
 * 从部署文件更新 .env 文件
 * Node.js 版本，无需 Python
 */

const fs = require('fs');
const path = require('path');

function updateEnvFile() {
    console.log('📝 更新 .env 文件...\n');
    
    const deploymentFile = path.join(__dirname, '../deployments/localhost-latest.json');
    const envFile = path.join(__dirname, '../.env');
    
    // 读取部署信息
    if (!fs.existsSync(deploymentFile)) {
        console.error(`❌ 未找到部署文件: ${deploymentFile}`);
        console.error('\n💡 解决方案:');
        console.error('   1. 确保 Hardhat 节点正在运行: npm run node');
        console.error('   2. 运行部署脚本: npm run deploy:local');
        process.exit(1);
    }
    
    let deployment;
    try {
        deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        console.log(`✅ 加载部署信息成功 (网络: ${deployment.network}, 时间: ${deployment.timestamp})`);
    } catch (error) {
        console.error(`❌ 无法读取部署信息: ${error.message}`);
        process.exit(1);
    }
    
    const contracts = deployment.contracts;
    const config = deployment.configuration || {};
    
    // 读取现有的 .env 文件（如果存在）
    const envVars = {};
    if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [key, ...valueParts] = trimmed.split('=');
                const value = valueParts.join('='); // 处理值中包含 = 的情况
                envVars[key.trim()] = value.trim();
            }
        }
    }
    
    // 更新合约地址
    envVars['RIDE_ORDER_ADDRESS'] = contracts.rideOrder || '';
    envVars['PAYMENT_ESCROW_ADDRESS'] = contracts.paymentEscrow || '';
    envVars['USER_REGISTRY_ADDRESS'] = contracts.userRegistry || '';
    envVars['RATING_SYSTEM_ADDRESS'] = contracts.ratingSystem || '';
    envVars['DISPUTE_RESOLUTION_ADDRESS'] = contracts.disputeResolution || '';
    
    // 更新平台配置
    if (config.platformWallet) {
        envVars['PLATFORM_WALLET'] = config.platformWallet;
    }
    
    // 保留其他重要的环境变量
    if (!envVars['RPC_URL']) {
        envVars['RPC_URL'] = 'http://127.0.0.1:8545';
    }
    if (!envVars['CHAIN_ID']) {
        envVars['CHAIN_ID'] = '1337';
    }
    if (!envVars['PLATFORM_FEE_RATE']) {
        envVars['PLATFORM_FEE_RATE'] = '5';
    }
    
    // 写入 .env 文件
    const envContent = `# 环境变量配置文件
# 自动更新于: ${new Date().toISOString()}
# ETH Mode - 使用原生 ETH 进行支付

# ==================== 区块链配置 ====================
RPC_URL=${envVars['RPC_URL']}
CHAIN_ID=${envVars['CHAIN_ID']}

# ==================== 合约地址 (ETH 模式) ====================
PAYMENT_ESCROW_ADDRESS=${envVars['PAYMENT_ESCROW_ADDRESS']}
RIDE_ORDER_ADDRESS=${envVars['RIDE_ORDER_ADDRESS']}
USER_REGISTRY_ADDRESS=${envVars['USER_REGISTRY_ADDRESS']}
RATING_SYSTEM_ADDRESS=${envVars['RATING_SYSTEM_ADDRESS']}
DISPUTE_RESOLUTION_ADDRESS=${envVars['DISPUTE_RESOLUTION_ADDRESS']}

# ==================== 平台配置 ====================
${config.platformWallet ? `PLATFORM_WALLET=${config.platformWallet}` : '# PLATFORM_WALLET=未配置'}
PLATFORM_FEE_RATE=${envVars['PLATFORM_FEE_RATE']}

# ==================== 服务端口配置 ====================
WS_PORT=${envVars['WS_PORT'] || '8080'}
API_PORT=${envVars['API_PORT'] || '3000'}

# ==================== Redis配置 ====================
REDIS_URL=${envVars['REDIS_URL'] || 'redis://localhost:6379'}
REDIS_HOST=${envVars['REDIS_HOST'] || 'localhost'}
REDIS_PORT=${envVars['REDIS_PORT'] || '6379'}

# ==================== IPFS配置 ====================
IPFS_URL=${envVars['IPFS_URL'] || 'http://localhost:5001'}

# ==================== 日志配置 ====================
LOG_LEVEL=${envVars['LOG_LEVEL'] || 'info'}
LOG_FILE=${envVars['LOG_FILE'] || './logs/app.log'}

# ==================== 安全配置 ====================
JWT_SECRET=${envVars['JWT_SECRET'] || 'your-super-secret-jwt-key-please-change-this-in-production'}
JWT_EXPIRES_IN=${envVars['JWT_EXPIRES_IN'] || '7d'}

# ==================== 业务配置 ====================
MAX_MATCHING_DISTANCE=${envVars['MAX_MATCHING_DISTANCE'] || '10'}
MAX_MATCHED_DRIVERS=${envVars['MAX_MATCHED_DRIVERS'] || '10'}
ORDER_TIMEOUT=${envVars['ORDER_TIMEOUT'] || '1800000'}
LOCATION_UPDATE_INTERVAL=${envVars['LOCATION_UPDATE_INTERVAL'] || '5000'}
ARRIVAL_TOLERANCE=${envVars['ARRIVAL_TOLERANCE'] || '0.2'}
INITIAL_ORDER_ID=${envVars['INITIAL_ORDER_ID'] || '10000'}

# ==================== 前端环境变量 ====================
REACT_APP_API_URL=${envVars['REACT_APP_API_URL'] || 'http://localhost:3000'}
REACT_APP_WS_URL=${envVars['REACT_APP_WS_URL'] || 'ws://localhost:8080'}
REACT_APP_PAYMENT_ESCROW_ADDRESS=${envVars['PAYMENT_ESCROW_ADDRESS']}
REACT_APP_RIDE_ORDER_ADDRESS=${envVars['RIDE_ORDER_ADDRESS']}
REACT_APP_USER_REGISTRY_ADDRESS=${envVars['USER_REGISTRY_ADDRESS']}
REACT_APP_RATING_SYSTEM_ADDRESS=${envVars['RATING_SYSTEM_ADDRESS']}
REACT_APP_DISPUTE_RESOLUTION_ADDRESS=${envVars['DISPUTE_RESOLUTION_ADDRESS']}

# ==================== 开发模式 ====================
NODE_ENV=${envVars['NODE_ENV'] || 'development'}
`;
    
    try {
        fs.writeFileSync(envFile, envContent, 'utf8');
        console.log('✅ .env 文件已更新\n');
        console.log('更新的合约地址:');
        console.log(`  RIDE_ORDER_ADDRESS: ${envVars['RIDE_ORDER_ADDRESS']}`);
        console.log(`  PAYMENT_ESCROW_ADDRESS: ${envVars['PAYMENT_ESCROW_ADDRESS']}`);
        console.log(`  USER_REGISTRY_ADDRESS: ${envVars['USER_REGISTRY_ADDRESS']}`);
        console.log(`  RATING_SYSTEM_ADDRESS: ${envVars['RATING_SYSTEM_ADDRESS']}`);
        console.log(`  DISPUTE_RESOLUTION_ADDRESS: ${envVars['DISPUTE_RESOLUTION_ADDRESS']}`);
        console.log('');
    } catch (error) {
        console.error(`❌ 写入 .env 文件失败: ${error.message}`);
        process.exit(1);
    }
}

// 运行更新
updateEnvFile();

