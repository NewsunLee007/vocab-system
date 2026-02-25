/**
 * 新纪元英语词汇系统 - 奖励系统
 * 统一管理金币奖励逻辑，确保激励体系合理、均衡
 */
const RewardSystem = {
    // 奖励配置表
    CONFIG: {
        // 自主学习 (音形意用)
        LEARNING_PER_WORD: 1,      // 每个单词奖励
        LEARNING_COMPLETE_BONUS: 10, // 完成整组额外奖励
        
        // 卡片记忆
        FLASHCARD_PER_WORD: 1,     // 每个掌握的单词奖励
        FLASHCARD_COMPLETE_BONUS: 5, // 完成整组额外奖励

        // 学习检测 (根据准确率)
        TEST_PERFECT: 50,          // 100% 准确率
        TEST_EXCELLENT: 30,        // 90-99% 准确率
        TEST_GOOD: 15,             // 80-89% 准确率
        TEST_PASS: 5,              // 60-79% 准确率
        TEST_PARTICIPATION: 1,     // <60% 参与奖

        // 单词闯关 (游戏)
        GAME_3_STARS: 50,          // 三星通关
        GAME_2_STARS: 30,          // 二星通关
        GAME_1_STAR: 10,           // 一星通关
        
        // 每日签到
        DAILY_LOGIN: 5,            // 每日登录
        STREAK_BONUS: 2            // 连续签到每日递增 (上限20)
    },

    /**
     * 计算自主学习奖励
     * @param {number} wordCount - 学习单词数
     * @returns {number} 奖励金币数
     */
    calculateLearningReward(wordCount) {
        const base = wordCount * this.CONFIG.LEARNING_PER_WORD;
        return base + this.CONFIG.LEARNING_COMPLETE_BONUS;
    },

    /**
     * 计算卡片记忆奖励
     * @param {number} learnedCount - 掌握单词数
     * @returns {number} 奖励金币数
     */
    calculateFlashcardReward(learnedCount) {
        const base = learnedCount * this.CONFIG.FLASHCARD_PER_WORD;
        return base + (learnedCount > 0 ? this.CONFIG.FLASHCARD_COMPLETE_BONUS : 0);
    },

    /**
     * 计算测试奖励
     * @param {number} accuracy - 准确率 (0-100)
     * @returns {Object} { coins: number, level: string }
     */
    calculateTestReward(accuracy) {
        let coins = 0;
        let level = '';

        if (accuracy === 100) {
            coins = this.CONFIG.TEST_PERFECT;
            level = 'perfect';
        } else if (accuracy >= 90) {
            coins = this.CONFIG.TEST_EXCELLENT;
            level = 'excellent';
        } else if (accuracy >= 80) {
            coins = this.CONFIG.TEST_GOOD;
            level = 'good';
        } else if (accuracy >= 60) {
            coins = this.CONFIG.TEST_PASS;
            level = 'pass';
        } else {
            coins = this.CONFIG.TEST_PARTICIPATION;
            level = 'participation';
        }

        return { coins, level };
    },

    /**
     * 计算游戏奖励
     * @param {number} stars - 星级 (1-3)
     * @returns {number} 奖励金币数
     */
    calculateGameReward(stars) {
        switch (stars) {
            case 3: return this.CONFIG.GAME_3_STARS;
            case 2: return this.CONFIG.GAME_2_STARS;
            case 1: return this.CONFIG.GAME_1_STAR;
            default: return 0;
        }
    },

    /**
     * 发放奖励并显示通知
     * @param {string} studentId - 学生ID
     * @param {number} amount - 金币数量
     * @param {string} reason - 奖励原因
     */
    grantReward(studentId, amount, reason) {
        if (amount <= 0) return;

        // 调用 DB 更新金币
        db.addCoins(studentId, amount);
        
        // 显示全屏/浮动奖励动画 (这里简单使用 Toast，后续可升级为酷炫动画)
        this.showRewardAnimation(amount, reason);
    },

    /**
     * 显示奖励动画
     */
    showRewardAnimation(amount, reason) {
        // 创建一个临时的奖励覆盖层
        const rewardEl = document.createElement('div');
        rewardEl.className = 'fixed inset-0 flex items-center justify-center z-[10000] pointer-events-none animate-bounce-in';
        rewardEl.innerHTML = `
            <div class="bg-gradient-to-br from-amber-400 to-orange-500 p-1 rounded-3xl shadow-2xl transform scale-100 transition-transform">
                <div class="bg-white rounded-[20px] px-8 py-6 text-center relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-full bg-yellow-50 opacity-50"></div>
                    <div class="relative z-10">
                        <div class="text-6xl mb-2">🪙</div>
                        <div class="text-4xl font-black text-amber-500 mb-1">+${amount}</div>
                        <div class="text-slate-500 font-medium text-sm">${reason}</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(rewardEl);

        // 播放音效 (如果有)
        // helpers.playSound('coin');

        // 2秒后自动消失
        setTimeout(() => {
            rewardEl.classList.add('opacity-0', 'translate-y-[-50px]', 'transition-all', 'duration-500');
            setTimeout(() => rewardEl.remove(), 500);
        }, 2000);
    }
};

window.RewardSystem = RewardSystem;
