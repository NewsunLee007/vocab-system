/**
 * 错误处理模块 - 提供统一的错误处理和用户反馈机制
 */

const errorHandler = {
    // 错误类型定义
    errorTypes: {
        NETWORK: 'network',
        VALIDATION: 'validation',
        STORAGE: 'storage',
        PERMISSION: 'permission',
        UNKNOWN: 'unknown'
    },

    // 错误消息模板
    errorMessages: {
        network: {
            title: '网络连接错误',
            message: '请检查网络连接后重试',
            icon: 'fa-wifi',
            color: 'text-red-500'
        },
        validation: {
            title: '数据验证错误',
            message: '输入数据格式不正确，请检查后重试',
            icon: 'fa-exclamation-triangle',
            color: 'text-yellow-500'
        },
        storage: {
            title: '数据存储错误',
            message: '数据保存失败，请稍后重试',
            icon: 'fa-database',
            color: 'text-orange-500'
        },
        permission: {
            title: '权限错误',
            message: '您没有执行此操作的权限',
            icon: 'fa-lock',
            color: 'text-purple-500'
        },
        unknown: {
            title: '未知错误',
            message: '发生未知错误，请联系技术支持',
            icon: 'fa-question-circle',
            color: 'text-gray-500'
        }
    },

    /**
     * 处理错误
     */
    handle(error, context = '') {
        console.error(`[ErrorHandler] ${context}:`, error);
        
        const errorType = this.categorizeError(error);
        const errorConfig = this.errorMessages[errorType];
        
        // 显示用户友好的错误提示
        this.showErrorNotification(errorConfig, error.message);
        
        // 记录错误日志
        this.logError(error, context, errorType);
        
        // 返回标准化的错误对象
        return {
            type: errorType,
            message: error.message || errorConfig.message,
            timestamp: new Date().toISOString(),
            context: context
        };
    },

    /**
     * 分类错误类型
     */
    categorizeError(error) {
        if (error.name === 'NetworkError' || error.message?.includes('network')) {
            return this.errorTypes.NETWORK;
        }
        if (error.name === 'ValidationError' || error.message?.includes('validation')) {
            return this.errorTypes.VALIDATION;
        }
        if (error.name === 'StorageError' || error.message?.includes('storage')) {
            return this.errorTypes.STORAGE;
        }
        if (error.name === 'PermissionError' || error.message?.includes('permission')) {
            return this.errorTypes.PERMISSION;
        }
        return this.errorTypes.UNKNOWN;
    },

    /**
     * 显示错误通知
     */
    showErrorNotification(errorConfig, details = '') {
        const notificationHtml = `
            <div id="error-notification" class="fixed top-4 right-4 z-50 max-w-sm">
                <div class="bg-white rounded-lg shadow-lg border-l-4 border-red-500 p-4">
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            <i class="fa-solid ${errorConfig.icon} ${errorConfig.color} text-xl"></i>
                        </div>
                        <div class="ml-3 flex-1">
                            <h3 class="text-sm font-medium text-gray-900">${errorConfig.title}</h3>
                            <p class="text-sm text-gray-500 mt-1">${errorConfig.message}</p>
                            ${details ? `<p class="text-xs text-gray-400 mt-2">${details}</p>` : ''}
                        </div>
                        <div class="ml-4 flex-shrink-0">
                            <button onclick="document.getElementById('error-notification').remove()" 
                                class="text-gray-400 hover:text-gray-600 transition">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除现有通知
        const existing = document.getElementById('error-notification');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', notificationHtml);
        
        // 自动隐藏通知
        setTimeout(() => {
            const notification = document.getElementById('error-notification');
            if (notification) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    },

    /**
     * 记录错误日志
     */
    logError(error, context, type) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            type: type,
            context: context,
            message: error.message,
            stack: error.stack,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // 保存到本地存储
        const logs = this.getErrorLogs();
        logs.push(errorLog);
        
        // 限制日志数量
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        helpers.memoryStore.set('errorLogs', logs);
        
        // 发送到后端（如果有的话）
        this.sendErrorLogToServer(errorLog);
    },

    /**
     * 获取错误日志
     */
    getErrorLogs() {
        try {
            const logs = helpers.memoryStore.get('errorLogs');
            return Array.isArray(logs) ? logs : [];
        } catch (error) {
            console.error('Failed to parse error logs:', error);
            return [];
        }
    },

    /**
     * 发送错误日志到服务器
     */
    sendErrorLogToServer(errorLog) {
        // 这里可以添加发送到服务器的逻辑
        // 例如：fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorLog) })
        console.log('Error log would be sent to server:', errorLog);
    },

    /**
     * 显示加载状态
     */
    showLoading(message = '加载中...') {
        const existing = document.getElementById('loading-overlay');
        if (existing) {
            const p = existing.querySelector('p');
            if (p) p.textContent = message;
            return;
        }
        const loadingHtml = `
            <div id="loading-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p class="text-gray-700 font-medium">${message}</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHtml);
    },

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        const overlays = document.querySelectorAll('#loading-overlay');
        overlays.forEach(overlay => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        });
    },

    /**
     * 显示成功消息
     */
    showSuccess(message, duration = 3000) {
        const successHtml = `
            <div id="success-notification" class="fixed top-4 right-4 z-50 max-w-sm">
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            <i class="fa-solid fa-check-circle text-green-500 text-xl"></i>
                        </div>
                        <div class="ml-3 flex-1">
                            <h3 class="text-sm font-medium text-green-800">操作成功</h3>
                            <p class="text-sm text-green-600 mt-1">${message}</p>
                        </div>
                        <div class="ml-4 flex-shrink-0">
                            <button onclick="document.getElementById('success-notification').remove()" 
                                class="text-green-400 hover:text-green-600 transition">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除现有通知
        const existing = document.getElementById('success-notification');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', successHtml);
        
        // 自动隐藏通知
        setTimeout(() => {
            const notification = document.getElementById('success-notification');
            if (notification) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    },

    /**
     * 网络连接检查
     */
    checkNetworkConnection() {
        if (!navigator.onLine) {
            this.handle(new Error('Network connection lost'), 'Network check');
            return false;
        }
        return true;
    },

    /**
     * 数据验证
     */
    validateData(data, schema) {
        const errors = [];
        
        for (const [key, rules] of Object.entries(schema)) {
            const value = data[key];
            
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${key} is required`);
            }
            
            if (value && rules.type && typeof value !== rules.type) {
                errors.push(`${key} must be of type ${rules.type}`);
            }
            
            if (value && rules.pattern && !rules.pattern.test(value)) {
                errors.push(`${key} format is invalid`);
            }
        }
        
        if (errors.length > 0) {
            const error = new Error(`Validation failed: ${errors.join(', ')}`);
            error.name = 'ValidationError';
            throw error;
        }
        
        return true;
    },

    /**
     * 清理错误日志
     */
    clearErrorLogs() {
        helpers.memoryStore.remove('errorLogs');
        console.log('Error logs cleared');
    }
};

// 全局错误处理
window.addEventListener('error', (event) => {
    errorHandler.handle(event.error, 'Global error handler');
});

window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handle(new Error(`Unhandled promise rejection: ${event.reason}`), 'Promise rejection');
});

// 网络连接状态监听
window.addEventListener('online', () => {
    errorHandler.showSuccess('网络连接已恢复');
});

window.addEventListener('offline', () => {
    errorHandler.showErrorNotification({
        title: '网络连接断开',
        message: '您当前处于离线状态，部分功能可能无法使用',
        icon: 'fa-wifi',
        color: 'text-orange-500'
    });
});

// 导出错误处理模块
window.errorHandler = errorHandler;
