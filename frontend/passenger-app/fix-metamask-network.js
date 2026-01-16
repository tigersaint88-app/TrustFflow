/**
 * MetaMask 网络修复脚本
 * 用于诊断和修复 MetaMask 连接到 Hardhat 本地网络的问题
 * 
 * 使用方法：
 * 1. 打开浏览器控制台 (F12)
 * 2. 复制整个脚本内容并粘贴执行
 * 3. 或者保存为书签使用
 */

(async function fixMetaMaskNetwork() {
    console.log('🔧 MetaMask 网络诊断和修复工具\n');
    console.log('='.repeat(50));
    
    // 检查 MetaMask
    if (!window.ethereum) {
        console.error('❌ MetaMask 未检测到！请先安装 MetaMask 扩展。');
        alert('❌ MetaMask 未检测到！\n\n请先安装 MetaMask 扩展。');
        return;
    }
    console.log('✅ MetaMask 已检测到\n');
    
    try {
        // 1. 检查当前网络
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        const currentChainIdDec = parseInt(currentChainId, 16);
        console.log('📡 当前网络信息：');
        console.log('   Chain ID (十六进制):', currentChainId);
        console.log('   Chain ID (十进制):', currentChainIdDec);
        
        const networkNames = {
            1: 'Ethereum Mainnet',
            5: 'Goerli Testnet',
            137: 'Polygon Mainnet',
            80001: 'Mumbai Testnet',
            31337: 'Hardhat Local'
        };
        console.log('   网络名称:', networkNames[currentChainIdDec] || 'Unknown');
        console.log('');
        
        // 2. 检查账户
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
            console.warn('⚠️  未连接账户，请先连接钱包\n');
        } else {
            console.log('👤 当前账户:', accounts[0]);
            
            // 检查余额
            const balance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [accounts[0], 'latest']
            });
            const ethBalance = parseInt(balance, 16) / 1e18;
            console.log('💰 当前余额:', ethBalance, 'ETH');
            console.log('');
        }
        
        // 3. 检查是否需要切换到 Hardhat
        const hardhatChainId = '0x7a69'; // 31337
        const hardhatChainIdDec = 31337;
        
        if (currentChainId === hardhatChainId) {
            console.log('✅ 已连接到 Hardhat 本地网络\n');
            
            // 即使网络正确，也检查余额
            if (accounts.length > 0) {
                const balance = await window.ethereum.request({
                    method: 'eth_getBalance',
                    params: [accounts[0], 'latest']
                });
                const ethBalance = parseInt(balance, 16) / 1e18;
                
                if (ethBalance === 0) {
                    console.warn('⚠️  余额为 0，但网络正确。可能的原因：');
                    console.warn('   1. Hardhat 节点未运行');
                    console.warn('   2. RPC URL 配置错误');
                    console.warn('   3. 账户不是 Hardhat 默认账户\n');
                    
                    // 测试 RPC 连接
                    console.log('🔍 测试 RPC 连接...');
                    try {
                        const testProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
                        const blockNumber = await testProvider.getBlockNumber();
                        console.log('✅ RPC 连接正常，当前区块:', blockNumber);
                        
                        // 检查 Hardhat 默认账户余额
                        const hardhatAccount = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
                        const hardhatBalance = await testProvider.getBalance(hardhatAccount);
                        const hardhatEthBalance = ethers.utils.formatEther(hardhatBalance);
                        console.log('✅ Hardhat 默认账户余额:', hardhatEthBalance, 'ETH');
                        console.log('\n💡 建议：在 MetaMask 中导入 Hardhat 默认账户');
                        console.log('   地址:', hardhatAccount);
                        console.log('   私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
                    } catch (rpcError) {
                        console.error('❌ RPC 连接失败:', rpcError.message);
                        console.error('   请确保 Hardhat 节点正在运行: npm run node');
                    }
                } else {
                    console.log('✅ 余额正常\n');
                }
            }
        } else {
            console.log('⚠️  未连接到 Hardhat 本地网络\n');
            console.log('🔧 正在尝试切换到 Hardhat 网络...\n');
            
            try {
                // 先尝试切换
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: hardhatChainId }]
                });
                console.log('✅ 已切换到 Hardhat 网络\n');
                
                // 刷新余额
                if (accounts.length > 0) {
                    const newBalance = await window.ethereum.request({
                        method: 'eth_getBalance',
                        params: [accounts[0], 'latest']
                    });
                    const newEthBalance = parseInt(newBalance, 16) / 1e18;
                    console.log('💰 新余额:', newEthBalance, 'ETH');
                }
            } catch (switchError) {
                if (switchError.code === 4902) {
                    // 网络不存在，添加它
                    console.log('➕ Hardhat 网络不存在，正在添加...\n');
                    
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: hardhatChainId,
                            chainName: 'Hardhat Local',
                            nativeCurrency: {
                                name: 'Ethereum',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['http://127.0.0.1:8545', 'http://localhost:8545'],
                            blockExplorerUrls: null
                        }]
                    });
                    
                    console.log('✅ Hardhat 网络已添加并切换\n');
                    
                    // 再次检查余额
                    if (accounts.length > 0) {
                        const newBalance = await window.ethereum.request({
                            method: 'eth_getBalance',
                            params: [accounts[0], 'latest']
                        });
                        const newEthBalance = parseInt(newBalance, 16) / 1e18;
                        console.log('💰 新余额:', newEthBalance, 'ETH');
                    }
                } else {
                    console.error('❌ 切换网络失败:', switchError.message);
                    console.log('\n📝 请手动在 MetaMask 中添加网络：');
                    console.log('   网络名称: Hardhat Local');
                    console.log('   RPC URL: http://127.0.0.1:8545');
                    console.log('   链 ID: 31337');
                    console.log('   货币符号: ETH');
                }
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ 诊断完成！');
        
        // 显示总结
        const finalChainId = await window.ethereum.request({ method: 'eth_chainId' });
        const finalChainIdDec = parseInt(finalChainId, 16);
        
        if (finalChainIdDec === 31337 && accounts.length > 0) {
            const finalBalance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [accounts[0], 'latest']
            });
            const finalEthBalance = parseInt(finalBalance, 16) / 1e18;
            
            if (finalEthBalance > 0) {
                console.log('\n🎉 问题已解决！');
                console.log('   网络: Hardhat Local');
                console.log('   余额:', finalEthBalance, 'ETH');
            } else {
                console.log('\n⚠️  网络已切换，但余额仍为 0');
                console.log('   请导入 Hardhat 默认账户：');
                console.log('   私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
            }
        }
        
    } catch (error) {
        console.error('❌ 发生错误:', error);
        alert('修复过程中发生错误:\n' + error.message);
    }
})();

