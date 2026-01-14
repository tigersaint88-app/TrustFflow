/**
 * 快速切换到本地 Hardhat 网络
 * 在浏览器控制台执行此脚本，或保存为书签使用
 */
(async function switchToLocalNetwork() {
    if (!window.ethereum) {
        console.error('❌ MetaMask 未检测到！请先安装 MetaMask 扩展。');
        alert('❌ MetaMask 未检测到！\n请先安装 MetaMask 扩展。');
        return;
    }

    console.log('🔄 正在切换到本地 Hardhat 网络...\n');

    try {
        // 先尝试切换到本地网络（如果已存在）
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x539' }] // 1337 的十六进制
            });
            console.log('✅ 已切换到本地网络 (Chain ID: 1337)');
            alert('✅ 已切换到本地 Hardhat 网络！\n\n请刷新页面。');
            return;
        } catch (switchError) {
            if (switchError.code === 4902) {
                // 网络不存在，需要添加
                console.log('➕ 本地网络不存在，正在添加...\n');
            } else {
                throw switchError; // 其他错误，重新抛出
            }
        }

        // 添加网络
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: '0x539', // 1337 的十六进制
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

        console.log('✅ 本地网络已添加并切换 (Chain ID: 1337)');
        alert('✅ 本地 Hardhat 网络已添加并切换！\n\n请刷新页面。');

    } catch (error) {
        console.error('❌ 切换网络失败:', error);
        
        let errorMessage = '❌ 切换网络失败！\n\n';
        errorMessage += `错误: ${error.message}\n\n`;
        
        if (error.code === 4902) {
            errorMessage += '网络不存在，但添加网络时也失败了。\n';
        } else if (error.code === -32002) {
            errorMessage += '网络切换请求已提交，请检查 MetaMask 弹窗。\n';
        }
        
        errorMessage += '\n请手动在 MetaMask 中添加网络：\n';
        errorMessage += '- 网络名称: Hardhat Local\n';
        errorMessage += '- RPC URL: http://127.0.0.1:8545\n';
        errorMessage += '- Chain ID: 1337\n';
        errorMessage += '- 货币符号: ETH\n';
        
        alert(errorMessage);
    }
})();

