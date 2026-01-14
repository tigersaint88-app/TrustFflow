/**
 * 快速修复合约地址脚本
 * 在浏览器控制台（F12）中运行此代码，然后刷新页面
 */

// 最新的合约地址（从 deployments/localhost-latest.json）
const latestAddresses = {
    rideOrder: '0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf',
    paymentEscrow: '0x9d4454B023096f34B160D6B654540c56A1F81688',
    ratingSystem: '0x0E801D84Fa97b50751Dbf25036d067dCf18858bF',
    userRegistry: '0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf',
    disputeResolution: '0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00'
};

// 更新 localStorage
localStorage.setItem('RIDE_ORDER_ADDRESS', latestAddresses.rideOrder);
localStorage.setItem('PAYMENT_ESCROW_ADDRESS', latestAddresses.paymentEscrow);
localStorage.setItem('RATING_SYSTEM_ADDRESS', latestAddresses.ratingSystem);

console.log('✓ 合约地址已更新：');
console.log('  - RIDE_ORDER_ADDRESS:', latestAddresses.rideOrder);
console.log('  - PAYMENT_ESCROW_ADDRESS:', latestAddresses.paymentEscrow);
console.log('  - RATING_SYSTEM_ADDRESS:', latestAddresses.ratingSystem);
console.log('');
console.log('请刷新页面以使用新的合约地址。');

// 自动刷新页面（可选，注释掉下面这行如果不想要自动刷新）
// location.reload();

