/**
 * 交互式教程系统 (Tour System)
 * 用于提供分步引导、关键功能提示和操作验证
 */
const Tour = {
    steps: [],
    currentStepIndex: 0,
    isActive: false,
    options: {
        id: 'default-tour',
        showSkip: true,
        showProgress: true,
        onEnd: null
    },

    /**
     * 初始化教程
     * @param {Array} steps - 步骤配置数组
     * @param {Object} options - 配置选项
     */
    init(steps, options = {}) {
        this.steps = steps;
        this.options = { ...this.options, ...options };
        this.currentStepIndex = 0;
    },

    /**
     * 检查教程是否已完成
     */
    isCompleted() {
        return localStorage.getItem(`tour_completed_${this.options.id}`) === 'true';
    },

    /**
     * 重置教程状态
     */
    reset() {
        localStorage.removeItem(`tour_completed_${this.options.id}`);
    },

    /**
     * 开始教程
     */
    start() {
        if (this.steps.length === 0) return;
        
        this.isActive = true;
        this.showStep(0);
        
        // 绑定事件
        document.addEventListener('keydown', this.handleKeydown);
        window.addEventListener('resize', this.handleResize);
    },

    /**
     * 显示指定步骤
     */
    showStep(index) {
        if (index < 0 || index >= this.steps.length) {
            this.end();
            return;
        }

        this.currentStepIndex = index;
        const step = this.steps[index];
        
        // 尝试找到目标元素
        // 如果 step.element 是函数，则执行它获取选择器或元素
        let targetSelector = typeof step.element === 'function' ? step.element() : step.element;
        let target = null;
        
        if (targetSelector) {
            target = typeof targetSelector === 'string' ? document.querySelector(targetSelector) : targetSelector;
        }

        // 移除旧的高亮和提示
        this.clearHighlight();
        this.removeTooltip();

        // 无论是否找到 target，都显示 tooltip (如果找不到 target，就居中显示)
        // 但如果配置了必须依赖 target，则可能会有问题。这里假设没有 target 就居中显示通用提示。
        
        if (target) {
            // 滚动到目标元素
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 等待滚动完成后显示
            setTimeout(() => {
                if (this.isActive && this.currentStepIndex === index) {
                    this.highlightElement(target);
                    this.showTooltip(target, step);
                }
            }, 300);
        } else {
            this.showTooltip(null, step);
        }
    },

    /**
     * 高亮目标元素
     */
    highlightElement(element) {
        const rect = element.getBoundingClientRect();
        
        // 创建一个高亮框
        const highlightBox = document.createElement('div');
        highlightBox.id = 'tour-highlight-box';
        highlightBox.style.position = 'fixed';
        highlightBox.style.top = `${rect.top - 5}px`;
        highlightBox.style.left = `${rect.left - 5}px`;
        highlightBox.style.width = `${rect.width + 10}px`;
        highlightBox.style.height = `${rect.height + 10}px`;
        highlightBox.style.borderRadius = '8px';
        // 使用巨大的阴影作为遮罩，模拟 spotlight 效果
        highlightBox.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.75)'; 
        highlightBox.style.zIndex = '9998'; 
        highlightBox.style.pointerEvents = 'none'; // 允许点击穿透
        highlightBox.style.transition = 'all 0.3s ease';
        // 添加一个发光的边框
        highlightBox.style.border = '2px solid rgba(255, 255, 255, 0.8)';
        
        document.body.appendChild(highlightBox);
    },

    /**
     * 显示提示框
     */
    showTooltip(target, step) {
        const tooltip = document.createElement('div');
        tooltip.id = 'tour-tooltip';
        tooltip.className = 'fixed bg-white/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-white/20 fade-in-up z-[9999] max-w-sm';
        
        // 内容
        let html = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="font-bold text-lg text-indigo-600">${step.title}</h3>
                <span class="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">${this.currentStepIndex + 1}/${this.steps.length}</span>
            </div>
            <div class="text-slate-600 text-sm mb-6 leading-relaxed">
                ${step.content}
            </div>
            <div class="flex justify-between items-center">
                <button onclick="Tour.skip()" class="text-slate-400 hover:text-slate-600 text-sm font-medium transition">跳过教程</button>
                <div class="flex space-x-3">
                    ${this.currentStepIndex > 0 ? `<button onclick="Tour.prev()" class="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition">上一步</button>` : ''}
                    <button onclick="Tour.next()" class="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm hover:shadow-lg font-bold transition flex items-center">
                        ${this.currentStepIndex === this.steps.length - 1 ? '完成体验' : '下一步 <i class="fa-solid fa-arrow-right ml-2 text-xs"></i>'}
                    </button>
                </div>
            </div>
        `;
        
        // 如果有箭头指向
        html += `<div id="tour-arrow" class="absolute w-4 h-4 bg-white/95 border-l border-t border-white/20 transform rotate-45"></div>`;
        
        tooltip.innerHTML = html;
        document.body.appendChild(tooltip);
        
        const arrow = tooltip.querySelector('#tour-arrow');
        
        // 定位逻辑
        if (target) {
            const rect = target.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            const margin = 20; // 间距
            
            let top, left;
            let placement = step.placement || 'bottom'; // 默认下方
            
            // 简单的位置计算
            if (placement === 'bottom') {
                top = rect.bottom + margin;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                // 箭头位置
                if (arrow) {
                    arrow.style.top = '-8px';
                    arrow.style.left = '50%';
                    arrow.style.marginLeft = '-8px';
                }
            } else if (placement === 'top') {
                top = rect.top - tooltipRect.height - margin;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                if (arrow) {
                    arrow.style.bottom = '-8px';
                    arrow.style.left = '50%';
                    arrow.style.marginLeft = '-8px';
                    arrow.style.transform = 'rotate(225deg)';
                }
            } else if (placement === 'right') {
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + margin;
                if (arrow) {
                    arrow.style.left = '-8px';
                    arrow.style.top = '50%';
                    arrow.style.marginTop = '-8px';
                    arrow.style.transform = 'rotate(-45deg)';
                }
            } else if (placement === 'left') {
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - margin;
                if (arrow) {
                    arrow.style.right = '-8px';
                    arrow.style.top = '50%';
                    arrow.style.marginTop = '-8px';
                    arrow.style.transform = 'rotate(135deg)';
                }
            }

            // 边界检查与修正 (简单版)
            // 如果超出屏幕，尝试反向或者调整
            // 这里只做简单的水平/垂直修正
            if (left < 10) left = 10;
            if (left + tooltipRect.width > window.innerWidth - 10) left = window.innerWidth - tooltipRect.width - 10;
            if (top < 10) top = 10;
            if (top + tooltipRect.height > window.innerHeight - 10) top = window.innerHeight - tooltipRect.height - 10;

            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
        } else {
            // 居中显示
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            if (arrow) arrow.style.display = 'none';
        }
    },

    /**
     * 下一步
     */
    next() {
        this.showStep(this.currentStepIndex + 1);
    },

    /**
     * 上一步
     */
    prev() {
        this.showStep(this.currentStepIndex - 1);
    },

    /**
     * 跳过/结束
     */
    skip() {
        this.end();
    },

    /**
     * 结束教程
     */
    end() {
        this.isActive = false;
        this.clearHighlight();
        this.removeTooltip();
        
        document.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener('resize', this.handleResize);
        
        if (this.options.onEnd) {
            this.options.onEnd();
        }
        
        // 记录完成状态
        localStorage.setItem(`tour_completed_${this.options.id}`, 'true');
    },

    clearHighlight() {
        const box = document.getElementById('tour-highlight-box');
        if (box) box.remove();
    },

    removeTooltip() {
        const tooltip = document.getElementById('tour-tooltip');
        if (tooltip) tooltip.remove();
    },

    handleKeydown(e) {
        if (!Tour.isActive) return;
        if (e.key === 'ArrowRight') Tour.next();
        if (e.key === 'ArrowLeft') Tour.prev();
        if (e.key === 'Escape') Tour.skip();
    },
    
    handleResize() {
        if (Tour.isActive) {
            Tour.showStep(Tour.currentStepIndex);
        }
    }
};

window.Tour = Tour;
