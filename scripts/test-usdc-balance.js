/**
 * 测试 USDC 代币余额
 * 验证部署后账户是否已正确分配 USDC
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("测试 USDC 代币余额...\n");
    
    // 读取最新部署信息
    const deploymentFile = path.join(__dirname, "../deployments/localhost-latest.json");
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ 未找到部署信息文件，请先运行部署脚本");
        process.exit(1);
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const usdcTokenAddress = deploymentInfo.contracts.usdcToken;
    
    // 检查节点是否可用
    try {
        const provider = hre.ethers.provider;
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        console.log(`✓ 已连接到网络: ${network.name} (Chain ID: ${network.chainId})`);
        console.log(`✓ 当前区块高度: ${blockNumber}\n`);
    } catch (error) {
        console.error("❌ 无法连接到 Hardhat 节点");
        console.error("   请先运行: npm run node");
        console.error("   或者在另一个终端窗口运行: npx hardhat node");
        process.exit(1);
    }
    
    // 验证合约地址是否有代码
    const code = await hre.ethers.provider.getCode(usdcTokenAddress);
    if (code === '0x') {
        console.error(`❌ 合约地址 ${usdcTokenAddress} 没有部署代码`);
        console.error("   可能的原因：");
        console.error("   1. Hardhat 节点已重启，合约丢失（本地节点是内存节点）");
        console.error("   2. 请重新运行部署脚本: npm run deploy:local");
        process.exit(1);
    }
    console.log(`✓ 合约地址验证通过: ${usdcTokenAddress}\n`);
    
    console.log("USDC 代币地址:", usdcTokenAddress);
    console.log("平台钱包:", deploymentInfo.configuration.platformWallet);
    console.log("已分配账户数:", deploymentInfo.configuration.testAccountsFunded);
    console.log("每个账户 USDC 数量:", deploymentInfo.configuration.usdcPerAccount);
    console.log("\n" + "=".repeat(60) + "\n");
    
    // 获取 USDC 合约实例
    const USDCTestToken = await hre.ethers.getContractFactory("USDCTestToken");
    const usdcToken = USDCTestToken.attach(usdcTokenAddress);
    
    // 获取前 10 个账户
    const signers = await hre.ethers.getSigners();
    const testAccounts = signers.slice(0, 10);
    
    console.log("检查账户 USDC 余额:\n");
    
    let totalBalance = hre.ethers.BigNumber.from(0);
    
    for (let i = 0; i < testAccounts.length; i++) {
        const account = testAccounts[i];
        const balance = await usdcToken.balanceOf(account.address);
        
        // USDC 使用 6 位小数
        const balanceFormatted = hre.ethers.utils.formatUnits(balance, 6);
        
        console.log(`账户 #${i + 1} (${account.address.substring(0, 10)}...):`);
        console.log(`  余额: ${balanceFormatted} USDC`);
        console.log(`  原始值: ${balance.toString()}\n`);
        
        totalBalance = totalBalance.add(balance);
    }
    
    // 检查平台钱包余额
    const platformWallet = deploymentInfo.configuration.platformWallet;
    const platformBalance = await usdcToken.balanceOf(platformWallet);
    const platformBalanceFormatted = hre.ethers.utils.formatUnits(platformBalance, 6);
    
    console.log("平台钱包余额:");
    console.log(`  余额: ${platformBalanceFormatted} USDC`);
    console.log(`  原始值: ${platformBalance.toString()}\n`);
    
    // 检查总供应量
    const totalSupply = await usdcToken.totalSupply();
    const totalSupplyFormatted = hre.ethers.utils.formatUnits(totalSupply, 6);
    
    console.log("=".repeat(60));
    console.log("总供应量:", totalSupplyFormatted, "USDC");
    console.log("总分配量:", hre.ethers.utils.formatUnits(totalBalance.add(platformBalance), 6), "USDC");
    console.log("=".repeat(60));
    
    // 验证预期值
    // 注意：部署者账户（账户 #0）有初始供应量 + 分配的金额，其他账户只有分配的金额
    const expectedPerAccount = hre.ethers.utils.parseUnits(deploymentInfo.configuration.usdcPerAccount, 6);
    // 部署者账户不在测试账户列表中（因为测试账户从索引 1 开始）
    // 实际测试的账户总数是 testAccounts.length，每个应该有 expectedPerAccount
    const expectedTotalForTestAccounts = expectedPerAccount.mul(testAccounts.length);
    
    console.log("\n验证结果:");
    console.log(`  测试账户数: ${testAccounts.length}`);
    console.log(`  每个账户预期: ${hre.ethers.utils.formatUnits(expectedPerAccount, 6)} USDC`);
    console.log(`  测试账户总预期: ${hre.ethers.utils.formatUnits(expectedTotalForTestAccounts, 6)} USDC`);
    console.log(`  测试账户总实际: ${hre.ethers.utils.formatUnits(totalBalance, 6)} USDC`);
    
    // 注意：第一个账户（索引 1）实际上是账户 #1，应该只有分配的 100,000 USDC
    // 但如果部署者也在列表中，它会有初始供应量 + 分配金额
    // 我们只检查每个测试账户至少有分配的金额
    let allAccountsValid = true;
    for (let i = 0; i < testAccounts.length; i++) {
        const account = testAccounts[i];
        const balance = await usdcToken.balanceOf(account.address);
        const balanceFormatted = parseFloat(hre.ethers.utils.formatUnits(balance, 6));
        const expectedFormatted = parseFloat(hre.ethers.utils.formatUnits(expectedPerAccount, 6));
        
        // 账户至少应该有分配的金额（部署者可能更多，因为初始供应量）
        if (balanceFormatted < expectedFormatted) {
            console.log(`  ❌ 账户 #${i + 1} 余额不足: ${balanceFormatted} < ${expectedFormatted}`);
            allAccountsValid = false;
        }
    }
    
    if (allAccountsValid) {
        console.log("\n✓ 所有测试账户余额符合预期（至少达到分配金额）");
    } else {
        console.log("\n❌ 部分账户余额不足");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

