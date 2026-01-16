/**
 * 添加 Hardhat 本地网络到 MetaMask 的工具脚本
 * 可以在浏览器控制台中直接运行
 */

async function addHardhatNetwork() {
    if (typeof window.ethereum === 'undefined') {
        console.error('❌ 未检测到 MetaMask，请先安装 MetaMask 浏览器扩展');
        alert('❌ 未检测到 MetaMask\n\n请先安装 MetaMask 浏览器扩展：\nhttps://metamask.io/');
        return false;
    }

    const networkConfig = {
        chainId: '0x539', // 1337 的十六进制
        chainName: 'Hardhat Localhost',
        nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18
        },
        rpcUrls: ['http://127.0.0.1:8545'],
        blockExplorerUrls: null
    };

    try {
        console.log('🔄 正在添加 Hardhat 本地网络到 MetaMask...');
        
        // 先尝试添加网络
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig]
        });
        
        console.log('✅ 网络已添加');
        
        // 添加成功后尝试切换
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x539' }]
            });
            console.log('✅ 已切换到 Hardhat 本地网络');
            alert('✅ 成功！\n\nHardhat 本地网络已添加到 MetaMask，并已自动切换。');
            return true;
        } catch (switchError) {
            if (switchError.code === 4902) {
                console.log('ℹ️ 网络已添加，但需要手动切换');
                alert('✅ 网络已添加\n\n请在 MetaMask 中手动切换到 "Hardhat Localhost" 网络。');
            } else {
                console.warn('⚠️ 切换网络失败:', switchError.message);
                alert('✅ 网络已添加\n\n但切换失败，请在 MetaMask 中手动切换到 "Hardhat Localhost" 网络。');
            }
            return true;
        }
    } catch (error) {
        if (error.code === 4902) {
            // 网络已存在，尝试切换
            console.log('ℹ️ 网络已存在，尝试切换...');
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x539' }]
                });
                console.log('✅ 已切换到 Hardhat 本地网络');
                alert('✅ 已切换到 Hardhat 本地网络');
                return true;
            } catch (switchError) {
                console.error('❌ 切换网络失败:', switchError);
                alert('❌ 切换网络失败\n\n' + switchError.message);
                return false;
            }
        } else if (error.code === 4001) {
            console.error('❌ 用户拒绝了添加网络的请求');
            alert('❌ 您取消了添加网络\n\n请重试并点击 "批准"。');
            return false;
        } else {
            console.error('❌ 添加网络失败:', error);
            alert('❌ 添加网络失败\n\n' + error.message + '\n\n请确保 Hardhat 节点正在运行（npm run node）');
            return false;
        }
    }
}

// 自动检测并提示
async function checkAndPromptNetwork() {
    if (typeof window.ethereum === 'undefined') {
        return;
    }

    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const expectedChainId = '0x539'; // 1337

        if (chainId !== expectedChainId) {
            console.log('⚠️ 当前 Chain ID:', parseInt(chainId, 16), '期望 Chain ID: 1337');
            
            const shouldAdd = confirm(
                '检测到您当前不在 Hardhat 本地网络。\n\n' +
                '当前网络: Chain ID ' + parseInt(chainId, 16) + '\n' +
                '需要切换到: Chain ID 1337 (Hardhat Localhost)\n\n' +
                '是否自动添加并切换到 Hardhat 本地网络？'
            );

            if (shouldAdd) {
                await addHardhatNetwork();
            }
        } else {
            console.log('✅ Chain ID 匹配，网络正确');
        }
    } catch (error) {
        console.error('检查网络失败:', error);
    }
}

// 导出函数（如果在浏览器中使用）
if (typeof window !== 'undefined') {
    window.addHardhatNetwork = addHardhatNetwork;
    window.checkAndPromptNetwork = checkAndPromptNetwork;
    
    console.log('📝 Hardhat 网络工具已加载');
    console.log('   使用方法：');
    console.log('   - 添加网络: addHardhatNetwork()');
    console.log('   - 检查并提示: checkAndPromptNetwork()');
}

// 如果在 Node.js 环境中（用于测试）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addHardhatNetwork,
        checkAndPromptNetwork
    };
}

