/**
 * TrustFlow 设计系统 JavaScript 工具
 * 提供 Toast、Modal、Loading 等组件的功能
 */

/**
 * Toast 通知管理器
 */
class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // 创建 Toast 容器
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    }

    /**
     * 显示 Toast 通知
     * @param {string} message - 消息内容
     * @param {string} type - 类型: 'success' | 'error' | 'warning' | 'info'
     * @param {string} title - 标题（可选）
     * @param {number} duration - 显示时长（毫秒），0 表示不自动关闭
     */
    show(message, type = 'info', title = null, duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // 图标 SVG
        const iconMap = {
            success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 6l-8 8-4-4"/></svg>`,
            error: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 10l4 4m0-4l-4 4M6 10l4-4m0 4l-4-4"/></svg>`,
            warning: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 6v4m0 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
            info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
        };

        toast.innerHTML = `
            <div class="toast-icon">${iconMap[type] || iconMap.info}</div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 4l-8 8M4 4l8 8"/>
                </svg>
            </button>
        `;

        this.container.appendChild(toast);

        // 自动关闭
        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    }

    success(message, title = null, duration = 5000) {
        return this.show(message, 'success', title, duration);
    }

    error(message, title = null, duration = 7000) {
        return this.show(message, 'error', title, duration);
    }

    warning(message, title = null, duration = 6000) {
        return this.show(message, 'warning', title, duration);
    }

    info(message, title = null, duration = 5000) {
        return this.show(message, 'info', title, duration);
    }
}

/**
 * Modal 管理器
 */
class ModalManager {
    constructor() {
        this.currentModal = null;
    }

    /**
     * 显示模态框
     * @param {Object} options - 配置选项
     * @param {string} options.title - 标题
     * @param {string} options.content - 内容（HTML）
     * @param {Array} options.buttons - 按钮配置 [{label, onClick, type}]
     * @param {boolean} options.closable - 是否可关闭（默认 true）
     * @param {boolean} options.large - 是否大尺寸（默认 false）
     */
    show({ title, content, buttons = [], closable = true, large = false }) {
        // 关闭现有模态框
        if (this.currentModal) {
            this.close();
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = `modal ${large ? 'modal-large' : ''}`;

        const buttonHTML = buttons.map(btn => {
            const type = btn.type || 'primary';
            return `<button class="btn btn-${type}" onclick="window.currentModalAction = () => { ${btn.onClick.toString()}(); window.modalManager.close(); }">${btn.label}</button>`;
        }).join('');

        modal.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
                ${closable ? '<button class="modal-close-btn" onclick="window.modalManager.close()">×</button>' : ''}
            </div>
            <div class="modal-body">
                ${content}
            </div>
            ${buttons.length > 0 ? `
                <div class="modal-footer">
                    ${buttonHTML}
                </div>
            ` : ''}
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        this.currentModal = overlay;

        // 点击背景关闭
        if (closable) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close();
                }
            });
        }

        // ESC 键关闭
        if (closable) {
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.close();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }

        // 执行按钮点击处理
        setTimeout(() => {
            if (window.currentModalAction) {
                const action = window.currentModalAction;
                window.currentModalAction = null;
                modal.querySelectorAll('.btn').forEach((btn, index) => {
                    if (buttons[index] && buttons[index].onClick) {
                        btn.addEventListener('click', () => {
                            buttons[index].onClick();
                            this.close();
                        });
                    }
                });
            }
        }, 0);

        return overlay;
    }

    /**
     * 确认对话框
     * @param {string} message - 消息内容
     * @param {Function} onConfirm - 确认回调
     * @param {Function} onCancel - 取消回调（可选）
     */
    confirm(message, onConfirm, onCancel = null) {
        return this.show({
            title: '确认操作',
            content: `<p style="margin: 0; color: var(--gray-700);">${message}</p>`,
            buttons: [
                {
                    label: '取消',
                    type: 'ghost',
                    onClick: () => { if (onCancel) onCancel(); }
                },
                {
                    label: '确认',
                    type: 'primary',
                    onClick: () => { onConfirm(); }
                }
            ]
        });
    }

    close() {
        if (this.currentModal) {
            this.currentModal.classList.add('hidden');
            setTimeout(() => {
                if (this.currentModal && this.currentModal.parentNode) {
                    this.currentModal.parentNode.removeChild(this.currentModal);
                }
                this.currentModal = null;
            }, 200);
        }
    }
}

/**
 * Loading 管理器
 */
class LoadingManager {
    constructor() {
        this.overlay = null;
    }

    /**
     * 显示加载动画
     * @param {string} message - 加载消息
     */
    show(message = '加载中...') {
        if (this.overlay) {
            this.hide();
        }

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner loading-spinner-large"></div>
                ${message ? `<div class="loading-text">${message}</div>` : ''}
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlay = overlay;
    }

    /**
     * 隐藏加载动画
     */
    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

/**
 * 异步操作包装器 - 自动显示 loading 和 toast
 * @param {Function} asyncFn - 异步函数
 * @param {Object} options - 配置选项
 */
async function withLoadingAndToast(asyncFn, options = {}) {
    const {
        loadingMessage = '处理中...',
        successMessage = '操作成功',
        errorMessage = '操作失败',
        showLoading = true,
        showToast = true,
        onSuccess = null,
        onError = null
    } = options;

    const loadingManager = new LoadingManager();
    const toastManager = new ToastManager();

    try {
        if (showLoading) {
            loadingManager.show(loadingMessage);
        }

        const result = await asyncFn();

        if (showLoading) {
            loadingManager.hide();
        }

        if (showToast && successMessage) {
            toastManager.success(successMessage);
        }

        if (onSuccess) {
            onSuccess(result);
        }

        return result;
    } catch (error) {
        if (showLoading) {
            loadingManager.hide();
        }

        const errorMsg = errorMessage || error.message || '操作失败';
        if (showToast) {
            toastManager.error(errorMsg);
        }

        if (onError) {
            onError(error);
        } else {
            console.error('操作失败:', error);
        }

        throw error;
    }
}

// 初始化全局实例
const toastManager = new ToastManager();
const modalManager = new ModalManager();
const loadingManager = new LoadingManager();

// 导出到全局
window.toastManager = toastManager;
window.modalManager = modalManager;
window.loadingManager = loadingManager;
window.withLoadingAndToast = withLoadingAndToast;

// 便捷方法
window.toast = {
    success: (msg, title) => toastManager.success(msg, title),
    error: (msg, title) => toastManager.error(msg, title),
    warning: (msg, title) => toastManager.warning(msg, title),
    info: (msg, title) => toastManager.info(msg, title)
};

