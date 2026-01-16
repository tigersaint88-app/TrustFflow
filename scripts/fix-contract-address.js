/**
 * 修复前端合约地址配置
 * 从部署文件中读取最新的合约地址并更新前端配置
 */

const fs = require('fs');
const path = require('path');

async function fixContractAddresses() {
    console.log('🔧 修复前端合约地址配置...\n');
    console.log('='.repeat(80));
    
    // 1. 加载部署信息
    const deploymentFile = path.join(__dirname, '../deployments/localhost-latest.json');
    
    if (!fs.existsSync(deploymentFile)) {
        console.log('❌ 未找到部署信息文件:', deploymentFile);
        console.log('\n💡 解决方案:');
        console.log('   1. 确保 Hardhat 节点正在运行: npm run node');
        console.log('   2. 运行部署脚本: npm run deploy:local');
        console.log('   3. 或使用完整部署脚本: start-dev-with-deploy.bat');
        process.exit(1);
    }
    
    let deployment;
    try {
        deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        console.log(`✅ 加载部署信息成功`);
        console.log(`   网络: ${deployment.network}`);
        console.log(`   部署时间: ${deployment.timestamp}`);
    } catch (error) {
        console.log(`❌ 无法读取部署信息: ${error.message}`);
        process.exit(1);
    }
    
    const contracts = deployment.contracts;
    
    // 2. 生成前端配置脚本
    console.log('\n📝 生成前端配置脚本...');
    
    const configScript = `/**
 * 前端合约地址配置
 * 此文件由脚本自动生成，请勿手动修改
 * 生成时间: ${new Date().toISOString()}
 */

// 合约地址配置
window.CONTRACT_ADDRESSES = {
    rideOrder: '${contracts.rideOrder}',
    paymentEscrow: '${contracts.paymentEscrow}',
    userRegistry: '${contracts.userRegistry}',
    ratingSystem: '${contracts.ratingSystem}',
    disputeResolution: '${contracts.disputeResolution || ''}'
};

// 部署信息
window.DEPLOYMENT_INFO = {
    network: '${deployment.network}',
    timestamp: '${deployment.timestamp}',
    deployer: '${deployment.deployer}'
};

console.log('✅ 合约地址配置已加载:');
console.log('   rideOrder:', window.CONTRACT_ADDRESSES.rideOrder);
console.log('   paymentEscrow:', window.CONTRACT_ADDRESSES.paymentEscrow);
console.log('   userRegistry:', window.CONTRACT_ADDRESSES.userRegistry);
console.log('   ratingSystem:', window.CONTRACT_ADDRESSES.ratingSystem);
`;
    
    // 3. 更新前端配置文件
    const frontendConfigPath = path.join(__dirname, '../frontend/driver-app/config.js');
    const passengerConfigPath = path.join(__dirname, '../frontend/passenger-app/config.js');
    
    const configFiles = [
        { path: frontendConfigPath, name: '司机端配置' },
        { path: passengerConfigPath, name: '乘客端配置' }
    ];
    
    for (const file of configFiles) {
        try {
            // 读取现有配置
            let existingConfig = '';
            if (fs.existsSync(file.path)) {
                existingConfig = fs.readFileSync(file.path, 'utf8');
            }
            
            // 检查是否需要更新
            const needsUpdate = !existingConfig.includes(contracts.rideOrder) || 
                               !existingConfig.includes('自动生成');
            
            if (needsUpdate || true) { // 总是更新以确保最新
                // 备份原文件
                if (fs.existsSync(file.path)) {
                    const backupPath = file.path + '.backup';
                    fs.writeFileSync(backupPath, existingConfig);
                    console.log(`   已备份原配置: ${backupPath}`);
                }
                
                // 写入新配置
                fs.writeFileSync(file.path, configScript, 'utf8');
                console.log(`✅ ${file.name}已更新: ${file.path}`);
            } else {
                console.log(`ℹ️  ${file.name}已是最新，跳过更新`);
            }
        } catch (error) {
            console.log(`⚠️  更新 ${file.name}失败: ${error.message}`);
        }
    }
    
    // 4. 生成部署信息 JSON（供前端加载）
    const deploymentInfoPath = path.join(__dirname, '../frontend/shared/deployment-info.json');
    try {
        fs.writeFileSync(
            deploymentInfoPath, 
            JSON.stringify(deployment, null, 2), 
            'utf8'
        );
        console.log(`✅ 部署信息 JSON 已生成: ${deploymentInfoPath}`);
    } catch (error) {
        console.log(`⚠️  生成部署信息 JSON 失败: ${error.message}`);
    }
    
    // 5. 生成 HTML 说明
    console.log('\n📋 合约地址信息:');
    console.log('='.repeat(80));
    console.log(`rideOrder:        ${contracts.rideOrder}`);
    console.log(`paymentEscrow:    ${contracts.paymentEscrow}`);
    console.log(`userRegistry:     ${contracts.userRegistry}`);
    console.log(`ratingSystem:     ${contracts.ratingSystem}`);
    if (contracts.disputeResolution) {
        console.log(`disputeResolution: ${contracts.disputeResolution}`);
    }
    console.log('='.repeat(80));
    
    console.log('\n✅ 前端合约地址配置已修复！');
    console.log('\n💡 下一步:');
    console.log('   1. 刷新前端页面');
    console.log('   2. 如果问题仍然存在，运行: npm run check:contracts');
    console.log('   3. 如果合约未部署，运行: npm run deploy:local');
    console.log('');
}

// 运行修复
fixContractAddresses().catch((error) => {
    console.error('\n❌ 修复过程出错:', error);
    console.error('\n错误详情:', error.stack);
    process.exit(1);
});

