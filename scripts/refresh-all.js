/**
 * 完整刷新脚本：重置所有数据并重新部署
 * 
 * 功能：
 * 1. 在.env文件中设置初始订单编号
 * 2. 删除所有订单记录
 * 3. 重置所有Hardhat账户（重启节点）
 * 4. 重新部署合约
 * 5. 可选：重启后端服务器
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');

// 配置路径
const ROOT_DIR = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const ENV_TEMPLATE = path.join(ROOT_DIR, 'ENV_TEMPLATE.txt');
const DATA_DIR = path.join(ROOT_DIR, 'backend/data');
const ORDERS_DIR = path.join(DATA_DIR, 'orders');
const ORDER_CONFIG_FILE = path.join(DATA_DIR, 'order-config.json');
const ORDER_HISTORY_FILE = path.join(DATA_DIR, 'order-history.json');
const PLATFORM_DIR = path.join(DATA_DIR, 'platform');
const SUMMARY_FILE = path.join(PLATFORM_DIR, 'summary.json');

// 从环境变量或默认值获取初始订单ID
const INITIAL_ORDER_ID = parseInt(process.env.INITIAL_ORDER_ID || '10000');

/**
 * 更新.env文件中的初始订单ID
 */
async function updateEnvFile() {
    console.log('\n[1/6] 更新.env文件中的初始订单ID...');
    
    try {
        let envContent = '';
        
        // 读取现有.env文件
        if (await fs.access(ENV_FILE).then(() => true).catch(() => false)) {
            envContent = await fs.readFile(ENV_FILE, 'utf8');
            console.log('  ✓ 读取现有.env文件');
        } else if (await fs.access(ENV_TEMPLATE).then(() => true).catch(() => false)) {
            envContent = await fs.readFile(ENV_TEMPLATE, 'utf8');
            console.log('  ✓ 从模板创建.env文件');
        } else {
            envContent = `# 环境变量配置
# 自动生成于 ${new Date().toISOString()}

# ==================== 业务配置 ====================
INITIAL_ORDER_ID=${INITIAL_ORDER_ID}

# ==================== 区块链配置 ====================
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=1337

# ==================== 服务端口配置 ====================
API_PORT=3000
WS_PORT=8080
`;
            console.log('  ✓ 创建新的.env文件');
        }
        
        // 更新或添加INITIAL_ORDER_ID
        const lines = envContent.split('\n');
        let updated = false;
        const updatedLines = [];
        
        for (let line of lines) {
            if (/^\s*INITIAL_ORDER_ID\s*=/.test(line)) {
                const commentMatch = line.match(/(\s+#.*)$/);
                const comment = commentMatch ? commentMatch[1] : '';
                updatedLines.push(`INITIAL_ORDER_ID=${INITIAL_ORDER_ID}${comment}`);
                updated = true;
            } else {
                updatedLines.push(line);
            }
        }
        
        if (!updated) {
            // 如果不存在，添加到业务配置部分
            let insertIndex = updatedLines.length;
            for (let i = 0; i < updatedLines.length; i++) {
                if (updatedLines[i].includes('业务配置') || updatedLines[i].includes('Business')) {
                    for (let j = i + 1; j < updatedLines.length; j++) {
                        if (updatedLines[j].trim() === '' || 
                            (updatedLines[j].trim().startsWith('#') && updatedLines[j].includes('==='))) {
                            insertIndex = j;
                            break;
                        }
                    }
                    break;
                }
            }
            updatedLines.splice(insertIndex, 0, `INITIAL_ORDER_ID=${INITIAL_ORDER_ID}`);
        }
        
        await fs.writeFile(ENV_FILE, updatedLines.join('\n'), 'utf8');
        console.log(`  ✓ .env文件已更新: INITIAL_ORDER_ID=${INITIAL_ORDER_ID}`);
    } catch (error) {
        console.error('  ✗ 更新.env文件失败:', error.message);
        throw error;
    }
}

/**
 * 删除所有订单文件
 */
async function deleteAllOrders() {
    console.log('\n[2/6] 删除所有订单记录...');
    
    try {
        // 确保订单目录存在
        await fs.mkdir(ORDERS_DIR, { recursive: true });
        
        // 读取目录中的所有文件
        const files = await fs.readdir(ORDERS_DIR);
        
        // 过滤出订单文件
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
    console.log('\n[3/6] 重置订单配置文件...');
    
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        
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
    console.log('\n[3.5/6] 重置订单历史文件...');
    
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const history = {};
        await fs.writeFile(ORDER_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
        console.log('  ✓ 订单历史文件已重置');
    } catch (error) {
        console.warn('  ⚠ 重置订单历史文件失败（可能不存在）:', error.message);
    }
}

/**
 * 重置平台统计文件
 */
async function resetPlatformSummary() {
    console.log('\n[3.6/6] 重置平台统计文件...');
    
    try {
        await fs.mkdir(PLATFORM_DIR, { recursive: true });
        const summary = {
            totalTransactions: 0,
            totalRevenue: '0',
            totalPlatformFee: '0',
            totalDisputes: 0,
            resolvedDisputes: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await fs.writeFile(SUMMARY_FILE, JSON.stringify(summary, null, 2), 'utf8');
        console.log('  ✓ 平台统计文件已重置');
    } catch (error) {
        console.warn('  ⚠ 重置平台统计文件失败（可能不存在）:', error.message);
    }
}

/**
 * 检查Hardhat节点是否运行
 */
function isHardhatNodeRunning() {
    try {
        if (process.platform === 'win32') {
            const result = execSync('netstat -aon | findstr :8545 | findstr LISTENING', { 
                encoding: 'utf8', 
                stdio: 'pipe' 
            });
            return result.trim().length > 0;
        } else {
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
async function stopHardhatNode() {
    console.log('\n[4/6] 停止Hardhat节点...');
    
    if (!isHardhatNodeRunning()) {
        console.log('  ✓ Hardhat节点未运行');
        return;
    }
    
    try {
        if (process.platform === 'win32') {
            // Windows: 查找所有占用8545端口的进程
            const result = execSync('netstat -aon | findstr :8545', { 
                encoding: 'utf8' 
            });
            const lines = result.trim().split('\n');
            const pids = new Set();
            
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0') {
                    pids.add(pid);
                }
            }
            
            // 也查找 hardhat 和 node 相关进程
            try {
                const nodeProcesses = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', { 
                    encoding: 'utf8' 
                });
                const nodeLines = nodeProcesses.split('\n').slice(1); // 跳过标题行
                for (const line of nodeLines) {
                    if (line.includes('hardhat') || line.includes('node')) {
                        const match = line.match(/"(\d+)"/);
                        if (match) {
                            pids.add(match[1]);
                        }
                    }
                }
            } catch (e) {
                // 忽略错误
            }
            
            // 停止所有相关进程
            for (const pid of pids) {
                try {
                    execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
                    console.log(`  ✓ 已停止进程 PID: ${pid}`);
                } catch (error) {
                    // 忽略已结束的进程
                }
            }
        } else {
            try {
                // Linux/Mac: 停止所有 hardhat 和 node 进程
                execSync('pkill -f "hardhat node"', { stdio: 'pipe' });
                execSync('pkill -f "node.*hardhat"', { stdio: 'pipe' });
                console.log('  ✓ 已停止Hardhat节点');
            } catch (error) {
                // 忽略没有找到进程的错误
            }
        }
        
        console.log('  等待端口释放和进程完全退出...');
        // 等待更长时间确保进程完全退出
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 验证节点是否真的停止了
        let retries = 5;
        while (retries > 0 && isHardhatNodeRunning()) {
            console.log('  节点仍在运行，继续等待...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            retries--;
        }
        
        if (isHardhatNodeRunning()) {
            console.warn('  ⚠ 节点可能仍在运行，请手动停止');
        } else {
            console.log('  ✓ 节点已完全停止');
        }
    } catch (error) {
        console.error('  ✗ 停止Hardhat节点失败:', error.message);
        console.log('  请手动停止Hardhat节点');
    }
}

/**
 * 启动Hardhat节点
 */
async function startHardhatNode() {
    console.log('\n[4.5/6] 启动Hardhat节点（恢复账户余额）...');
    
    if (isHardhatNodeRunning()) {
        console.log('  ⚠ Hardhat节点已在运行');
        console.log('  注意: 如果节点未完全重启，账户余额可能不会恢复为初始值');
        console.log('  建议: 完全停止节点后重新启动以恢复所有账户余额为 10000 ETH');
        return;
    }
    
    try {
        // 在后台启动Hardhat节点
        const nodeProcess = spawn('npm', ['run', 'node'], {
            detached: true,
            stdio: 'ignore',
            shell: true,
            cwd: ROOT_DIR
        });
        
        nodeProcess.unref();
        
        console.log('  ✓ Hardhat节点启动命令已执行');
        console.log('  等待节点启动...');
        
        // 等待节点启动
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 验证节点是否启动成功
        let retries = 10;
        while (retries > 0) {
            if (isHardhatNodeRunning()) {
                console.log('  ✓ Hardhat节点已成功启动');
                
                // 验证账户余额是否恢复
                try {
                    const { ethers } = require('ethers');
                    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
                    const accounts = await hre.ethers.getSigners();
                    const platformAccount = accounts[0];
                    const balance = await provider.getBalance(platformAccount.address);
                    const balanceEth = parseFloat(ethers.utils.formatEther(balance));
                    
                    if (balanceEth >= 9999.9) {
                        console.log(`  ✓ 平台账户余额已恢复: ${balanceEth.toFixed(6)} ETH`);
                        console.log('  ℹ 余额接近 10000 ETH（可能因部署合约消耗少量 gas）');
                    } else {
                        console.warn(`  ⚠ 平台账户余额: ${balanceEth.toFixed(6)} ETH`);
                        console.warn('  ⚠ 余额可能未完全恢复，节点可能未完全重启');
                    }
                } catch (error) {
                    console.warn('  ⚠ 无法验证账户余额:', error.message);
                }
                
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            retries--;
        }
        
        console.warn('  ⚠ Hardhat节点可能未完全启动，请手动检查');
    } catch (error) {
        console.error('  ✗ 启动Hardhat节点失败:', error.message);
        console.log('  请手动运行: npm run node');
    }
}

/**
 * 重新部署合约
 */
async function redeployContracts() {
    console.log('\n[5/6] 重新部署合约...');
    
    try {
        console.log('  执行部署命令...');
        execSync('npm run deploy:local', {
            cwd: ROOT_DIR,
            stdio: 'inherit',
            env: { ...process.env, INITIAL_ORDER_ID: INITIAL_ORDER_ID.toString() }
        });
        console.log('  ✓ 合约部署完成');
    } catch (error) {
        console.error('  ✗ 部署合约失败:', error.message);
        throw error;
    }
}

/**
 * 验证部署结果
 */
async function verifyDeployment() {
    console.log('\n[6/6] 验证部署结果...');
    
    try {
        // 读取部署信息
        const deploymentsDir = path.join(ROOT_DIR, 'deployments');
        const latestFile = path.join(deploymentsDir, 'localhost-latest.json');
        
        if (!await fs.access(latestFile).then(() => true).catch(() => false)) {
            console.warn('  ⚠ 未找到部署信息文件');
            return;
        }
        
        const deployment = JSON.parse(await fs.readFile(latestFile, 'utf8'));
        const rideOrderAddress = deployment.contracts.rideOrder;
        
        console.log('  ✓ 读取部署信息');
        console.log(`  ✓ 合约地址: ${rideOrderAddress}`);
        
        // 使用hardhat run来验证（在hardhat环境中）
        try {
            const verifyScript = `
                const hre = require('hardhat');
                const { ethers } = hre;
                
                async function verify() {
                    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
                    const address = '${rideOrderAddress}';
                    const expectedOrderId = ${INITIAL_ORDER_ID};
                    
                    // 检查合约是否部署
                    const code = await provider.getCode(address);
                    if (code === '0x') {
                        console.log('  ✗ 合约未部署到链上');
                        return;
                    }
                    
                    // 检查订单计数
                    const TrustFlowRide = await ethers.getContractFactory('TrustFlowRide');
                    const rideOrder = TrustFlowRide.attach(address);
                    const orderCount = await rideOrder.orderCount();
                    
                    console.log('  ✓ 合约已部署');
                    console.log('  ✓ 当前订单计数:', orderCount.toString());
                    
                    if (orderCount.toString() === expectedOrderId.toString()) {
                        console.log('  ✓ 初始订单ID设置正确:', expectedOrderId);
                    } else {
                        console.warn('  ⚠ 订单计数不匹配: 期望', expectedOrderId, ', 实际', orderCount.toString());
                    }
                }
                
                verify().catch(console.error);
            `;
            
            const tempScript = path.join(ROOT_DIR, 'scripts', 'temp-verify.js');
            await fs.writeFile(tempScript, verifyScript, 'utf8');
            
            execSync(`npx hardhat run ${tempScript} --network localhost`, {
                cwd: ROOT_DIR,
                stdio: 'inherit'
            });
            
            // 清理临时文件
            await fs.unlink(tempScript).catch(() => {});
        } catch (error) {
            console.warn('  ⚠ 验证订单计数失败（可能节点未完全启动）:', error.message);
            console.log('  可以稍后运行: npm run check-order-count');
        }
    } catch (error) {
        console.error('  ✗ 验证部署结果失败:', error.message);
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('='.repeat(60));
    console.log('完整刷新：重置所有数据并重新部署');
    console.log('='.repeat(60));
    console.log(`初始订单ID: ${INITIAL_ORDER_ID}`);
    console.log('='.repeat(60));
    
    try {
        // 1. 更新.env文件
        await updateEnvFile();
        
        // 2. 删除所有订单文件
        await deleteAllOrders();
        
        // 3. 重置订单配置和历史
        await resetOrderConfig();
        await resetOrderHistory();
        await resetPlatformSummary();
        
        // 4. 停止并重启Hardhat节点
        await stopHardhatNode();
        await startHardhatNode();
        
        // 5. 重新部署合约
        await redeployContracts();
        
        // 6. 验证部署结果
        await verifyDeployment();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ 刷新完成！');
        console.log('='.repeat(60));
        console.log('\n下一步操作:');
        console.log('1. 后端服务器需要重启以加载新的合约地址');
        console.log('2. ⚠️  前端页面需要手动刷新以获取新的合约地址');
        console.log('   如果页面出现无限刷新循环，请：');
        console.log('   - 关闭所有前端页面标签页');
        console.log('   - 清除浏览器缓存（Ctrl+Shift+Delete）');
        console.log('   - 重新打开前端页面');
        console.log(`3. 订单ID已重置为: ${INITIAL_ORDER_ID}`);
        console.log('4. Hardhat节点已重启，所有账户余额应恢复为10000 ETH');
        console.log('   (平台账户可能因部署合约消耗少量 gas，余额略低于10000 ETH)');
        console.log('\n启动后端服务器: npm run server');
        console.log('或启动完整开发环境: npm run server:full');
        console.log('\n验证账户余额: npx hardhat run scripts/check-account-balance.js --network localhost');
        
    } catch (error) {
        console.error('\n✗ 刷新过程中发生错误:', error);
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
    updateEnvFile,
    deleteAllOrders,
    resetOrderConfig,
    resetOrderHistory,
    resetPlatformSummary,
    stopHardhatNode,
    startHardhatNode,
    redeployContracts,
    verifyDeployment
};


