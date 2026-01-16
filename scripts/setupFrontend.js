/**
 * 前端配置脚本
 * 自动从部署信息中提取合约地址并配置前端环境
 */

const fs = require('fs');
const path = require('path');

async function main() {
    console.log("配置前端环境...");
    
    // 读取部署信息
    const deploymentFile = path.join(__dirname, '../deployments/localhost-latest.json');
    
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ 未找到部署信息，请先运行部署脚本:");
        console.error("   npm run deploy:local");
        process.exit(1);
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    console.log("\n✓ 找到部署信息:");
    console.log("  网络:", deployment.network);
    console.log("  部署者:", deployment.deployer);
    
    // 创建前端环境变量文件
    const frontendEnvPath = path.join(__dirname, '../frontend/passenger-app/.env');
    const frontendEnvContent = `# TrustFlow 前端环境变量
# 自动生成于: ${new Date().toISOString()}

# 合约地址
REACT_APP_PAYMENT_ESCROW_ADDRESS=${deployment.contracts.paymentEscrow}
REACT_APP_RIDE_ORDER_ADDRESS=${deployment.contracts.rideOrder}
REACT_APP_USER_REGISTRY_ADDRESS=${deployment.contracts.userRegistry}
REACT_APP_RATING_SYSTEM_ADDRESS=${deployment.contracts.ratingSystem}
REACT_APP_DISPUTE_RESOLUTION_ADDRESS=${deployment.contracts.disputeResolution}

# API配置
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:8080

# 网络配置
REACT_APP_NETWORK=localhost
REACT_APP_CHAIN_ID=1337
REACT_APP_RPC_URL=http://localhost:8545
`;
    
    // 确保目录存在
    const frontendDir = path.dirname(frontendEnvPath);
    if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
    }
    
    fs.writeFileSync(frontendEnvPath, frontendEnvContent);
    console.log("\n✓ 前端环境变量已生成:", frontendEnvPath);
    
    // 创建本地存储配置文件（用于HTML页面）
    const configJsPath = path.join(__dirname, '../frontend/passenger-app/config.js');
    const configJsContent = `// 合约地址配置（自动生成）
// 更新时间: ${new Date().toISOString()}

const CONTRACT_ADDRESSES = {
    rideOrder: "${deployment.contracts.rideOrder}",
    paymentEscrow: "${deployment.contracts.paymentEscrow}",
    userRegistry: "${deployment.contracts.userRegistry}",
    ratingSystem: "${deployment.contracts.ratingSystem}",
    disputeResolution: "${deployment.contracts.disputeResolution}"
};

// 保存到localStorage（用于HTML页面）
if (typeof localStorage !== 'undefined') {
    localStorage.setItem('RIDE_ORDER_ADDRESS', CONTRACT_ADDRESSES.rideOrder);
    localStorage.setItem('PAYMENT_ESCROW_ADDRESS', CONTRACT_ADDRESSES.paymentEscrow);
    localStorage.setItem('USER_REGISTRY_ADDRESS', CONTRACT_ADDRESSES.userRegistry);
    localStorage.setItem('RATING_SYSTEM_ADDRESS', CONTRACT_ADDRESSES.ratingSystem);
    localStorage.setItem('DISPUTE_RESOLUTION_ADDRESS', CONTRACT_ADDRESSES.disputeResolution);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONTRACT_ADDRESSES;
}
`;
    
    fs.writeFileSync(configJsPath, configJsContent);
    console.log("✓ 配置文件已生成:", configJsPath);
    
    console.log("\n" + "=".repeat(60));
    console.log("前端配置完成！");
    console.log("=".repeat(60));
    console.log("\n合约地址:");
    console.log("  TrustFlowRide:", deployment.contracts.rideOrder);
    console.log("  TrustFlowEscrow:", deployment.contracts.paymentEscrow);
    console.log("  TrustFlowUserRegistry:", deployment.contracts.userRegistry);
    console.log("  TrustFlowRating:", deployment.contracts.ratingSystem);
    console.log("  TrustFlowDispute:", deployment.contracts.disputeResolution);
    console.log("\n下一步:");
    console.log("  1. 在浏览器中打开: frontend/passenger-app/index.html");
    console.log("  2. 或启动React应用: cd frontend/passenger-app && npm start");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

