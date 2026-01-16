/**
 * 从部署文件加载合约地址到浏览器 localStorage
 * 用法：在浏览器控制台中运行此脚本，或者将其添加到前端代码中
 */

// 读取部署文件并更新 localStorage
async function loadContractAddressesFromDeployment() {
    try {
        // 从部署文件读取合约地址
        const response = await fetch('/deployments/localhost-latest.json');
        if (!response.ok) {
            throw new Error('无法加载部署文件');
        }
        
        const deployment = await response.json();
        const contracts = deployment.contracts;
        
        // 更新 localStorage
        if (contracts.rideOrder) {
            localStorage.setItem('RIDE_ORDER_ADDRESS', contracts.rideOrder);
            console.log('✓ RIDE_ORDER_ADDRESS:', contracts.rideOrder);
        }
        
        if (contracts.paymentEscrow) {
            localStorage.setItem('PAYMENT_ESCROW_ADDRESS', contracts.paymentEscrow);
            console.log('✓ PAYMENT_ESCROW_ADDRESS:', contracts.paymentEscrow);
        }
        
        if (contracts.ratingSystem) {
            localStorage.setItem('RATING_SYSTEM_ADDRESS', contracts.ratingSystem);
            console.log('✓ RATING_SYSTEM_ADDRESS:', contracts.ratingSystem);
        }
        
        if (contracts.userRegistry) {
            localStorage.setItem('USER_REGISTRY_ADDRESS', contracts.userRegistry);
            console.log('✓ USER_REGISTRY_ADDRESS:', contracts.userRegistry);
        }
        
        if (contracts.disputeResolution) {
            localStorage.setItem('DISPUTE_RESOLUTION_ADDRESS', contracts.disputeResolution);
            console.log('✓ DISPUTE_RESOLUTION_ADDRESS:', contracts.disputeResolution);
        }
        
        console.log('✓ 合约地址已更新！请刷新页面。');
        return true;
    } catch (error) {
        console.error('✗ 加载合约地址失败:', error);
        return false;
    }
}

// 如果是在浏览器环境中，自动执行
if (typeof window !== 'undefined') {
    window.loadContractAddressesFromDeployment = loadContractAddressesFromDeployment;
}

// 如果是在 Node.js 环境中，导出函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = loadContractAddressesFromDeployment;
}

