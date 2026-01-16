/**
 * 检查平台钱包的实际转账情况
 * 查看交易收据中的内部转账
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("=".repeat(60));
    console.log("检查平台钱包的实际转账情况");
    console.log("=".repeat(60));
    console.log();

    // 1. 加载部署信息
    const networkName = hre.network.name === 'hardhat' ? 'localhost' : hre.network.name;
    const deploymentFile = path.join(__dirname, `../deployments/${networkName}-latest.json`);
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ 未找到部署信息文件");
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const platformWallet = deployment.configuration?.platformWallet;
    const rideOrderAddress = deployment.contracts?.rideOrder;

    if (!platformWallet || !rideOrderAddress) {
        console.error("❌ 部署信息不完整");
        process.exit(1);
    }

    console.log("📋 平台钱包地址:", platformWallet);
    console.log("📋 合约地址:", rideOrderAddress);
    console.log();

    const provider = new hre.ethers.providers.JsonRpcProvider(
        hre.network.config.url || "http://127.0.0.1:8545"
    );

    try {
        // 2. 查询 PaymentReleased 事件
        const contractArtifact = await hre.artifacts.readArtifact("TrustFlowRide");
        const rideOrderContract = new hre.ethers.Contract(
            rideOrderAddress,
            contractArtifact.abi,
            provider
        );

        const filter = rideOrderContract.filters.PaymentReleased();
        const events = await rideOrderContract.queryFilter(filter, 0, 'latest');

        console.log(`找到 ${events.length} 笔 PaymentReleased 事件\n`);

        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const orderId = event.args.orderId.toString();
            const driver = event.args.driver;
            const driverAmount = event.args.driverAmount;
            const platformFee = event.args.platformFee;

            console.log("=".repeat(60));
            console.log(`订单 #${orderId}`);
            console.log("=".repeat(60));

            // 获取交易收据
            const receipt = await provider.getTransactionReceipt(event.transactionHash);
            const tx = await provider.getTransaction(event.transactionHash);
            const block = await provider.getBlock(receipt.blockNumber);

            console.log("交易信息:");
            console.log("  交易哈希:", event.transactionHash);
            console.log("  区块号:", receipt.blockNumber);
            console.log("  时间:", new Date(block.timestamp * 1000).toLocaleString());
            console.log();

            console.log("转账详情:");
            console.log("  订单总额:", hre.ethers.utils.formatEther(driverAmount.add(platformFee)), "ETH");
            console.log("  司机收到:", hre.ethers.utils.formatEther(driverAmount), "ETH");
            console.log("  平台费:", hre.ethers.utils.formatEther(platformFee), "ETH");
            console.log();

            // 检查交易中的 value（直接转账）
            console.log("交易 value:", hre.ethers.utils.formatEther(tx.value), "ETH");
            console.log("   (这是发送给合约的金额，应该为 0，因为这是 completeOrder 调用)");
            console.log();

            // 检查交易是否成功
            if (receipt.status === 0) {
                console.log("❌ 交易失败！");
            } else {
                console.log("✅ 交易成功");
            }
            console.log();

            // 检查日志中的转账信息
            console.log("交易日志:");
            console.log(`  日志数量: ${receipt.logs.length}`);
            
            // 查找转账日志（Transfer 事件）
            const transferEvents = receipt.logs.filter(log => {
                // 检查是否是从合约到平台钱包的转账
                try {
                    // 简单检查：如果日志的主题包含平台钱包地址
                    return log.topics.some(topic => 
                        topic.toLowerCase().includes(platformWallet.toLowerCase().slice(2))
                    );
                } catch (e) {
                    return false;
                }
            });

            if (transferEvents.length > 0) {
                console.log(`  找到 ${transferEvents.length} 条相关日志`);
                transferEvents.forEach((log, idx) => {
                    console.log(`  [${idx + 1}] 地址: ${log.address}`);
                    console.log(`      Topics: ${log.topics.length}`);
                });
            }
            console.log();

            // 检查平台钱包在交易前后的余额变化
            // 需要获取交易前后区块的余额
            const blockBefore = receipt.blockNumber - 1;
            const blockAfter = receipt.blockNumber;

            try {
                // 查询交易执行前后的余额变化
                const blockBefore = receipt.blockNumber - 1;
                const blockAfter = receipt.blockNumber;
                
                // 查询交易执行前的余额（查询前一个区块的状态）
                let balanceBefore = hre.ethers.BigNumber.from(0);
                try {
                    // 尝试通过 provider.getBalance 在特定区块查询
                    // 注意：某些 provider 可能不支持 blockTag 参数，使用 try-catch
                    balanceBefore = await provider.getBalance(platformWallet, blockBefore);
                } catch (e) {
                    // 如果不支持，尝试其他方法
                    try {
                        const block = await provider.getBlock(blockBefore);
                        // 通过状态查询可能不可行，使用当前余额减去本次平台费来估算
                        balanceBefore = hre.ethers.BigNumber.from(0); // 标记为未知
                    } catch (e2) {
                        balanceBefore = hre.ethers.BigNumber.from(0);
                    }
                }
                
                // 查询交易执行后的余额
                const balanceAfter = await provider.getBalance(platformWallet, blockAfter);
                const balanceChange = balanceAfter.sub(balanceBefore);
                
                console.log("平台钱包余额变化:");
                if (balanceBefore.gt(0) || balanceBefore.eq(0)) {
                    try {
                        const block = await provider.getBlock(blockBefore);
                        console.log("  交易前余额（区块 #" + blockBefore + "）:", 
                            hre.ethers.utils.formatEther(balanceBefore), "ETH");
                    } catch (e) {
                        console.log("  交易前余额: 无法查询");
                    }
                } else {
                    console.log("  交易前余额: 无法准确查询");
                }
                console.log("  交易后余额（区块 #" + blockAfter + "）:", 
                    hre.ethers.utils.formatEther(balanceAfter), "ETH");
                
                if (balanceChange.gte(0)) {
                    console.log("  余额变化:", 
                        hre.ethers.utils.formatEther(balanceChange), "ETH");
                    
                    // 验证余额变化是否匹配平台费
                    const feeDifference = balanceChange.sub(platformFee).abs();
                    const tolerance = hre.ethers.utils.parseEther("0.0000001"); // 允许微小误差
                    
                    if (feeDifference.lt(tolerance)) {
                        console.log("  ✅ 余额变化与平台费匹配！平台费已成功到账");
                    } else {
                        console.log("  ⚠️  余额变化与平台费不完全匹配");
                        console.log("     差异:", hre.ethers.utils.formatEther(feeDifference), "ETH");
                        console.log("     (可能由于其他交易或初始余额较大导致)");
                    }
                }
                console.log();
            } catch (error) {
                console.log("  ⚠️  无法查询余额变化:", error.message);
                console.log();
            }

            // 检查平台钱包在交易日志中是否作为接收者
            console.log("转账验证:");
            console.log("  合约地址:", rideOrderAddress);
            console.log("  平台钱包地址:", platformWallet);
            console.log("  事件中的平台费:", hre.ethers.utils.formatEther(platformFee), "ETH");
            console.log();
        }

        // 3. 查询平台钱包的当前余额和历史余额变化
        console.log("=".repeat(60));
        console.log("平台钱包余额验证");
        console.log("=".repeat(60));
        
        const currentBalance = await provider.getBalance(platformWallet);
        const expectedFees = events.reduce((sum, e) => 
            sum.add(e.args.platformFee), 
            hre.ethers.BigNumber.from(0)
        );
        
        console.log("当前余额:", hre.ethers.utils.formatEther(currentBalance), "ETH");
        console.log("预期收到的平台费总额:", hre.ethers.utils.formatEther(expectedFees), "ETH");
        console.log();

        // 检查合约余额
        const contractBalance = await provider.getBalance(rideOrderAddress);
        console.log("合约当前余额:", hre.ethers.utils.formatEther(contractBalance), "ETH");
        console.log();

        console.log("=".repeat(60));
        console.log("关于 MetaMask 不显示 Activity 的原因");
        console.log("=".repeat(60));
        console.log();
        console.log("MetaMask 通常只显示:");
        console.log("  1. 从该地址发送的交易（作为 from）");
        console.log("  2. 直接接收的 ETH 转账（value > 0）");
        console.log();
        console.log("平台费是通过合约内部转账的:");
        console.log("  - 交易调用: completeOrder()");
        console.log("  - 合约内部执行: payable(platformWallet).call{value: platformFee}()");
        console.log("  - 这是内部交易（internal transaction），不是外部交易");
        console.log();
        console.log("验证平台费是否到账的方法:");
        console.log("  1. 运行此脚本查看事件记录");
        console.log("  2. 对比平台钱包的余额变化");
        console.log("  3. 使用区块浏览器查看内部交易（Etherscan 等）");
        console.log("  4. 查看交易收据中的日志");
        console.log();

    } catch (error) {
        console.error("❌ 查询失败:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

