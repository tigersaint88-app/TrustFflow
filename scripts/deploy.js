/**
 * 部署脚本
 * 部署所有智能合约
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("开始部署智能合约...");
    console.log("网络:", hre.network.name);
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", hre.ethers.utils.formatEther(await deployer.getBalance()), "ETH");
    
    const deployedContracts = {};
    // 平台钱包地址配置
    // 方式1: 使用环境变量（如果设置了）
    // 方式2: 使用部署者地址（默认）
    const platformWallet = process.env.PLATFORM_WALLET_ADDRESS || deployer.address;
    
    console.log("平台钱包地址:", platformWallet);
    console.log("  (提示: 可通过环境变量 PLATFORM_WALLET_ADDRESS 自定义，否则使用部署者地址)");
    
    // 1. 部署用户注册合约
    console.log("\n[1/5] 部署 TrustFlowUserRegistry...");
    const TrustFlowUserRegistry = await hre.ethers.getContractFactory("TrustFlowUserRegistry");
    const userRegistryTx = await TrustFlowUserRegistry.deploy();
    await userRegistryTx.deployed();
    console.log("✓ TrustFlowUserRegistry 部署到:", userRegistryTx.address);
    console.log("  交易哈希:", userRegistryTx.deployTransaction.hash);
    deployedContracts.userRegistry = userRegistryTx.address;
    const userRegistry = userRegistryTx;
    
    // 2. 部署评价系统合约
    console.log("\n[2/5] 部署 TrustFlowRating...");
    const TrustFlowRating = await hre.ethers.getContractFactory("TrustFlowRating");
    const ratingSystemTx = await TrustFlowRating.deploy();
    await ratingSystemTx.deployed();
    console.log("✓ TrustFlowRating 部署到:", ratingSystemTx.address);
    console.log("  交易哈希:", ratingSystemTx.deployTransaction.hash);
    deployedContracts.ratingSystem = ratingSystemTx.address;
    const ratingSystem = ratingSystemTx;
    
    // 3. 部署订单管理合约
    console.log("\n[3/5] 部署 TrustFlowRide...");
    const TrustFlowRide = await hre.ethers.getContractFactory("TrustFlowRide");
    const rideOrderTx = await TrustFlowRide.deploy(platformWallet);
    await rideOrderTx.deployed();
    console.log("✓ TrustFlowRide 部署到:", rideOrderTx.address);
    console.log("  交易哈希:", rideOrderTx.deployTransaction.hash);
    deployedContracts.rideOrder = rideOrderTx.address;
    const rideOrder = rideOrderTx;
    
    // 4. 部署支付托管合约（使用 ETH）
    console.log("\n[4/5] 部署 TrustFlowEscrow...");
    const TrustFlowEscrow = await hre.ethers.getContractFactory("TrustFlowEscrow");
    const paymentEscrowTx = await TrustFlowEscrow.deploy(platformWallet);
    await paymentEscrowTx.deployed();
    console.log("✓ TrustFlowEscrow 部署到:", paymentEscrowTx.address);
    console.log("  交易哈希:", paymentEscrowTx.deployTransaction.hash);
    console.log("  平台钱包:", platformWallet);
    deployedContracts.paymentEscrow = paymentEscrowTx.address;
    const paymentEscrow = paymentEscrowTx;
    
    // 5. 部署争议处理合约
    console.log("\n[5/5] 部署 TrustFlowDispute...");
    const TrustFlowDispute = await hre.ethers.getContractFactory("TrustFlowDispute");
    const disputeResolutionTx = await TrustFlowDispute.deploy();
    await disputeResolutionTx.deployed();
    console.log("✓ TrustFlowDispute 部署到:", disputeResolutionTx.address);
    console.log("  交易哈希:", disputeResolutionTx.deployTransaction.hash);
    deployedContracts.disputeResolution = disputeResolutionTx.address;
    const disputeResolution = disputeResolutionTx;
    
    // 6. 配置合约之间的关联
    console.log("\n配置合约关联...");
    
    // 设置评价系统合约的订单合约地址
    await ratingSystem.setOrderContract(rideOrder.address);
    console.log("✓ RatingSystem 配置完成");
    
    // 添加支付合约和订单合约为用户注册合约的验证者
    await userRegistry.addVerifier(paymentEscrow.address);
    await userRegistry.addVerifier(rideOrder.address);
    await userRegistry.addVerifier(ratingSystem.address);
    console.log("✓ UserRegistry 验证者配置完成");
    
    // 设置初始订单ID（从环境变量读取，默认10000）
    const initialOrderId = parseInt(process.env.INITIAL_ORDER_ID || '10000');
    if (initialOrderId > 0) {
        try {
            const setInitialOrderIdTx = await rideOrder.setInitialOrderId(initialOrderId);
            await setInitialOrderIdTx.wait();
            console.log(`✓ TrustFlowRide 初始订单ID已设置为: ${initialOrderId}`);
        } catch (error) {
            console.warn(`⚠️  设置初始订单ID失败（可能已初始化）: ${error.message}`);
        }
    }
    
    // 7. 保存部署信息
    console.log("\n保存部署信息...");
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: deployedContracts,
        transactions: {
            userRegistry: userRegistry.deployTransaction.hash,
            ratingSystem: ratingSystem.deployTransaction.hash,
            rideOrder: rideOrder.deployTransaction.hash,
            paymentEscrow: paymentEscrow.deployTransaction.hash,
            disputeResolution: disputeResolution.deployTransaction.hash
        },
        configuration: {
            platformWallet: platformWallet,
            platformFeeRate: "5%",
            paymentCurrency: "ETH"
        }
    };
    
    // 保存到文件
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const filename = `${hre.network.name}-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(deploymentsDir, filename),
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    // 更新最新部署信息
    fs.writeFileSync(
        path.join(deploymentsDir, `${hre.network.name}-latest.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log(`✓ 部署信息已保存到: deployments/${filename}`);
    
    // 8. 生成ABI文件
    console.log("\n生成ABI文件...");
    const abiDir = path.join(__dirname, "../contracts/abi");
    if (!fs.existsSync(abiDir)) {
        fs.mkdirSync(abiDir, { recursive: true });
    }
    
    const artifacts = [
        "TrustFlowEscrow",
        "TrustFlowRide",
        "TrustFlowUserRegistry",
        "TrustFlowRating",
        "TrustFlowDispute"
    ];
    
    for (const contractName of artifacts) {
        const artifact = await hre.artifacts.readArtifact(contractName);
        fs.writeFileSync(
            path.join(abiDir, `${contractName}.json`),
            JSON.stringify(artifact.abi, null, 2)
        );
    }
    
    console.log("✓ ABI文件生成完成");
    
    // 9. 更新 .env 文件
    console.log("\n更新 .env 文件...");
    const envFile = path.join(__dirname, "../.env");
    const envTemplateFile = path.join(__dirname, "../ENV_TEMPLATE.txt");
    
    let envContent = '';
    
    // 如果 .env 文件存在，读取现有内容
    if (fs.existsSync(envFile)) {
        envContent = fs.readFileSync(envFile, 'utf8');
        console.log("✓ 读取现有 .env 文件");
    } else if (fs.existsSync(envTemplateFile)) {
        // 如果 .env 不存在但模板存在，从模板创建
        envContent = fs.readFileSync(envTemplateFile, 'utf8');
        console.log("✓ 从模板创建 .env 文件");
    } else {
        // 如果都不存在，创建基本模板
        envContent = `# 环境变量配置
# 自动生成于 ${new Date().toISOString()}

# ==================== 合约地址 ====================
PAYMENT_ESCROW_ADDRESS=
RIDE_ORDER_ADDRESS=
USER_REGISTRY_ADDRESS=
RATING_SYSTEM_ADDRESS=
DISPUTE_RESOLUTION_ADDRESS=

# ==================== 区块链配置 ====================
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=1337

# ==================== 服务端口配置 ====================
API_PORT=3000
WS_PORT=8080

# ==================== 业务配置 ====================
INITIAL_ORDER_ID=10000
`;
        console.log("✓ 创建新的 .env 文件");
    }
    
    // 更新或添加合约地址
    const contractVars = {
        'PAYMENT_ESCROW_ADDRESS': deployedContracts.paymentEscrow,
        'RIDE_ORDER_ADDRESS': deployedContracts.rideOrder,
        'USER_REGISTRY_ADDRESS': deployedContracts.userRegistry,
        'RATING_SYSTEM_ADDRESS': deployedContracts.ratingSystem,
        'DISPUTE_RESOLUTION_ADDRESS': deployedContracts.disputeResolution
    };
    
    // 如果是本地网络，也更新RPC_URL和CHAIN_ID
    if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
        contractVars['RPC_URL'] = 'http://127.0.0.1:8545';
        contractVars['CHAIN_ID'] = '1337';
    }
    
    let updated = false;
    let lines = envContent.split('\n');
    const updatedLines = [];
    const existingVars = new Set();
    
    // 处理现有行
    for (let line of lines) {
        let modified = false;
        for (const [varName, varValue] of Object.entries(contractVars)) {
            // 匹配变量定义（支持注释和空行）
            // 匹配格式: VAR_NAME=value 或 VAR_NAME=value # comment
            const regex = new RegExp(`^\\s*${varName}\\s*=\\s*.*$`);
            if (regex.test(line)) {
                // 保留行内注释（如果有）
                const commentMatch = line.match(/(\s+#.*)$/);
                const comment = commentMatch ? commentMatch[1] : '';
                updatedLines.push(`${varName}=${varValue}${comment}`);
                existingVars.add(varName);
                modified = true;
                updated = true;
                break;
            }
        }
        if (!modified) {
            updatedLines.push(line);
        }
    }
    
    // 添加缺失的变量
    for (const [varName, varValue] of Object.entries(contractVars)) {
        if (!existingVars.has(varName)) {
            // 找到合约地址部分的合适位置
            let insertIndex = updatedLines.length;
            let foundSection = false;
            
            // 查找合约地址部分
            for (let i = 0; i < updatedLines.length; i++) {
                const line = updatedLines[i];
                if (line.includes('合约地址') || line.includes('Contract Address')) {
                    foundSection = true;
                    // 找到这个部分的末尾（下一个空行或下一个注释块）
                    for (let j = i + 1; j < updatedLines.length; j++) {
                        const nextLine = updatedLines[j].trim();
                        // 如果遇到空行且下一行是注释或新部分，在这里插入
                        if (nextLine === '') {
                            if (j + 1 < updatedLines.length) {
                                const afterEmpty = updatedLines[j + 1].trim();
                                if (afterEmpty.startsWith('#') || afterEmpty === '') {
                                    insertIndex = j + 1;
                                    break;
                                }
                            }
                        } else if (nextLine.startsWith('#') && nextLine.includes('===')) {
                            // 遇到下一个主要部分
                            insertIndex = j;
                            break;
                        }
                    }
                    // 如果没找到合适位置，就在这个部分后面插入
                    if (insertIndex === updatedLines.length) {
                        for (let j = i + 1; j < updatedLines.length; j++) {
                            if (updatedLines[j].trim() === '' || 
                                (updatedLines[j].trim().startsWith('#') && updatedLines[j].includes('==='))) {
                                insertIndex = j;
                                break;
                            }
                        }
                    }
                    break;
                }
            }
            
            // 如果没找到合约地址部分，在文件末尾添加
            if (!foundSection) {
                // 查找区块链配置部分
                for (let i = 0; i < updatedLines.length; i++) {
                    if (updatedLines[i].includes('区块链配置') || updatedLines[i].includes('Blockchain')) {
                        insertIndex = i - 1; // 在这个部分之前插入
                        break;
                    }
                }
            }
            
            updatedLines.splice(insertIndex, 0, `${varName}=${varValue}`);
            updated = true;
        }
    }
    
    // 写回文件
    if (updated) {
        fs.writeFileSync(envFile, updatedLines.join('\n'), 'utf8');
        console.log("✓ .env 文件已更新");
    } else {
        console.log("✓ .env 文件已是最新（无需更新）");
    }
    
    // 10. 显示部署摘要
    console.log("\n" + "=".repeat(60));
    console.log("部署完成！");
    console.log("=".repeat(60));
    console.log("\n合约地址:");
    console.log("  TrustFlowEscrow:      ", deployedContracts.paymentEscrow);
    console.log("  TrustFlowRide:        ", deployedContracts.rideOrder);
    console.log("  TrustFlowUserRegistry:", deployedContracts.userRegistry);
    console.log("  TrustFlowRating:      ", deployedContracts.ratingSystem);
    console.log("  TrustFlowDispute:     ", deployedContracts.disputeResolution);
    
    if (updated) {
        console.log("\n✅ .env 文件已自动更新合约地址");
    } else {
        console.log("\n⚠️  .env 文件未更新（可能已包含这些地址）");
    }
    
    // 10. 如果是测试网或主网，提示验证合约
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\n验证合约（可选）:");
        console.log("npx hardhat verify --network", hre.network.name, deployedContracts.paymentEscrow, platformWallet);
        console.log("npx hardhat verify --network", hre.network.name, deployedContracts.rideOrder);
        console.log("npx hardhat verify --network", hre.network.name, deployedContracts.userRegistry);
        console.log("npx hardhat verify --network", hre.network.name, deployedContracts.ratingSystem);
        console.log("npx hardhat verify --network", hre.network.name, deployedContracts.disputeResolution);
    }
    
    console.log("\n" + "=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });








