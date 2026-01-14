/**
 * MetaMask 账户显示问题修复脚本
 * 自动检查和修复常见的 MetaMask 账户显示问题
 */

const { ethers } = require('ethers');
require('dotenv').config();

const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const EXPECTED_CHAIN_ID = 1337;

async function main() {
    console.log('🔧 MetaMask 账户显示问题修复工具\n');
    console.log('='.repeat(80));
    
    // 步骤 1: 检查 Hardhat 节点
    console.log('\n📡 步骤 1: 检查 Hardhat 节点连接...');
    let provider;
    try {
        provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const network = await provider.getNetwork();
        const chainId = typeof network.chainId === 'object' 
            ? network.chainId.toNumber() 
            : parseInt(network.chainId.toString(), 10);
        
        if (chainId === EXPECTED_CHAIN_ID) {
            console.log('✅ Hardhat 节点连接正常');
            console.log(`   - Chain ID: ${chainId}`);
            console.log(`   - RPC URL: ${RPC_URL}`);
        } else {
            console.log(`⚠️  Chain ID 不匹配! 期望: ${EXPECTED_CHAIN_ID}, 实际: ${chainId}`);
        }
    } catch (error) {
        console.log('❌ 无法连接到 Hardhat 节点!');
        console.log(`   错误: ${error.message}\n`);
        console.log('💡 解决方案:');
        console.log('   1. 确保 Hardhat 节点正在运行: npm run node');
        console.log('   2. 等待节点启动完成（看到 "Started HTTP and WebSocket server"）');
        console.log('   3. 然后重新运行此脚本\n');
        process.exit(1);
    }
    
    // 步骤 2: 获取账户信息
    console.log('\n👤 步骤 2: 获取 Hardhat 测试账户信息...\n');
    
    try {
        const accounts = [];
        
        // 使用 Hardhat 默认账户地址
        // Hardhat 默认账户地址列表
        const defaultAccounts = [
            '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
            '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
            '0x15d34AAf54267DB7D7c3c1742a9a865F7Fd8b9c1'
        ];
        
        console.log('检查 Hardhat 默认账户余额...\n');
        
        for (let i = 0; i < defaultAccounts.length; i++) {
            const address = defaultAccounts[i];
            try {
                const balance = await provider.getBalance(address);
                const balanceETH = parseFloat(ethers.utils.formatEther(balance));
                
                // 只显示有余额的账户
                if (balanceETH > 0) {
                    accounts.push({
                        index: i,
                        address: address,
                        balance: balanceETH.toFixed(4)
                    });
                }
            } catch (e) {
                // 跳过无效账户
            }
        }
        
        if (accounts.length === 0) {
            console.log('⚠️  无法获取账户信息');
            console.log('   请确保 Hardhat 节点正在运行并已初始化\n');
        } else {
            console.log(`找到 ${accounts.length} 个账户:\n`);
            
            accounts.forEach(acc => {
                console.log(`账户 #${acc.index + 1}:`);
                console.log(`  地址: ${acc.address}`);
                console.log(`  余额: ${parseFloat(acc.balance).toFixed(4)} ETH`);
                console.log('');
            });
        }
    } catch (error) {
        console.log('⚠️  获取账户信息失败:', error.message);
    }
    
    // 步骤 3: 生成 MetaMask 配置脚本
    console.log('\n🔧 步骤 3: 生成 MetaMask 配置脚本...\n');
    
    const metaMaskScript = `
// 在浏览器控制台（F12）运行此脚本来配置 MetaMask

(async function() {
    console.log('开始配置 MetaMask...');
    
    // 1. 检查 MetaMask 是否安装
    if (typeof window.ethereum === 'undefined') {
        alert('❌ 未检测到 MetaMask，请先安装 MetaMask 扩展');
        return;
    }
    
    try {
        // 2. 添加本地网络
        console.log('添加本地网络...');
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x539' }] // 1337 的十六进制
            });
            console.log('✅ 已切换到本地网络');
        } catch (switchError) {
            if (switchError.code === 4902) {
                // 网络不存在，需要添加
                console.log('网络不存在，正在添加...');
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x539',
                        chainName: 'Hardhat Local',
                        nativeCurrency: {
                            name: 'Ethereum',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: ['http://127.0.0.1:8545'],
                        blockExplorerUrls: null
                    }]
                });
                console.log('✅ 本地网络已添加');
            } else {
                throw switchError;
            }
        }
        
        // 3. 检查网络连接
        console.log('检查网络连接...');
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const chainIdNum = parseInt(chainId, 16);
        
        if (chainIdNum !== 1337) {
            console.warn('⚠️  Chain ID 不匹配:', chainIdNum);
        } else {
            console.log('✅ Chain ID 正确:', chainIdNum);
        }
        
        // 4. 请求账户访问
        console.log('请求账户访问...');
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length > 0) {
            console.log('✅ 已连接账户:', accounts[0]);
            
            // 5. 检查余额
            const balance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [accounts[0], 'latest']
            });
            const ethBalance = parseInt(balance, 16) / 1e18;
            console.log('✅ 账户余额:', ethBalance.toFixed(4), 'ETH');
            
            if (ethBalance === 0) {
                console.warn('⚠️  账户余额为 0');
                console.log('💡 提示: 请导入 Hardhat 测试账户到 MetaMask');
                console.log('   运行: node scripts/show-hardhat-accounts.js 查看账户私钥');
            }
        } else {
            console.warn('⚠️  未检测到账户');
            console.log('💡 提示: 请导入账户或创建新账户');
        }
        
        alert('✅ MetaMask 配置完成！请检查控制台查看详细信息。');
        
    } catch (error) {
        console.error('❌ 配置失败:', error);
        alert('❌ 配置失败: ' + error.message);
    }
})();
`;
    
    console.log('已生成 MetaMask 配置脚本。');
    console.log('请复制以下脚本到浏览器控制台（F12 -> Console）运行:\n');
    console.log('─'.repeat(80));
    console.log(metaMaskScript);
    console.log('─'.repeat(80));
    
    // 步骤 4: 生成账户导入说明
    console.log('\n📝 步骤 4: 账户导入说明...\n');
    
    console.log('如果 MetaMask 显示余额为 0，需要导入 Hardhat 测试账户:');
    console.log('');
    console.log('1. 运行账户信息脚本:');
    console.log('   node scripts/show-hardhat-accounts.js');
    console.log('');
    console.log('2. 复制私钥（从 0x 开始）');
    console.log('');
    console.log('3. 在 MetaMask 中:');
    console.log('   - 点击账户图标');
    console.log('   - 选择 "导入账户"');
    console.log('   - 选择 "私钥"');
    console.log('   - 粘贴私钥');
    console.log('   - 点击 "导入"');
    console.log('');
    
    // 步骤 5: 总结
    console.log('\n' + '='.repeat(80));
    console.log('✅ 诊断完成！\n');
    console.log('📋 下一步操作:');
    console.log('');
    console.log('1. ✅ 确保 Hardhat 节点正在运行: npm run node');
    console.log('2. 📋 在浏览器控制台运行上面生成的 MetaMask 配置脚本');
    console.log('3. 🔑 如果需要，导入 Hardhat 测试账户到 MetaMask');
    console.log('4. 🔄 刷新页面并检查 MetaMask 账户余额');
    console.log('');
    console.log('📚 详细文档: docs/MetaMask账户显示问题完整解决方案.md');
    console.log('='.repeat(80) + '\n');
}

// 运行
main().catch((error) => {
    console.error('\n❌ 脚本执行出错:', error);
    console.error('\n错误详情:', error.stack);
    process.exit(1);
});

