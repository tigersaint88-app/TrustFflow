/**
 * 将 docs 目录下的英文文件名重命名为中文
 */

const fs = require('fs');
const path = require('path');

const renameMap = {
    'API.md': 'API接口文档.md',
    'ARCHITECTURE.md': '架构设计.md',
    'CHAIN_ID_MISMATCH_FIX.md': 'Chain ID不匹配修复.md',
    'DATA_PERSISTENCE_EXPLANATION.md': '数据持久性说明.md',
    'DEPLOYMENT_STATUS.md': '部署状态.md',
    'DEPLOYMENT.md': '部署指南.md',
    'FIREFOX_METAMASK_SYNTAX_ERROR.md': 'Firefox MetaMask语法错误.md',
    'GETPASSENGERORDERS_ERROR_FIX.md': 'getPassengerOrders错误修复.md',
    'HOW_TO_PRINT.md': '如何打印.md',
    'LOCAL_TESTING.md': '本地测试.md',
    'METAMASK_NETWORK_TROUBLESHOOTING.md': 'MetaMask网络故障排查.md',
    'MOBILE_WALLET_GUIDE.md': '移动端钱包指南.md',
    'ORDER_DISPLAY_TROUBLESHOOTING.md': '订单显示故障排查.md',
    'PORT_EXPLANATION.md': '端口说明.md',
    'PYTHON_VIRTUAL_ENV_GUIDE.md': 'Python虚拟环境指南.md',
    'QUICK_START.md': '快速开始.md',
    'REDIS_OPTIONAL_GUIDE.md': 'Redis可选配置指南.md',
    'SERVING_FRONTEND.md': '前端服务说明.md',
    'START_SERVER_GUIDE.md': '服务器启动指南.md',
    'STATIC_FILES_404_FIX.md': '静态文件404错误修复.md',
    'SYSTEM_ARCHITECTURE.md': '系统架构.md',
    'TESTNET_DEPLOYMENT.md': '测试网部署.md',
    'TROUBLESHOOTING_WALLET.md': '钱包故障排查.md'
};

const docsDir = path.join(__dirname, '../docs');

console.log('开始重命名文件...\n');

let renamed = 0;
let skipped = 0;
let errors = 0;

for (const [oldName, newName] of Object.entries(renameMap)) {
    const oldPath = path.join(docsDir, oldName);
    const newPath = path.join(docsDir, newName);
    
    try {
        if (fs.existsSync(oldPath)) {
            // 如果新文件已存在，跳过
            if (fs.existsSync(newPath)) {
                console.log(`⏭️  跳过: ${oldName} (${newName} 已存在)`);
                skipped++;
            } else {
                fs.renameSync(oldPath, newPath);
                console.log(`✅ 重命名: ${oldName} -> ${newName}`);
                renamed++;
            }
        } else {
            console.log(`⚠️  文件不存在: ${oldName}`);
            skipped++;
        }
    } catch (error) {
        console.error(`❌ 错误: 无法重命名 ${oldName} - ${error.message}`);
        errors++;
    }
}

console.log('\n' + '='.repeat(60));
console.log(`完成！重命名: ${renamed}, 跳过: ${skipped}, 错误: ${errors}`);
console.log('='.repeat(60));

