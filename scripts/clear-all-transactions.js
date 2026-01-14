/**
 * 清除所有交易记录和平台统计数据
 * 包括：
 * 1. 清除所有订单文件（backend/data/orders/*.json）
 * 2. 重置平台统计（totalTransactions, totalRevenue, totalPlatformFee, totalDisputes）
 */

const fs = require('fs').promises;
const path = require('path');

const dataDir = path.join(__dirname, '../backend/data');
const ordersDir = path.join(dataDir, 'orders');
const platformDir = path.join(dataDir, 'platform');
const summaryFile = path.join(platformDir, 'summary.json');

async function clearAllTransactions() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🗑️  开始清除所有交易记录和平台统计数据...');
    console.log('═══════════════════════════════════════════════════════');
    
    try {
        // 1. 清除所有订单文件
        console.log('\n📋 步骤 1: 清除所有订单文件...');
        try {
            const files = await fs.readdir(ordersDir);
            console.log(`   找到 ${files.length} 个订单文件`);
            
            for (const file of files) {
                if (file.startsWith('order-') && file.endsWith('.json')) {
                    const filePath = path.join(ordersDir, file);
                    await fs.unlink(filePath);
                    console.log(`   ✅ 已删除: ${file}`);
                }
            }
            
            console.log(`   ✅ 已清除 ${files.length} 个订单文件`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('   ⚠️  订单目录不存在，跳过');
            } else {
                throw error;
            }
        }
        
        // 2. 重置平台统计数据
        console.log('\n📊 步骤 2: 重置平台统计数据...');
        try {
            // 确保目录存在
            await fs.mkdir(platformDir, { recursive: true });
            
            // 重置统计数据
            const resetSummary = {
                totalTransactions: 0,
                totalRevenue: '0',
                totalPlatformFee: '0',
                totalDisputes: 0,
                resolvedDisputes: 0,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            
            await fs.writeFile(summaryFile, JSON.stringify(resetSummary, null, 2), 'utf8');
            console.log('   ✅ 平台统计数据已重置:');
            console.log(`      - totalTransactions: ${resetSummary.totalTransactions}`);
            console.log(`      - totalRevenue: ${resetSummary.totalRevenue} ETH`);
            console.log(`      - totalPlatformFee: ${resetSummary.totalPlatformFee} ETH`);
            console.log(`      - totalDisputes: ${resetSummary.totalDisputes}`);
            console.log(`      - resolvedDisputes: ${resetSummary.resolvedDisputes}`);
        } catch (error) {
            console.error('   ❌ 重置平台统计数据失败:', error);
            throw error;
        }
        
        // 3. 清除订单历史记录（如果存在）
        console.log('\n📜 步骤 3: 清除订单历史记录...');
        const orderHistoryFile = path.join(dataDir, 'order-history.json');
        try {
            await fs.unlink(orderHistoryFile);
            console.log('   ✅ 已删除订单历史记录文件');
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('   ⚠️  订单历史记录文件不存在，跳过');
            } else {
                throw error;
            }
        }
        
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ 所有交易记录和平台统计数据已清除！');
        console.log('═══════════════════════════════════════════════════════');
        console.log('\n💡 提示：');
        console.log('   - 订单文件已删除');
        console.log('   - 平台统计数据已重置为 0');
        console.log('   - 请重启后端服务以应用更改');
        console.log('   - 平台端刷新页面后，Total Transactions 将显示为 0');
        
    } catch (error) {
        console.error('\n❌ 清除交易记录失败:', error);
        process.exit(1);
    }
}

// 执行清除操作
clearAllTransactions();

