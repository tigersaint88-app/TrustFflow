/**
 * 检查合约部署状态
 * 验证合约地址是否真的有合约代码
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';

async function checkContractDeployment() {
    console.log('🔍 检查合约部署状态...\n');
    console.log('='.repeat(80));
    
    // 1. 连接到网络
    console.log('\n📡 连接到网络...');
    let provider;
    try {
        provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const network = await provider.getNetwork();
        const chainId = typeof network.chainId === 'object' 
            ? network.chainId.toNumber() 
            : parseInt(network.chainId.toString(), 10);
        console.log(`✅ 网络连接成功 (Chain ID: ${chainId}, RPC: ${RPC_URL})`);
    } catch (error) {
        console.log(`❌ 无法连接到网络: ${error.message}`);
        console.log('\n💡 解决方案:');
        console.log('   1. 确保 Hardhat 节点正在运行: npm run node');
        console.log('   2. 检查 RPC URL 配置是否正确');
        process.exit(1);
    }
    
    // 2. 加载部署信息
    console.log('\n📋 加载部署信息...');
    const deploymentFile = path.join(__dirname, '../deployments/localhost-latest.json');
    
    if (!fs.existsSync(deploymentFile)) {
        console.log('❌ 未找到部署信息文件:', deploymentFile);
        console.log('\n💡 解决方案:');
        console.log('   运行部署脚本: npm run deploy:local');
        process.exit(1);
    }
    
    let deployment;
    try {
        deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        console.log(`✅ 加载部署信息成功 (网络: ${deployment.network}, 时间: ${deployment.timestamp})`);
    } catch (error) {
        console.log(`❌ 无法读取部署信息: ${error.message}`);
        process.exit(1);
    }
    
    // 3. 检查每个合约
    console.log('\n🔍 检查合约部署状态...\n');
    const contracts = deployment.contracts;
    const contractNames = Object.keys(contracts);
    const results = {};
    
    for (const contractName of contractNames) {
        const address = contracts[contractName];
        console.log(`检查 ${contractName}:`);
        console.log(`  地址: ${address}`);
        
        try {
            // 检查地址是否有代码
            const code = await provider.getCode(address);
            
            if (code === '0x' || code === '0x0' || !code) {
                console.log(`  ❌ 没有合约代码！`);
                results[contractName] = {
                    address,
                    deployed: false,
                    error: '没有合约代码'
                };
            } else {
                const codeLength = (code.length - 2) / 2; // 减去 '0x' 前缀，除以2得到字节数
                console.log(`  ✅ 合约代码存在 (${codeLength} 字节)`);
                results[contractName] = {
                    address,
                    deployed: true,
                    codeLength
                };
            }
        } catch (error) {
            console.log(`  ❌ 检查失败: ${error.message}`);
            results[contractName] = {
                address,
                deployed: false,
                error: error.message
            };
        }
        console.log('');
    }
    
    // 4. 生成报告
    console.log('='.repeat(80));
    console.log('📊 检查结果摘要');
    console.log('='.repeat(80));
    
    const deployed = Object.values(results).filter(r => r.deployed).length;
    const total = Object.keys(results).length;
    const notDeployed = total - deployed;
    
    console.log(`\n总计: ${total} 个合约`);
    console.log(`✅ 已部署: ${deployed}`);
    console.log(`❌ 未部署: ${notDeployed}\n`);
    
    if (notDeployed > 0) {
        console.log('⚠️  以下合约没有部署:');
        for (const [name, result] of Object.entries(results)) {
            if (!result.deployed) {
                console.log(`   - ${name}: ${result.address}`);
                console.log(`     错误: ${result.error || '未知错误'}`);
            }
        }
        console.log('');
        
        console.log('💡 解决方案:');
        console.log('   1. 重新部署合约: npm run deploy:local');
        console.log('   2. 或者使用完整部署脚本: start-dev-with-deploy.bat');
        console.log('');
        console.log('⚠️  注意: 如果 Hardhat 节点重启了，所有合约都会丢失。');
        console.log('   这是本地开发网络的特点，需要重新部署。\n');
        
        process.exit(1);
    } else {
        console.log('✅ 所有合约都已正确部署！\n');
    }
    
    // 5. 验证合约功能
    console.log('='.repeat(80));
    console.log('🧪 测试合约功能...');
    console.log('='.repeat(80));
    
    if (results.rideOrder && results.rideOrder.deployed) {
        try {
            const rideOrderABI = require('../contracts/abi/TrustFlowRide.json');
            const rideOrderContract = new ethers.Contract(
                results.rideOrder.address,
                rideOrderABI,
                provider
            );
            
            // 尝试调用一个只读函数
            const orderCount = await rideOrderContract.nextOrderId();
            console.log(`✅ rideOrder 合约可以正常调用 (下一个订单ID: ${orderCount.toString()})`);
        } catch (error) {
            console.log(`⚠️  rideOrder 合约调用失败: ${error.message}`);
            console.log('   这可能表示合约ABI不匹配或合约功能有问题');
        }
    }
    
    console.log('\n✅ 检查完成！\n');
}

// 运行检查
checkContractDeployment().catch((error) => {
    console.error('\n❌ 检查过程出错:', error);
    console.error('\n错误详情:', error.stack);
    process.exit(1);
});

