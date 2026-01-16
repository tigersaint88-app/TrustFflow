/**
 * 完整重置脚本
 * 
 * 功能：
 * 1. 停止所有服务（Hardhat节点、后端服务器、前端服务器）
 * 2. 清除所有订单缓存（backend/data/orders/）
 * 3. 清除部署历史（deployments/目录）
 * 4. 重启Hardhat节点（重置所有账户余额为10000 ETH）
 * 5. 重新部署合约
 * 6. 重启后端和前端服务
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');

// 配置路径
const DATA_DIR = path.join(__dirname, '../backend/data');
const ORDERS_DIR = path.join(DATA_DIR, 'orders');
const ORDER_CONFIG_FILE = path.join(DATA_DIR, 'order-config.json');
const ORDER_HISTORY_FILE = path.join(DATA_DIR, 'order-history.json');
const DEPLOYMENTS_DIR = path.join(__dirname, '../deployments');

// 从环境变量或默认值获取初始订单ID
const INITIAL_ORDER_ID = parseInt(process.env.INITIAL_ORDER_ID || '10000');

/**
 * 检查端口是否被占用
 */
function isPortInUse(port) {
    try {
        if (process.platform === 'win32') {
            const result = execSync(`netstat -aon | findstr :${port} | findstr LISTENING`, { encoding: 'utf8', stdio: 'pipe' });
            return result.trim().length > 0;
        } else {
            try {
                execSync(`lsof -i :${port}`, { encoding: 'utf8', stdio: 'pipe' });
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
 * 停止占用指定端口的进程
 */
function stopPort(port, serviceName) {
    if (!isPortInUse(port)) {
        return false;
    }
    
    try {
        if (process.platform === 'win32') {
            const result = execSync(`netstat -aon | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' });
            const lines = result.trim().split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid) {
                    try {
                        execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
                        console.log(`  ✓ 已停止 ${serviceName} (PID: ${pid})`);
                    } catch (error) {
                        console.warn(`  ⚠ 无法停止进程 PID: ${pid}`);
                    }
                }
            }
        } else {
            execSync(`lsof -ti :${port} | xargs kill -9`, { stdio: 'pipe' });
            console.log(`  ✓ 已停止 ${serviceName}`);
        }
        return true;
    } catch (error) {
        console.warn(`  ⚠ 停止 ${serviceName} 失败: ${error.message}`);
        return false;
    }
}

/**
 * 步骤1: 停止所有服务
 */
async function stopAllServices() {
    console.log('\n[1/7] 停止所有服务...');
    
    const services = [
        { port: 8545, name: 'Hardhat节点' },
        { port: 3000, name: '后端服务器' },
        { port: 3001, name: '前端服务器' }
    ];
    
    let stoppedCount = 0;
    for (const service of services) {
        if (stopPort(service.port, service.name)) {
            stoppedCount++;
        } else {
            console.log(`  ✓ ${service.name} 未运行`);
        }
    }
    
    if (stoppedCount > 0) {
        console.log('  等待端口释放...');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('  ✓ 所有服务已停止');
}

/**
 * 步骤2: 清除所有订单缓存
 */
async function clearOrderCache() {
    console.log('\n[2/7] 清除订单缓存...');
    
    try {
        // 确保订单目录存在
        await fs.mkdir(ORDERS_DIR, { recursive: true });
        
        // 读取目录中的所有文件
        const files = await fs.readdir(ORDERS_DIR);
        
        // 过滤出订单文件
        const orderFiles = files.filter(file => file.startsWith('order-') && file.endsWith('.json'));
        
        if (orderFiles.length === 0) {
            console.log('  ✓ 没有找到订单文件');
        } else {
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
        }
        
        // 重置订单配置文件
        const config = {
            nextOrderId: INITIAL_ORDER_ID,
            lastUpdated: Date.now()
        };
        await fs.writeFile(ORDER_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        console.log(`  ✓ 订单配置文件已重置: nextOrderId = ${INITIAL_ORDER_ID}`);
        
        // 重置订单历史文件
        const history = {};
        await fs.writeFile(ORDER_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
        console.log('  ✓ 订单历史文件已重置');
        
    } catch (error) {
        console.error('  ✗ 清除订单缓存失败:', error.message);
        throw error;
    }
}

/**
 * 步骤3: 清除部署历史
 */
async function clearDeploymentHistory() {
    console.log('\n[3/7] 清除部署历史...');
    
    try {
        // 确保部署目录存在
        await fs.mkdir(DEPLOYMENTS_DIR, { recursive: true });
        
        // 读取目录中的所有文件
        const files = await fs.readdir(DEPLOYMENTS_DIR);
        
        // 过滤出JSON文件（部署历史文件）
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        if (jsonFiles.length === 0) {
            console.log('  ✓ 没有找到部署历史文件');
        } else {
            // 删除所有部署历史文件
            let deletedCount = 0;
            for (const file of jsonFiles) {
                try {
                    const filePath = path.join(DEPLOYMENTS_DIR, file);
                    await fs.unlink(filePath);
                    deletedCount++;
                } catch (error) {
                    console.error(`  ✗ 删除文件失败: ${file}`, error.message);
                }
            }
            console.log(`  ✓ 已删除 ${deletedCount} 个部署历史文件`);
        }
        
    } catch (error) {
        console.error('  ✗ 清除部署历史失败:', error.message);
        throw error;
    }
}

/**
 * 步骤4: 启动Hardhat节点
 */
function startHardhatNode() {
    console.log('\n[4/7] 启动Hardhat节点（重置账户余额）...');
    
    if (isPortInUse(8545)) {
        console.log('  ✓ Hardhat节点已在运行');
        console.log('  提示: 重启节点会自动恢复所有账户的初始余额（每个账户10000 ETH）');
        return;
    }
    
    try {
        if (process.platform === 'win32') {
            // Windows: 在新窗口中启动
            execSync('start "Hardhat Node" cmd /k "npm run node"', { stdio: 'pipe', cwd: path.join(__dirname, '..') });
        } else {
            // Linux/Mac: 在后台启动
            execSync('npm run node &', { stdio: 'pipe', cwd: path.join(__dirname, '..') });
        }
        
        console.log('  ✓ Hardhat节点启动命令已执行');
        console.log('  等待节点启动...');
        
    } catch (error) {
        console.error('  ✗ 启动Hardhat节点失败:', error.message);
        console.log('  请手动运行: npm run node');
    }
}

/**
 * 步骤5: 等待Hardhat节点就绪
 */
async function waitForHardhatNode(maxAttempts = 30) {
    console.log('\n[5/7] 等待Hardhat节点就绪...');
    
    const { ethers } = require('ethers');
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await provider.getBlockNumber();
            console.log('  ✓ Hardhat节点已就绪');
            return true;
        } catch (error) {
            if (i < maxAttempts - 1) {
                process.stdout.write(`  .`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.log('\n  ✗ Hardhat节点启动超时');
                return false;
            }
        }
    }
    
    return false;
}

/**
 * 步骤6: 重新部署合约
 */
async function deployContracts() {
    console.log('\n[6/7] 重新部署合约...');
    
    try {
        execSync('npm run deploy:local', {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..'),
            encoding: 'utf8'
        });
        console.log('  ✓ 合约部署完成');
    } catch (error) {
        console.error('  ✗ 合约部署失败:', error.message);
        throw error;
    }
}

/**
 * 步骤7: 启动后端和前端服务
 */
function startServices() {
    console.log('\n[7/7] 启动后端和前端服务...');
    
    try {
        if (process.platform === 'win32') {
            // Windows: 在新窗口中启动服务
            execSync('start "Backend Server" cmd /k "npm run server"', { stdio: 'pipe', cwd: path.join(__dirname, '..') });
            console.log('  ✓ 后端服务器启动命令已执行');
            
            // 等待后端启动
            setTimeout(() => {
                execSync('start "Frontend Server" cmd /k "npm run frontend"', { stdio: 'pipe', cwd: path.join(__dirname, '..') });
                console.log('  ✓ 前端服务器启动命令已执行');
            }, 2000);
        } else {
            // Linux/Mac: 在后台启动
            execSync('npm run server &', { stdio: 'pipe', cwd: path.join(__dirname, '..') });
            console.log('  ✓ 后端服务器已启动');
            
            setTimeout(() => {
                execSync('npm run frontend &', { stdio: 'pipe', cwd: path.join(__dirname, '..') });
                console.log('  ✓ 前端服务器已启动');
            }, 2000);
        }
        
    } catch (error) {
        console.error('  ✗ 启动服务失败:', error.message);
        console.log('  请手动运行:');
        console.log('    npm run server  (后端)');
        console.log('    npm run frontend  (前端)');
    }
}

/**
 * 验证重置结果
 */
async function verifyReset() {
    console.log('\n验证重置结果...');
    
    try {
        // 检查Hardhat节点
        const { ethers } = require('ethers');
        const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        
        const signer = provider.getSigner(0);
        const balance = await signer.getBalance();
        const address = await signer.getAddress();
        
        console.log(`  ✓ Hardhat节点运行正常`);
        console.log(`  ✓ 账户0地址: ${address}`);
        console.log(`  ✓ 账户0余额: ${ethers.utils.formatEther(balance)} ETH`);
        
        if (parseFloat(ethers.utils.formatEther(balance)) >= 10000) {
            console.log('  ✓ 账户余额已重置（初始余额：10000 ETH）');
        }
        
        // 检查订单目录
        const orderFiles = await fs.readdir(ORDERS_DIR);
        const orderCount = orderFiles.filter(f => f.startsWith('order-') && f.endsWith('.json')).length;
        console.log(`  ✓ 订单缓存已清除（剩余: ${orderCount} 个文件）`);
        
        // 检查部署文件
        const deploymentFiles = await fs.readdir(DEPLOYMENTS_DIR);
        const deployCount = deploymentFiles.filter(f => f.endsWith('.json')).length;
        console.log(`  ✓ 部署历史已清除并重新创建（文件数: ${deployCount}）`);
        
    } catch (error) {
        console.error('  ✗ 验证失败:', error.message);
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('='.repeat(60));
    console.log('完整系统重置');
    console.log('='.repeat(60));
    console.log('\n此操作将：');
    console.log('  1. 停止所有运行中的服务');
    console.log('  2. 清除所有订单缓存');
    console.log('  3. 清除部署历史');
    console.log('  4. 重启Hardhat节点（重置账户余额）');
    console.log('  5. 重新部署智能合约');
    console.log('  6. 重启后端和前端服务');
    console.log('\n警告: 此操作将清除所有本地数据！');
    
    try {
        // 1. 停止所有服务
        await stopAllServices();
        
        // 2. 清除订单缓存
        await clearOrderCache();
        
        // 3. 清除部署历史
        await clearDeploymentHistory();
        
        // 4. 启动Hardhat节点
        startHardhatNode();
        
        // 5. 等待Hardhat节点就绪
        const nodeReady = await waitForHardhatNode();
        if (!nodeReady) {
            console.log('\n⚠ Hardhat节点未就绪，请手动启动: npm run node');
            console.log('然后手动运行部署: npm run deploy:local');
            return;
        }
        
        // 6. 重新部署合约
        await deployContracts();
        
        // 7. 启动服务
        startServices();
        
        // 验证重置结果
        await verifyReset();
        
        console.log('\n' + '='.repeat(60));
        console.log('重置完成！');
        console.log('='.repeat(60));
        console.log('\n下一步操作:');
        console.log('  1. 所有账户余额已重置为10000 ETH');
        console.log('  2. 合约已重新部署');
        console.log('  3. 订单ID已重置为:', INITIAL_ORDER_ID);
        console.log('  4. 后端服务: http://localhost:3000');
        console.log('  5. 前端服务: http://localhost:3001');
        console.log('\n提示: 如果服务未自动启动，请手动运行:');
        console.log('  npm run server  (后端)');
        console.log('  npm run frontend  (前端)');
        
    } catch (error) {
        console.error('\n✗ 重置过程中发生错误:', error);
        console.log('\n部分操作可能已完成，请检查状态并手动完成剩余步骤');
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
    stopAllServices,
    clearOrderCache,
    clearDeploymentHistory,
    startHardhatNode,
    waitForHardhatNode,
    deployContracts,
    startServices,
    verifyReset
};

