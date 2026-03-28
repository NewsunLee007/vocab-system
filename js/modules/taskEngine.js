/**
 * 新纪元英语词汇系统 - 任务引擎模块
 * 支持多种学习模式的组合执行
 */

const taskEngine = {
    // 当前任务状态
    state: {
        taskId: null,
        task: null,
        wordlist: null,
        words: [],
        currentModeIndex: 0,
        modes: [],
        results: {},
        totalCoins: 0,
        startTime: null
    },

    // 学习模式配置
    modeConfig: {
        'context': {
            name: '场景语境选择',
            description: '锻炼结合上下文推断词义的能力',
            icon: 'fa-book-open',
            color: 'indigo'
        },
        'spelling': {
            name: '听音拼写填空',
            description: '考查发音与拼写的绝对准确率',
            icon: 'fa-headphones',
            color: 'amber'
        },
        'matching': {
            name: '词义匹配',
            description: '快速识别单词与中文释义的对应关系',
            icon: 'fa-link',
            color: 'emerald'
        },
        'flashcard': {
            name: '卡片认知',
            description: '通过翻转卡片加深词汇记忆',
            icon: 'fa-clone',
            color: 'purple'
        }
    },

    /**
     * 开始执行任务
     * 流程：先学习（音形意用）-> 后检测
     * 难词清单中的单词会自动加入学习列表
     */
    start(taskId) {
        const task = db._data.tasks.find(t => t.id === taskId);
        if (!task) {
            helpers.showToast('任务不存在！', 'error');
            return;
        }

        const wordlist = db.findWordList(task.wordListId);
        if (!wordlist) {
            helpers.showToast('词表不存在！', 'error');
            return;
        }

        // 获取难词清单
        const user = auth.getCurrentUser();
        const difficultWords = db.getDifficultWords(user.id) || [];
        const difficultWordList = difficultWords.map(dw => dw.word);

        // 合并任务单词和难词（去重）
        const allWords = [...new Set([...wordlist.words, ...difficultWordList])];

        // 初始化状态
        this.state.taskId = taskId;
        this.state.task = task;
        this.state.wordlist = wordlist;
        this.state.words = helpers.shuffle(allWords);
        this.state.currentModeIndex = 0;
        this.state.modes = task.taskTypes || ['context'];
        this.state.results = {};
        this.state.totalCoins = 0;
        this.state.startTime = Date.now();
        this.state.hasLearned = false;

        // 显示任务开始界面
        this.showTaskIntro();
    },

    /**
     * 使用指定单词列表开始任务
     * 用于分批次学习/检测
     */
    startWithWords(taskId, words) {
        const task = db._data.tasks.find(t => t.id === taskId);
        if (!task) {
            helpers.showToast('任务不存在！', 'error');
            return;
        }

        const wordlist = db.findWordList(task.wordListId);
        if (!wordlist) {
            helpers.showToast('词表不存在！', 'error');
            return;
        }

        // 获取难词清单并合并
        const user = auth.getCurrentUser();
        const difficultWords = db.getDifficultWords(user.id) || [];
        const difficultWordList = difficultWords.map(dw => dw.word);
        const allWords = [...new Set([...words, ...difficultWordList])];

        // 初始化状态
        this.state.taskId = taskId;
        this.state.task = task;
        this.state.wordlist = wordlist;
        this.state.words = allWords;
        this.state.currentModeIndex = 0;
        this.state.modes = task.taskTypes || ['context'];
        this.state.results = {};
        this.state.totalCoins = 0;
        this.state.startTime = Date.now();
        this.state.hasLearned = false;

        // 直接显示学习阶段
        this.showLearningPhase();
    },

    /**
     * 显示任务介绍界面
     */
    showTaskIntro() {
        const modeList = this.state.modes.map(mode => {
            const config = this.modeConfig[mode];
            return `
                <div class="flex items-center p-3 bg-${config.color}-50 rounded-lg mb-2">
                    <div class="w-10 h-10 rounded-full bg-${config.color}-100 text-${config.color}-600 flex items-center justify-center mr-3">
                        <i class="fa-solid ${config.icon}"></i>
                    </div>
                    <div>
                        <div class="font-bold text-slate-800">${config.name}</div>
                        <div class="text-xs text-slate-500">${config.description}</div>
                    </div>
                </div>
            `;
        }).join('');

        // 获取难词数量
        const user = auth.getCurrentUser();
        const difficultWords = db.getDifficultWords(user.id) || [];
        const difficultCount = difficultWords.length;

        // 难词提醒
        let difficultReminder = '';
        if (difficultCount > 0) {
            difficultReminder = `
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <div class="flex items-center text-amber-700">
                        <i class="fa-solid fa-triangle-exclamation mr-2"></i>
                        <span class="font-medium">包含 ${difficultCount} 个待复习难词</span>
                    </div>
                    <p class="text-xs text-amber-600 mt-1">这些单词将在本次学习中重点复习</p>
                </div>
            `;
        }

        // 截止时间提醒
        let deadlineReminder = '';
        if (this.state.task.deadline) {
            const now = Date.now();
            const timeLeft = this.state.task.deadline - now;
            if (timeLeft > 0) {
                const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
                const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
                const timeText = daysLeft > 1 ? `还剩 ${daysLeft} 天` : `还剩 ${hoursLeft} 小时`;
                const urgencyClass = daysLeft <= 1 ? 'text-rose-600' : 'text-amber-600';
                deadlineReminder = `
                    <div class="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4">
                        <div class="flex items-center ${urgencyClass}">
                            <i class="fa-solid fa-clock mr-2"></i>
                            <span class="font-medium">任务截止：${timeText}</span>
                        </div>
                    </div>
                `;
            }
        }

        const introHtml = `
            <div id="task-intro" class="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 fade-in">
                <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl m-4">
                    <div class="text-center mb-6">
                        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center mx-auto mb-4">
                            <i class="fa-solid fa-rocket text-white text-2xl"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-slate-800">${this.state.task.title}</h2>
                        <p class="text-slate-500 mt-2">共 ${this.state.words.length} 个单词 · ${this.state.modes.length} 种检测模式</p>
                    </div>
                    
                    ${deadlineReminder}
                    ${difficultReminder}
                    
                    <div class="mb-6">
                        <h3 class="font-bold text-slate-700 mb-3">本次任务包含以下检测模式：</h3>
                        ${modeList}
                    </div>
                    
                    <button onclick="taskEngine.startFirstMode()" class="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition transform hover:-translate-y-0.5">
                        <i class="fa-solid fa-play mr-2"></i>开始挑战
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', introHtml);
    },

    /**
     * 开始第一个模式
     * 先进入学习阶段，再进入检测阶段
     */
    startFirstMode() {
        const intro = document.getElementById('task-intro');
        if (intro) intro.remove();
        
        // 显示学习模式选择
        this.showLearningModeChoice();
    },

    /**
     * 显示学习模式选择
     */
    showLearningModeChoice() {
        const choiceHtml = `
            <div id="learning-choice" class="fixed inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center z-50">
                <div class="text-center text-white p-8 w-full max-w-lg">
                    <div class="w-24 h-24 rounded-full bg-white bg-opacity-20 flex items-center justify-center mx-auto mb-6">
                        <i class="fa-solid fa-graduation-cap text-5xl"></i>
                    </div>
                    <h2 class="text-3xl font-bold mb-4">选择学习模式</h2>
                    <p class="text-xl text-indigo-200 mb-8">请选择适合你的学习方式</p>
                    
                    <div class="space-y-4 mb-8">
                        <button onclick="taskEngine.selectLearningMode('detailed')" 
                            class="w-full bg-white bg-opacity-10 hover:bg-opacity-20 rounded-2xl p-6 text-left transition border-2 border-transparent hover:border-white group">
                            <div class="flex items-center">
                                <div class="w-16 h-16 rounded-full bg-indigo-400 flex items-center justify-center mr-4 group-hover:scale-110 transition">
                                    <i class="fa-solid fa-layer-group text-2xl"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-bold text-xl mb-1">音形意用模式</div>
                                    <div class="text-indigo-200 text-sm">系统学习单词的发音、拼写、释义和用法</div>
                                    <div class="text-indigo-300 text-xs mt-1">适合：新单词学习、深度记忆</div>
                                </div>
                                <i class="fa-solid fa-chevron-right text-indigo-300"></i>
                            </div>
                        </button>
                        
                        <button onclick="taskEngine.selectLearningMode('flashcard')" 
                            class="w-full bg-white bg-opacity-10 hover:bg-opacity-20 rounded-2xl p-6 text-left transition border-2 border-transparent hover:border-white group">
                            <div class="flex items-center">
                                <div class="w-16 h-16 rounded-full bg-purple-400 flex items-center justify-center mr-4 group-hover:scale-110 transition">
                                    <i class="fa-solid fa-clone text-2xl"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-bold text-xl mb-1">卡片记忆模式</div>
                                    <div class="text-indigo-200 text-sm">翻转卡片快速记忆，正反面切换</div>
                                    <div class="text-indigo-300 text-xs mt-1">适合：快速复习、巩固记忆</div>
                                </div>
                                <i class="fa-solid fa-chevron-right text-indigo-300"></i>
                            </div>
                        </button>
                    </div>
                    
                    <p class="text-indigo-300 text-sm">
                        <i class="fa-solid fa-lightbulb mr-1"></i>
                        提示：两种模式效果相同，选择你喜欢的方式即可
                    </p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', choiceHtml);
    },

    /**
     * 选择学习模式
     */
    selectLearningMode(mode) {
        const choice = document.getElementById('learning-choice');
        if (choice) choice.remove();
        
        this.state.learningMode = mode;
        
        if (mode === 'flashcard') {
            // 使用卡片模式学习
            flashcardLearning.start(this.state.words, (result) => {
                this.state.hasLearned = true;
                this.state.learningResult = result;
                this.showTestPhase();
            });
        } else {
            // 使用音形意用模式学习
            wordLearning.start(this.state.words, (result) => {
                this.state.hasLearned = true;
                this.state.learningResult = result;
                this.showTestPhase();
            });
        }
    },

    /**
     * 显示学习阶段（保留兼容）
     */
    showLearningPhase() {
        this.showLearningModeChoice();
    },

    /**
     * 开始学习（保留兼容）
     */
    startLearning() {
        this.selectLearningMode('detailed');
    },

    /**
     * 显示检测阶段 - 允许学生自主选择检测模式
     */
    showTestPhase() {
        // 存储可选模式
        this.state.availableModes = [...this.state.modes];
        this.state.selectedModes = [];
        this.state.completedModes = [];
        
        const testHtml = `
            <div id="test-phase" class="fixed inset-0 bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center z-50 overflow-y-auto">
                <div class="text-center text-white p-8 w-full max-w-lg">
                    <div class="w-24 h-24 rounded-full bg-white bg-opacity-20 flex items-center justify-center mx-auto mb-6">
                        <i class="fa-solid fa-clipboard-check text-5xl"></i>
                    </div>
                    <h2 class="text-3xl font-bold mb-4">第二阶段：学习检测</h2>
                    <p class="text-xl text-rose-200 mb-2">检验学习成果</p>
                    <p class="text-rose-300 mb-6">请自主选择检测模式，完成任意2个即可过关</p>
                    
                    <div class="bg-white bg-opacity-10 rounded-xl p-6 mb-6">
                        <h3 class="text-lg font-bold mb-4 text-rose-100">选择检测模式（至少选2个）</h3>
                        <div class="space-y-3" id="mode-selection-container">
                            ${this.state.modes.map((mode, idx) => {
                                const config = this.modeConfig[mode];
                                return `
                                    <label class="flex items-center p-3 bg-white bg-opacity-10 rounded-lg cursor-pointer hover:bg-opacity-20 transition mode-option" data-mode="${mode}">
                                        <input type="checkbox" value="${mode}" onchange="taskEngine.toggleModeSelection('${mode}')" 
                                            class="w-5 h-5 rounded border-2 border-white bg-transparent text-rose-500 focus:ring-rose-400 mr-4 mode-checkbox">
                                        <div class="w-10 h-10 rounded-full bg-${config.color}-400 flex items-center justify-center mr-3">
                                            <i class="fa-solid ${config.icon}"></i>
                                        </div>
                                        <div class="text-left flex-1">
                                            <div class="font-bold">${config.name}</div>
                                            <div class="text-sm text-rose-200">${config.description}</div>
                                        </div>
                                    </label>
                                `;
                            }).join('')}
                        </div>
                        <div id="mode-selection-error" class="hidden mt-3 text-yellow-300 text-sm">
                            <i class="fa-solid fa-circle-exclamation mr-1"></i>请至少选择2个检测模式
                        </div>
                    </div>
                    
                    <div class="text-sm text-rose-200 mb-4">
                        <i class="fa-solid fa-circle-info mr-1"></i>已选择 <span id="selected-mode-count" class="font-bold text-white">0</span> 个模式
                    </div>
                    
                    <button onclick="taskEngine.confirmModeSelection()" class="bg-white text-rose-600 font-bold py-4 px-10 rounded-full hover:bg-rose-50 transition shadow-lg text-lg">
                        <i class="fa-solid fa-play mr-2"></i>开始检测
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', testHtml);
    },

    /**
     * 切换模式选择
     */
    toggleModeSelection(mode) {
        const index = this.state.selectedModes.indexOf(mode);
        if (index > -1) {
            this.state.selectedModes.splice(index, 1);
        } else {
            this.state.selectedModes.push(mode);
        }
        
        // 更新计数显示
        document.getElementById('selected-mode-count').innerText = this.state.selectedModes.length;
        
        // 隐藏错误提示
        document.getElementById('mode-selection-error').classList.add('hidden');
        
        // 更新选中样式
        const option = document.querySelector(`.mode-option[data-mode="${mode}"]`);
        if (option) {
            if (this.state.selectedModes.includes(mode)) {
                option.classList.add('bg-opacity-30', 'border-2', 'border-white');
            } else {
                option.classList.remove('bg-opacity-30', 'border-2', 'border-white');
            }
        }
    },

    /**
     * 确认模式选择
     */
    confirmModeSelection() {
        if (this.state.selectedModes.length < 2) {
            document.getElementById('mode-selection-error').classList.remove('hidden');
            return;
        }
        
        // 使用选中的模式
        this.state.modes = [...this.state.selectedModes];
        this.startTesting();
    },

    /**
     * 开始检测
     */
    startTesting() {
        const phase = document.getElementById('test-phase');
        if (phase) phase.remove();
        
        this.state.currentModeIndex = 0;
        this.state.completedModes = [];
        this.startCurrentMode();
    },

    /**
     * 开始当前模式
     */
    startCurrentMode() {
        if (this.state.currentModeIndex >= this.state.modes.length) {
            // 所有模式完成
            this.showTaskComplete();
            return;
        }

        const mode = this.state.modes[this.state.currentModeIndex];
        const config = this.modeConfig[mode];

        // 显示模式过渡界面
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

        // 2秒后进入实际模式
        setTimeout(() => {
            const transition = document.getElementById('mode-transition');
            if (transition) transition.remove();
            
            this.launchMode(this.state.modes[this.state.currentModeIndex]);
        }, 2000);
    },

    /**
     * 启动具体的学习模式
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
                flashcardLearning.start(this.state.words, (result) => this.onModeComplete(result));
                break;
            default:
                // 默认使用语境测试
                contextTest.start(this.state.words, (result) => this.onModeComplete(result));
        }
    },

    /**
     * 模式完成回调
     */
    onModeComplete(result) {
        const mode = this.state.modes[this.state.currentModeIndex];
        this.state.results[mode] = result;
        this.state.totalCoins += result.coins || 0;

        // 将错误单词添加到难词清单
        if (result.weakWords && result.weakWords.length > 0) {
            this.addWeakWordsToDifficultList(result.weakWords);
        }

        // 显示模式完成界面
        this.showModeComplete(result);
    },

    /**
     * 将薄弱词汇添加到难词清单
     */
    addWeakWordsToDifficultList(weakWords) {
        const user = auth.getCurrentUser();
        if (!user || !weakWords || weakWords.length === 0) return;

        // 获取或创建学生的难词列表
        let difficultWords = db.getDifficultWords(user.id) || [];
        
        weakWords.forEach(word => {
            // 检查是否已在难词列表中
            const exists = difficultWords.find(dw => dw.word === word);
            if (!exists) {
                // 获取单词详情
                const wordData = db.findWord(word);
                difficultWords.push({
                    word: word,
                    meaning: wordData?.meaning || '',
                    phonetic: wordData?.phonetic || '',
                    addedAt: Date.now(),
                    errorCount: 1
                });
            } else {
                // 增加错误次数
                exists.errorCount = (exists.errorCount || 1) + 1;
                exists.lastErrorAt = Date.now();
            }
        });

        // 保存难词列表
        db.saveDifficultWords(user.id, difficultWords);
    },

    /**
     * 显示模式完成界面
     * 完成2个模式即可过关，但可以继续挑战更多
     */
    showModeComplete(result) {
        const config = this.modeConfig[this.state.modes[this.state.currentModeIndex]];
        this.state.completedModes.push(this.state.modes[this.state.currentModeIndex]);
        
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
            // 已过关但还有更多模式
            buttons = `
                <div class="space-y-2">
                    <button onclick="taskEngine.finish()" class="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition">
                        <i class="fa-solid fa-check mr-2"></i>完成任务
                    </button>
                    <button onclick="taskEngine.nextMode()" class="w-full bg-${config.color}-100 text-${config.color}-700 font-bold py-3 rounded-xl hover:bg-${config.color}-200 transition">
                        继续挑战下一关 <i class="fa-solid fa-arrow-right ml-2"></i>
                    </button>
                </div>
            `;
        } else if (hasMore) {
            // 还未过关，继续下一关
            buttons = `
                <button onclick="taskEngine.nextMode()" class="w-full bg-${config.color}-500 text-white font-bold py-3 rounded-xl hover:bg-${config.color}-600 transition">
                    下一关 <i class="fa-solid fa-arrow-right ml-2"></i>
                </button>
            `;
        } else {
            // 所有模式完成
            buttons = `
                <button onclick="taskEngine.finish()" class="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition">
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
     * 显示任务完成界面
     */
    showTaskComplete() {
        // 计算总成绩
        let totalAccuracy = 0;
        let modeCount = 0;
        
        Object.values(this.state.results).forEach(result => {
            if (result.accuracy) {
                totalAccuracy += result.accuracy;
                modeCount++;
            }
        });
        
        const avgAccuracy = modeCount > 0 ? Math.round(totalAccuracy / modeCount) : 0;
        
        // 确定评价
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

        // 记录学习日志
        const user = auth.getCurrentUser();
        db.addLearningLog({
            studentId: user.id,
            teacherId: user.teacherId,
            learnedCount: this.state.words.length,
            reviewCount: 0,
            correctRate: avgAccuracy,
            weakWord: this.getWeakWords(),
            taskType: 'multi'
        });

        // 增加金币
        db.addCoins(user.id, this.state.totalCoins);

        // 更新学生统计
        db.updateStudent(user.id, {
            totalLearned: user.totalLearned + this.state.words.length,
            totalTests: user.totalTests + 1,
            totalCorrect: user.totalCorrect + Math.round(this.state.words.length * avgAccuracy / 100),
            totalQuestions: user.totalQuestions + this.state.words.length
        });

        // 更新当前用户
        auth.updateCurrentUser({
            coins: user.coins + this.state.totalCoins,
            totalLearned: user.totalLearned + this.state.words.length,
            totalTests: user.totalTests + 1,
            totalCorrect: user.totalCorrect + Math.round(this.state.words.length * avgAccuracy / 100),
            totalQuestions: user.totalQuestions + this.state.words.length
        });

        const completeHtml = `
            <div id="task-complete" class="fixed inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center z-50">
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
                    
                    <button onclick="taskEngine.finish()" class="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition">
                        <i class="fa-solid fa-home mr-2"></i>返回首页
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', completeHtml);
        
        // 庆祝动画
        helpers.createParticles(document.getElementById('task-complete'), 50);
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
     * 完成任务
     */
    finish() {
        const complete = document.getElementById('task-complete');
        if (complete) complete.remove();
        
        // 重置状态
        this.state = {
            taskId: null,
            task: null,
            wordlist: null,
            words: [],
            currentModeIndex: 0,
            modes: [],
            results: {},
            totalCoins: 0,
            startTime: null
        };
        
        // 返回学生主页并刷新统计数据
        student.backToDashboard();
        student.updateDashboardStats();
    }
};
