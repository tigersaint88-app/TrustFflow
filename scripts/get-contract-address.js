/**
 * 获取最新部署的合约地址并生成更新命令
 */

const fs = require('fs');
const path = require('path');

try {
    const deploymentFile = path.join(__dirname, '../deployments/localhost-latest.json');
    
    if (!fs.existsSync(deploymentFile)) {
        console.log('❌ 部署文件不存在！');
        console.log('请先运行: npm run deploy:local');
        process.exit(1);
    }
    
    const data = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const addr = data.contracts.rideOrder;
    
    console.log('='.repeat(60));
    console.log('最新的 TrustFlowRide 合约地址:');
    console.log('='.repeat(60));
    console.log(addr);
    console.log('');
    console.log('📋 请在浏览器控制台运行以下命令更新地址:');
    console.log('-'.repeat(60));
    console.log(`localStorage.setItem('RIDE_ORDER_ADDRESS', '${addr}');`);
    console.log('location.reload();');
    console.log('-'.repeat(60));
    console.log('');
    console.log('或者复制上面的地址，手动在前端应用中设置。');
    
} catch (error) {
    console.error('❌ 读取部署文件失败:', error.message);
    console.log('请先运行: npm run deploy:local');
    process.exit(1);
}

