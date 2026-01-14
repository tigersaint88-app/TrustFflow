/**
 * 验证合约部署状态
 * 检查部署文件中的合约地址是否在链上有代码
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('='.repeat(60));
    console.log('验证合约部署状态');
    console.log('='.repeat(60));
    
    // 读取部署文件
    const deploymentFile = path.join(__dirname, '../deployments/localhost-latest.json');
    if (!fs.existsSync(deploymentFile)) {
        console.error('❌ 未找到部署文件:', deploymentFile);
        console.error('请先运行: npm run deploy:local');
        process.exit(1);
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log('\n📄 部署文件:', deploymentFile);
    console.log('📅 部署时间:', deployment.timestamp);
    console.log('🌐 网络:', deployment.network);
    
    // 连接到本地Hardhat节点
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // 检查节点是否运行
    try {
        const blockNumber = await provider.getBlockNumber();
        console.log('\n✅ Hardhat节点运行正常');
        console.log('📦 当前区块高度:', blockNumber);
    } catch (error) {
        console.error('\n❌ 无法连接到Hardhat节点');
        console.error('请确保Hardhat节点正在运行: npm run node');
        process.exit(1);
    }
    
    // 验证每个合约
    const contracts = deployment.contracts;
    const contractNames = Object.keys(contracts);
    let allValid = true;
    
    console.log('\n' + '='.repeat(60));
    console.log('验证合约地址...');
    console.log('='.repeat(60));
    
    for (const contractName of contractNames) {
        const address = contracts[contractName];
        console.log(`\n📋 ${contractName}:`);
        console.log(`   地址: ${address}`);
        
        try {
            const code = await provider.getCode(address);
            if (code === '0x' || code === '0x0') {
                console.log(`   ❌ 合约未部署（地址没有代码）`);
                allValid = false;
            } else {
                const codeSize = (code.length - 2) / 2; // 减去 '0x' 前缀，每个字节2个字符
                console.log(`   ✅ 合约已部署（代码大小: ${codeSize} 字节）`);
            }
        } catch (error) {
            console.log(`   ❌ 验证失败: ${error.message}`);
            allValid = false;
        }
    }
    
    console.log('\n' + '='.repeat(60));
    if (allValid) {
        console.log('✅ 所有合约验证通过');
        console.log('='.repeat(60));
    } else {
        console.log('❌ 部分合约未部署');
        console.log('='.repeat(60));
        console.log('\n解决方案:');
        console.log('1. 重新部署合约:');
        console.log('   npm run deploy:local');
        console.log('\n2. 或者重启Hardhat节点并重新部署:');
        console.log('   - 停止节点 (Ctrl+C)');
        console.log('   - 启动节点: npm run node');
        console.log('   - 部署合约: npm run deploy:local');
        process.exit(1);
    }
}

main().catch(error => {
    console.error('验证失败:', error);
    process.exit(1);
});

