/**
 * 前端配置
 * 合约地址配置
 * 
 * 这个文件会在部署时自动生成
 * 如果没有部署，可以从localStorage中读取或手动设置
 */

// 合约地址（从localStorage或部署信息中加载）
// 只在 window 对象上创建，避免全局变量污染
(function() {
    'use strict';
    const CONTRACT_ADDRESSES = {
        rideOrder: '',
        paymentEscrow: '',
        ratingSystem: ''
    };

    // 尝试从localStorage加载
    try {
        if (typeof localStorage !== 'undefined') {
            const rideOrder = localStorage.getItem('RIDE_ORDER_ADDRESS');
            const paymentEscrow = localStorage.getItem('PAYMENT_ESCROW_ADDRESS');
            const ratingSystem = localStorage.getItem('RATING_SYSTEM_ADDRESS');
            
            if (rideOrder) {
                CONTRACT_ADDRESSES.rideOrder = rideOrder;
                CONTRACT_ADDRESSES.paymentEscrow = paymentEscrow || '';
                CONTRACT_ADDRESSES.ratingSystem = ratingSystem || '';
            }
        }
    } catch (e) {
        console.warn('Failed to load contract addresses from localStorage:', e);
    }

    // 暴露到全局，让index.html可以访问
    if (typeof window !== 'undefined') {
        window.CONTRACT_ADDRESSES = CONTRACT_ADDRESSES;
    }
})();

