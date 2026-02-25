/**
 * ESL词汇学习系统 - 检测引擎模块
 * 专门处理检测流程，不包含学习阶段
 */

const testEngine = {
    state: {
        words: [],
        modes: [],
        currentModeIndex: 0,
        results: {},
        completedModes: [],
        totalCoins: 0,
        taskId: null,
        onComplete: null
    },

    modeConfig: {
        'context': { name: '场景语境选择', description: '锻炼结合上下文推断词义的能力', icon: 'fa-book-open', color: 'indigo' },
        'spelling': { name: '听音拼写填空', description: '考查发音与拼写的绝对准确率', icon: 'fa-headphones', color: 'amber' },
        'matching': { name: '词义匹配', description: '快速识别单词与中文释义的对应关系', icon: 'fa-link', color: 'emerald' },
        'flashcard': { name: '卡片认知', description: '通过翻转卡片加深词汇记忆', icon: 'fa-clone', color: 'purple' }
    },

    /**
     * 开始检测
     */
    start(words, modes, taskId, onComplete) {
        this.state.words = helpers.shuffle([...words]);
        this.state.modes = modes;
        this.state.currentModeIndex = 0;
        this.state.results = {};
        this.state.completedModes = [];
        this.state.totalCoins = 0;
        this.state.taskId = taskId;
        this.state.onComplete = onComplete;

        this.startCurrentMode();
    },

    /**
     * 开始当前模式
     */
    startCurrentMode() {
        if (this.state.currentModeIndex >= this.state.modes.length) {
            this.showComplete();
            return;
        }

        const mode = this.state.modes[this.state.currentModeIndex];
        const config = this.modeConfig[mode];

        this.showModeTransition(config);
    },

    /**
     * 显示模式过渡界面
     */
    showModeTransition(config) {
        const transitionHtml = `
            <div id="mode-transition" class="fixed inset-0 bg-slate-900 bg-opacity-80 flex items-center justify-center z-50 fade-in">
                <div class="text-center text-white">
                    <div class="w-24 h-24 rounded-full bg-${config.color}-500 flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <i class="fa-solid ${config.icon} text-4xl"></i>
                    </div>
                    <h2 class="text-3xl font-bold mb-2">第 ${this.state.currentModeIndex + 1} 关</h2>
                    <h3 class="text-2xl font-bold text-${config.color}-300 mb-4">${config.name}</h3>
                    <p class="text-slate-300 mb-8">${config.description}</p>
                    <div class="text-sm text-slate-400">
                        <span class="inline-block w-3 h-3 rounded-full bg-${config.color}-400 mr-2"></span>
                        准备中...
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', transitionHtml);

        setTimeout(() => {
            const transition = document.getElementById('mode-transition');
            if (transition) transition.remove();
            
            this.launchMode(this.state.modes[this.state.currentModeIndex]);
        }, 500);
    },

    /**
     * 启动具体检测模式
     */
    launchMode(mode) {
        switch (mode) {
            case 'context':
                contextTest.start(this.state.words, (result) => this.onModeComplete(result));
                break;
            case 'spelling':
                spellingTest.start(this.state.words, (result) => this.onModeComplete(result));
                break;
            case 'matching':
                matchingTest.start(this.state.words, (result) => this.onModeComplete(result));
                break;
            case 'flashcard':
                flashcardLearning.start(this.state.words, (result) => this.onModeComplete(result), { teacherId: this.state.wordlist?.teacherId, wordlistId: this.state.wordlist?.id });
                break;
            default:
                contextTest.start(this.state.words, (result) => this.onModeComplete(result));
        }
    },

    /**
     * 模式完成回调
     */
    onModeComplete(result) {
        const mode = this.state.modes[this.state.currentModeIndex];
        this.state.results[mode] = result;
        
        // 计算奖励
        const reward = RewardSystem.calculateTestReward(result.accuracy);
        this.state.totalCoins += reward.coins;
        
        // 记录结果
        result.coins = reward.coins;
        
        if (result.accuracy >= 60) {
            this.state.completedModes.push(mode);
        }

        if (result.weakWords && result.weakWords.length > 0) {
            this.addWeakWordsToDifficultList(result.weakWords);
        }

        this.showModeComplete(result);
    },

    /**
     * 将薄弱词汇添加到难词清单
     */
    addWeakWordsToDifficultList(weakWords) {
        const user = auth.getCurrentUser();
        if (!user || !weakWords || weakWords.length === 0) return;

        let difficultWords = db.getDifficultWords(user.id) || [];
        
        weakWords.forEach(word => {
            const exists = difficultWords.find(dw => dw.word === word);
            if (!exists) {
                const wordData = db.findWord(word);
                difficultWords.push({
                    word: word,
                    meaning: wordData?.meaning || '',
                    phonetic: wordData?.phonetic || '',
                    addedAt: Date.now(),
                    errorCount: 1
                });
            } else {
                exists.errorCount = (exists.errorCount || 1) + 1;
                exists.lastErrorAt = Date.now();
            }
        });

        db.saveDifficultWords(user.id, difficultWords);
    },

    /**
     * 显示模式完成界面
     */
    showModeComplete(result) {
        const config = this.modeConfig[this.state.modes[this.state.currentModeIndex]];
        const completedCount = this.state.completedModes.length;
        const totalModes = this.state.modes.length;
        const hasPassed = completedCount >= 2;
        const hasMore = this.state.currentModeIndex < totalModes - 1;
        
        let statusBadge = '';
        if (hasPassed) {
            statusBadge = `<div class="text-emerald-500 text-sm mb-2"><i class="fa-solid fa-trophy mr-1"></i>已过关！</div>`;
        }
        
        let buttons = '';
        if (hasPassed && hasMore) {
            buttons = `
                <div class="space-y-2">
                    <button onclick="testEngine.finish()" class="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition">
                        <i class="fa-solid fa-check mr-2"></i>完成任务
                    </button>
                    <button onclick="testEngine.nextMode()" class="w-full bg-${config.color}-100 text-${config.color}-700 font-bold py-3 rounded-xl hover:bg-${config.color}-200 transition">
                        继续挑战下一关 <i class="fa-solid fa-arrow-right ml-2"></i>
                    </button>
                </div>
            `;
        } else if (hasMore) {
            buttons = `
                <button onclick="testEngine.nextMode()" class="w-full bg-${config.color}-500 text-white font-bold py-3 rounded-xl hover:bg-${config.color}-600 transition">
                    下一关 <i class="fa-solid fa-arrow-right ml-2"></i>
                </button>
            `;
        } else {
            buttons = `
                <button onclick="testEngine.finish()" class="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition">
                    <i class="fa-solid fa-flag-checkered mr-2"></i>查看总成绩
                </button>
            `;
        }
        
        const completeHtml = `
            <div id="mode-complete" class="fixed inset-0 bg-slate-900 bg-opacity-80 flex items-center justify-center z-50 fade-in">
                <div class="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl m-4 text-center">
                    <div class="w-20 h-20 rounded-full bg-${config.color}-100 flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-check text-${config.color}-600 text-3xl"></i>
                    </div>
                    ${statusBadge}
                    <h3 class="text-xl font-bold text-slate-800 mb-2">${config.name}</h3>
                    <p class="text-slate-500 mb-4">完成！(${completedCount}/${totalModes})</p>
                    
                    <div class="bg-slate-50 rounded-lg p-4 mb-6">
                        <div class="flex justify-between mb-2">
                            <span class="text-slate-600">正确率</span>
                            <span class="font-bold text-${config.color}-600">${result.accuracy}%</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-600">获得金币</span>
                            <span class="font-bold text-yellow-500">+${result.coins} 🪙</span>
                        </div>
                    </div>
                    
                    ${buttons}
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', completeHtml);
    },

    /**
     * 进入下一个模式
     */
    nextMode() {
        const complete = document.getElementById('mode-complete');
        if (complete) complete.remove();
        
        this.state.currentModeIndex++;
        this.startCurrentMode();
    },

    /**
     * 显示完成界面
     */
    showComplete() {
        let totalAccuracy = 0;
        let modeCount = 0;
        
        Object.values(this.state.results).forEach(result => {
            if (result.accuracy) {
                totalAccuracy += result.accuracy;
                modeCount++;
            }
        });
        
        const avgAccuracy = modeCount > 0 ? Math.round(totalAccuracy / modeCount) : 0;
        
        let evaluation = '';
        let emoji = '';
        if (avgAccuracy >= 90) {
            evaluation = '完美通关！';
            emoji = '🏆';
        } else if (avgAccuracy >= 80) {
            evaluation = '表现出色！';
            emoji = '🌟';
        } else if (avgAccuracy >= 60) {
            evaluation = '完成挑战！';
            emoji = '👍';
        } else {
            evaluation = '继续努力！';
            emoji = '💪';
        }

        const user = auth.getCurrentUser();
        db.addLearningLog({
            studentId: user.id,
            teacherId: user.teacherId,
            learnedCount: 0,
            reviewCount: this.state.words.length,
            correctRate: avgAccuracy,
            weakWord: this.getWeakWords(),
            taskType: 'test'
        });

        db.addCoins(user.id, this.state.totalCoins);

        const completeHtml = `
            <div id="test-complete" class="fixed inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center z-50">
                <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl m-4 text-center">
                    <div class="text-6xl mb-4">${emoji}</div>
                    <h2 class="text-2xl font-bold text-slate-800 mb-2">${evaluation}</h2>
                    <p class="text-slate-500 mb-6">已完成所有检测模式</p>
                    
                    <div class="bg-slate-50 rounded-xl p-6 mb-6">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="text-center">
                                <div class="text-3xl font-bold text-indigo-600">${avgAccuracy}%</div>
                                <div class="text-xs text-slate-500">综合正确率</div>
                            </div>
                            <div class="text-center">
                                <div class="text-3xl font-bold text-yellow-500">${this.state.totalCoins} 🪙</div>
                                <div class="text-xs text-slate-500">获得金币</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-2 mb-6">
                        ${this.state.modes.map(mode => {
                            const result = this.state.results[mode];
                            const config = this.modeConfig[mode];
                            return `
                                <div class="flex justify-between items-center p-2 bg-${config.color}-50 rounded-lg">
                                    <span class="text-sm text-slate-600"><i class="fa-solid ${config.icon} mr-2 text-${config.color}-500"></i>${config.name}</span>
                                    <span class="font-bold text-${config.color}-600">${result?.accuracy || 0}%</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <button onclick="testEngine.finish()" class="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition">
                        <i class="fa-solid fa-home mr-2"></i>返回首页
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', completeHtml);
        helpers.createParticles(document.getElementById('test-complete'), 50);
    },

    /**
     * 获取薄弱词汇
     */
    getWeakWords() {
        const weakWords = new Set();
        Object.values(this.state.results).forEach(result => {
            if (result.weakWords) {
                result.weakWords.forEach(word => weakWords.add(word));
            }
        });
        return weakWords.size > 0 ? Array.from(weakWords).join(', ') : '-';
    },

    /**
     * 完成检测
     */
    finish() {
        const complete = document.getElementById('mode-complete') || document.getElementById('test-complete');
        if (complete) complete.remove();
        
        // 发放总奖励
        const user = auth.getCurrentUser();
        if (user && this.state.totalCoins > 0) {
            RewardSystem.grantReward(user.id, this.state.totalCoins, '学习检测奖励');
        }

        if (this.state.onComplete) {
            this.state.onComplete({
                results: this.state.results,
                totalCoins: this.state.totalCoins,
                completedModes: this.state.completedModes
            });
        }
    }
};
