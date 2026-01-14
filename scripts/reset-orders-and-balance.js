/**
 * 重置脚本：删除所有订单记录并恢复Hardhat账户余额
 * 
 * 功能：
 * 1. 删除所有订单文件（backend/data/orders/order-*.json）
 * 2. 重置订单配置文件（backend/data/order-config.json）
 * 3. 恢复Hardhat账户余额（通过重启节点或使用hardhat的impersonate功能）
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// 配置路径
const DATA_DIR = path.join(__dirname, '../backend/data');
const ORDERS_DIR = path.join(DATA_DIR, 'orders');
const ORDER_CONFIG_FILE = path.join(DATA_DIR, 'order-config.json');
const ORDER_HISTORY_FILE = path.join(DATA_DIR, 'order-history.json');

// 从环境变量或默认值获取初始订单ID
const INITIAL_ORDER_ID = parseInt(process.env.INITIAL_ORDER_ID || '10000');

/**
 * 删除所有订单文件
 */
async function deleteAllOrders() {
    console.log('\n[1/4] 删除所有订单记录...');
    
    try {
        // 确保订单目录存在
        await fs.mkdir(ORDERS_DIR, { recursive: true });
        
        // 读取目录中的所有文件
        const files = await fs.readdir(ORDERS_DIR);
        
        // 过滤出订单文件（格式：order-{orderId}.json）
        const orderFiles = files.filter(file => file.startsWith('order-') && file.endsWith('.json'));
        
        if (orderFiles.length === 0) {
            console.log('  ✓ 没有找到订单文件');
            return 0;
        }
        
        // 删除所有订单文件
        let deletedCount = 0;
        for (const file of orderFiles) {
            try {
                const filePath = path.join(ORDERS_DIR, file);
                await fs.unlink(filePath);
                deletedCount++;
            } catch (error) {
                console.error(`  ✗ 删除文件失败: ${file}`, error.message);
            }
        }
        
        console.log(`  ✓ 已删除 ${deletedCount} 个订单文件`);
        return deletedCount;
    } catch (error) {
        console.error('  ✗ 删除订单文件失败:', error.message);
        throw error;
    }
}

/**
 * 重置订单配置文件
 */
async function resetOrderConfig() {
    console.log('\n[2/4] 重置订单配置文件...');
    
    try {
        const config = {
            nextOrderId: INITIAL_ORDER_ID,
            lastUpdated: Date.now()
        };
        
        await fs.writeFile(ORDER_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        console.log(`  ✓ 订单配置文件已重置: nextOrderId = ${INITIAL_ORDER_ID}`);
    } catch (error) {
        console.error('  ✗ 重置订单配置文件失败:', error.message);
        throw error;
    }
}

/**
 * 重置订单历史文件
 */
async function resetOrderHistory() {
    console.log('\n[2.5/4] 重置订单历史文件...');
    
    try {
        const history = {};
        await fs.writeFile(ORDER_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
        console.log('  ✓ 订单历史文件已重置');
    } catch (error) {
        console.error('  ✗ 重置订单历史文件失败:', error.message);
        // 不抛出错误，因为历史文件可能不存在
    }
}

/**
 * 检查Hardhat节点是否运行
 */
function isHardhatNodeRunning() {
    try {
        // Windows: 检查端口8545是否被占用
        if (process.platform === 'win32') {
            const result = execSync('netstat -aon | findstr :8545 | findstr LISTENING', { encoding: 'utf8', stdio: 'pipe' });
            return result.trim().length > 0;
        } else {
            // Linux/Mac: 使用lsof或netstat
            try {
                execSync('lsof -i :8545', { encoding: 'utf8', stdio: 'pipe' });
                return true;
            } catch {
                return false;
            }
        }
    } catch {
        return false;
    }
}

/**
 * 停止Hardhat节点
 */
function stopHardhatNode() {
    console.log('\n[3/4] 停止Hardhat节点...');
    
    if (!isHardhatNodeRunning()) {
        console.log('  ✓ Hardhat节点未运行');
        return;
    }
    
    try {
        if (process.platform === 'win32') {
            // Windows: 查找并终止占用8545端口的进程
            const result = execSync('netstat -aon | findstr :8545 | findstr LISTENING', { encoding: 'utf8' });
            const lines = result.trim().split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid) {
                    try {
                        execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
                        console.log(`  ✓ 已停止进程 PID: ${pid}`);
                    } catch (error) {
                        console.warn(`  ⚠ 无法停止进程 PID: ${pid}`);
                    }
                }
            }
        } else {
            // Linux/Mac: 使用kill命令
            try {
                execSync('pkill -f "hardhat node"', { stdio: 'pipe' });
                console.log('  ✓ 已停止Hardhat节点');
            } catch (error) {
                console.warn('  ⚠ 无法停止Hardhat节点，可能需要手动停止');
            }
        }
        
        // 等待端口释放
        console.log('  等待端口释放...');
        return new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
        console.error('  ✗ 停止Hardhat节点失败:', error.message);
        console.log('  请手动停止Hardhat节点（Ctrl+C）');
    }
}

/**
 * 启动Hardhat节点
 */
function startHardhatNode() {
    console.log('\n[4/4] 启动Hardhat节点（恢复账户余额）...');
    
    if (isHardhatNodeRunning()) {
        console.log('  ✓ Hardhat节点已在运行');
        console.log('  提示: 重启节点会自动恢复所有账户的初始余额（每个账户10000 ETH）');
        return;
    }
    
    try {
        if (process.platform === 'win32') {
            // Windows: 在新窗口中启动
            execSync('start "Hardhat Node" cmd /k "npm run node"', { stdio: 'pipe' });
        } else {
            // Linux/Mac: 在后台启动
            execSync('npm run node &', { stdio: 'pipe' });
        }
        
        console.log('  ✓ Hardhat节点启动命令已执行');
        console.log('  等待节点启动...');
        
        // 等待节点启动
        return new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
        console.error('  ✗ 启动Hardhat节点失败:', error.message);
        console.log('  请手动运行: npm run node');
    }
}

/**
 * 验证节点状态
 */
async function verifyNodeStatus() {
    console.log('\n验证节点状态...');
    
    try {
        const { ethers } = require('ethers');
        const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        
        // 获取账户0的余额
        const signer = provider.getSigner(0);
        const balance = await signer.getBalance();
        const address = await signer.getAddress();
        
        console.log(`  ✓ 节点运行正常`);
        console.log(`  ✓ 账户0地址: ${address}`);
        console.log(`  ✓ 账户0余额: ${ethers.utils.formatEther(balance)} ETH`);
        
        if (parseFloat(ethers.utils.formatEther(balance)) >= 10000) {
            console.log('  ✓ 账户余额已恢复（初始余额：10000 ETH）');
        } else {
            console.log('  ⚠ 账户余额可能未完全恢复，请检查节点是否为新启动的');
        }
    } catch (error) {
        console.error('  ✗ 无法连接到Hardhat节点:', error.message);
        console.log('  请确保Hardhat节点正在运行: npm run node');
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('='.repeat(60));
    console.log('重置订单记录和Hardhat账户余额');
    console.log('='.repeat(60));
    
    try {
        // 1. 删除所有订单文件
        const deletedCount = await deleteAllOrders();
        
        // 2. 重置订单配置文件
        await resetOrderConfig();
        
        // 3. 重置订单历史文件
        await resetOrderHistory();
        
        // 4. 停止Hardhat节点（如果正在运行）
        await stopHardhatNode();
        
        // 5. 启动Hardhat节点（恢复账户余额）
        await startHardhatNode();
        
        // 6. 验证节点状态
        await verifyNodeStatus();
        
        console.log('\n' + '='.repeat(60));
        console.log('重置完成！');
        console.log('='.repeat(60));
        console.log('\n下一步操作:');
        console.log('1. 如果Hardhat节点已重启，所有账户余额已恢复为10000 ETH');
        console.log('2. 重新部署合约: npm run deploy:local');
        console.log('3. 或在MetaMask中重置账户（设置 -> 高级 -> 重置账户）');
        console.log(`4. 订单ID已重置为: ${INITIAL_ORDER_ID}`);
        
    } catch (error) {
        console.error('\n✗ 重置过程中发生错误:', error);
        process.exit(1);
    }
}

// 运行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('未处理的错误:', error);
        process.exit(1);
    });
}

module.exports = {
    deleteAllOrders,
    resetOrderConfig,
    resetOrderHistory,
    stopHardhatNode,
    startHardhatNode,
    verifyNodeStatus
};

