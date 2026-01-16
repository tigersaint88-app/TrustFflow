# TrustFlow 设计系统

统一的 UI 组件和交互规范，用于所有前端应用。

## 📦 文件结构

```
frontend/shared/
├── design-system.css    # 设计系统样式
├── design-system.js     # JavaScript 工具（Toast、Modal、Loading）
├── icons.js            # 图标库
└── README.md           # 本文档
```

## 🚀 快速开始

### 1. 引入文件

在 HTML 文件的 `<head>` 中引入 CSS：

```html
<link rel="stylesheet" href="../shared/design-system.css">
```

在 `</body>` 前引入 JavaScript：

```html
<script src="../shared/icons.js"></script>
<script src="../shared/design-system.js"></script>
```

### 2. 使用布局

#### 标准布局（左侧导航 + 顶部标题栏 + 右侧主内容）

```html
<div class="app-layout">
    <!-- 左侧导航栏 -->
    <aside class="sidebar">
        <div class="sidebar-header">
            <h2>TrustFlow</h2>
        </div>
        <nav class="sidebar-nav">
            <a href="#" class="sidebar-nav-item active">
                <span class="sidebar-nav-item-icon">🏠</span>
                首页
            </a>
            <a href="#" class="sidebar-nav-item">
                <span class="sidebar-nav-item-icon">📋</span>
                订单
            </a>
            <a href="#" class="sidebar-nav-item">
                <span class="sidebar-nav-item-icon">👤</span>
                用户
            </a>
        </nav>
    </aside>
    
    <!-- 主内容区域 -->
    <main class="main-content">
        <!-- 顶部标题栏 -->
        <header class="top-header">
            <h1 class="top-header-title">页面标题</h1>
            <div class="top-header-actions">
                <button class="btn btn-primary">操作</button>
            </div>
        </header>
        
        <!-- 内容区域 -->
        <div class="content-area">
            <!-- 使用卡片展示内容 -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">卡片标题</h3>
                    <p class="card-subtitle">卡片副标题</p>
                </div>
                <div class="card-body">
                    <p>卡片内容</p>
                </div>
            </div>
        </div>
    </main>
</div>
```

## 🎨 组件使用

### 按钮组件

#### Primary 按钮

```html
<button class="btn btn-primary">主要操作</button>
```

#### Secondary 按钮

```html
<button class="btn btn-secondary">次要操作</button>
```

#### Ghost 按钮

```html
<button class="btn btn-ghost">取消</button>
```

#### 按钮尺寸

```html
<button class="btn btn-primary btn-sm">小按钮</button>
<button class="btn btn-primary">默认按钮</button>
<button class="btn btn-primary btn-lg">大按钮</button>
```

### 表单组件

#### 带图标的输入框

```html
<div class="form-group">
    <label class="form-label">地址</label>
    <div class="form-input-wrapper">
        <span class="form-input-icon">
            <svg>...</svg> <!-- 或使用 window.getIcon('location') -->
        </span>
        <input type="text" class="form-input" placeholder="请输入地址">
    </div>
</div>
```

#### 使用图标库

```html
<div class="form-input-wrapper">
    <span class="form-input-icon">
        ${window.getIcon('location')}
    </span>
    <input type="text" class="form-input" placeholder="请输入地址">
</div>
```

#### 选择框

```html
<div class="form-group">
    <label class="form-label">状态</label>
    <select class="form-select">
        <option>选项1</option>
        <option>选项2</option>
    </select>
</div>
```

### 状态徽章

```html
<span class="badge badge-created">CREATED</span>
<span class="badge badge-accepted">ACCEPTED</span>
<span class="badge badge-in-progress">IN_PROGRESS</span>
<span class="badge badge-completed">COMPLETED</span>
<span class="badge badge-settled">SETTLED</span>
```

### 卡片组件

```html
<div class="card">
    <div class="card-header">
        <h3 class="card-title">订单信息</h3>
        <p class="card-subtitle">订单 #12345</p>
    </div>
    <div class="card-body">
        <p>订单详情内容</p>
    </div>
    <div class="card-footer">
        <button class="btn btn-ghost">取消</button>
        <button class="btn btn-primary">确认</button>
    </div>
</div>
```

## 💬 交互组件

### Toast 通知

```javascript
// 成功通知
window.toast.success('操作成功！');

// 错误通知
window.toast.error('操作失败，请重试');

// 警告通知
window.toast.warning('请注意此操作');

// 信息通知
window.toast.info('这是一条信息');

// 带标题的通知
window.toast.success('订单已创建', '成功');
```

### Modal 模态框

#### 基本用法

```javascript
window.modalManager.show({
    title: '确认操作',
    content: '<p>确定要执行此操作吗？</p>',
    buttons: [
        {
            label: '取消',
            type: 'ghost',
            onClick: () => console.log('取消')
        },
        {
            label: '确认',
            type: 'primary',
            onClick: () => console.log('确认')
        }
    ]
});
```

#### 确认对话框

```javascript
window.modalManager.confirm(
    '确定要删除此订单吗？',
    () => {
        // 确认后的操作
        console.log('已确认');
        window.toast.success('订单已删除');
    },
    () => {
        // 取消后的操作（可选）
        console.log('已取消');
    }
);
```

#### 大尺寸模态框

```javascript
window.modalManager.show({
    title: '详细信息',
    content: '<p>大量内容...</p>',
    large: true,
    buttons: [...]
});
```

### Loading 加载动画

```javascript
// 显示加载动画
window.loadingManager.show('加载中...');

// 执行异步操作
await someAsyncOperation();

// 隐藏加载动画
window.loadingManager.hide();
```

### 异步操作包装器

自动处理 loading 和 toast：

```javascript
await window.withLoadingAndToast(
    async () => {
        // 你的异步操作
        const result = await fetch('/api/orders');
        return result.json();
    },
    {
        loadingMessage: '正在创建订单...',
        successMessage: '订单创建成功！',
        errorMessage: '订单创建失败，请重试',
        onSuccess: (result) => {
            console.log('成功:', result);
        },
        onError: (error) => {
            console.error('失败:', error);
        }
    }
);
```

## 📱 响应式设计

在移动端，侧边栏会自动隐藏，需要通过菜单按钮打开。

```javascript
// 打开侧边栏
document.querySelector('.sidebar').classList.add('open');
document.querySelector('.sidebar-overlay').classList.add('active');

// 关闭侧边栏
document.querySelector('.sidebar').classList.remove('open');
document.querySelector('.sidebar-overlay').classList.remove('active');
```

## 🎯 布局规范

- **统一间距**: 所有组件使用 24px 作为基础间距
- **卡片展示**: 订单、用户、结算信息使用卡片组件
- **响应式**: 支持桌面端和移动端

## 🎨 设计规范

### 按钮规范

- **Primary**: 主要操作，使用品牌色
- **Secondary**: 次要操作，使用灰色
- **Ghost**: 取消或低优先级操作，透明背景

### 状态徽章颜色

- **CREATED**: 灰色 (#9ca3af)
- **ACCEPTED**: 靛蓝色 (#6366f1)
- **IN_PROGRESS**: 黄色 (#eab308)
- **COMPLETED**: 绿色 (#10b981)
- **SETTLED**: 蓝色 (#3b82f6)

### 交互规范

- **异步操作**: 显示 loading spinner
- **提交操作**: 显示 toast 成功或失败
- **关键确认**: 使用 modal 弹出框（开始行程、结束行程、结算）

## 📚 更多示例

查看各应用的实际使用示例：

- `frontend/platform-dashboard/index.html`
- `frontend/driver-app/index.html`
- `frontend/passenger-app/index.html`

## 🔧 自定义

所有颜色、间距、圆角等都可以通过 CSS 变量自定义：

```css
:root {
    --primary-color: #635bff;
    --spacing-lg: 24px;
    --radius-md: 8px;
    /* ... */
}
```

## 📝 注意事项

1. 确保在引入 `design-system.js` 之前先引入 `icons.js`
2. Toast 和 Modal 会自动添加到页面中，无需手动创建容器
3. Loading 动画会阻止用户交互，适合长时间操作
4. 所有组件都支持响应式，移动端会自动适配

