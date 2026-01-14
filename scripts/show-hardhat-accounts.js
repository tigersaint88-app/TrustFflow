/**
 * 显示 Hardhat 测试账户
 * 显示所有默认测试账户的地址和私钥，用于导入到 MetaMask
 */

const hre = require("hardhat");

async function main() {
    console.log("=".repeat(80));
    console.log("Hardhat 测试账户信息");
    console.log("=".repeat(80));
    console.log("\n提示: 这些账户可以导入到 MetaMask 钱包进行测试\n");
    
    // 获取所有签名者（Hardhat 默认提供20个账户）
    const signers = await hre.ethers.getSigners();
    
    console.log(`共找到 ${signers.length} 个测试账户:\n`);
    
    // 显示每个账户的信息
    for (let i = 0; i < signers.length; i++) {
        const signer = signers[i];
        const address = signer.address;
        
        // 获取账户余额
        const balance = await signer.getBalance();
        const balanceEth = hre.ethers.utils.formatEther(balance);
        
        // 获取私钥（Hardhat 会提供私钥）
        // 注意：Hardhat 默认账户的私钥是预定义的
        // 我们可以通过 provider 获取，但在某些情况下可能需要从配置中获取
        
        console.log(`[账户 ${i + 1}]`);
        console.log(`  地址 (Address):    ${address}`);
        console.log(`  余额 (Balance):    ${parseFloat(balanceEth).toFixed(4)} ETH`);
        
        // 尝试从 provider 获取私钥
        // 注意：在某些版本的 Hardhat 中，我们需要从账户对象中获取私钥
        try {
            // Hardhat 默认账户的私钥是固定的，我们可以从网络配置中获取
            // 或者使用钱包对象的内部属性
            if (signer._signingKey && signer._signingKey.privateKey) {
                const privateKey = signer._signingKey.privateKey;
                console.log(`  私钥 (Private Key): ${privateKey}`);
            } else if (signer.privateKey) {
                console.log(`  私钥 (Private Key): ${signer.privateKey}`);
            } else {
                // 如果无法直接获取，显示已知的 Hardhat 默认私钥模式
                // Hardhat 使用固定的测试账户，私钥可以通过账户索引计算
                console.log(`  私钥 (Private Key): 使用 Hardhat 默认测试账户 (索引 ${i})`);
            }
        } catch (error) {
            console.log(`  私钥 (Private Key): 无法直接获取`);
        }
        
        console.log("");
    }
    
    // 显示 Hardhat 默认账户的私钥模式说明
    console.log("=".repeat(80));
    console.log("Hardhat 默认测试账户私钥说明:");
    console.log("=".repeat(80));
    console.log("\nHardhat 使用预定义的测试账户。每个账户都有固定的私钥。");
    console.log("这些私钥是公开的，仅用于开发和测试，不要用于主网！\n");
    console.log("如果需要获取完整的私钥信息，可以:");
    console.log("1. 查看 Hardhat 文档中的默认账户列表");
    console.log("2. 使用以下命令导出账户信息:\n");
    console.log("   node -e \"");
    console.log("     const { ethers } = require('hardhat');");
    console.log("     (async () => {");
    console.log("       const signers = await ethers.getSigners();");
    console.log("       for (let i = 0; i < signers.length; i++) {");
    console.log("         const signer = signers[i];");
    console.log("         const privateKey = signer._signingKey.privateKey;");
    console.log("         console.log(`Account \${i}: \${signer.address} -> \${privateKey}`);");
    console.log("       }");
    console.log("     })();\"\n");
    
    // 尝试另一种方法获取私钥
    console.log("\n尝试获取私钥信息...\n");
    
    const accountsInfo = [];
    for (let i = 0; i < signers.length; i++) {
        const signer = signers[i];
        try {
            // 使用反射或其他方法获取私钥
            const wallet = await hre.ethers.Wallet.fromMnemonic(
                "test test test test test test test test test test test junk",
                `m/44'/60'/0'/0/${i}`
            );
            accountsInfo.push({
                index: i,
                address: signer.address,
                privateKey: wallet.privateKey,
                balance: await signer.getBalance()
            });
        } catch (error) {
            // 如果上述方法失败，尝试其他方法
            try {
                // 直接从 signer 获取
                if (signer._signingKey) {
                    accountsInfo.push({
                        index: i,
                        address: signer.address,
                        privateKey: signer._signingKey.privateKey,
                        balance: await signer.getBalance()
                    });
                }
            } catch (e) {
                console.error(`无法获取账户 ${i} 的私钥:`, e.message);
            }
        }
    }
    
    if (accountsInfo.length > 0) {
        console.log("\n" + "=".repeat(80));
        console.log("账户详情 (可用于导入 MetaMask):");
        console.log("=".repeat(80) + "\n");
        
        accountsInfo.forEach((acc, idx) => {
            console.log(`账户 #${acc.index + 1}:`);
            console.log(`  地址:     ${acc.address}`);
            console.log(`  私钥:     ${acc.privateKey}`);
            console.log(`  余额:     ${hre.ethers.utils.formatEther(acc.balance)} ETH`);
            console.log("");
        });
        
        console.log("\n导入 MetaMask 步骤:");
        console.log("1. 打开 MetaMask 扩展");
        console.log("2. 点击账户图标 -> '导入账户'");
        console.log("3. 选择 '私钥' 选项");
        console.log("4. 粘贴上述私钥");
        console.log("5. 点击 '导入'\n");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

