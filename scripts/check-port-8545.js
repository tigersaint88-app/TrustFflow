/**
 * 检查端口 8545 是否被占用
 */

const http = require('http');

const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const PORT = 8545;

async function checkPort() {
    console.log('🔍 检查端口 8545 状态...\n');
    
    return new Promise((resolve) => {
        // 尝试连接到端口
        const testRequest = http.request({
            hostname: 'localhost',
            port: PORT,
            path: '/',
            method: 'POST',
            timeout: 2000,
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            console.log(`✅ 端口 ${PORT} 可访问！`);
            console.log(`   状态码: ${res.statusCode}`);
            console.log(`   RPC URL: ${RPC_URL}\n`);
            
            // 尝试发送一个 JSON-RPC 请求
            testRPC();
            resolve(true);
        });
        
        testRequest.on('error', (error) => {
            if (error.code === 'ECONNREFUSED') {
                console.log(`❌ 端口 ${PORT} 无法访问（连接被拒绝）\n`);
                console.log('💡 这通常意味着 Hardhat 节点没有运行。\n');
                console.log('📝 解决方案:');
                console.log('   1. 在新的终端窗口运行: npm run node');
                console.log('   2. 等待节点启动完成（看到 "Started HTTP and WebSocket server"）');
                console.log('   3. 然后重新运行此检查\n');
            } else if (error.code === 'ETIMEDOUT') {
                console.log(`⏱️  端口 ${PORT} 连接超时\n`);
                console.log('💡 可能的原因:');
                console.log('   - Hardhat 节点正在启动中（等待几秒后重试）');
                console.log('   - 防火墙阻止了连接');
                console.log('   - 网络配置问题\n');
            } else {
                console.log(`❌ 检查端口时出错: ${error.message}\n`);
            }
            resolve(false);
        });
        
        testRequest.on('timeout', () => {
            testRequest.destroy();
            console.log(`⏱️  连接超时（2秒）\n`);
            console.log('💡 端口可能没有响应，Hardhat 节点可能未运行。\n');
            resolve(false);
        });
        
        testRequest.end();
    });
}

async function testRPC() {
    console.log('🧪 测试 JSON-RPC 调用...\n');
    
    const rpcRequest = JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
    });
    
    const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(rpcRequest)
        },
        timeout: 3000
    };
    
    return new Promise((resolve) => {
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.result) {
                        const blockNumber = parseInt(response.result, 16);
                        console.log(`✅ JSON-RPC 调用成功！`);
                        console.log(`   当前区块高度: ${blockNumber}\n`);
                        console.log('🎉 所有检查通过！Hardhat 节点运行正常。\n');
                        resolve(true);
                    } else {
                        console.log(`⚠️  RPC 响应异常:`, response);
                        resolve(false);
                    }
                } catch (error) {
                    console.log(`❌ 解析 RPC 响应失败: ${error.message}`);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ RPC 调用失败: ${error.message}\n`);
            resolve(false);
        });
        
        req.on('timeout', () => {
            req.destroy();
            console.log(`⏱️  RPC 调用超时\n`);
            resolve(false);
        });
        
        req.write(rpcRequest);
        req.end();
    });
}

async function main() {
    const isPortAvailable = await checkPort();
    
    if (!isPortAvailable) {
        console.log('='.repeat(60));
        console.log('📋 启动 Hardhat 节点的步骤:');
        console.log('='.repeat(60));
        console.log('');
        console.log('1. 打开新的终端窗口（不要关闭当前窗口）');
        console.log('2. 导航到项目目录:');
        console.log('   cd C:\\tiger\\SmartContractRent');
        console.log('');
        console.log('3. 启动 Hardhat 节点:');
        console.log('   npm run node');
        console.log('');
        console.log('4. 等待看到以下消息:');
        console.log('   Started HTTP and WebSocket server on http://127.0.0.1:8545/');
        console.log('');
        console.log('5. ⚠️  重要: 保持那个终端窗口打开！');
        console.log('');
        console.log('6. 然后回到这里重新运行检查:');
        console.log('   node scripts/check-port-8545.js');
        console.log('');
        console.log('='.repeat(60));
        console.log('');
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('\n❌ 检查过程出错:', error);
    process.exit(1);
});

