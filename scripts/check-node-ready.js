/**
 * 检查 Hardhat 节点是否就绪
 * 用于批处理脚本中检查节点状态
 */

const { ethers } = require('ethers');

async function checkNodeReady() {
    try {
        const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        
        // 设置较短的超时时间
        provider.pollingInterval = 1000;
        
        // 尝试获取区块号
        const blockNumber = await provider.getBlockNumber();
        
        // 如果成功获取区块号，说明节点就绪
        process.exit(0);
    } catch (error) {
        // 节点未就绪
        process.exit(1);
    }
}

checkNodeReady();
