/**
 * 验证 .env 文件是否包含正确的合约地址
 */

const fs = require('fs');
const path = require('path');

// 读取最新的部署信息
const deploymentsDir = path.join(__dirname, '../deployments');
const latestDeploymentFile = path.join(deploymentsDir, 'localhost-latest.json');

if (!fs.existsSync(latestDeploymentFile)) {
    console.error('❌ 未找到部署信息文件');
    process.exit(1);
}

const deployment = JSON.parse(fs.readFileSync(latestDeploymentFile, 'utf8'));
const deployedContracts = deployment.contracts;

// 读取 .env 文件
const envFile = path.join(__dirname, '../.env');
if (!fs.existsSync(envFile)) {
    console.error('❌ .env 文件不存在');
    process.exit(1);
}

const envContent = fs.readFileSync(envFile, 'utf8');

// 检查每个合约地址
const contractVars = {
    'PAYMENT_ESCROW_ADDRESS': deployedContracts.paymentEscrow,
    'RIDE_ORDER_ADDRESS': deployedContracts.rideOrder,
    'USER_REGISTRY_ADDRESS': deployedContracts.userRegistry,
    'RATING_SYSTEM_ADDRESS': deployedContracts.ratingSystem,
    'DISPUTE_RESOLUTION_ADDRESS': deployedContracts.disputeResolution
};

console.log('验证 .env 文件中的合约地址...\n');
console.log('='.repeat(60));

let allMatch = true;

for (const [varName, expectedAddress] of Object.entries(contractVars)) {
    // 查找环境变量
    const regex = new RegExp(`^\\s*${varName}\\s*=\\s*(.+?)(\\s*#.*)?$`, 'm');
    const match = envContent.match(regex);
    
    if (match) {
        const actualAddress = match[1].trim();
        if (actualAddress === expectedAddress) {
            console.log(`✅ ${varName}`);
            console.log(`   期望: ${expectedAddress}`);
            console.log(`   实际: ${actualAddress}`);
        } else {
            console.log(`❌ ${varName}`);
            console.log(`   期望: ${expectedAddress}`);
            console.log(`   实际: ${actualAddress}`);
            allMatch = false;
        }
    } else {
        console.log(`❌ ${varName} - 未找到`);
        console.log(`   期望: ${expectedAddress}`);
        allMatch = false;
    }
    console.log('');
}

// 检查 RPC_URL 和 CHAIN_ID（如果是本地网络）
if (deployment.network === 'localhost' || deployment.network === 'hardhat') {
    console.log('检查本地网络配置...\n');
    
    const rpcRegex = /^\s*RPC_URL\s*=\s*(.+?)(\s*#.*)?$/m;
    const chainIdRegex = /^\s*CHAIN_ID\s*=\s*(.+?)(\s*#.*)?$/m;
    
    const rpcMatch = envContent.match(rpcRegex);
    const chainIdMatch = envContent.match(chainIdRegex);
    
    if (rpcMatch && rpcMatch[1].trim() === 'http://127.0.0.1:8545') {
        console.log('✅ RPC_URL = http://127.0.0.1:8545');
    } else {
        console.log('⚠️  RPC_URL 未设置为本地地址');
    }
    
    if (chainIdMatch && chainIdMatch[1].trim() === '1337') {
        console.log('✅ CHAIN_ID = 1337');
    } else {
        console.log('⚠️  CHAIN_ID 未设置为 1337');
    }
    console.log('');
}

console.log('='.repeat(60));
if (allMatch) {
    console.log('\n✅ 所有合约地址都已正确更新到 .env 文件！');
    process.exit(0);
} else {
    console.log('\n❌ 部分合约地址未正确更新，请检查 .env 文件');
    process.exit(1);
}

