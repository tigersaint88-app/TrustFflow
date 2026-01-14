/**
 * 检查历史部署并继续使用
 * 1. 查找历史部署记录
 * 2. 验证合约是否还在节点上
 * 3. 如果还在，可以使用旧合约继续处理
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
    console.log('='.repeat(60));
    console.log('检查历史部署记录');
    console.log('='.repeat(60));
    console.log('');
    
    // 1. 读取最新部署记录
    const deploymentsDir = path.join(__dirname, '../deployments');
    const latestFile = path.join(deploymentsDir, 'localhost-latest.json');
    
    if (!fs.existsSync(latestFile)) {
        console.log('❌ 未找到部署记录文件');
        console.log('请先运行: npm run deploy:local');
        process.exit(1);
    }
    
    const deployment = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    const contractAddress = deployment.contracts.rideOrder;
    
    console.log('📋 最新部署记录:');
    console.log(`   网络: ${deployment.network}`);
    console.log(`   部署时间: ${new Date(deployment.timestamp).toLocaleString('zh-CN')}`);
    console.log(`   部署账户: ${deployment.deployer}`);
    console.log('');
    console.log('📦 合约地址:');
    console.log(`   TrustFlowRide: ${contractAddress}`);
    
    // 如果有交易哈希，显示出来
    if (deployment.transactions && deployment.transactions.rideOrder) {
        console.log(`   部署交易哈希: ${deployment.transactions.rideOrder}`);
    }
    console.log('');
    
    // 2. 连接到 Hardhat 节点
    console.log('🔍 检查 Hardhat 节点连接...');
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    
    try {
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ 节点连接成功，当前区块: ${blockNumber}`);
    } catch (error) {
        console.log('❌ 无法连接到 Hardhat 节点');
        console.log('   请确保节点正在运行: npm run node');
        process.exit(1);
    }
    
    // 3. 检查合约是否还在节点上
    console.log('');
    console.log('🔍 检查合约是否还在节点上...');
    const code = await provider.getCode(contractAddress);
    
    if (code === '0x') {
        console.log('❌ 合约未部署或已丢失');
        console.log('');
        console.log('可能原因:');
        console.log('   1. Hardhat 节点已重启（数据已清空）');
        console.log('   2. 合约地址错误');
        console.log('');
        console.log('解决方案:');
        console.log('   重新部署合约: npm run deploy:local');
        process.exit(1);
    }
    
    console.log('✅ 合约仍在节点上！');
    
    // 4. 尝试获取合约信息
    console.log('');
    console.log('📊 获取合约状态...');
    
    try {
        // 读取 ABI
        const abiPath = path.join(__dirname, '../contracts/abi/TrustFlowRide.json');
        const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        const contract = new ethers.Contract(contractAddress, abi, provider);
        
        // 获取订单总数
        const orderCount = await contract.orderCount();
        console.log(`   订单总数: ${orderCount.toString()}`);
        
        // 获取待接单订单数
        try {
            const pendingCount = await contract.getPendingOrdersCount();
            console.log(`   待接单订单: ${pendingCount.toString()}`);
        } catch (e) {
            // 如果方法不存在，跳过
        }
        
        console.log('');
        console.log('='.repeat(60));
        console.log('✅ 合约可以继续使用！');
        console.log('='.repeat(60));
        console.log('');
        console.log('📋 使用说明:');
        console.log(`   1. 合约地址: ${contractAddress}`);
        console.log('   2. 在前端更新地址:');
        console.log('');
        console.log('   在浏览器控制台运行:');
        console.log(`   localStorage.setItem('RIDE_ORDER_ADDRESS', '${contractAddress}');`);
        console.log('   location.reload();');
        console.log('');
        console.log('   或者直接在前端应用中输入合约地址。');
        console.log('');
        
    } catch (error) {
        console.log('⚠️  无法获取合约详细信息:', error.message);
        console.log('   但合约代码存在，可能可以继续使用。');
    }
    
    // 5. 显示所有历史部署记录
    console.log('');
    console.log('📚 所有历史部署记录:');
    const files = fs.readdirSync(deploymentsDir)
        .filter(f => f.startsWith('localhost-') && f.endsWith('.json'))
        .sort()
        .reverse();
    
    files.slice(0, 5).forEach((file, index) => {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(deploymentsDir, file), 'utf8'));
            const isLatest = file === 'localhost-latest.json';
            const marker = isLatest ? ' ⭐ 最新' : '';
            console.log(`   ${index + 1}. ${file}${marker}`);
            console.log(`      时间: ${new Date(data.timestamp).toLocaleString('zh-CN')}`);
            console.log(`      地址: ${data.contracts.rideOrder}`);
            if (data.transactions && data.transactions.rideOrder) {
                console.log(`      交易: ${data.transactions.rideOrder}`);
            }
            console.log('');
        } catch (e) {
            // 忽略错误文件
        }
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ 错误:', error);
        process.exit(1);
    });

