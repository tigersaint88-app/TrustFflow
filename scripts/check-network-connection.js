/**
 * 网络连接诊断工具
 * 检查 Hardhat 本地节点是否正在运行
 */

const { ethers } = require('ethers');
require('dotenv').config();

const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const EXPECTED_CHAIN_ID = parseInt(process.env.CHAIN_ID || '1337');

async function checkNetworkConnection() {
    console.log('🔍 开始检查网络连接...\n');
    
    console.log(`📡 RPC URL: ${RPC_URL}`);
    console.log(`🔗 期望 Chain ID: ${EXPECTED_CHAIN_ID}\n`);
    
    // 1. 检查端口是否可访问
    console.log('1️⃣  检查端口连接...');
    try {
        const url = new URL(RPC_URL);
        const testUrl = `http://${url.hostname}:${url.port || 8545}`;
        
        // 尝试简单的 HTTP 请求
        const http = require('http');
        const testRequest = (url) => {
            return new Promise((resolve, reject) => {
                const parsedUrl = new URL(url);
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || 8545,
                    path: '/',
                    method: 'GET',
                    timeout: 3000
                };
                
                const req = http.request(options, (res) => {
                    resolve({ status: res.statusCode, reachable: true });
                });
                
                req.on('error', (err) => {
                    reject(err);
                });
                
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('连接超时'));
                });
                
                req.end();
            });
        };
        
        try {
            await testRequest(testUrl);
            console.log('   ✅ 端口可访问\n');
        } catch (error) {
            console.log('   ❌ 端口不可访问:', error.message);
            console.log('   💡 提示: Hardhat 节点可能没有运行\n');
            
            console.log('   📝 解决方案:');
            console.log('      1. 在新的终端窗口运行: npm run node');
            console.log('      2. 等待节点启动完成（看到 "Started HTTP and WebSocket server"）');
            console.log('      3. 然后重新运行此检查脚本\n');
            
            process.exit(1);
        }
    } catch (error) {
        console.log('   ⚠️  无法解析 RPC URL:', error.message, '\n');
    }
    
    // 2. 检查 Provider 连接
    console.log('2️⃣  检查 Ethers Provider 连接...');
    let provider;
    try {
        provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        
        // 尝试获取网络信息
        const network = await provider.getNetwork();
        const chainId = typeof network.chainId === 'object' 
            ? network.chainId.toNumber() 
            : parseInt(network.chainId.toString(), 10);
        
        console.log(`   ✅ 成功连接到网络`);
        console.log(`      - Chain ID: ${chainId}`);
        console.log(`      - 网络名称: ${network.name}`);
        
        if (chainId !== EXPECTED_CHAIN_ID) {
            console.log(`   ⚠️  警告: Chain ID 不匹配!`);
            console.log(`      期望: ${EXPECTED_CHAIN_ID}, 实际: ${chainId}\n`);
        } else {
            console.log(`   ✅ Chain ID 匹配\n`);
        }
        
    } catch (error) {
        console.log('   ❌ Provider 连接失败');
        console.log(`   错误: ${error.message}\n`);
        
        if (error.code === 'NETWORK_ERROR' || error.event === 'noNetwork') {
            console.log('   💡 这是一个网络错误，可能的原因:');
            console.log('      1. Hardhat 节点没有运行');
            console.log('      2. RPC URL 配置错误');
            console.log('      3. 防火墙阻止了连接');
            console.log('      4. 端口被其他程序占用\n');
            
            console.log('   📝 解决步骤:');
            console.log('      1. 检查 Hardhat 节点是否运行:');
            console.log('         npm run node');
            console.log('      2. 如果节点没有运行，启动它:');
            console.log('         npm run node');
            console.log('      3. 检查端口 8545 是否被占用:');
            console.log('         netstat -ano | findstr :8545  (Windows)');
            console.log('         lsof -i :8545  (Linux/Mac)\n');
        }
        
        process.exit(1);
    }
    
    // 3. 检查区块同步
    console.log('3️⃣  检查区块同步...');
    try {
        const blockNumber = await provider.getBlockNumber();
        console.log(`   ✅ 当前区块高度: ${blockNumber}\n`);
        
        // 获取最新区块信息
        const latestBlock = await provider.getBlock(blockNumber);
        console.log(`   📦 最新区块信息:`);
        console.log(`      - 区块哈希: ${latestBlock.hash}`);
        console.log(`      - 时间戳: ${new Date(latestBlock.timestamp * 1000).toLocaleString()}`);
        console.log(`      - 交易数: ${latestBlock.transactions.length}\n`);
        
    } catch (error) {
        console.log(`   ❌ 获取区块信息失败: ${error.message}\n`);
        process.exit(1);
    }
    
    // 4. 检查账户余额
    console.log('4️⃣  检查默认账户余额...');
    try {
        // Hardhat 默认账户（账户 0）
        const defaultAccount = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
        const balance = await provider.getBalance(defaultAccount);
        const balanceETH = ethers.utils.formatEther(balance);
        
        console.log(`   ✅ 默认账户余额: ${balanceETH} ETH`);
        console.log(`      账户地址: ${defaultAccount}\n`);
        
        if (parseFloat(balanceETH) === 0) {
            console.log('   ⚠️  警告: 账户余额为 0');
            console.log('   💡 这可能是正常的，取决于网络状态\n');
        }
        
    } catch (error) {
        console.log(`   ⚠️  无法获取账户余额: ${error.message}\n`);
    }
    
    // 5. 测试 JSON-RPC 调用
    console.log('5️⃣  测试 JSON-RPC 调用...');
    try {
        const result = await provider.send('eth_blockNumber', []);
        console.log(`   ✅ JSON-RPC 调用成功`);
        console.log(`      当前区块 (hex): ${result}\n`);
    } catch (error) {
        console.log(`   ❌ JSON-RPC 调用失败: ${error.message}\n`);
        process.exit(1);
    }
    
    console.log('✅ 所有检查通过！网络连接正常。\n');
    
    console.log('📋 网络信息摘要:');
    console.log(`   RPC URL: ${RPC_URL}`);
    const network = await provider.getNetwork();
    const chainId = typeof network.chainId === 'object' 
        ? network.chainId.toNumber() 
        : parseInt(network.chainId.toString(), 10);
    console.log(`   Chain ID: ${chainId}`);
    const blockNumber = await provider.getBlockNumber();
    console.log(`   当前区块: ${blockNumber}`);
    console.log(`   网络状态: ✅ 正常\n`);
}

// 运行检查
checkNetworkConnection().catch((error) => {
    console.error('\n❌ 检查过程出错:', error);
    console.error('\n错误详情:', error.stack);
    process.exit(1);
});

