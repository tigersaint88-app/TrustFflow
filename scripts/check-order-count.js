/**
 * 检查合约中的订单计数
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("检查合约订单计数...\n");
    
    // 读取最新部署信息
    const deploymentsDir = path.join(__dirname, "../deployments");
    const latestFile = path.join(deploymentsDir, "localhost-latest.json");
    
    if (!fs.existsSync(latestFile)) {
        console.error("❌ 未找到部署信息文件");
        process.exit(1);
    }
    
    const deployment = JSON.parse(fs.readFileSync(latestFile, "utf8"));
    const rideOrderAddress = deployment.contracts.rideOrder;
    
    console.log("合约地址:", rideOrderAddress);
    console.log("网络:", deployment.network);
    console.log("");
    
    // 连接合约
    const TrustFlowRide = await hre.ethers.getContractFactory("TrustFlowRide");
    const rideOrder = TrustFlowRide.attach(rideOrderAddress);
    
    // 获取订单计数
    const orderCount = await rideOrder.orderCount();
    console.log("当前订单计数 (orderCount):", orderCount.toString());
    console.log("");
    
    if (orderCount.toString() === "10000") {
        console.log("✅ 初始订单ID设置成功！下一个订单ID将是 10000");
    } else if (orderCount.toString() === "0") {
        console.log("⚠️  订单计数仍为0，初始订单ID可能未设置");
    } else {
        console.log(`ℹ️  当前订单计数: ${orderCount.toString()}，下一个订单ID将是 ${orderCount.toString()}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

