/**
 * TrustFlow 图标库
 * 提供常用的 SVG 图标
 */

const Icons = {
    // 用户相关
    user: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
    </svg>`,
    
    // 位置相关
    location: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 10a2 2 0 100-4 2 2 0 000 4z"/>
        <path fill-rule="evenodd" d="M10 18s-6-4.5-6-9a6 6 0 1112 0c0 4.5-6 9-6 9zm0-11a2 2 0 100-4 2 2 0 000 4z"/>
    </svg>`,
    
    // 搜索
    search: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 9m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0"/>
        <path d="m15 15 4 4"/>
    </svg>`,
    
    // 钱包
    wallet: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
        <path d="M14 10a2 2 0 11-4 0 2 2 0 014 0z"/>
    </svg>`,
    
    // 订单
    order: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4h12l-1 7H5L4 4z"/>
        <path d="M4 4l-1-2H2"/>
        <path d="M6 18a1 1 0 11-2 0 1 1 0 012 0zM17 18a1 1 0 11-2 0 1 1 0 012 0z"/>
    </svg>`,
    
    // 设置
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"/>
    </svg>`,
    
    // 日历
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="14" height="14" rx="2" ry="2"/>
        <path d="M16 2v4M8 2v4M3 10h14"/>
    </svg>`,
    
    // 时间
    clock: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="10" cy="10" r="8"/>
        <path d="M10 6v4l3 3"/>
    </svg>`,
    
    // 金额
    money: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 8c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z"/>
        <path d="M12 14v7M4 6v12M20 6v12"/>
    </svg>`,
    
    // 首页
    home: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
    </svg>`,
    
    // 历史记录
    history: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 18a8 8 0 100-16 8 8 0 000 16z"/>
        <path d="M10 6v4l3 3"/>
    </svg>`,
    
    // 通知
    bell: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
    </svg>`,
    
    // 菜单
    menu: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 5h14M3 10h14M3 15h14"/>
    </svg>`,
    
    // 关闭
    close: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 5L5 15M5 5l10 10"/>
    </svg>`,
    
    // 检查/确认
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 6l-8 8-4-4"/>
    </svg>`,
    
    // 编辑
    edit: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`,
    
    // 删除
    delete: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h14M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v10a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
    </svg>`,
    
    // 箭头
    arrowRight: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 10h10M10 5l5 5-5 5"/>
    </svg>`,
    
    arrowLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 10H5M10 5l-5 5 5 5"/>
    </svg>`
};

// 导出到全局
window.Icons = Icons;

// 获取图标 HTML 的便捷方法
window.getIcon = function(name) {
    return Icons[name] || '';
};

