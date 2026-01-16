/**
 * 检查 Hardhat 节点状态
 */

const hre = require("hardhat");

async function main() {
    console.log("检查 Hardhat 节点状态...\n");
    
    try {
        const provider = hre.ethers.provider;
        
        // 获取网络信息
        const network = await provider.getNetwork();
        console.log("网络信息:");
        console.log("  名称:", network.name);
        console.log("  Chain ID:", network.chainId.toString());
        
        // 获取区块号
        const blockNumber = await provider.getBlockNumber();
        console.log("\n区块信息:");
        console.log("  当前区块高度:", blockNumber);
        
        if (blockNumber > 0) {
            // 获取最新的几个区块
            console.log("\n最近的区块:");
            for (let i = 0; i < Math.min(blockNumber + 1, 5); i++) {
                const block = await provider.getBlock(blockNumber - i);
                if (block) {
                    console.log(`  区块 #${block.number}:`, {
                        hash: block.hash,
                        timestamp: new Date(block.timestamp * 1000).toISOString(),
                        transactions: block.transactions.length,
                        gasUsed: block.gasUsed.toString()
                    });
                }
            }
        } else {
            console.log("\n⚠️  警告: 区块高度为 0");
            console.log("   节点可能是刚启动的，或者没有交易");
        }
        
        // 获取账户信息
        const signers = await hre.ethers.getSigners();
        console.log("\n账户信息:");
        console.log("  账户数量:", signers.length);
        for (let i = 0; i < Math.min(signers.length, 3); i++) {
            const balance = await provider.getBalance(signers[i].address);
            console.log(`  账户 #${i}: ${signers[i].address.substring(0, 10)}...`);
            console.log(`    余额: ${hre.ethers.utils.formatEther(balance)} ETH`);
        }
        
        // 尝试获取部署文件中的合约地址
        const fs = require("fs");
        const path = require("path");
        const deploymentFile = path.join(__dirname, "../deployments/localhost-latest.json");
        
        if (fs.existsSync(deploymentFile)) {
            const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
            const usdcAddress = deploymentInfo.contracts.usdcToken;
            
            console.log("\n检查 USDC 合约地址:", usdcAddress);
            const code = await provider.getCode(usdcAddress);
            console.log("  代码长度:", code.length, "字符");
            console.log("  是否部署:", code !== '0x' ? '是' : '否');
            
            if (code !== '0x') {
                console.log("  代码前100字符:", code.substring(0, 100));
            }
        }
        
    } catch (error) {
        console.error("❌ 错误:", error.message);
        console.error("\n可能的原因:");
        console.error("  1. Hardhat 节点未运行");
        console.error("  2. 网络配置不正确");
        console.error("  3. 连接超时");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

