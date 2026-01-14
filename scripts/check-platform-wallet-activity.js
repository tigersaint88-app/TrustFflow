/**
 * 查询平台钱包地址的交易活动
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("=".repeat(60));
    console.log("查询平台钱包地址的交易活动");
    console.log("=".repeat(60));
    console.log();

    // 1. 加载部署信息
    const deploymentFile = path.join(__dirname, `../deployments/${hre.network.name}-latest.json`);
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ 未找到部署信息文件:", deploymentFile);
        console.error("   请先运行部署脚本: npm run deploy:local");
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const platformWallet = deployment.configuration?.platformWallet;

    if (!platformWallet) {
        console.error("❌ 部署信息中未找到平台钱包地址");
        process.exit(1);
    }

    console.log("📋 平台钱包地址:", platformWallet);
    console.log("🌐 网络:", hre.network.name);
    console.log();

    // 2. 连接到网络
    const provider = new hre.ethers.providers.JsonRpcProvider(
        hre.network.config.url || "http://127.0.0.1:8545"
    );

    try {
        // 3. 查询账户余额
        const balance = await provider.getBalance(platformWallet);
        console.log("💰 当前余额:", hre.ethers.utils.formatEther(balance), "ETH");
        console.log();

        // 4. 获取当前区块号
        const currentBlock = await provider.getBlockNumber();
        console.log("📦 当前区块高度:", currentBlock);
        console.log();

        // 5. 通过合约事件查询平台费转账（更准确的方法）
        let platformFees = [];
        if (deployment.contracts.rideOrder) {
            try {
                console.log("🔍 查询 PaymentReleased 事件（平台费记录）...");
                
                // 加载合约 ABI
                const contractArtifact = await hre.artifacts.readArtifact("TrustFlowRide");
                const rideOrderContract = new hre.ethers.Contract(
                    deployment.contracts.rideOrder,
                    contractArtifact.abi,
                    provider
                );

                // 查询 PaymentReleased 事件
                // 事件定义: PaymentReleased(uint256 indexed orderId, address indexed driver, uint256 driverAmount, uint256 platformFee)
                const filter = rideOrderContract.filters.PaymentReleased();
                const events = await rideOrderContract.queryFilter(filter, 0, currentBlock);

                for (const event of events) {
                    const orderId = event.args.orderId.toString();
                    const driver = event.args.driver;
                    const driverAmount = event.args.driverAmount;
                    const platformFee = event.args.platformFee;
                    
                    // 获取交易收据以获取区块信息
                    const receipt = await provider.getTransactionReceipt(event.transactionHash);
                    const block = await provider.getBlock(receipt.blockNumber);

                    platformFees.push({
                        orderId,
                        driver,
                        driverAmount,
                        platformFee,
                        transactionHash: event.transactionHash,
                        blockNumber: receipt.blockNumber,
                        timestamp: block.timestamp
                    });
                }

                console.log(`   找到 ${platformFees.length} 笔平台费转账记录`);
                console.log();
            } catch (error) {
                console.log("   ⚠️  无法查询合约事件:", error.message);
                console.log();
            }
        }

        // 5. 查询最近的交易（从当前区块往前查询）
        console.log("🔍 查询交易历史...");
        console.log("   (注意: 本地节点可能不保留完整的交易历史)");
        console.log();

        const searchBlocks = Math.min(1000, currentBlock); // 最多查询最近1000个区块
        let transactionCount = 0;
        let receivedTransactions = [];
        let sentTransactions = [];

        // 查询接收交易（作为 to 地址）
        for (let i = currentBlock; i >= Math.max(0, currentBlock - searchBlocks); i--) {
            try {
                const block = await provider.getBlockWithTransactions(i);
                
                for (const tx of block.transactions) {
                    // 检查是否与平台钱包相关
                    if (tx.to && tx.to.toLowerCase() === platformWallet.toLowerCase()) {
                        // 接收交易
                        receivedTransactions.push({
                            hash: tx.hash,
                            from: tx.from,
                            value: tx.value,
                            blockNumber: tx.blockNumber,
                            timestamp: block.timestamp
                        });
                        transactionCount++;
                    } else if (tx.from && tx.from.toLowerCase() === platformWallet.toLowerCase()) {
                        // 发送交易
                        sentTransactions.push({
                            hash: tx.hash,
                            to: tx.to,
                            value: tx.value,
                            blockNumber: tx.blockNumber,
                            timestamp: block.timestamp
                        });
                        transactionCount++;
                    }
                }

                // 每查询100个区块显示进度
                if ((currentBlock - i) % 100 === 0 && i < currentBlock) {
                    process.stdout.write(`\r   已查询 ${currentBlock - i} 个区块，找到 ${transactionCount} 笔交易...`);
                }
            } catch (error) {
                // 忽略单个区块查询错误，继续查询
                continue;
            }
        }
        console.log();
        console.log();

        // 6. 显示交易统计
        console.log("📊 交易统计:");
        console.log("   - 接收交易:", receivedTransactions.length, "笔");
        console.log("   - 发送交易:", sentTransactions.length, "笔");
        console.log("   - 总计:", transactionCount, "笔");
        console.log();

        // 7. 显示平台费转账记录（通过事件查询）
        if (platformFees.length > 0) {
            console.log("=".repeat(60));
            console.log("💰 平台费收入记录 (通过 PaymentReleased 事件)");
            console.log("=".repeat(60));
            
            // 按时间排序（最新的在前）
            platformFees.sort((a, b) => b.blockNumber - a.blockNumber);
            const recentFees = platformFees.slice(0, 50); // 显示最近50笔

            let totalPlatformFees = hre.ethers.BigNumber.from(0);
            
            for (let i = 0; i < recentFees.length; i++) {
                const fee = recentFees[i];
                const date = new Date(fee.timestamp * 1000);
                const platformFeeETH = hre.ethers.utils.formatEther(fee.platformFee);
                const driverAmountETH = hre.ethers.utils.formatEther(fee.driverAmount);
                const orderAmount = fee.driverAmount.add(fee.platformFee);
                const orderAmountETH = hre.ethers.utils.formatEther(orderAmount);
                
                totalPlatformFees = totalPlatformFees.add(fee.platformFee);
                
                console.log(`\n[${i + 1}] 订单 #${fee.orderId}`);
                console.log(`    区块 #${fee.blockNumber}`);
                console.log(`    交易哈希: ${fee.transactionHash}`);
                console.log(`    订单总额: ${orderAmountETH} ETH`);
                console.log(`    司机收到: ${driverAmountETH} ETH (95%)`);
                console.log(`    平台费: ${platformFeeETH} ETH (5%)`);
                console.log(`    司机地址: ${fee.driver}`);
                console.log(`    时间: ${date.toLocaleString()}`);
            }

            console.log();
            console.log("=".repeat(60));
            console.log("📊 平台费统计");
            console.log("=".repeat(60));
            console.log(`   平台费交易数: ${platformFees.length} 笔`);
            console.log(`   平台费总额: ${hre.ethers.utils.formatEther(totalPlatformFees)} ETH`);
            console.log();
        } else {
            console.log("ℹ️  未找到平台费转账记录");
            console.log("   (可能还没有完成任何订单)");
            console.log();
        }

        // 8. 显示接收交易（直接转账到平台钱包）
        if (receivedTransactions.length > 0) {
            console.log("=".repeat(60));
            console.log("📥 直接接收交易 (最近 20 笔)");
            console.log("=".repeat(60));
            
            // 按时间排序（最新的在前）
            receivedTransactions.sort((a, b) => b.blockNumber - a.blockNumber);
            const recentReceived = receivedTransactions.slice(0, 20);

            for (let i = 0; i < recentReceived.length; i++) {
                const tx = recentReceived[i];
                const date = new Date(tx.timestamp * 1000);
                const valueETH = hre.ethers.utils.formatEther(tx.value);
                
                console.log(`\n[${i + 1}] 区块 #${tx.blockNumber}`);
                console.log(`    交易哈希: ${tx.hash}`);
                console.log(`    来自: ${tx.from}`);
                console.log(`    金额: ${valueETH} ETH`);
                console.log(`    时间: ${date.toLocaleString()}`);
            }
            console.log();
        }

        // 9. 显示发送交易
        if (sentTransactions.length > 0) {
            console.log("=".repeat(60));
            console.log("📤 发送交易 (最近 10 笔)");
            console.log("=".repeat(60));
            
            // 按时间排序（最新的在前）
            sentTransactions.sort((a, b) => b.blockNumber - a.blockNumber);
            const recentSent = sentTransactions.slice(0, 10);

            for (let i = 0; i < recentSent.length; i++) {
                const tx = recentSent[i];
                const date = new Date(tx.timestamp * 1000);
                const valueETH = hre.ethers.utils.formatEther(tx.value);
                
                console.log(`\n[${i + 1}] 区块 #${tx.blockNumber}`);
                console.log(`    交易哈希: ${tx.hash}`);
                console.log(`    发送到: ${tx.to || "合约创建"}`);
                console.log(`    金额: ${valueETH} ETH`);
                console.log(`    时间: ${date.toLocaleString()}`);
            }
        } else {
            console.log("ℹ️  未找到发送交易");
        }

        // 10. 计算总收入和总支出
        const totalReceived = receivedTransactions.reduce(
            (sum, tx) => sum.add(tx.value), 
            hre.ethers.BigNumber.from(0)
        );
        const totalSent = sentTransactions.reduce(
            (sum, tx) => sum.add(tx.value), 
            hre.ethers.BigNumber.from(0)
        );
        const netIncome = totalReceived.sub(totalSent);

        console.log();
        console.log("=".repeat(60));
        console.log("📈 财务摘要");
        console.log("=".repeat(60));
        console.log("   总收入:", hre.ethers.utils.formatEther(totalReceived), "ETH");
        console.log("   总支出:", hre.ethers.utils.formatEther(totalSent), "ETH");
        console.log("   净收入:", hre.ethers.utils.formatEther(netIncome), "ETH");
        console.log("   当前余额:", hre.ethers.utils.formatEther(balance), "ETH");
        console.log();

    } catch (error) {
        console.error("❌ 查询失败:", error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error("   无法连接到 Hardhat 节点，请确保节点正在运行:");
            console.error("   npm run node");
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

