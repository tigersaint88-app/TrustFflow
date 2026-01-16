/**
 * 初始化脚本
 * 用于设置初始数据和测试账户
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("初始化合约...");
    
    // 加载部署信息
    const deploymentFile = path.join(__dirname, `../deployments/${hre.network.name}-latest.json`);
    if (!fs.existsSync(deploymentFile)) {
        console.error("未找到部署信息，请先运行部署脚本");
        process.exit(1);
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    console.log("加载部署信息:", hre.network.name);
    
    const [deployer, testPassenger, testDriver] = await hre.ethers.getSigners();
    
    // 连接到已部署的合约
    const userRegistry = await hre.ethers.getContractAt("TrustFlowUserRegistry", deployment.contracts.userRegistry);
    const rideOrder = await hre.ethers.getContractAt("TrustFlowRide", deployment.contracts.rideOrder);
    const ratingSystem = await hre.ethers.getContractAt("TrustFlowRating", deployment.contracts.ratingSystem);
    const paymentEscrow = await hre.ethers.getContractAt("TrustFlowEscrow", deployment.contracts.paymentEscrow);
    
    console.log("\n创建测试账户...");
    
    // 1. 注册测试乘客
    console.log("\n[1/2] 注册测试乘客:", testPassenger.address);
    try {
        const tx1 = await userRegistry.connect(testPassenger).registerPassenger(
            "测试乘客",
            hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("13800138000"))
        );
        await tx1.wait();
        console.log("✓ 测试乘客注册成功");
    } catch (error) {
        console.log("⚠ 乘客可能已注册");
    }
    
    // 2. 注册测试司机
    console.log("\n[2/2] 注册测试司机:", testDriver.address);
    try {
        const tx2 = await userRegistry.connect(testDriver).registerDriver(
            "测试司机",
            hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("13900139000")),
            hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("驾照号123456")),
            "京A12345",
            "特斯拉 Model 3"
        );
        await tx2.wait();
        console.log("✓ 测试司机注册成功");
    } catch (error) {
        console.log("⚠ 司机可能已注册");
    }
    
    // 3. 验证测试司机（仅部署者可以）
    console.log("\n验证测试司机KYC状态...");
    try {
        await userRegistry.updateKYCStatus(testDriver.address, 2); // 2 = Verified
        console.log("✓ 测试司机已验证");
    } catch (error) {
        console.log("⚠ KYC验证失败:", error.message);
    }
    
    // 4. 设置司机在线
    console.log("\n设置测试司机在线...");
    try {
        await userRegistry.connect(testDriver).setDriverActive(true);
        console.log("✓ 测试司机已上线");
    } catch (error) {
        console.log("⚠ 设置在线失败:", error.message);
    }
    
    // 5. 创建测试订单（可选）
    if (process.env.CREATE_TEST_ORDER === "true") {
        console.log("\n创建测试订单...");
        try {
            // 乘客创建订单
            const tx = await rideOrder.connect(testPassenger).createOrder(
                39900000, // 北京天安门纬度
                116400000, // 经度
                "天安门广场",
                40000000, // 鸟巢纬度
                116400000, // 经度
                "国家体育场（鸟巢）",
                hre.ethers.utils.parseEther("0.01") // 0.01 ETH
            );
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === "OrderCreated");
            const orderId = event.args.orderId;
            
            console.log("✓ 测试订单创建成功，订单ID:", orderId.toString());
            
            // 司机接单
            console.log("\n测试司机接单...");
            await rideOrder.connect(testDriver).acceptOrder(orderId);
            console.log("✓ 测试司机接单成功");
            
        } catch (error) {
            console.log("⚠ 创建测试订单失败:", error.message);
        }
    }
    
    // 6. 显示摘要
    console.log("\n" + "=".repeat(60));
    console.log("初始化完成！");
    console.log("=".repeat(60));
    console.log("\n测试账户:");
    console.log("  部署者:     ", deployer.address);
    console.log("  测试乘客:   ", testPassenger.address);
    console.log("  测试司机:   ", testDriver.address);
    
    console.log("\n合约状态:");
    const passengerInfo = await userRegistry.getUser(testPassenger.address);
    const driverInfo = await userRegistry.getUser(testDriver.address);
    const driverDetails = await userRegistry.getDriverInfo(testDriver.address);
    
    console.log("\n乘客信息:");
    console.log("  地址:", passengerInfo.userAddress);
    console.log("  姓名:", passengerInfo.name);
    console.log("  信用分:", passengerInfo.creditScore.toString());
    
    console.log("\n司机信息:");
    console.log("  地址:", driverInfo.userAddress);
    console.log("  姓名:", driverInfo.name);
    console.log("  车牌:", driverDetails.vehiclePlate);
    console.log("  车型:", driverDetails.vehicleModel);
    console.log("  在线状态:", driverDetails.isActive ? "在线" : "离线");
    console.log("  KYC状态:", ["未验证", "待审核", "已验证", "已拒绝"][driverInfo.kycStatus]);
    
    console.log("\n" + "=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });







