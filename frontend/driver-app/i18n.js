/**
 * 多语言支持
 * Internationalization (i18n) Support
 */

const translations = {
    en: {
        // Header
        title: "TrustFlow",
        subtitle: "Decentralized Rental Payment System - Order Creation",
        
        // Wallet Section
        walletSection: "1. Connect Wallet",
        walletStatus: "Please connect your wallet to get started",
        walletConnected: "Wallet Connected",
        connectWallet: "Connect Wallet",
        connected: "Connected",
        accountLabel: "Connected Account:",
        
        // Order Form Section
        orderSection: "2. Create Order",
        pickupAddress: "Pickup Address",
        pickupAddressPlaceholder: "e.g., Tiananmen Square",
        destinationAddress: "Destination Address",
        destinationAddressPlaceholder: "e.g., National Stadium (Bird's Nest)",
        pickupLatitude: "Pickup Latitude",
        pickupLongitude: "Pickup Longitude",
        destinationLatitude: "Destination Latitude",
        destinationLongitude: "Destination Longitude",
        estimatedFare: "Estimated Fare (USD)",
        category: "Category",
        subCategory: "Sub Category",
        subCategoryPlaceholder: "e.g., Sedan, SUV, Motorcycle",
        categoryRequired: "Please select a category",
        categoryVehicleRental: "Vehicle Rental",
        categoryPropertyRental: "Property Rental",
        categoryEquipmentRental: "Equipment Rental",
        categoryService: "Service",
        calculateFare: "Calculate Fare",
        creating: "Creating Order...",
        createOrder: "Create Order",
        
        // Status Messages
        walletConnectSuccess: "✓ Wallet connected successfully!",
        walletConnectError: "Connection failed:",
        installMetaMask: "Please install MetaMask wallet extension!\n\nDownload: https://metamask.io/",
        installMetaMaskMobile: "Please install MetaMask Mobile App!\n\nDownload from App Store or Google Play",
        mobileWalletGuide: "Mobile Wallet Guide",
        mobileWalletOptions: "For mobile devices, you can use:",
        metamaskMobile: "MetaMask Mobile App",
        walletConnect: "WalletConnect (QR Code)",
        trustWallet: "Trust Wallet",
        coinbaseWallet: "Coinbase Wallet",
        openInMetaMask: "Open in MetaMask",
        scanQRCode: "Scan QR Code to Connect",
        connecting: "Connecting...",
        calculating: "Calculating...",
        fareCalculated: "✓ Fare calculated! Distance: {distance} km, Estimated fare: ${fare} USD",
        submitting: "⏳ Submitting transaction, please confirm in MetaMask...",
        transactionSubmitted: "⏳ Transaction submitted, waiting for confirmation... (Hash: {hash}...)",
        orderCreated: "✓ Order created successfully! Order ID: {orderId}",
        orderCreateError: "Failed to create order:",
        contractNotInitialized: "Contract not initialized, please connect wallet and configure contract address",
        contractAddressNotSet: "⚠️ Contract address not configured!\nPlease deploy contracts and set addresses first.",
        
        // Order Info
        orderDetails: "📋 Order Details",
        orderId: "Order ID:",
        status: "Status:",
        passengerAddress: "Passenger Address:",
        driverAddress: "Driver Address:",
        notAccepted: "Not Accepted",
        pickupLocation: "Pickup Location:",
        destination: "Destination:",
        transactionHash: "Transaction Hash:",
        createdAt: "Created At:",
        statusPending: "Pending",
        statusAccepted: "Accepted",
        statusPickedUp: "Picked Up",
        statusCompleted: "Completed",
        statusCancelled: "Cancelled",
        
        // Language
        language: "Language",
        english: "English",
        chinese: "中文",
        systemMenu: "System Menu",
        about: "About",
        help: "Help",
        contract: "Contract",
        orders: "Orders",
        ordersSubtitle: "Your ride history",
        profile: "Profile",
        profileSubtitle: "Your account information",
        all: "All",
        pending: "Pending",
        completed: "Completed",
        cancelled: "Cancelled",
        loadingOrders: "Loading orders...",
        noOrders: "No orders yet",
        createFirstOrder: "Create your first order to get started",
        user: "User",
        passenger: "Passenger",
        totalOrders: "Total Orders",
        completedOrders: "Completed",
        totalSpent: "Total Spent",
        accountSettings: "Account Settings",
        wallet: "Wallet",
        network: "Network",
        clearCache: "Clear Cache",
        clearCacheDesc: "Clear stored data",
        personalInfo: "Personal Information",
        nickname: "Nickname",
        contactMethod: "Contact Method",
        nicknameHint: "Display name for rental orders",
        contactHint: "How drivers can contact you (phone, email, etc.)",
        saveProfile: "Save Profile",
        contactInfo: "Contact Information",
        
        cancelOrder: "Cancel Order",
        cancelConfirm: "Are you sure you want to cancel this order?",
        cancelReason: "Cancellation Reason",
        orderCancelled: "Order cancelled successfully",
        cancelError: "Failed to cancel order:",
        gasWarning: "⚠️ Note: This action requires gas fees",
        gasEstimate: "Estimated Gas:",
        gasCost: "Estimated Cost:",
        gasConsumption: "Gas consumption",
        
        // Fee Details
        feeDetails: "Fee Details",
        feeDetailsTitle: "Fee Details",
        orderAmount: "Order Amount",
        platformFee: "Platform Fee (5%)",
        estimatedPlatformFee: "Estimated Platform Fee (5%)",
        gasFee: "Gas Fee",
        estimatedGasFee: "Estimated Gas Fee",
        netIncome: "Net Income",
        actualIncome: "Actual Income",
        estimatedNetIncome: "Estimated Net Income",
        estimatedFeeDetails: "Estimated Fee Details",
        estimatedOrderAmount: "Estimated Order Amount",
        reference: "reference",
        gasFeeNote: "Note: Gas fee not included in this calculation",
        actualFeeNote: "Actual fee will be determined when completing the order",
        enterActualFare: "Enter actual fare (ETH):",
        estimatedFareLabel: "Estimated Fare:",
        
        // Driver App Specific
        driverApp: "Driver App",
        driverAppSubtitle: "Driver Order Management System",
        currentBrowser: "Current Browser:",
        driverCurrentAccountLabel: "Current Driver Account:",
        driverAccountHint: "Tip: Each browser can use a different MetaMask account, but connect to the same contract address",
        driverSwitchAccount: "Switch Account",
        driverSwitchAccountDesc: "Change MetaMask account",
        driverWalletInfo: "Wallet Info",
        driverNetworkInfo: "Network Info",
        driverRefreshPage: "Refresh Page",
        metaMaskNotInstalled: "MetaMask is not installed!",
        switchAccountFailed: "Failed to switch account:",
        multiAccountHint: "Tip: Detected {count} accounts, you can click \"Switch Account\" to change",
        accountSwitched: "Account Switched",
        accountChanged: "Account Changed",
        noAccountSelected: "No account selected",
        availableOrdersTitle: "Available Orders",
        availableOrdersSubtitle: "Orders waiting to be accepted",
        myOrdersTitle: "My Orders",
        myOrdersSubtitle: "Orders you have accepted",
        profileTitle: "Profile",
        profileSubtitle: "Your driver account information",
        
        // Order Display
        orderNumber: "Order #{orderId}",
        pickup: "Pickup:",
        destination: "Destination:",
        category: "Category:",
        createdAtLabel: "Created:",
        acceptOrder: "Accept Order",
        acceptingOrder: "Accepting...",
        orderAccepted: "Order #{orderId} accepted successfully!",
        acceptOrderConfirm: "Confirm accepting order #{orderId}?",
        pickupPassenger: "Pick Up",
        pickingUp: "Processing...",
        pickupConfirmed: "Pickup confirmed! Order #{orderId}",
        pickupConfirm: "Confirm passenger picked up for order #{orderId}?",
        completeOrder: "Complete Order",
        completing: "Completing...",
        orderCompleted: "Order #{orderId} completed",
        completeOrderConfirm: "Confirm completing order #{orderId}?",
        transactionSubmitted: "Transaction submitted, waiting for confirmation... (Hash: {hash}...)",
        currentAccount: "Current Account:",
        noAvailableOrders: "No available orders",
        noAvailableOrdersHint: "Orders will appear here when passengers create them",
        loadingOrdersFailed: "Failed to load orders",
        refreshPage: "Refresh Page",
        
        // Common
        copy: "Copy",
        copied: "Copied to clipboard:"
    },
    zh: {
        // Header
        title: "TrustFlow",
        subtitle: "去中心化租赁支付系统 - 订单创建",
        
        // Wallet Section
        walletSection: "1. 连接钱包",
        walletStatus: "请连接您的钱包以开始使用",
        walletConnected: "钱包已连接",
        connectWallet: "连接钱包",
        connected: "已连接",
        accountLabel: "已连接账户:",
        
        // Order Form Section
        orderSection: "2. 创建订单",
        pickupAddress: "上车点地址",
        pickupAddressPlaceholder: "例如: 天安门广场",
        destinationAddress: "目的地地址",
        destinationAddressPlaceholder: "例如: 国家体育场（鸟巢）",
        pickupLatitude: "上车点纬度",
        pickupLongitude: "上车点经度",
        destinationLatitude: "目的地纬度",
        destinationLongitude: "目的地经度",
        estimatedFare: "预估费用 (USD)",
        category: "类别",
        subCategory: "子类别",
        subCategoryPlaceholder: "例如：小轿车、SUV、摩托车",
        categoryRequired: "请选择类别",
        categoryVehicleRental: "车辆租赁",
        categoryPropertyRental: "房屋租赁",
        categoryEquipmentRental: "设备租赁",
        categoryService: "服务",
        calculateFare: "计算费用",
        creating: "创建订单中...",
        createOrder: "创建订单",
        
        // Status Messages
        walletConnectSuccess: "✓ 钱包连接成功！",
        walletConnectError: "连接失败:",
        installMetaMask: "请安装 MetaMask 钱包扩展！\n\n下载地址: https://metamask.io/",
        installMetaMaskMobile: "请安装 MetaMask 手机应用！\n\n从 App Store 或 Google Play 下载",
        mobileWalletGuide: "手机钱包指南",
        mobileWalletOptions: "手机端可以使用：",
        metamaskMobile: "MetaMask 手机应用",
        walletConnect: "WalletConnect（二维码）",
        trustWallet: "Trust Wallet",
        coinbaseWallet: "Coinbase Wallet",
        openInMetaMask: "在 MetaMask 中打开",
        scanQRCode: "扫描二维码连接",
        connecting: "连接中...",
        calculating: "计算中...",
        fareCalculated: "✓ 费用计算完成！距离: {distance} km，预估费用: ${fare} USD",
        submitting: "⏳ 正在提交交易，请在MetaMask中确认...",
        transactionSubmitted: "⏳ 交易已提交，等待确认... (哈希: {hash}...)",
        orderCreated: "✓ 订单创建成功！订单ID: {orderId}",
        orderCreateError: "创建订单失败:",
        contractNotInitialized: "合约未初始化，请先连接钱包并配置合约地址",
        contractAddressNotSet: "⚠️ 合约地址未配置！\n请先部署合约并设置地址。",
        
        // Order Info
        orderDetails: "📋 订单详情",
        orderId: "订单ID:",
        status: "状态:",
        passengerAddress: "乘客地址:",
        driverAddress: "司机地址:",
        notAccepted: "未接单",
        pickupLocation: "上车点:",
        destination: "目的地:",
        transactionHash: "交易哈希:",
        createdAt: "创建时间:",
        statusPending: "待接单",
        statusAccepted: "已接单",
        statusPickedUp: "已上车",
        statusCompleted: "已完成",
        statusCancelled: "已取消",
        
        // Language
        language: "语言",
        english: "English",
        chinese: "中文",
        systemMenu: "系统菜单",
        about: "关于",
        help: "帮助",
        contract: "合约",
        orders: "订单",
        ordersSubtitle: "您的行程历史",
        profile: "我的",
        profileSubtitle: "您的账户信息",
        all: "全部",
        pending: "待处理",
        completed: "已完成",
        cancelled: "已取消",
        loadingOrders: "加载订单中...",
        noOrders: "暂无订单",
        createFirstOrder: "创建您的第一个订单开始使用",
        user: "用户",
        passenger: "乘客",
        totalOrders: "总订单数",
        completedOrders: "已完成",
        totalSpent: "总消费",
        accountSettings: "账户设置",
        wallet: "钱包",
        network: "网络",
        clearCache: "清除缓存",
        clearCacheDesc: "清除存储的数据",
        personalInfo: "个人信息",
        nickname: "昵称",
        contactMethod: "联系方式",
        nicknameHint: "用于租赁订单的显示名称",
        contactHint: "司机如何联系您（电话、邮箱等）",
        saveProfile: "保存个人信息",
        contactInfo: "联系信息",
        
        cancelOrder: "取消订单",
        cancelConfirm: "确定要取消此订单吗？",
        cancelReason: "取消原因",
        orderCancelled: "订单已成功取消",
        cancelError: "取消订单失败:",
        gasWarning: "⚠️ 注意：此操作需要消耗 Gas 费用",
        gasEstimate: "预估 Gas:",
        gasCost: "预估费用:",
        gasConsumption: "Gas 消耗",
        
        // Fee Details
        feeDetails: "费用明细",
        feeDetailsTitle: "费用明细",
        orderAmount: "订单金额",
        platformFee: "平台费 (5%)",
        estimatedPlatformFee: "预估平台费 (5%)",
        gasFee: "Gas费用",
        estimatedGasFee: "预估Gas费用",
        netIncome: "净收入",
        actualIncome: "实际收入",
        estimatedNetIncome: "预估净收入",
        estimatedFeeDetails: "预估费用明细",
        estimatedOrderAmount: "预估订单金额",
        reference: "参考值",
        gasFeeNote: "注: Gas费用未包含在此计算中",
        actualFeeNote: "实际费用将在完成订单时确定",
        enterActualFare: "请输入实际费用（ETH）:",
        estimatedFareLabel: "预估费用:",
        
        // Driver App Specific
        driverApp: "司机端",
        driverAppSubtitle: "司机订单管理系统",
        currentBrowser: "当前浏览器:",
        driverCurrentAccountLabel: "当前司机账户:",
        driverAccountHint: "💡 提示：每个浏览器使用不同的MetaMask账户，但连接到同一个合约地址",
        driverSwitchAccount: "切换账户",
        driverSwitchAccountDesc: "切换MetaMask账户",
        driverWalletInfo: "钱包信息",
        driverNetworkInfo: "网络信息",
        driverRefreshPage: "刷新页面",
        metaMaskNotInstalled: "MetaMask未安装！",
        switchAccountFailed: "切换账户失败:",
        multiAccountHint: "💡 提示：检测到 {count} 个账户，可点击\"切换账户\"按钮切换",
        accountSwitched: "已切换账户",
        accountChanged: "账户已切换",
        noAccountSelected: "未选择账户",
        availableOrdersTitle: "可接订单",
        availableOrdersSubtitle: "等待接单的订单",
        myOrdersTitle: "我的订单",
        myOrdersSubtitle: "您已接受的订单",
        profileTitle: "个人资料",
        profileSubtitle: "您的司机账户信息",
        
        // Order Display
        orderNumber: "订单 #{orderId}",
        pickup: "上车点:",
        destination: "目的地:",
        category: "类别:",
        createdAtLabel: "创建时间:",
        acceptOrder: "接单",
        acceptingOrder: "接单中...",
        orderAccepted: "接单成功！订单 #{orderId} 已被您接受",
        acceptOrderConfirm: "确定要接单 #{orderId} 吗？",
        pickupPassenger: "已上车",
        pickingUp: "处理中...",
        pickupConfirmed: "已确认上车！订单 #{orderId}",
        pickupConfirm: "确认乘客已上车？订单 #{orderId}？",
        completeOrder: "完成订单",
        completing: "完成中...",
        orderCompleted: "订单完成！订单 #{orderId} 已完成",
        completeOrderConfirm: "确认完成订单 #{orderId}？",
        transactionSubmitted: "交易已提交，等待确认... (哈希: {hash}...)",
        currentAccount: "当前账户:",
        noAvailableOrders: "暂无可接订单",
        noAvailableOrdersHint: "当前没有待接单的订单",
        loadingOrdersFailed: "加载订单失败",
        refreshPage: "刷新页面",
        
        // Common
        copy: "复制",
        copied: "已复制到剪贴板:"
    }
};

// i18n 类
class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'en';
        this.translations = translations;
    }
    
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            this.updatePage();
        }
    }
    
    t(key, params = {}) {
        const translation = this.translations[this.currentLang]?.[key] || this.translations.en[key] || key;
        
        // 替换参数
        return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey] !== undefined ? params[paramKey] : match;
        });
    }
    
    updatePage() {
        // 更新所有带有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type !== 'submit' && element.type !== 'button') {
                element.placeholder = text;
            } else if (element.tagName === 'LABEL') {
                element.textContent = text;
            } else {
                element.textContent = text;
            }
        });
        
        // 更新页面标题
        document.title = `${this.t('title')} - ${this.t('subtitle')}`;
    }
}

// 创建全局实例
const i18n = new I18n();

