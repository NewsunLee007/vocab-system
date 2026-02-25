/**
 * 新纪元英语词汇系统 - 工具函数
 */

const helpers = {
    /**
     * 生成唯一ID
     */
    generateId(prefix = '') {
        return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    /**
     * 获取今天日期 (YYYY-MM-DD)
     */
    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * 生成模拟IP地址
     */
    generateMockIP() {
        return '192.168.1.' + Math.floor(Math.random() * 255);
    },

    /**
     * 简单哈希函数（用于密码）
     */
    hash(str) {
        return btoa(str);
    },

    /**
     * 验证密码
     */
    verifyPassword(input, hashed) {
        return btoa(input) === hashed;
    },

    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 数组随机排序
     */
    shuffle(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },

    /**
     * 格式化数字（添加千分位）
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * 计算正确率
     */
    calculateAccuracy(correct, total) {
        if (total === 0) return 0;
        return Math.round((correct / total) * 100);
    },

    /**
     * 获取学习头衔
     */
    getTitle(coins) {
        if (coins >= 1000) return '词汇大师';
        if (coins >= 500) return '钻石学霸';
        if (coins >= 300) return '黄金达人';
        if (coins >= 100) return '青铜学者';
        return '词汇新手';
    },

    /**
     * 获取头衔颜色
     */
    getTitleColor(coins) {
        if (coins >= 1000) return 'bg-purple-500';
        if (coins >= 500) return 'bg-blue-500';
        if (coins >= 300) return 'bg-yellow-500';
        if (coins >= 100) return 'bg-orange-500';
        return 'bg-emerald-500';
    },

    /**
     * 日期格式化
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    },

    /**
     * 获取日期差
     */
    getDaysDiff(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    },

    /**
     * 显示加载动画
     */
    showLoading(text = '加载中...') {
        const hide = this.hideLoading;
        if (typeof hide === 'function') hide.call(this);
        
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] fade-in';
        loader.innerHTML = `
            <div class="bg-white/90 backdrop-blur rounded-2xl p-8 shadow-2xl text-center transform scale-100 animate-bounce-subtle">
                <div class="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p class="text-slate-700 font-medium">${text}</p>
            </div>
        `;
        document.body.appendChild(loader);
    },

    /**
     * 隐藏加载动画
     */
    hideLoading() {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (loader && loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
            }, 300);
        }
        
        // 强制移除所有可能残留的 loading 元素（通过 class 查找）
        const allLoaders = document.querySelectorAll('.fixed.inset-0.bg-slate-900\\/50.z-\\[100\\]');
        allLoaders.forEach(el => el.remove());
    },
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        const colors = {
            success: 'bg-emerald-500',
            error: 'bg-rose-500',
            warning: 'bg-amber-500',
            info: 'bg-indigo-500'
        };
        
        toast.className = `fixed top-20 left-1/2 transform -translate-x-1/2 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in`;
        toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>${message}`;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * 确认对话框
     */
    confirm(message, onConfirm, onCancel) {
        if (window.confirm(message)) {
            onConfirm && onConfirm();
        } else {
            onCancel && onCancel();
        }
    },

    /**
     * 创建金币动画
     */
    createCoinAnimation(container, amount) {
        const coin = document.createElement('div');
        coin.className = 'coin-pop';
        coin.innerHTML = `+${amount} <i class="fa-solid fa-coins"></i>`;
        container.appendChild(coin);
        
        setTimeout(() => {
            if (container.contains(coin)) {
                container.removeChild(coin);
            }
        }, 800);
    },

    /**
     * 创建粒子效果
     */
    createParticles(container, count = 10) {
        const colors = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = '50%';
            particle.style.animationDelay = Math.random() * 0.5 + 's';
            container.appendChild(particle);
            
            setTimeout(() => particle.remove(), 1000);
        }
    },

    /**
     * 深拷贝对象
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * 节流函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 从词表标题解析教材、年级、册别、单元信息
     * 支持格式：
     * - 人教版 七年级上册 Unit 1
     * - 七下 Unit 1 核心词汇
     * - 外研版 八年级 Unit 3 重点词汇
     * - 新概念 第1册 补充扩展
     */
    parseWordlistTitle(title) {
        const result = {
            textbook: '',
            grade: '',
            volume: '',
            unit: ''
        };
        
        if (!title) return result;
        
        // 解析教材
        const textbookMatch = title.match(/(人教版|外研版|牛津版|新概念|北师大版|苏教版|沪教版)/);
        if (textbookMatch) {
            result.textbook = textbookMatch[1];
        }
        
        // 解析年级
        const gradeMatch = title.match(/(七|八|九)年级/);
        const gradeShortMatch = title.match(/(七|八|九)(上|下)/);
        if (gradeMatch) {
            result.grade = gradeMatch[1] + '年级';
        } else if (gradeShortMatch) {
            result.grade = gradeShortMatch[1] + '年级';
        }
        
        // 解析册别
        const volumeMatch = title.match(/(上|下)册/);
        if (volumeMatch) {
            result.volume = volumeMatch[1] + '册';
        } else if (gradeShortMatch) {
            result.volume = gradeShortMatch[2] === '上' ? '上册' : '下册';
        }
        
        // 解析单元（更灵活，支持任意格式）
        const unitMatch = title.match(/Unit\s*(\d+|Starter|S)/i);
        if (unitMatch) {
            result.unit = unitMatch[1];
        } else {
            // 尝试匹配其他格式，如 "第1课", "Lesson 1", 或直接数字
            const otherUnitMatch = title.match(/(?:第|Lesson\s*)(\d+|S|Starter)/i) || 
                                   title.match(/\b(\d{1,2})\b/);
            if (otherUnitMatch) {
                result.unit = otherUnitMatch[1];
            } else if (title.includes('课外') || title.includes('扩展') || title.includes('补充')) {
                result.unit = '课外';
            }
        }
        
        return result;
    },

    /**
     * 统一格式化词表完整名称
     * 格式：[教材] [年级] [册别] [单元]
     */
    formatFullWordlistTitle(wl) {
        if (!wl) return '';

        // 如果 title 已经包含完整信息（如 "人教版 七年级上册 Unit 5"），优先直接格式化该字符串
        if (wl.title && wl.title.length > 10 && /[\u4e00-\u9fa5]/.test(wl.title)) {
            // 尝试标准化其中的单元部分
            return wl.title
                .replace(/Unit\s*(\d+)/gi, '第$1单元')
                .replace(/\s+(\d+)\s*$/, ' 第$1单元');
        }

        // 否则进行拼接
        const parts = [];
        
        if (wl.textbook) parts.push(wl.textbook);
        if (wl.grade) parts.push(wl.grade);
        if (wl.volume) parts.push(wl.volume);

        // 处理单元部分
        let unitStr = wl.unit || wl.title;
        if (unitStr) {
            // 提取数字
            const match = unitStr.match(/(\d+)/);
            if (match) {
                parts.push(`第${match[1]}单元`);
            } else {
                // 如果没有数字，原样保留（可能是"Starter"等）
                parts.push(unitStr);
            }
        }

        return parts.join(' ');
    },

    /**
     * 统一格式化单元显示为“第N单元”
     */
    formatUnitLabel(input) {
        if (!input) return '';
        const s = String(input).trim();
        if (/第\d+单元/.test(s)) return s;
        const unitNum = s.match(/Unit\s*(\d+)/i) || s.match(/(\d+)\s*$/);
        if (unitNum) {
            return `第${unitNum[1]}单元`;
        }
        return s.includes('单元') ? s : s; // 非数字保留原样
    },

    memoryStore: (() => {
        const map = new Map();
        return {
            set(key, value) {
                map.set(String(key), value);
                return true;
            },
            get(key, defaultValue = null) {
                const k = String(key);
                return map.has(k) ? map.get(k) : defaultValue;
            },
            remove(key) {
                return map.delete(String(key));
            },
            clear() {
                map.clear();
                return true;
            }
        };
    })()
};
