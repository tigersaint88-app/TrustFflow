/**
 * 检查账户余额
 * 用于验证 refresh 后账户余额是否正确
 */

const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("检查账户余额...\n");
    
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // 获取所有测试账户
    const accounts = await hre.ethers.getSigners();
    
    console.log("=".repeat(60));
    console.log("账户余额信息");
    console.log("=".repeat(60));
    
    for (let i = 0; i < Math.min(accounts.length, 5); i++) {
        const account = accounts[i];
        const balance = await provider.getBalance(account.address);
        const balanceEth = ethers.utils.formatEther(balance);
        
        const isPlatform = i === 0; // 第一个账户是部署者/平台钱包
        const label = isPlatform ? " (平台钱包/部署者)" : "";
        
        console.log(`\n账户 #${i}${label}:`);
        console.log(`  地址: ${account.address}`);
        console.log(`  余额: ${balanceEth} ETH`);
        
        if (isPlatform) {
            const expectedBalance = "10000.0";
            if (parseFloat(balanceEth) < parseFloat(expectedBalance)) {
                const diff = parseFloat(expectedBalance) - parseFloat(balanceEth);
                console.log(`  ⚠ 余额低于预期 (${expectedBalance} ETH)`);
                console.log(`  ℹ 已消耗: ${diff.toFixed(6)} ETH (可能是部署合约的 gas 费用)`);
            } else {
                console.log(`  ✓ 余额正常 (Hardhat 默认初始余额: 10000 ETH)`);
            }
        }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("说明:");
    console.log("=".repeat(60));
    console.log("1. Hardhat 节点默认每个账户的初始余额是 10000 ETH");
    console.log("2. 平台钱包地址 (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266) 是:");
    console.log("   - Hardhat 默认的第一个账户 (Account #0)");
    console.log("   - 部署者地址 (deployer)");
    console.log("   - 默认的平台钱包地址 (如果未设置 PLATFORM_WALLET_ADDRESS)");
    console.log("3. 当节点重启时，余额会恢复为 10000 ETH");
    console.log("4. 如果余额不是 10000 ETH，可能是因为:");
    console.log("   - 部署合约消耗了 gas");
    console.log("   - 执行了其他交易");
    console.log("   - 节点没有完全重启");
    console.log("\n要完全重置余额，需要:");
    console.log("  1. 完全停止 Hardhat 节点");
    console.log("  2. 重新启动节点 (npm run node)");
    console.log("  3. 所有账户余额会恢复为 10000 ETH");
    console.log("=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

