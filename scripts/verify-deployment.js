/**
 * 验证部署状态
 * 检查合约是否已部署到当前运行的节点
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("验证部署状态...\n");
    
    // 读取最新部署信息
    const deploymentFile = path.join(__dirname, "../deployments/localhost-latest.json");
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ 未找到部署信息文件");
        console.error("   请先运行: npm run deploy:local");
        process.exit(1);
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    
    console.log("部署信息文件:");
    console.log("  时间:", deploymentInfo.timestamp);
    console.log("  网络:", deploymentInfo.network);
    console.log("  部署者:", deploymentInfo.deployer);
    console.log("\n" + "=".repeat(60) + "\n");
    
    // 检查节点连接
    try {
        const provider = hre.ethers.provider;
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        const latestBlock = await provider.getBlock(blockNumber);
        
        console.log("节点连接状态:");
        console.log("  网络:", network.name, "(Chain ID:", network.chainId + ")");
        console.log("  当前区块高度:", blockNumber);
        console.log("  最新区块时间:", latestBlock ? new Date(latestBlock.timestamp * 1000).toISOString() : "N/A");
        
        if (blockNumber === 0) {
            console.warn("\n⚠️  警告: 区块高度为 0，节点可能是新启动的");
            console.warn("   如果合约是在之前的节点实例中部署的，需要重新部署");
        }
        
    } catch (error) {
        console.error("❌ 无法连接到 Hardhat 节点");
        console.error("   错误:", error.message);
        console.error("\n   请确保 Hardhat 节点正在运行:");
        console.error("   npm run node");
        process.exit(1);
    }
    
    console.log("\n" + "=".repeat(60) + "\n");
    console.log("检查合约部署状态:\n");
    
    const contracts = deploymentInfo.contracts;
    let allDeployed = true;
    
    for (const [name, address] of Object.entries(contracts)) {
        try {
            const code = await hre.ethers.provider.getCode(address);
            const status = code !== '0x' ? '✓ 已部署' : '❌ 未找到';
            console.log(`${name.padEnd(25)} ${address} ${status}`);
            
            if (code === '0x') {
                allDeployed = false;
            }
        } catch (error) {
            console.log(`${name.padEnd(25)} ${address} ❌ 检查失败: ${error.message}`);
            allDeployed = false;
        }
    }
    
    console.log("\n" + "=".repeat(60) + "\n");
    
    if (allDeployed) {
        console.log("✓ 所有合约都已部署到当前节点");
        console.log("\n可以运行测试脚本:");
        console.log("  node scripts/test-usdc-balance.js");
    } else {
        console.log("❌ 部分合约未部署到当前节点");
        console.log("\n解决方案:");
        console.log("  1. 确保 Hardhat 节点正在运行: npm run node");
        console.log("  2. 在节点运行的情况下重新部署: npm run deploy:local");
        console.log("  3. 然后再运行测试: node scripts/test-usdc-balance.js");
        console.log("\n注意: Hardhat 本地节点是内存节点，重启后会丢失所有数据");
    }
    
    // 检查部署者账户余额
    try {
        const deployerBalance = await hre.ethers.provider.getBalance(deploymentInfo.deployer);
        console.log("\n" + "=".repeat(60));
        console.log("部署者账户余额:", hre.ethers.utils.formatEther(deployerBalance), "ETH");
    } catch (error) {
        console.log("\n无法获取部署者余额");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

