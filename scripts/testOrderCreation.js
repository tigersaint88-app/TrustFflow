/**
 * 订单创建测试脚本
 * 用于在本地测试订单创建功能
 * 
 * 使用方法：
 * 1. 启动本地节点: npm run node
 * 2. 部署合约: npm run deploy:local
 * 3. 初始化: npx hardhat run scripts/initialize.js --network localhost
 * 4. 运行此脚本: npx hardhat run scripts/testOrderCreation.js --network localhost
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("=".repeat(60));
    console.log("开始测试订单创建模块");
    console.log("=".repeat(60));
    
    // 加载部署信息
    const deploymentFile = path.join(__dirname, `../deployments/localhost-latest.json`);
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ 未找到部署信息，请先运行部署脚本:");
        console.error("   npm run deploy:local");
        process.exit(1);
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    console.log("\n✓ 加载部署信息成功");
    console.log("  网络:", deployment.network);
    console.log("  部署者:", deployment.deployer);
    
    // 获取测试账户
    const [deployer, passenger, driver] = await hre.ethers.getSigners();
    console.log("\n测试账户:");
    console.log("  部署者:", deployer.address);
    console.log("  乘客:", passenger.address);
    console.log("  司机:", driver.address);
    
    // 连接到已部署的合约
    console.log("\n连接合约...");
    const trustFlowRide = await hre.ethers.getContractAt(
        "TrustFlowRide",
        deployment.contracts.rideOrder
    );
    const trustFlowEscrow = await hre.ethers.getContractAt(
        "TrustFlowEscrow",
        deployment.contracts.paymentEscrow
    );
    const trustFlowUserRegistry = await hre.ethers.getContractAt(
        "TrustFlowUserRegistry",
        deployment.contracts.userRegistry
    );
    console.log("✓ 合约连接成功");
    
    // 检查用户是否已注册
    console.log("\n检查用户注册状态...");
    try {
        const passengerInfo = await trustFlowUserRegistry.getUser(passenger.address);
        console.log("✓ 乘客已注册:", passengerInfo.name);
    } catch (error) {
        console.log("⚠ 乘客未注册，正在注册...");
        const tx = await trustFlowUserRegistry.connect(passenger).registerPassenger(
            "测试乘客",
            hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("13800138000"))
        );
        await tx.wait();
        console.log("✓ 乘客注册成功");
    }
    
    try {
        const driverInfo = await trustFlowUserRegistry.getUser(driver.address);
        const driverDetails = await trustFlowUserRegistry.getDriverInfo(driver.address);
        console.log("✓ 司机已注册:", driverInfo.name);
        if (!driverDetails.isActive) {
            console.log("⚠ 司机未上线，正在设置上线...");
            await trustFlowUserRegistry.connect(driver).setDriverActive(true);
            console.log("✓ 司机已上线");
        }
    } catch (error) {
        console.log("⚠ 司机未注册，正在注册...");
        const tx = await trustFlowUserRegistry.connect(driver).registerDriver(
            "测试司机",
            hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("13900139000")),
            hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("驾照号123456")),
            "京A12345",
            "特斯拉 Model 3"
        );
        await tx.wait();
        
        // 验证司机KYC
        await trustFlowUserRegistry.updateKYCStatus(driver.address, 2); // Verified
        await trustFlowUserRegistry.connect(driver).setDriverActive(true);
        console.log("✓ 司机注册并上线成功");
    }
    
    // ==================== 测试1: 创建订单 ====================
    console.log("\n" + "=".repeat(60));
    console.log("测试1: 创建订单");
    console.log("=".repeat(60));
    
    const pickupLat = 39900000;  // 北京天安门纬度 (39.9 * 1e6)
    const pickupLng = 116400000; // 经度 (116.4 * 1e6)
    const destLat = 40000000;    // 鸟巢纬度 (40.0 * 1e6)
    const destLng = 116400000;    // 经度
    const estimatedFare = hre.ethers.utils.parseEther("0.01"); // 0.01 ETH
    
    console.log("\n订单信息:");
    console.log("  上车点: 天安门广场 (", pickupLat / 1e6, ",", pickupLng / 1e6, ")");
    console.log("  目的地: 国家体育场（鸟巢） (", destLat / 1e6, ",", destLng / 1e6, ")");
    console.log("  预估费用:", hre.ethers.utils.formatEther(estimatedFare), "ETH");
    
    try {
        // 创建订单
        console.log("\n正在创建订单...");
        const tx1 = await trustFlowRide.connect(passenger).createOrder(
            pickupLat,
            pickupLng,
            "天安门广场",
            destLat,
            destLng,
            "国家体育场（鸟巢）",
            estimatedFare
        );
        
        const receipt1 = await tx1.wait();
        const orderCreatedEvent = receipt1.events.find(e => e.event === "OrderCreated");
        const orderId = orderCreatedEvent.args.orderId.toNumber();
        
        console.log("✓ 订单创建成功!");
        console.log("  订单ID:", orderId);
        console.log("  交易哈希:", receipt1.transactionHash);
        
        // 查询订单详情
        const order = await trustFlowRide.getOrder(orderId);
        console.log("\n订单详情:");
        console.log("  订单ID:", order.orderId.toString());
        console.log("  乘客:", order.passenger);
        console.log("  司机:", order.driver === hre.ethers.constants.AddressZero ? "未接单" : order.driver);
        console.log("  状态:", ["待接单", "已接单", "已上车", "已完成", "已取消"][order.status]);
        console.log("  预估费用:", hre.ethers.utils.formatEther(order.estimatedFare), "ETH");
        console.log("  创建时间:", new Date(order.createdAt.toNumber() * 1000).toLocaleString());
        
        // ==================== 测试2: 司机接单 ====================
        console.log("\n" + "=".repeat(60));
        console.log("测试2: 司机接单");
        console.log("=".repeat(60));
        
        console.log("\n司机正在接单...");
        const tx2 = await trustFlowRide.connect(driver).acceptOrder(orderId);
        const receipt2 = await tx2.wait();
        
        console.log("✓ 司机接单成功!");
        console.log("  交易哈希:", receipt2.transactionHash);
        
        // 更新订单详情
        const orderAfterAccept = await trustFlowRide.getOrder(orderId);
        console.log("\n接单后订单状态:");
        console.log("  司机:", orderAfterAccept.driver);
        console.log("  状态:", ["待接单", "已接单", "已上车", "已完成", "已取消"][orderAfterAccept.status]);
        console.log("  接单时间:", new Date(orderAfterAccept.acceptedAt.toNumber() * 1000).toLocaleString());
        
        // ==================== 测试3: 锁定资金 ====================
        console.log("\n" + "=".repeat(60));
        console.log("测试3: 锁定资金");
        console.log("=".repeat(60));
        
        console.log("\n乘客正在锁定资金...");
        const passengerBalanceBefore = await hre.ethers.provider.getBalance(passenger.address);
        console.log("  乘客余额（锁定前）:", hre.ethers.utils.formatEther(passengerBalanceBefore), "ETH");
        
        const tx3 = await trustFlowEscrow.connect(passenger).createOrder(
            orderAfterAccept.driver,
            { value: estimatedFare }
        );
        const receipt3 = await tx3.wait();
        
        const passengerBalanceAfter = await hre.ethers.provider.getBalance(passenger.address);
        console.log("✓ 资金锁定成功!");
        console.log("  交易哈希:", receipt3.transactionHash);
        console.log("  乘客余额（锁定后）:", hre.ethers.utils.formatEther(passengerBalanceAfter), "ETH");
        console.log("  锁定金额:", hre.ethers.utils.formatEther(estimatedFare), "ETH");
        
        // 查询托管订单
        const escrowOrderId = receipt3.events.find(e => e.event === "OrderCreated").args.orderId.toNumber();
        const escrowOrder = await trustFlowEscrow.getOrderDetails(escrowOrderId);
        console.log("\n托管订单详情:");
        console.log("  托管订单ID:", escrowOrderId);
        console.log("  订单金额:", hre.ethers.utils.formatEther(escrowOrder.amount), "ETH");
        console.log("  平台手续费:", hre.ethers.utils.formatEther(escrowOrder.platformFee), "ETH");
        console.log("  订单状态:", ["已创建", "已锁定", "进行中", "已完成", "已取消", "争议中"][escrowOrder.status]);
        
        // ==================== 测试4: 确认上车 ====================
        console.log("\n" + "=".repeat(60));
        console.log("测试4: 确认上车");
        console.log("=".repeat(60));
        
        console.log("\n司机确认接到乘客...");
        const tx4 = await trustFlowRide.connect(driver).confirmPickup(orderId);
        await tx4.wait();
        
        // 开始行程（在支付合约中）
        const tx5 = await trustFlowEscrow.connect(driver).startRide(escrowOrderId);
        await tx5.wait();
        
        console.log("✓ 已确认上车，行程开始!");
        
        // ==================== 测试5: 完成订单 ====================
        console.log("\n" + "=".repeat(60));
        console.log("测试5: 完成订单");
        console.log("=".repeat(60));
        
        const actualFare = estimatedFare; // 假设实际费用等于预估费用
        console.log("\n司机完成订单...");
        console.log("  实际费用:", hre.ethers.utils.formatEther(actualFare), "ETH");
        
        const driverBalanceBefore = await hre.ethers.provider.getBalance(driver.address);
        const platformBalanceBefore = await hre.ethers.provider.getBalance(deployment.configuration.platformWallet);
        
        // 在订单合约中完成订单
        const tx6 = await trustFlowRide.connect(driver).completeOrder(orderId, actualFare);
        await tx6.wait();
        
        // 在支付合约中释放资金
        const tx7 = await trustFlowEscrow.connect(driver).completeOrder(escrowOrderId);
        const receipt7 = await tx7.wait();
        
        const driverBalanceAfter = await hre.ethers.provider.getBalance(driver.address);
        const platformBalanceAfter = await hre.ethers.provider.getBalance(deployment.configuration.platformWallet);
        
        console.log("✓ 订单完成，资金已释放!");
        console.log("\n资金分配:");
        const driverReceived = driverBalanceAfter.sub(driverBalanceBefore);
        const platformReceived = platformBalanceAfter.sub(platformBalanceBefore);
        console.log("  司机收到:", hre.ethers.utils.formatEther(driverReceived), "ETH");
        console.log("  平台收到:", hre.ethers.utils.formatEther(platformReceived), "ETH");
        
        // 查询最终订单状态
        const finalOrder = await trustFlowRide.getOrder(orderId);
        console.log("\n最终订单状态:");
        console.log("  状态:", ["待接单", "已接单", "已上车", "已完成", "已取消"][finalOrder.status]);
        console.log("  实际费用:", hre.ethers.utils.formatEther(finalOrder.actualFare), "ETH");
        console.log("  完成时间:", new Date(finalOrder.completedAt.toNumber() * 1000).toLocaleString());
        
        // ==================== 测试摘要 ====================
        console.log("\n" + "=".repeat(60));
        console.log("测试摘要");
        console.log("=".repeat(60));
        console.log("✓ 所有测试通过!");
        console.log("\n测试的订单ID:", orderId);
        console.log("托管订单ID:", escrowOrderId);
        console.log("\n可以在Hardhat控制台中查询订单:");
        console.log("  npx hardhat console --network localhost");
        console.log("  const ride = await ethers.getContractAt('TrustFlowRide', '", deployment.contracts.rideOrder, "');");
        console.log("  const order = await ride.getOrder(", orderId, ");");
        console.log("  console.log(order);");
        
    } catch (error) {
        console.error("\n❌ 测试失败:", error.message);
        if (error.reason) {
            console.error("  原因:", error.reason);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

