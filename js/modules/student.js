/**
 * 新纪元英语词汇系统 - 学生模块
 */

const student = {
    /**
     * 渲染学生主页
     */
    render() {
        const user = auth.getCurrentUser();
        if (!user) {
            console.warn('student.render: No current user');
            return;
        }
        if (user.passwordChanged === false) {
            console.log('Skipping student render due to pending password change');
            return;
        }
        
        // 检查并同步ZPD离线金币
        try {
            const pendingCoinsStr = localStorage.getItem('zootopia_pending_coins');
            const pendingCoins = parseInt(pendingCoinsStr) || 0;
            if (pendingCoins > 0) {
                db.addCoins(user.id, pendingCoins);
                helpers.showToast(`ZPD特训离线奖励已同步: +${pendingCoins} 金币`, 'success');
                localStorage.removeItem('zootopia_pending_coins');
            }
        } catch (e) {
            console.warn('Failed to sync offline coins', e);
        }

        const stats = db.getStudentStats(user.id);
        if (!stats) {
            console.warn('student.render: No stats found for user', user.id);
            return;
        }

        auth.updateCurrentUser({
            ...stats,
            role: 'student'
        });
        
        // 更新统计数据
        const learnedCount = document.getElementById('student-learned-count');
        const streakCount = document.getElementById('student-streak-count');
        const coinsCount = document.getElementById('student-coins-count');
        if (learnedCount) learnedCount.innerText = stats.totalLearned || 0;
        if (streakCount) streakCount.innerText = stats.streak || 0;
        if (coinsCount) coinsCount.innerText = stats.coins || 0;
        
        // 渲染任务列表
        this.renderTasks();
        
        // 更新导航栏
        app.updateNav();

        // 检查并启动新手指引
        setTimeout(() => {
            if (typeof Tour !== 'undefined' && !helpers.memoryStore.get('tour_completed_student-intro')) {
                this.startTour();
            }
        }, 800);
    },

    /**
     * 启动新手指引
     */
    startTour() {
        if (typeof Tour === 'undefined') return;
        
        const steps = [
            {
                title: '👋 欢迎来到新纪元英语',
                content: '这是一个充满乐趣的词汇学习中心。让我们花一点时间熟悉一下界面，助你快速上手！',
                placement: 'center'
            },
            {
                element: '#view-student h1',
                title: '🏠 学习中心',
                content: '这里是你的个人主页，你可以在这里开始学习、查看任务和进度。',
                placement: 'bottom'
            },
            {
                element: 'div[onclick="student.startLearningMode()"]',
                title: '📚 自主学习',
                content: '点击这里开始系统化的单词学习，包含发音、拼写、释义和用法全方位训练。',
                placement: 'right'
            },
            {
                element: 'div[onclick="student.startGameMode()"]',
                title: '🎮 单词闯关',
                content: '在这里通过趣味游戏来巩固记忆，让背单词变得不再枯燥！',
                placement: 'left'
            },
            {
                element: '#student-tasks-list',
                title: '📝 我的任务',
                content: '老师布置的学习任务会显示在这里，请务必按时完成哦！我们会智能提醒你剩余时间。',
                placement: 'top'
            },
            {
                element: '#student-coins-count',
                title: '🏆 学习奖励',
                content: '每一次学习和闯关都会获得金币奖励，见证你的每一次进步！',
                placement: 'top'
            }
        ];

        Tour.init(steps, { id: 'student-intro' });
        Tour.start();
    },

    /**
     * 渲染任务列表
     * 任务分类：学习任务 和 检测任务
     */
    renderTasks() {
        const user = auth.getCurrentUser();
        
        // 调试：打印用户信息
        console.log('=== Student renderTasks Debug ===');
        console.log('Current user:', user);
        console.log('User id:', user?.id);
        console.log('User role:', user?.role);
        
        // 获取所有任务（调试用）
        const allTasks = db._data.tasks;
        console.log('All tasks in DB:', allTasks.map(t => ({ id: t.id, title: t.title, teacherId: t.teacherId, assignedStudents: t.assignedStudents })));
        
        const tasks = db.getTasksByStudent(user.id);
        console.log('Filtered tasks for student:', tasks.map(t => ({ id: t.id, title: t.title })));
        
        const container = document.getElementById('student-tasks-list');
        container.innerHTML = '';
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-500">
                    <i class="fa-solid fa-mug-hot text-4xl mb-3 opacity-50"></i>
                    <p>老师今天还没布置任务哦，休息一下吧！</p>
                </div>
            `;
            return;
        }
        
        // 分离学习任务和检测任务
        // 如果没有 taskTypes，说明是基础学习任务
        const learningTasks = tasks.filter(t => !t.taskTypes || t.taskTypes.length === 0 || t.type === 'learn');
        // 如果有 taskTypes，说明是检测任务（包括 type='test', 'mixed', 'context', 'spelling', 'matching' 等）
        const testTasks = tasks.filter(t => t.taskTypes && t.taskTypes.length > 0 && t.type !== 'learn');
        
        // 渲染学习任务
        if (learningTasks.length > 0) {
            const learnSection = document.createElement('div');
            learnSection.className = 'mb-6';
            learnSection.innerHTML = `
                <div class="flex items-center mb-3">
                    <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-2">
                        <i class="fa-solid fa-graduation-cap"></i>
                    </div>
                    <h3 class="font-bold text-white">基础学习任务</h3>
                    <span class="text-xs text-indigo-200 ml-2">(${learningTasks.length}个)</span>
                </div>
            `;
            
            learningTasks.forEach(task => {
                learnSection.appendChild(this.createTaskCard(task, 'learning'));
            });
            container.appendChild(learnSection);
        }
        
        // 渲染检测任务
        if (testTasks.length > 0) {
            const testSection = document.createElement('div');
            testSection.className = 'mb-6';
            testSection.innerHTML = `
                <div class="flex items-center mb-3">
                    <div class="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mr-2">
                        <i class="fa-solid fa-clipboard-check"></i>
                    </div>
                    <h3 class="font-bold text-white">学习检测任务</h3>
                    <span class="text-xs text-indigo-200 ml-2">(${testTasks.length}个)</span>
                </div>
            `;
            
            testTasks.forEach(task => {
                testSection.appendChild(this.createTaskCard(task, 'test'));
            });
            container.appendChild(testSection);
        }
    },

    /**
     * 创建任务卡片 - 显示学习和检测两个入口
     */
    createTaskCard(task, taskCategory) {
        const wordlist = db.findWordList(task.wordListId);
        const wordCount = wordlist ? wordlist.words.length : 0;

        // 任务类型标签
        let taskTypeTags = '';
        if (task.taskTypeNames) {
            taskTypeTags = `<span class="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded ml-2">${task.taskTypeNames}</span>`;
        }

        // 截止时间显示
        let deadlineHtml = '';
        if (task.deadline) {
            const now = Date.now();
            const timeLeft = task.deadline - now;
            const isExpired = timeLeft <= 0;

            if (isExpired) {
                deadlineHtml = `<span class="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded ml-2"><i class="fa-solid fa-clock mr-1"></i>已截止</span>`;
            } else {
                const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
                const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
                const timeText = daysLeft > 1 ? `还剩${daysLeft}天` : `还剩${hoursLeft}小时`;
                const urgencyClass = daysLeft <= 1 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600';
                deadlineHtml = `<span class="text-xs ${urgencyClass} px-2 py-0.5 rounded ml-2"><i class="fa-solid fa-clock mr-1"></i>${timeText}</span>`;
            }
        }

        const isTest = taskCategory === 'test';
        const iconClass = isTest ? 'fa-clipboard-check' : 'fa-graduation-cap';
        const iconBg = isTest ? 'bg-rose-100 text-rose-500' : 'bg-emerald-100 text-emerald-600';

        const taskCard = document.createElement('div');
        taskCard.className = 'task-card p-4 border border-slate-100 rounded-xl hover:shadow-md transition bg-slate-50 group mb-3';

        // 如果是检测任务，显示两个按钮（学习和检测）
        if (isTest && task.taskTypes && task.taskTypes.length > 0) {
            taskCard.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl group-hover:scale-110 transition">
                            <i class="fa-solid fa-book-open"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-slate-800 flex items-center flex-wrap">${task.title}${taskTypeTags}${deadlineHtml}</h3>
                            <p class="text-xs text-slate-500">包含 ${wordCount} 个单词 · 预计耗时 ${Math.ceil(wordCount * 0.5)} 分钟</p>
                        </div>
                    </div>
                </div>
                <div class="flex space-x-3 mt-3">
                    <button onclick="student.showTaskOptions('${task.id}', 'learning', ${wordCount})"
                        class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg font-bold shadow transition flex items-center justify-center">
                        <i class="fa-solid fa-graduation-cap mr-2"></i>学习模式
                    </button>
                    <button onclick="student.showTaskOptions('${task.id}', 'test', ${wordCount})"
                        class="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-lg font-bold shadow transition flex items-center justify-center">
                        <i class="fa-solid fa-clipboard-check mr-2"></i>检测模式
                    </button>
                </div>
            `;
        } else {
            // 普通任务，只显示一个按钮
            const btnClass = isTest ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600';
            const btnText = isTest ? '开始检测' : '开始学习';
            taskCard.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 rounded-full ${iconBg} flex items-center justify-center text-xl group-hover:scale-110 transition">
                            <i class="fa-solid ${iconClass}"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-slate-800 flex items-center flex-wrap">${task.title}${taskTypeTags}${deadlineHtml}</h3>
                            <p class="text-xs text-slate-500">包含 ${wordCount} 个单词 · 预计耗时 ${Math.ceil(wordCount * 0.5)} 分钟</p>
                        </div>
                    </div>
                    <button onclick="student.showTaskOptions('${task.id}', '${taskCategory}', ${wordCount})"
                        class="${btnClass} text-white px-5 py-2 rounded-full font-bold shadow transition transform hover:-translate-y-0.5">
                        ${btnText}
                    </button>
                </div>
            `;
        }

        return taskCard;
    },

    /**
     * 显示任务选项（学习量选择）
     */
    showTaskOptions(taskId, taskCategory, totalWords) {
        const task = db._data.tasks.find(t => t.id === taskId);
        const wordlist = db.findWordList(task.wordListId);
        
        // 默认选项
        const defaultBatchSize = Math.min(10, totalWords);
        const options = [];
        
        // 生成批次选项
        if (totalWords <= 10) {
            options.push({ value: totalWords, label: `全部学习 (${totalWords}个)` });
        } else {
            options.push({ value: 5, label: '5个单词' });
            options.push({ value: 10, label: '10个单词' });
            if (totalWords > 15) options.push({ value: 15, label: '15个单词' });
            options.push({ value: totalWords, label: `全部学习 (${totalWords}个)` });
        }
        
        const optionsHtml = options.map(opt => `
            <button onclick="student.startTaskWithOptions('${taskId}', '${taskCategory}', ${opt.value})" 
                class="w-full p-4 mb-3 rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition text-left">
                <div class="font-bold text-slate-800">${opt.label}</div>
                <div class="text-xs text-slate-500 mt-1">预计耗时 ${Math.ceil(opt.value * 0.5)} 分钟</div>
            </button>
        `).join('');
        
        const modalHtml = `
            <div id="task-options-modal" class="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50">
                <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl m-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-slate-800">选择学习量</h3>
                        <button onclick="document.getElementById('task-options-modal').remove()" class="text-slate-400 hover:text-slate-600">
                            <i class="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>
                    <p class="text-sm text-slate-500 mb-4">本次任务共 ${totalWords} 个单词，你可以选择分批次学习</p>
                    ${optionsHtml}
                    <div class="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
                        <i class="fa-solid fa-lightbulb mr-1"></i>
                        提示：学习过程中可随时退出，进度会自动保存
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * 开始任务（带选项）
     */
    startTaskWithOptions(taskId, taskCategory, batchSize) {
        // 关闭选项弹窗
        const modal = document.getElementById('task-options-modal');
        if (modal) modal.remove();
        
        const task = db._data.tasks.find(t => t.id === taskId);
        const wordlist = db.findWordList(task.wordListId);
        
        if (!wordlist) {
            helpers.showToast('词表不存在！', 'error');
            return;
        }
        
        // 获取单词列表（限制数量）
        const words = wordlist.words.slice(0, batchSize);
        
        // 保存学习进度
        this.saveTaskProgress(taskId, batchSize);
        
        if (taskCategory === 'learning') {
            // 学习模式：显示学习模式选择界面
            this.showLearningModeChoice(words, taskId, batchSize);
        } else {
            // 检测模式：直接进入检测模式选择
            this.startTestDirectly(words, taskId);
        }
    },

    /**
     * 显示学习模式选择界面
     */
    showLearningModeChoice(words, taskId, batchSize) {
        const choiceHtml = `
            <div id="learning-mode-choice" class="fixed inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center z-50 animate-fade-in">
                <div class="glass-card rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl relative overflow-hidden bg-white/95 backdrop-blur-xl">
                    <!-- 背景装饰 -->
                    <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div class="absolute bottom-0 left-0 w-24 h-24 bg-purple-50 rounded-full blur-2xl -ml-10 -mb-10"></div>

                    <div class="text-center mb-8 relative z-10">
                        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-indigo-100">
                            <i class="fa-solid fa-graduation-cap text-4xl text-white"></i>
                        </div>
                        <h2 class="text-3xl font-black text-slate-800 mb-2 tracking-tight">选择学习模式</h2>
                        <p class="text-slate-500 text-sm">请选择适合你的学习方式</p>
                    </div>
                    
                    <div class="space-y-4 mb-8 relative z-10">
                        <button onclick="student.selectLearningMode('detailed', '${taskId}', ${batchSize})" 
                            class="w-full bg-indigo-50 hover:bg-white rounded-2xl p-4 text-left transition border-2 border-indigo-100 hover:border-indigo-300 group shadow-sm hover:shadow-md">
                            <div class="flex items-center">
                                <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center mr-4 group-hover:scale-110 transition shadow-lg shadow-indigo-200">
                                    <i class="fa-solid fa-layer-group text-white text-xl"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-bold text-lg text-slate-800 mb-1">音形意用模式</div>
                                    <div class="text-slate-500 text-xs">系统学习单词的发音、拼写、释义和用法</div>
                                    <div class="text-indigo-500 text-[10px] mt-1 font-bold bg-indigo-100 px-2 py-0.5 rounded inline-block">适合：新单词学习、深度记忆</div>
                                </div>
                                <i class="fa-solid fa-chevron-right text-indigo-300 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1"></i>
                            </div>
                        </button>
                        
                        <button onclick="student.selectLearningMode('flashcard', '${taskId}', ${batchSize})" 
                            class="w-full bg-purple-50 hover:bg-white rounded-2xl p-4 text-left transition border-2 border-purple-100 hover:border-purple-300 group shadow-sm hover:shadow-md">
                            <div class="flex items-center">
                                <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mr-4 group-hover:scale-110 transition shadow-lg shadow-purple-200">
                                    <i class="fa-solid fa-clone text-white text-xl"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-bold text-lg text-slate-800 mb-1">卡片记忆模式</div>
                                    <div class="text-slate-500 text-xs">翻转卡片快速记忆，正反面切换</div>
                                    <div class="text-purple-500 text-[10px] mt-1 font-bold bg-purple-100 px-2 py-0.5 rounded inline-block">适合：快速复习、巩固记忆</div>
                                </div>
                                <i class="fa-solid fa-chevron-right text-purple-300 group-hover:text-purple-500 transition-transform group-hover:translate-x-1"></i>
                            </div>
                        </button>
                    </div>
                    
                    <button onclick="document.getElementById('learning-mode-choice').remove()" class="w-full py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition flex items-center justify-center relative z-10">
                        <i class="fa-solid fa-arrow-left mr-2"></i>返回
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', choiceHtml);
        
        // 保存单词列表供后续使用
        this._pendingWords = words;
    },

    /**
     * 显示自主学习模式选择界面
     */
    showSelfLearningModeChoice(wordlistId) {
        this.currentWordlistId = wordlistId;
        const wordlist = db.findWordList(wordlistId);
        const wordCount = wordlist ? wordlist.words.length : 0;
        
        const choiceHtml = `
            <div id="self-learning-mode-choice" class="fixed inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center z-50 overflow-y-auto">
                <!-- Return Button (Top Left) -->
                <button onclick="document.getElementById('self-learning-mode-choice').remove()" class="absolute top-6 left-6 text-white hover:text-indigo-200 transition flex items-center bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
                    <i class="fa-solid fa-arrow-left mr-2"></i>返回主页
                </button>

                <div class="text-center text-white p-8 w-full max-w-4xl mt-12">
                    <div class="w-24 h-24 rounded-full bg-white bg-opacity-20 flex items-center justify-center mx-auto mb-6">
                        <i class="fa-solid fa-brain text-5xl"></i>
                    </div>
                    <h2 class="text-4xl font-bold mb-4">自主学习中心</h2>
                    <p class="text-xl text-indigo-200 mb-8">选择你喜欢的学习方式，让单词记忆更高效</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        <!-- 单词卡片模式 -->
                        <button onclick="student.startSelfLearningMode('flashcard', '${wordlistId}')" 
                            class="bg-white bg-opacity-10 hover:bg-opacity-20 rounded-2xl p-6 text-left transition border-2 border-transparent hover:border-white group">
                            <div class="flex flex-col items-center text-center">
                                <div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                    <i class="fa-solid fa-clone text-2xl"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-bold text-xl mb-2">单词卡片</div>
                                    <div class="text-indigo-200 text-sm mb-2">翻转卡片查看释义、发音和例句</div>
                                    <div class="text-indigo-300 text-xs">适合：视觉记忆、快速复习</div>
                                </div>
                            </div>
                        </button>

                        <!-- 拼写练习模式 -->
                        <button onclick="student.startSelfLearningMode('spelling', '${wordlistId}')" 
                            class="bg-white bg-opacity-10 hover:bg-opacity-20 rounded-2xl p-6 text-left transition border-2 border-transparent hover:border-white group">
                            <div class="flex flex-col items-center text-center">
                                <div class="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                    <i class="fa-solid fa-keyboard text-2xl"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-bold text-xl mb-2">拼写练习</div>
                                    <div class="text-indigo-200 text-sm mb-2">听音拼写、看义拼写多种练习</div>
                                    <div class="text-indigo-300 text-xs">适合：强化拼写、听力训练</div>
                                </div>
                            </div>
                        </button>

                        <!-- 选择题模式 -->
                        <button onclick="student.startSelfLearningMode('quiz', '${wordlistId}')" 
                            class="bg-white bg-opacity-10 hover:bg-opacity-20 rounded-2xl p-6 text-left transition border-2 border-transparent hover:border-white group">
                            <div class="flex flex-col items-center text-center">
                                <div class="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                    <i class="fa-solid fa-list-check text-2xl"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-bold text-xl mb-2">选择题</div>
                                    <div class="text-indigo-200 text-sm mb-2">根据释义选单词、根据单词选释义</div>
                                    <div class="text-indigo-300 text-xs">适合：理解测试、快速检测</div>
                                </div>
                            </div>
                        </button>

                        <!-- 闯关游戏模式 -->
                        <button onclick="student.startSelfLearningMode('game', '${wordlistId}')" 
                            class="bg-white bg-opacity-10 hover:bg-opacity-20 rounded-2xl p-6 text-left transition border-2 border-transparent hover:border-white group">
                            <div class="flex flex-col items-center text-center">
                                <div class="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                    <i class="fa-solid fa-gamepad text-2xl"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-bold text-xl mb-2">闯关游戏</div>
                                    <div class="text-indigo-200 text-sm mb-2">设置难度等级和奖励机制</div>
                                    <div class="text-indigo-300 text-xs">适合：游戏化学习、挑战自我</div>
                                </div>
                            </div>
                        </button>

                        <!-- 错题复习模式 -->
                        <button onclick="student.startSelfLearningMode('error-review', '${wordlistId}')" 
                            class="bg-white bg-opacity-10 hover:bg-opacity-20 rounded-2xl p-6 text-left transition border-2 border-transparent hover:border-white group">
                            <div class="flex flex-col items-center text-center">
                                <div class="w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-pink-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                    <i class="fa-solid fa-bug text-2xl"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-bold text-xl mb-2">错题复习</div>
                                    <div class="text-indigo-200 text-sm mb-2">自动收集错误单词针对性练习</div>
                                    <div class="text-indigo-300 text-xs">适合：查漏补缺、巩固薄弱</div>
                                </div>
                            </div>
                        </button>

                        <!-- 自定义学习计划 -->
                        <button onclick="student.startSelfLearningMode('study-plan', '${wordlistId}')" 
                            class="bg-white bg-opacity-10 hover:bg-opacity-20 rounded-2xl p-6 text-left transition border-2 border-transparent hover:border-white group">
                            <div class="flex flex-col items-center text-center">
                                <div class="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                    <i class="fa-solid fa-calendar-check text-2xl"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-bold text-xl mb-2">学习计划</div>
                                    <div class="text-indigo-200 text-sm mb-2">设置每日学习目标和提醒</div>
                                    <div class="text-indigo-300 text-xs">适合：规律学习、长期规划</div>
                                </div>
                            </div>
                        </button>
                    </div>
                    
                    <div class="bg-white bg-opacity-10 rounded-2xl p-4 mb-6">
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-indigo-200">词表：${wordlist?.title || '未知词表'}</span>
                            <span class="text-indigo-200">单词数：${wordCount}个</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', choiceHtml);
    },

    /**
     * 开始自主学习模式
     */
    startSelfLearningMode(mode, wordlistId) {
        // 关闭模式选择界面
        const choice = document.getElementById('self-learning-mode-choice');
        if (choice) choice.remove();
        
        // 保存当前词表ID，便于各模式退出时返回
        this.currentWordlistId = wordlistId;
        
        const wordlist = db.findWordList(wordlistId);
        if (!wordlist) {
            helpers.showToast('词表不存在！', 'error');
            return;
        }
        
        // 根据模式启动不同的学习模块
        switch (mode) {
            case 'flashcard':
                this.startFlashcardMode(wordlist.words);
                break;
            case 'spelling':
                this.startSpellingMode(wordlist.words);
                break;
            case 'quiz':
                this.startQuizMode(wordlist.words);
                break;
            case 'game':
                this.startGameLearningMode(wordlist.words);
                break;
            case 'error-review':
                this.startErrorReviewMode(wordlistId);
                break;
            case 'study-plan':
                this.showStudyPlanInterface(wordlistId);
                break;
            default:
                helpers.showToast('未知的学习模式', 'error');
        }
    },

    /**
     * 开始单词卡片模式
     */
    startFlashcardMode(words) {
        if (typeof flashcardLearning !== 'undefined') {
            const wl = this.currentWordlistId ? db.findWordList(this.currentWordlistId) : null;
            const ctx = wl ? { teacherId: wl.teacherId, wordlistId: wl.id } : null;
            flashcardLearning.start(words, (result) => {
                this.onSelfLearningComplete(result);
            }, ctx);
        } else {
            this.createSimpleFlashcardMode(words);
        }
    },

    /**
     * 开始拼写练习模式（包装）
     */
    startSpellingMode(words) {
        if (typeof spellingLearning !== 'undefined') {
            spellingLearning.start(words, (result) => {
                this.onSelfLearningComplete(result);
            });
        } else {
            this.createSimpleSpellingMode(words);
        }
    },

    /**
     * 开始选择题模式（包装）
     */
    startQuizMode(words) {
        if (typeof quizLearning !== 'undefined') {
            quizLearning.start(words, (result) => {
                this.onSelfLearningComplete(result);
            });
        } else {
            this.createSimpleQuizMode(words);
        }
    },

    /**
     * 开始闯关游戏模式（包装）
     */
    startGameLearningMode(words) {
        // 优先使用内置简化闯关玩法，若未来存在专用游戏模块，可在此分流
        this.createSimpleGameMode(words);
    },

    /**
     * 创建简化版单词卡片模式
     */
    createSimpleFlashcardMode(words) {
        const flashcardHtml = `
            <div id="flashcard-mode" class="fixed inset-0 bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center z-50">
                <div class="w-full max-w-2xl p-8">
                    <div class="text-center text-white mb-8">
                        <h2 class="text-3xl font-bold mb-2">单词卡片模式</h2>
                        <p class="text-blue-200">点击卡片翻转查看释义</p>
                    </div>
                    
                    <div class="relative h-96 mb-8">
                        <div id="flashcard-container" class="absolute inset-0 preserve-3d cursor-pointer" onclick="student.flipFlashcard()">
                            <!-- 卡片内容将通过JS动态生成 -->
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center text-white">
                        <button onclick="student.previousFlashcard()" class="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition">
                            <i class="fa-solid fa-chevron-left text-xl"></i>
                        </button>
                        
                        <div class="text-center">
                            <div class="text-sm text-blue-200 mb-1">
                                <span id="flashcard-progress">1</span> / <span id="flashcard-total">${words.length}</span>
                            </div>
                            <div class="w-32 h-2 bg-white bg-opacity-20 rounded-full overflow-hidden">
                                <div id="flashcard-progress-bar" class="h-full bg-white transition-all duration-300" style="width: 0%"></div>
                            </div>
                        </div>
                        
                        <button onclick="student.nextFlashcard()" class="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition">
                            <i class="fa-solid fa-chevron-right text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="mt-8 text-center">
                        <button onclick="student.exitFlashcardMode()" class="text-blue-200 hover:text-white transition">
                            <i class="fa-solid fa-times mr-2"></i>退出学习
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', flashcardHtml);
        
        // 初始化卡片模式状态
        this.flashcardState = {
            words: words,
            currentIndex: 0,
            isFlipped: false,
            learnedWords: []
        };
        
        this.renderFlashcard();
    },

    /**
     * 渲染单词卡片
     */
    renderFlashcard() {
        const state = this.flashcardState;
        const word = state.words[state.currentIndex];
        const wordData = db.findWord(word) || this.generateDefaultWordData(word);
        
        const container = document.getElementById('flashcard-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="absolute inset-0 bg-white rounded-3xl shadow-2xl p-8 flex flex-col justify-center items-center text-center backface-hidden ${state.isFlipped ? 'rotate-y-180' : ''}">
                <div class="text-6xl font-bold text-gray-800 mb-4">${wordData.word}</div>
                <div class="text-xl text-gray-500 mb-4">${wordData.phonetic || `/${word}/`}</div>
                <button onclick="student.speakFlashcardWord()" class="bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full p-3 transition">
                    <i class="fa-solid fa-volume-high text-xl"></i>
                </button>
            </div>
            
            <div class="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-2xl p-8 flex flex-col justify-center items-center text-center text-white backface-hidden rotate-y-180 ${state.isFlipped ? 'rotate-y-0' : ''}">
                <div class="text-3xl font-bold mb-4">${wordData.word}</div>
                <div class="text-lg mb-4">${wordData.phonetic || `/${word}/`}</div>
                <div class="text-xl mb-4">${wordData.meaning || '暂无释义'}</div>
                <div class="text-base italic mb-4">"${wordData.sentence || wordData.example || '暂无例句'}"</div>
                <button onclick="student.speakFlashcardWord()" class="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition">
                    <i class="fa-solid fa-volume-high text-xl"></i>
                </button>
            </div>
        `;
        
        // 更新进度
        document.getElementById('flashcard-progress').textContent = state.currentIndex + 1;
        document.getElementById('flashcard-total').textContent = state.words.length;
        const progress = ((state.currentIndex + 1) / state.words.length) * 100;
        document.getElementById('flashcard-progress-bar').style.width = `${progress}%`;
    },

    /**
     * 翻转卡片
     */
    flipFlashcard() {
        if (this.flashcardState) {
            this.flashcardState.isFlipped = !this.flashcardState.isFlipped;
            this.renderFlashcard();
        }
    },

    /**
     * 下一张卡片
     */
    nextFlashcard() {
        if (!this.flashcardState) return;
        
        if (this.flashcardState.currentIndex < this.flashcardState.words.length - 1) {
            this.flashcardState.currentIndex++;
            this.flashcardState.isFlipped = false;
            this.renderFlashcard();
        } else {
            // 完成学习
            this.exitFlashcardMode();
            helpers.showToast('卡片学习完成！', 'success');
        }
    },

    /**
     * 上一张卡片
     */
    previousFlashcard() {
        if (!this.flashcardState) return;
        
        if (this.flashcardState.currentIndex > 0) {
            this.flashcardState.currentIndex--;
            this.flashcardState.isFlipped = false;
            this.renderFlashcard();
        }
    },

    /**
     * 播放卡片单词发音
     */
    speakFlashcardWord() {
        if (this.flashcardState && this.flashcardState.words[this.flashcardState.currentIndex]) {
            speech.speakWord(this.flashcardState.words[this.flashcardState.currentIndex]);
        }
    },

    /**
     * 播放游戏单词发音
     */
    speakGameWord() {
        if (this.gameState && this.gameState.currentQuestion && this.gameState.currentQuestion.word) {
            speech.speakWord(this.gameState.currentQuestion.word);
        }
    },

    /**
     * 退出卡片模式
     */
    exitFlashcardMode() {
        const mode = document.getElementById('flashcard-mode');
        if (mode) mode.remove();
        this.flashcardState = null;
    },

    /**
     * 生成默认单词数据
     */
    generateDefaultWordData(word) {
        const defaultData = {
            'routine': { phonetic: '/ruːˈtiːn/', meaning: 'n. 常规；日常事务', sentence: 'Doing morning exercises is part of his daily routine.' },
            'geography': { phonetic: '/dʒiˈɒɡrəfi/', meaning: 'n. 地理(学)', sentence: 'In our geography class, we learn about mountains and rivers.' },
            'instrument': { phonetic: '/ˈɪnstrəmənt/', meaning: 'n. 乐器；工具', sentence: 'The piano is a beautiful musical instrument.' },
            'exercise': { phonetic: '/ˈeksəsaɪz/', meaning: 'n. 锻炼；练习 v. 锻炼', sentence: 'Swimming is good exercise. It helps me stay healthy.' },
            'festival': { phonetic: '/ˈfestɪvl/', meaning: 'n. 节日', sentence: 'The Spring Festival is the most important festival in China.' }
        };

        const lowerWord = word.toLowerCase();
        if (defaultData[lowerWord]) {
            return { word: word, ...defaultData[lowerWord] };
        }

        return {
            word: word,
            phonetic: `/${word}/`,
            meaning: 'n. 单词',
            sentence: `This is an example sentence with the word "${word}".`
        };
    },

    enrichWordData(word) {
        let data = db.findWord(word) || this.generateDefaultWordData(word);
        let wl = null;
        if (this.currentWordlistId) {
            wl = db.findWordList(this.currentWordlistId);
        }
        if (wl && wl.teacherId && wl.id) {
            const review = db.getTeacherReviewedSentences(wl.teacherId, wl.id);
            if (review && review.sentences && review.sentences[word]) {
                const r = review.sentences[word];
                if (r.status === 'approved' || r.status === 'modified') {
                    data = {
                        word: word,
                        phonetic: r.phonetic || data.phonetic,
                        meaning: r.meaning || data.meaning,
                        sentence: (r.sentence || '')
                    };
                }
            }
        }
        return data;
    },

    maskWordInSentence(sentence, word) {
        try {
            const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'gi');
            return sentence.replace(pattern, '____');
        } catch (_) {
            return sentence;
        }
    },

    /**
     * 选择学习模式（任务模式）
     */
    selectLearningMode(mode, taskId, batchSize) {
        const choice = document.getElementById('learning-mode-choice');
        if (choice) choice.remove();
        
        const words = this._pendingWords;
        
        if (mode === 'flashcard') {
            // 使用卡片模式学习
            if (typeof flashcardLearning !== 'undefined') {
                flashcardLearning.start(words, (result) => {
                    this.onLearningComplete(taskId, batchSize);
                });
            } else {
                // 使用简化的卡片模式
                this.startFlashcardMode(words);
            }
        } else {
            // 使用音形意用模式学习
            if (typeof flexibleLearning !== 'undefined') {
                flexibleLearning.start(words, taskId, () => {
                    this.onLearningComplete(taskId, batchSize);
                });
            } else {
                // 使用原始的学习模式
                wordLearning.start(words, () => {
                    this.onLearningComplete(taskId, batchSize);
                });
            }
        }
    },

    /**
     * 创建拼写练习模式
     */
    createSimpleSpellingMode(words) {
        try {
            errorHandler.showLoading('正在初始化拼写练习...');
            
            if (!words || words.length === 0) {
                throw new Error('单词列表为空');
            }

            // 打乱单词顺序
            const shuffledWords = [...words].sort(() => Math.random() - 0.5);
            
            const spellingState = {
                words: shuffledWords,
                currentIndex: 0,
                score: 0,
                errors: [],
                startTime: Date.now(),
                mode: 'spelling', // 可以是 'audio' (听音拼写) 或 'meaning' (看义拼写)
                currentMode: 'audio' // 默认听音拼写
            };

            this.spellingState = spellingState;
            
            errorHandler.hideLoading();
            this.renderSpellingMode();
            
        } catch (error) {
            errorHandler.hideLoading();
            errorHandler.handle(error, '创建拼写练习模式');
            // 回退到卡片模式
            this.startFlashcardMode(words);
        }
    },

    /**
     * 渲染拼写练习模式
     */
    renderSpellingMode() {
        try {
            const state = this.spellingState;
            const currentWord = state.words[state.currentIndex];
            const wordData = this.enrichWordData(currentWord);
            
            const modeText = state.currentMode === 'audio' ? '听音拼写' : '看义拼写';
            const instruction = state.currentMode === 'audio' 
                ? '请根据听到的发音拼写单词' 
                : '请根据中文释义拼写单词';

            const spellingHtml = `
                <div id="spelling-mode" class="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center z-50 overflow-y-auto">
                    <div class="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <!-- 头部 -->
                        <div class="text-center mb-6">
                            <div class="flex items-center justify-between mb-4">
                                <button onclick="student.exitSpellingMode()" 
                                    class="text-gray-500 hover:text-gray-700 transition">
                                    <i class="fa-solid fa-times text-xl"></i>
                                </button>
                                <div class="text-center">
                                    <h2 class="text-2xl font-bold text-gray-800">${modeText}</h2>
                                    <p class="text-gray-600">${instruction}</p>
                                </div>
                            </div>
                            
                            <!-- 进度条 -->
                            <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
                                <div id="spelling-progress-bar" class="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300" 
                                     style="width: ${((state.currentIndex + 1) / state.words.length) * 100}%"></div>
                            </div>
                            <div class="text-sm text-gray-600">
                                第 <span id="spelling-current">${state.currentIndex + 1}</span> / <span id="spelling-total">${state.words.length}</span> 个单词
                            </div>
                        </div>

                        <!-- 主要内容区域 -->
                        <div class="text-center mb-8">
                            ${this.renderSpellingContent(wordData)}
                        </div>

                        <!-- 输入区域 -->
                        <div class="mb-6">
                            <div class="relative">
                                <input type="text" id="spelling-input" 
                                       class="w-full px-4 py-3 text-xl border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition"
                                       placeholder="请输入单词拼写..." 
                                       onkeypress="if(event.key === 'Enter') student.checkSpelling()">
                                <button onclick="student.speakCurrentWord()" 
                                        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-500 hover:text-indigo-700 transition">
                                    <i class="fa-solid fa-volume-high text-xl"></i>
                                </button>
                            </div>
                        </div>

                        <!-- 按钮区域 -->
                        <div class="flex space-x-4">
                            <button onclick="student.skipSpelling()" 
                                    class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-medium transition">
                                <i class="fa-solid fa-forward mr-2"></i>跳过
                            </button>
                            <button onclick="student.checkSpelling()" 
                                    class="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-3 rounded-xl font-medium transition shadow-lg">
                                <i class="fa-solid fa-check mr-2"></i>检查答案
                            </button>
                        </div>

                        <!-- 提示信息 -->
                        <div id="spelling-feedback" class="mt-4 text-center hidden">
                            <div id="spelling-result" class="p-4 rounded-xl"></div>
                        </div>
                    </div>
                </div>
            `;

            // 移除现有模式
            const existing = document.getElementById('spelling-mode');
            if (existing) existing.remove();

            document.body.insertAdjacentHTML('beforeend', spellingHtml);
            
            // 自动聚焦输入框
            setTimeout(() => {
                const input = document.getElementById('spelling-input');
                if (input) input.focus();
            }, 100);

            // 如果是听音模式，自动播放发音
            if (state.currentMode === 'audio') {
                setTimeout(() => this.speakCurrentWord(), 500);
            }

        } catch (error) {
            errorHandler.handle(error, '渲染拼写练习模式');
            this.exitSpellingMode();
        }
    },

    /**
     * 渲染拼写内容
     */
    renderSpellingContent(wordData) {
        const state = this.spellingState;
        
        if (state.currentMode === 'audio') {
            return `
                <div class="mb-6">
                    <div class="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <i class="fa-solid fa-headphones text-5xl text-white"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">仔细听发音</h3>
                    <p class="text-gray-600">点击右侧的 🔊 按钮可以重复播放</p>
                </div>
            `;
        } else {
            return `
                <div class="mb-6">
                    <div class="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <i class="fa-solid fa-book-open text-5xl text-white"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">${wordData.word}</h3>
                    <p class="text-lg text-gray-600 mb-2">${wordData.phonetic || `/${wordData.word}/`}</p>
                    <p class="text-base text-gray-700">${wordData.meaning || '暂无释义'}</p>
                    ${wordData.sentence ? `<p class="text-sm text-gray-500 italic mt-2">"${wordData.sentence}"</p>` : ''}
                </div>
            `;
        }
    },

    /**
     * 播放当前单词发音
     */
    speakCurrentWord() {
        try {
            const state = this.spellingState;
            const currentWord = state.words[state.currentIndex];
            
            console.log('尝试播放单词:', currentWord);
            
            if (typeof speech !== 'undefined') {
                speech.speakWord(currentWord).catch(err => {
                    console.warn('语音播放失败:', err);
                    // 如果是浏览器自动播放策略阻止，给用户提示
                    if (err?.name === 'NotAllowedError' || err?.message?.includes('allowed')) {
                        helpers.showToast('请点击页面任意位置后再试', 'warning');
                    }
                });
            } else if (window.speechSynthesis) {
                // 先取消之前的播放
                window.speechSynthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(currentWord);
                utterance.lang = 'en-US';
                utterance.rate = 0.8;
                
                utterance.onerror = (e) => {
                    console.warn('语音合成错误:', e);
                };
                
                window.speechSynthesis.speak(utterance);
            } else {
                helpers.showToast('您的浏览器不支持语音播放', 'error');
            }
        } catch (error) {
            console.error('播放单词发音错误:', error);
            errorHandler.handle(error, '播放单词发音');
        }
    },

    /**
     * 检查拼写
     */
    checkSpelling() {
        try {
            const input = document.getElementById('spelling-input');
            const userAnswer = input.value.trim().toLowerCase();
            const correctAnswer = this.spellingState.words[this.spellingState.currentIndex].toLowerCase();
            
            if (!userAnswer) {
                errorHandler.showErrorNotification({
                    title: '输入为空',
                    message: '请输入单词拼写',
                    icon: 'fa-exclamation-circle',
                    color: 'text-yellow-500'
                });
                return;
            }

            const isCorrect = userAnswer === correctAnswer;
            const timeSpent = Date.now() - this.spellingState.startTime;

            // 保存学习记录
            dataSync.saveLearningRecord({
                word: correctAnswer,
                wordlistId: 'spelling-mode', // 可以扩展为实际的词表ID
                mode: this.spellingState.currentMode === 'audio' ? 'audio_spelling' : 'meaning_spelling',
                score: isCorrect ? 100 : 0,
                timeSpent: timeSpent,
                correct: isCorrect
            });

            if (isCorrect) {
                this.spellingState.score++;
                this.showSpellingFeedback(true, '拼写正确！', `✅ ${correctAnswer}`);
            } else {
                // 保存错误单词
                dataSync.saveErrorWord(correctAnswer, 'spelling-mode', 'spelling', correctAnswer);
                this.spellingState.errors.push({
                    word: correctAnswer,
                    userAnswer: userAnswer,
                    correctAnswer: correctAnswer
                });
                this.showSpellingFeedback(false, '拼写错误', `❌ 正确答案是: ${correctAnswer}`);
            }

            // 禁用输入和按钮
            input.disabled = true;
            document.querySelector('#spelling-mode button[onclick="student.checkSpelling()"]').disabled = true;

            // 2秒后进入下一个单词
            setTimeout(() => {
                this.nextSpellingWord();
            }, 2000);

        } catch (error) {
            errorHandler.handle(error, '检查拼写');
        }
    },

    /**
     * 显示拼写反馈
     */
    showSpellingFeedback(isCorrect, title, message) {
        try {
            const feedbackDiv = document.getElementById('spelling-feedback');
            const resultDiv = document.getElementById('spelling-result');
            
            feedbackDiv.classList.remove('hidden');
            
            if (isCorrect) {
                resultDiv.className = 'p-4 rounded-xl bg-green-50 border border-green-200 text-green-800';
                resultDiv.innerHTML = `
                    <div class="flex items-center">
                        <i class="fa-solid fa-check-circle text-green-500 text-xl mr-3"></i>
                        <div>
                            <h4 class="font-bold">${title}</h4>
                            <p class="text-sm">${message}</p>
                        </div>
                    </div>
                `;
            } else {
                resultDiv.className = 'p-4 rounded-xl bg-red-50 border border-red-200 text-red-800';
                resultDiv.innerHTML = `
                    <div class="flex items-center">
                        <i class="fa-solid fa-times-circle text-red-500 text-xl mr-3"></i>
                        <div>
                            <h4 class="font-bold">${title}</h4>
                            <p class="text-sm">${message}</p>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            errorHandler.handle(error, '显示拼写反馈');
        }
    },

    /**
     * 下一个单词
     */
    nextSpellingWord() {
        try {
            this.spellingState.currentIndex++;
            
            if (this.spellingState.currentIndex >= this.spellingState.words.length) {
                // 完成所有单词
                this.completeSpellingMode();
            } else {
                // 重置状态并渲染下一个单词
                this.spellingState.startTime = Date.now();
                this.renderSpellingMode();
            }
        } catch (error) {
            errorHandler.handle(error, '下一个拼写单词');
            this.exitSpellingMode();
        }
    },

    /**
     * 跳过当前单词
     */
    skipSpelling() {
        try {
            const currentWord = this.spellingState.words[this.spellingState.currentIndex];
            
            // 记录为跳过（错误处理）
            dataSync.saveErrorWord(currentWord, 'spelling-mode', 'skipped', currentWord);
            
            this.showSpellingFeedback(false, '已跳过', `答案: ${currentWord}`);
            
            // 2秒后进入下一个单词
            setTimeout(() => {
                this.nextSpellingWord();
            }, 1500);
            
        } catch (error) {
            errorHandler.handle(error, '跳过拼写单词');
        }
    },

    // 已移除拼写模式切换，保持固定的“听音拼写”挑战度

    /**
     * 完成拼写模式
     */
    completeSpellingMode() {
        try {
            const state = this.spellingState;
            const accuracy = Math.round((state.score / state.words.length) * 100);
            const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
            const user = auth.getCurrentUser();
            const awardCoins = Math.max(1, Math.floor(state.score * 2));
            if (user && awardCoins > 0) {
                db.addCoins(user.id, awardCoins);
                app.updateNav();
            }
            dataSync.saveLearningProgress('spelling-mode', { completedWords: state.words.length, score: accuracy, timeSpent: timeSpent, errorCount: state.errors.length });

            const completionHtml = `
                <div id="spelling-completion" class="fixed inset-0 bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center z-50">
                    <div class="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 text-center">
                        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6">
                            <i class="fa-solid fa-trophy text-5xl text-white"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-800 mb-4">练习完成！</h2>
                        
                        <div class="space-y-4 mb-6">
                            <div class="bg-gray-50 rounded-xl p-4">
                                <div class="text-2xl font-bold text-green-600 mb-1">${accuracy}%</div>
                                <div class="text-sm text-gray-600">正确率</div>
                            </div>
                            <div class="bg-gray-50 rounded-xl p-4">
                                <div class="text-2xl font-bold text-blue-600 mb-1">${state.score}/${state.words.length}</div>
                                <div class="text-sm text-gray-600">正确数量</div>
                            </div>
                            <div class="bg-gray-50 rounded-xl p-4">
                                <div class="text-2xl font-bold text-purple-600 mb-1">${timeSpent}s</div>
                                <div class="text-sm text-gray-600">用时</div>
                            </div>
                        </div>

                        ${state.errors.length > 0 ? `
                            <div class="bg-red-50 rounded-xl p-4 mb-6">
                                <h4 class="font-bold text-red-800 mb-2">错误单词 (${state.errors.length}个)</h4>
                                <div class="text-left space-y-1 max-h-32 overflow-y-auto">
                                    ${state.errors.map(error => `
                                        <div class="text-sm text-red-700">
                                            <span class="font-medium">${error.word}</span> 
                                            ${error.userAnswer ? `→ 你的答案: ${error.userAnswer}` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div class="bg-yellow-50 rounded-xl p-3 mb-6 border border-yellow-200 text-yellow-700">
                            <i class="fa-solid fa-coins mr-2"></i>奖励 ${awardCoins} 金币
                        </div>

                        <div class="flex space-x-3">
                            <button onclick="student.restartSpellingMode()" 
                                    class="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-3 rounded-xl font-medium transition shadow-lg">
                                <i class="fa-solid fa-redo mr-2"></i>重新练习
                            </button>
                            <button onclick="student.exitSpellingMode()" 
                                    class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-medium transition">
                                <i class="fa-solid fa-home mr-2"></i>返回
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('spelling-mode').remove();
            document.body.insertAdjacentHTML('beforeend', completionHtml);
            
        } catch (error) {
            errorHandler.handle(error, '完成拼写模式');
            this.exitSpellingMode();
        }
    },

    /**
     * 重新开始拼写模式
     */
    restartSpellingMode() {
        document.getElementById('spelling-completion').remove();
        this.createSimpleSpellingMode(this.spellingState.words);
    },

    /**
     * 退出拼写模式
     */
    exitSpellingMode() {
        try {
            const mode = document.getElementById('spelling-mode');
            const completion = document.getElementById('spelling-completion');
            
            if (mode) mode.remove();
            if (completion) completion.remove();
            
            this.spellingState = null;
            
            // 返回学习模式选择
            if (this.currentWordlistId) {
                this.showSelfLearningModeChoice(this.currentWordlistId);
            }
            
        } catch (error) {
            errorHandler.handle(error, '退出拼写模式');
        }
    },

    /**
     * 创建选择题模式
     */
    createSimpleQuizMode(words) {
        try {
            errorHandler.showLoading('正在初始化选择题模式...');
            
            if (!words || words.length === 0) {
                throw new Error('单词列表为空');
            }

            // 打乱单词顺序
            const shuffledWords = [...words].sort(() => Math.random() - 0.5);
            
            const quizState = {
                words: shuffledWords,
                currentIndex: 0,
                score: 0,
                errors: [],
                startTime: Date.now(),
                mode: 'quiz', // 可以是 'meaning_to_word' (释义选词) 或 'word_to_meaning' (词选释义)
                currentMode: 'meaning_to_word', // 默认释义选词
                currentQuestion: null,
                options: [],
                answered: false
            };

            this.quizState = quizState;
            
            errorHandler.hideLoading();
            this.generateQuizQuestion();
            
        } catch (error) {
            errorHandler.hideLoading();
            errorHandler.handle(error, '创建选择题模式');
            // 回退到卡片模式
            this.startFlashcardMode(words);
        }
    },

    /**
     * 生成选择题问题
     */
    generateQuizQuestion() {
        try {
            const state = this.quizState;
            const currentWord = state.words[state.currentIndex];
            const wordData = this.enrichWordData(currentWord);
            
            // 生成选项
            const options = this.generateQuizOptions(currentWord, wordData, state.currentMode);
            
            state.currentQuestion = {
                word: currentWord,
                wordData: wordData,
                correctAnswer: state.currentMode === 'meaning_to_word' ? currentWord : wordData.meaning,
                options: options
            };
            
            state.answered = false;
            this.renderQuizMode();
            
        } catch (error) {
            errorHandler.handle(error, '生成选择题问题');
            this.nextQuizQuestion();
        }
    },

    /**
     * 生成选择题选项
     */
    generateQuizOptions(correctWord, correctWordData, mode) {
        try {
            const options = [];
            const pool = (this.quizState?.words || []).filter(w => w !== correctWord);
            
            // 防御：确保正确答案的数据有效
            const validCorrectMeaning = correctWordData.meaning || `[缺失中文释义] ${correctWord}`;
            
            if (mode === 'meaning_to_word') {
                options.push({ value: correctWord, display: correctWord, isCorrect: true });
                const shuffled = pool.slice().sort(() => Math.random() - 0.5);
                for (let i = 0; i < Math.min(3, shuffled.length); i++) {
                    options.push({ value: shuffled[i], display: shuffled[i], isCorrect: false });
                }
            } else {
                options.push({ value: validCorrectMeaning, display: validCorrectMeaning, isCorrect: true });
                
                const shuffledOthers = pool.slice().sort(() => Math.random() - 0.5);
                let addedDistractors = 0;
                
                for (let i = 0; i < shuffledOthers.length && addedDistractors < 3; i++) {
                    const otherWordData = this.enrichWordData(shuffledOthers[i]);
                    // 防御：确保干扰项的中文有效，且与正确答案不同，也不能是英文单词本身
                    const otherMeaning = otherWordData.meaning;
                    if (otherMeaning && otherMeaning !== validCorrectMeaning && otherMeaning !== shuffledOthers[i]) {
                        options.push({ value: otherMeaning, display: otherMeaning, isCorrect: false });
                        addedDistractors++;
                    }
                }
                
                // 如果干扰项不够（比如整个词库释义都缺失），就去大词典里随机抽
                if (addedDistractors < 3 && typeof db !== 'undefined' && db.getAllWords) {
                    const allWords = db.getAllWords();
                    const extraPool = allWords.filter(w => w.meaning && w.meaning !== validCorrectMeaning && w.word !== correctWord);
                    const shuffledExtra = extraPool.sort(() => Math.random() - 0.5);
                    
                    for (let i = 0; i < shuffledExtra.length && addedDistractors < 3; i++) {
                        options.push({ value: shuffledExtra[i].meaning, display: shuffledExtra[i].meaning, isCorrect: false });
                        addedDistractors++;
                    }
                }
            }
            return options.sort(() => Math.random() - 0.5);
        } catch (error) {
            errorHandler.handle(error, '生成选择题选项');
            const safeMeaning = correctWordData.meaning || `[缺失中文释义] ${correctWord}`;
            return [{
                value: mode === 'meaning_to_word' ? correctWord : safeMeaning,
                display: mode === 'meaning_to_word' ? correctWord : safeMeaning,
                isCorrect: true
            }];
        }
    },

    /**
     * 渲染选择题模式
     */
    renderQuizMode() {
        try {
            const state = this.quizState;
            const question = state.currentQuestion;
            const modeText = state.currentMode === 'meaning_to_word' ? '释义选词' : '词选释义';
            
            const instruction = state.currentMode === 'meaning_to_word' 
                ? '请选择正确的单词' 
                : '请选择正确的释义';

            const quizHtml = `
                <div id="quiz-mode" class="fixed inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center z-50 overflow-y-auto">
                    <div class="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <!-- 头部 -->
                        <div class="text-center mb-6">
                            <div class="flex items-center justify-between mb-4">
                                <button onclick="student.exitQuizMode()" 
                                    class="text-gray-500 hover:text-gray-700 transition">
                                    <i class="fa-solid fa-times text-xl"></i>
                                </button>
                                <div class="text-center">
                                    <h2 class="text-2xl font-bold text-gray-800">${modeText}</h2>
                                    <p class="text-gray-600">${instruction}</p>
                                </div>
                            </div>
                            
                            <!-- 进度条 -->
                            <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
                                <div id="quiz-progress-bar" class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300" 
                                     style="width: ${((state.currentIndex + 1) / state.words.length) * 100}%"></div>
                            </div>
                            <div class="text-sm text-gray-600">
                                第 <span id="quiz-current">${state.currentIndex + 1}</span> / <span id="quiz-total">${state.words.length}</span> 个单词
                            </div>
                        </div>

                        <!-- 问题区域 -->
                        <div class="text-center mb-8">
                            ${this.renderQuizQuestion(question)}
                        </div>

                        <!-- 选项区域 -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            ${question.options.map((option, index) => `
                                <button onclick="student.selectQuizAnswer(${index})" 
                                        id="quiz-option-${index}"
                                        class="quiz-option bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300 rounded-xl p-4 text-left transition-all duration-200 transform hover:scale-105"
                                        ${state.answered ? 'disabled' : ''}>
                                    <div class="flex items-center">
                                        <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                                            <span class="text-gray-600 font-bold">${String.fromCharCode(65 + index)}</span>
                                        </div>
                                        <div class="text-gray-800">${option.display}</div>
                                    </div>
                                </button>
                            `).join('')}
                        </div>

                        <!-- 提示信息 -->
                        <div id="quiz-feedback" class="text-center mb-4 hidden">
                            <div id="quiz-result" class="p-4 rounded-xl"></div>
                        </div>

                        <!-- 按钮区域 -->
                        <div class="flex space-x-4">
                            <button onclick="student.skipQuiz()" 
                                    class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-medium transition">
                                <i class="fa-solid fa-forward mr-2"></i>跳过
                            </button>
                            <button onclick="student.nextQuizQuestion()" 
                                    id="quiz-next-btn"
                                    class="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-xl font-medium transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    ${!state.answered ? 'disabled' : ''}>
                                <i class="fa-solid fa-arrow-right mr-2"></i>下一题
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // 移除现有模式
            const existing = document.getElementById('quiz-mode');
            if (existing) existing.remove();

            document.body.insertAdjacentHTML('beforeend', quizHtml);
            
        } catch (error) {
            errorHandler.handle(error, '渲染选择题模式');
            this.exitQuizMode();
        }
    },

    /**
     * 渲染选择题问题
     */
    renderQuizQuestion(question) {
        const state = this.quizState;
        
        if (state.currentMode === 'meaning_to_word') {
            const wordData = question.wordData;
            const masked = wordData.sentence ? this.maskWordInSentence(wordData.sentence, question.word) : '';
            return `
                <div class="mb-6">
                    <div class="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <i class="fa-solid fa-question text-5xl text-white"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">${wordData.meaning || '暂无释义'}</h3>
                    ${masked ? `<p class="text-base text-gray-600 italic">"${masked}"</p>` : ''}
                </div>
            `;
        } else {
            // 词选释义：显示单词，选择释义
            return `
                <div class="mb-6">
                    <div class="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <i class="fa-solid fa-font text-5xl text-white"></i>
                    </div>
                    <h3 class="text-3xl font-bold text-gray-800 mb-2">${question.word}</h3>
                    ${question.wordData.phonetic ? `<p class="text-xl text-gray-600 mb-4">[${question.wordData.phonetic}]</p>` : ''}
                    <p class="text-lg text-gray-700">请选择正确的释义</p>
                </div>
            `;
        }
    },

    /**
     * 选择答案
     */
    selectQuizAnswer(selectedIndex) {
        try {
            if (this.quizState.answered) return;
            
            const state = this.quizState;
            const question = state.currentQuestion;
            const selectedOption = question.options[selectedIndex];
            const isCorrect = selectedOption.isCorrect;
            const timeSpent = Date.now() - state.startTime;
            
            state.answered = true;
            
            // 保存学习记录
            dataSync.saveLearningRecord({
                word: question.word,
                wordlistId: 'quiz-mode',
                mode: state.currentMode === 'meaning_to_word' ? 'meaning_to_word' : 'word_to_meaning',
                score: isCorrect ? 100 : 0,
                timeSpent: timeSpent,
                correct: isCorrect
            });

            // 直接进入下一题前更新分数与错题
            if (isCorrect) {
                state.score++;
            } else {
                // 保存错误单词
                dataSync.saveErrorWord(question.word, 'quiz-mode', 'quiz', question.correctAnswer);
                state.errors.push({
                    word: question.word,
                    userAnswer: selectedOption.value,
                    correctAnswer: question.correctAnswer
                });
            }
            setTimeout(() => this.nextQuizQuestion(), 100);
            
        } catch (error) {
            errorHandler.handle(error, '选择答案');
        }
    },

    /**
     * 显示选择题结果
     */
    showQuizResult(selectedIndex, isCorrect) {
        try {
            const state = this.quizState;
            const question = state.currentQuestion;
            
            // 禁用所有选项
            document.querySelectorAll('.quiz-option').forEach(btn => {
                btn.disabled = true;
            });
            
            // 标记选中的选项
            const selectedBtn = document.getElementById(`quiz-option-${selectedIndex}`);
            if (selectedBtn) {
                if (isCorrect) {
                    selectedBtn.classList.add('bg-green-50', 'border-green-500', 'text-green-800');
                    selectedBtn.innerHTML = selectedBtn.innerHTML.replace('bg-gray-100', 'bg-green-100 text-green-600');
                } else {
                    selectedBtn.classList.add('bg-red-50', 'border-red-500', 'text-red-800');
                    selectedBtn.innerHTML = selectedBtn.innerHTML.replace('bg-gray-100', 'bg-red-100 text-red-600');
                }
            }
            
            // 显示正确答案
            if (!isCorrect) {
                const correctIndex = question.options.findIndex(option => option.isCorrect);
                const correctBtn = document.getElementById(`quiz-option-${correctIndex}`);
                if (correctBtn) {
                    correctBtn.classList.add('bg-green-50', 'border-green-500', 'text-green-800');
                    correctBtn.innerHTML = correctBtn.innerHTML.replace('bg-gray-100', 'bg-green-100 text-green-600');
                }
            }
            
            // 显示反馈
            const feedbackDiv = document.getElementById('quiz-feedback');
            const resultDiv = document.getElementById('quiz-result');
            
            feedbackDiv.classList.remove('hidden');
            
            if (isCorrect) {
                resultDiv.className = 'p-4 rounded-xl bg-green-50 border border-green-200 text-green-800';
                resultDiv.innerHTML = `
                    <div class="flex items-center justify-center">
                        <i class="fa-solid fa-check-circle text-green-500 text-xl mr-3"></i>
                        <div>
                            <h4 class="font-bold">回答正确！</h4>
                            <p class="text-sm">太棒了！继续加油！</p>
                        </div>
                    </div>
                `;
            } else {
                resultDiv.className = 'p-4 rounded-xl bg-red-50 border border-red-200 text-red-800';
                resultDiv.innerHTML = `
                    <div class="flex items-center justify-center">
                        <i class="fa-solid fa-times-circle text-red-500 text-xl mr-3"></i>
                        <div>
                            <h4 class="font-bold">回答错误</h4>
                            <p class="text-sm">正确答案是: ${question.correctAnswer}</p>
                        </div>
                    </div>
                `;
            }
            
        } catch (error) {
            errorHandler.handle(error, '显示选择题结果');
        }
    },

    /**
     * 下一题
     */
    nextQuizQuestion() {
        try {
            this.quizState.currentIndex++;
            
            if (this.quizState.currentIndex >= this.quizState.words.length) {
                // 完成所有题目
                this.completeQuizMode();
            } else {
                // 生成下一题
                this.generateQuizQuestion();
            }
        } catch (error) {
            errorHandler.handle(error, '下一题');
            this.exitQuizMode();
        }
    },

    /**
     * 跳过当前题目
     */
    skipQuiz() {
        try {
            const currentWord = this.quizState.words[this.quizState.currentIndex];
            
            // 记录为跳过（错误处理）
            dataSync.saveErrorWord(currentWord, 'quiz-mode', 'skipped', currentWord);
            
            this.nextQuizQuestion();
            
        } catch (error) {
            errorHandler.handle(error, '跳过题目');
        }
    },

    /**
     * 切换选择题模式
     */
    // 已移除选择题模式切换，保持固定的“释义选词”挑战度

    /**
     * 完成选择题模式
     */
    completeQuizMode() {
        try {
            const state = this.quizState;
            const accuracy = Math.round((state.score / state.words.length) * 100);
            const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
            const user = auth.getCurrentUser();
            const awardCoins = Math.max(1, Math.floor(state.score * 2));
            if (user && awardCoins > 0) {
                db.addCoins(user.id, awardCoins);
                app.updateNav();
            }
            dataSync.saveLearningProgress('quiz-mode', { completedWords: state.words.length, score: accuracy, timeSpent: timeSpent, errorCount: state.errors.length });

            const completionHtml = `
                <div id="quiz-completion" class="fixed inset-0 bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center z-50">
                    <div class="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 text-center">
                        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center mx-auto mb-6">
                            <i class="fa-solid fa-graduation-cap text-5xl text-white"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-800 mb-4">测试完成！</h2>
                        
                        <div class="space-y-4 mb-6">
                            <div class="bg-gray-50 rounded-xl p-4">
                                <div class="text-2xl font-bold text-purple-600 mb-1">${accuracy}%</div>
                                <div class="text-sm text-gray-600">正确率</div>
                            </div>
                            <div class="bg-gray-50 rounded-xl p-4">
                                <div class="text-2xl font-bold text-blue-600 mb-1">${state.score}/${state.words.length}</div>
                                <div class="text-sm text-gray-600">正确数量</div>
                            </div>
                            <div class="bg-gray-50 rounded-xl p-4">
                                <div class="text-2xl font-bold text-green-600 mb-1">${timeSpent}s</div>
                                <div class="text-sm text-gray-600">用时</div>
                            </div>
                        </div>

                        ${state.errors.length > 0 ? `
                            <div class="bg-red-50 rounded-xl p-4 mb-6">
                                <h4 class="font-bold text-red-800 mb-2">错误题目 (${state.errors.length}个)</h4>
                                <div class="text-left space-y-1 max-h-32 overflow-y-auto">
                                    ${state.errors.map(error => `
                                        <div class="text-sm text-red-700">
                                            <span class="font-medium">${error.word}</span> 
                                            <span class="text-xs">→ 你的答案: ${error.userAnswer}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div class="bg-yellow-50 rounded-xl p-3 mb-6 border border-yellow-200 text-yellow-700">
                            <i class="fa-solid fa-coins mr-2"></i>奖励 ${awardCoins} 金币
                        </div>

                        <div class="flex space-x-3">
                            <button onclick="student.restartQuizMode()" 
                                    class="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white py-3 rounded-xl font-medium transition shadow-lg">
                                <i class="fa-solid fa-redo mr-2"></i>重新测试
                            </button>
                            <button onclick="student.exitQuizMode()" 
                                    class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-medium transition">
                                <i class="fa-solid fa-home mr-2"></i>返回
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('quiz-mode').remove();
            document.body.insertAdjacentHTML('beforeend', completionHtml);
            
        } catch (error) {
            errorHandler.handle(error, '完成选择题模式');
            this.exitQuizMode();
        }
    },

    /**
     * 重新开始选择题模式
     */
    restartQuizMode() {
        document.getElementById('quiz-completion').remove();
        this.createSimpleQuizMode(this.quizState.words);
    },

    /**
     * 退出选择题模式
     */
    exitQuizMode() {
        try {
            const mode = document.getElementById('quiz-mode');
            const completion = document.getElementById('quiz-completion');
            
            if (mode) mode.remove();
            if (completion) completion.remove();
            
            this.quizState = null;
            
            // 返回学习模式选择
            if (this.currentWordlistId) {
                this.showSelfLearningModeChoice(this.currentWordlistId);
            }
            
        } catch (error) {
            errorHandler.handle(error, '退出选择题模式');
        }
    },

    /**
     * 渲染闯关游戏模式
     */
    renderGameMode() {
        try {
            const state = this.gameState;
            const question = state.currentQuestion;
            const progress = ((state.currentIndex + 1) / state.words.length * 100).toFixed(1);
            
            const gameHtml = `
                <div id="game-mode" class="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 z-50 flex items-center justify-center p-4">
                    <div class="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <!-- 游戏头部 -->
                        <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-3xl">
                            <div class="flex items-center justify-between mb-4">
                                <button onclick="student.exitGameMode()" 
                                    class="text-white/80 hover:text-white transition">
                                    <i class="fa-solid fa-times text-xl"></i>
                                </button>
                                <div class="text-center">
                                    <h2 class="text-2xl font-bold">🎮 闯关游戏</h2>
                                    <p class="text-white/90">难度：${this.getDifficultyText(state.difficulty)}</p>
                                </div>
                                <div class="text-right">
                                    <div class="text-lg font-bold">${state.score}分</div>
                                    <div class="text-sm text-white/80">${state.coins}💰</div>
                                </div>
                            </div>
                            
                            <!-- 游戏状态 -->
                            <div class="grid grid-cols-4 gap-4 text-center">
                                <div class="bg-white/20 rounded-lg p-3">
                                    <div class="text-sm text-white/80">生命值</div>
                                    <div class="flex justify-center mt-1">
                                        ${Array(Math.max(0, Math.min(10, state.lives || 3))).fill('❤️').join('')}
                                    </div>
                                </div>
                                <div class="bg-white/20 rounded-lg p-3">
                                    <div class="text-sm text-white/80">连击</div>
                                    <div class="text-lg font-bold">${state.combo}x</div>
                                </div>
                                <div class="bg-white/20 rounded-lg p-3">
                                    <div class="text-sm text-white/80">关卡</div>
                                    <div class="text-lg font-bold">${state.level}</div>
                                </div>
                                <div class="bg-white/20 rounded-lg p-3">
                                    <div class="text-sm text-white/80">进度</div>
                                    <div class="text-lg font-bold">${progress}%</div>
                                </div>
                            </div>
                            
                            <!-- 进度条 -->
                            <div class="mt-4">
                                <div class="bg-white/20 rounded-full h-2">
                                    <div class="bg-yellow-400 h-2 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 游戏内容 -->
                        <div class="p-8">
                            <div class="text-center mb-8">
                                <div class="mb-6">
                                    <div class="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                                        <i class="fa-solid fa-question text-3xl text-white"></i>
                                    </div>
                                    <h3 class="text-2xl font-bold text-gray-800 mb-2">${question.question}</h3>
                                    ${question.hint ? `<p class="text-lg text-gray-600 mb-2">提示：${question.hint}</p>` : ''}
                                    ${question.timeLimit ? `<p class="text-sm text-gray-500">⏱️ ${question.timeLimit}秒</p>` : ''}
                                </div>
                            </div>
                            
                            <!-- 游戏选项 -->
                            <div class="mb-8">
                                ${this.renderGameQuestion(question)}
                            </div>
                            
                            <!-- 游戏控制 -->
                            <div class="flex space-x-4">
                                <button onclick="student.useGameHint()" 
                                        class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl font-medium transition shadow-lg">
                                    <i class="fa-solid fa-lightbulb mr-2"></i>使用提示
                                </button>
                                <button onclick="student.skipGameQuestion()" 
                                        class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition shadow-lg">
                                    <i class="fa-solid fa-forward mr-2"></i>跳过
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 移除现有模式
            const existing = document.getElementById('game-mode');
            if (existing) existing.remove();

            document.body.insertAdjacentHTML('beforeend', gameHtml);
            
            // 添加计时器
            if (question.timeLimit) {
                this.startGameTimer(question.timeLimit);
            }
            
        } catch (error) {
            errorHandler.handle(error, '渲染闯关游戏模式');
            this.exitGameMode();
        }
    },

    /**
     * 渲染游戏问题
     */
    renderGameQuestion(question) {
        try {
            if (question.type === 'simple_choice' || question.type === 'multiple_choice') {
                return `
                    <div class="grid gap-4">
                        ${question.options.map((option, index) => `
                            <button onclick="student.answerGameQuestion('${option.value}', ${option.isCorrect})" 
                                    class="game-option bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-gray-800 py-4 px-6 rounded-xl font-medium transition shadow-md hover:shadow-lg border-2 border-transparent hover:border-blue-300">
                                <div class="flex items-center justify-between">
                                    <span class="text-lg">${option.display}</span>
                                    <i class="fa-solid fa-arrow-right text-blue-500"></i>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                `;
            } else if (question.type === 'fill_blank') {
                return `
                    <div class="text-center">
                        <input type="text" id="game-answer-input" 
                               class="text-2xl text-center border-2 border-gray-300 rounded-xl py-4 px-6 mb-4 w-full max-w-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                               placeholder="请输入单词..."
                               onkeypress="if(event.key === 'Enter') student.submitGameAnswer()">
                        <br>
                        <button onclick="student.submitGameAnswer()" 
                                class="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 px-8 rounded-xl font-medium transition shadow-lg">
                            <i class="fa-solid fa-check mr-2"></i>提交答案
                        </button>
                    </div>
                `;
            }
            
            return '<p class="text-center text-gray-600">游戏类型不支持</p>';
            
        } catch (error) {
            errorHandler.handle(error, '渲染游戏问题');
            return '<p class="text-center text-red-500">问题渲染失败</p>';
        }
    },

    /**
     * 回答游戏问题
     */
    answerGameQuestion(answer, isCorrect) {
        try {
            const state = this.gameState;
            const currentWord = state.words[state.currentIndex];
            state.answered = true;
            
            // 清除计时器
            this.clearGameTimer();
            
            if (isCorrect) {
                // 播放正确音效
                speech.playSound('correct');
                
                // 正确答案
                const points = state.currentQuestion.points * (1 + state.combo * 0.1);
                state.score += Math.floor(points);
                state.coins += Math.floor(points / 10);
                state.combo++;
                state.maxCombo = Math.max(state.maxCombo, state.combo);
                
                // 显示成功动画
                this.showGameSuccess(answer);
                
                // 保存学习记录
                this.saveGameRecord(currentWord, true, points);
                
            } else {
                // 播放错误音效
                speech.playSound('wrong');
                
                // 错误答案
                state.lives--;
                state.combo = 0;
                state.errors.push(state.currentQuestion.word);
                
                // 显示错误动画
                this.showGameError(answer, state.currentQuestion.correctAnswer);
                
                // 保存错误记录
                this.saveGameRecord(currentWord, false, 0);
                
                // 检查生命值
                if (state.lives <= 0) {
                    this.gameOver();
                    return;
                }
            }
            
            // 检查是否升级
            this.checkLevelUp();
            
            // 延迟进入下一题
            setTimeout(() => {
                this.nextGameQuestion();
            }, 1500);
            
        } catch (error) {
            errorHandler.handle(error, '回答游戏问题');
            this.nextGameQuestion();
        }
    },

    /**
     * 提交游戏答案
     */
    submitGameAnswer() {
        try {
            const input = document.getElementById('game-answer-input');
            const answer = input.value.trim().toLowerCase();
            const correctAnswer = this.gameState.currentQuestion.correctAnswer.toLowerCase();
            
            if (!answer) {
                helpers.showToast('请输入答案', 'warning');
                return;
            }
            
            this.answerGameQuestion(answer, answer === correctAnswer);
            
        } catch (error) {
            errorHandler.handle(error, '提交游戏答案');
        }
    },

    /**
     * 使用游戏提示
     */
    useGameHint() {
        try {
            const state = this.gameState;
            const question = state.currentQuestion;
            
            if (state.coins < 20) {
                helpers.showToast('金币不足，需要20金币', 'warning');
                return;
            }
            
            state.coins -= 20;
            
            if (question.type === 'fill_blank') {
                // 显示更多提示
                const hint = this.generateHint(question.word, 'hard');
                helpers.showToast(`提示：${hint}`, 'info');
            } else if (question.options) {
                // 移除一个错误选项
                const wrongOptions = question.options.filter(opt => !opt.isCorrect);
                if (wrongOptions.length > 0) {
                    const optionToRemove = wrongOptions[0];
                    const buttons = document.querySelectorAll('.game-option');
                    buttons.forEach(button => {
                        if (button.textContent.includes(optionToRemove.display)) {
                            button.style.opacity = '0.3';
                            button.disabled = true;
                        }
                    });
                    helpers.showToast('已移除一个错误选项', 'success');
                }
            }
            
            this.updateGameUI();
            
        } catch (error) {
            errorHandler.handle(error, '使用游戏提示');
        }
    },

    /**
     * 跳过游戏问题
     */
    skipGameQuestion() {
        try {
            if (this.gameState.coins < 10) {
                helpers.showToast('金币不足，需要10金币', 'warning');
                return;
            }
            
            this.gameState.coins -= 10;
            this.gameState.errors.push(this.gameState.currentQuestion.word);
            this.nextGameQuestion();
            
        } catch (error) {
            errorHandler.handle(error, '跳过游戏问题');
        }
    },

    /**
     * 下一游戏问题
     */
    nextGameQuestion() {
        try {
            const state = this.gameState;
            state.currentIndex++;
            
            if (state.currentIndex >= state.words.length) {
                // 游戏完成
                this.completeGame();
                return;
            }
            
            this.generateGameQuestion();
            
        } catch (error) {
            errorHandler.handle(error, '下一游戏问题');
            this.exitGameMode();
        }
    },

    /**
     * 显示游戏成功
     */
    showGameSuccess(answer) {
        try {
            // 成功动画
            const successHtml = `
                <div id="game-success" class="fixed inset-0 bg-black/50 z-60 flex items-center justify-center">
                    <div class="bg-white rounded-2xl p-8 text-center shadow-2xl transform scale-100 transition-transform duration-300">
                        <div class="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                            <i class="fa-solid fa-check text-3xl text-white"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800 mb-2">🎉 答对了！</h3>
                        <p class="text-gray-600 mb-4">获得 ${this.gameState.currentQuestion.points} 分</p>
                        ${this.gameState.combo > 1 ? `<p class="text-yellow-600 font-bold">连击 x${this.gameState.combo}！</p>` : ''}
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', successHtml);
            
            setTimeout(() => {
                const element = document.getElementById('game-success');
                if (element) element.remove();
            }, 1500);
            
        } catch (error) {
            errorHandler.handle(error, '显示游戏成功');
        }
    },

    /**
     * 显示游戏错误
     */
    showGameError(answer, correctAnswer) {
        try {
            // 错误动画
            const errorHtml = `
                <div id="game-error" class="fixed inset-0 bg-black/50 z-60 flex items-center justify-center">
                    <div class="bg-white rounded-2xl p-8 text-center shadow-2xl">
                        <div class="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4">
                            <i class="fa-solid fa-times text-3xl text-white"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800 mb-2">❌ 答错了</h3>
                        <p class="text-gray-600 mb-2">你的答案：${answer}</p>
                        <p class="text-green-600 font-bold">正确答案：${correctAnswer}</p>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', errorHtml);
            
            setTimeout(() => {
                const element = document.getElementById('game-error');
                if (element) element.remove();
            }, 2000);
            
        } catch (error) {
            errorHandler.handle(error, '显示游戏错误');
        }
    },

    /**
     * 检查升级
     */
    checkLevelUp() {
        try {
            const state = this.gameState;
            const wordsPerLevel = 10;
            const newLevel = Math.floor(state.currentIndex / wordsPerLevel) + 1;
            
            if (newLevel > state.level) {
                state.level = newLevel;
                
                // 升级奖励
                const bonusCoins = newLevel * 50;
                state.coins += bonusCoins;
                
                // 升级动画
                this.showLevelUp(newLevel, bonusCoins);
                
                // 增加难度
                this.increaseDifficulty();
            }
            
        } catch (error) {
            errorHandler.handle(error, '检查升级');
        }
    },

    /**
     * 显示升级
     */
    showLevelUp(level, bonusCoins) {
        try {
            // 播放胜利/升级音效
            speech.playSound('win');
            
            const levelUpHtml = `
                <div id="level-up" class="fixed inset-0 bg-black/70 z-70 flex items-center justify-center">
                    <div class="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-8 text-center text-white shadow-2xl transform scale-110">
                        <div class="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                            <i class="fa-solid fa-trophy text-4xl"></i>
                        </div>
                        <h2 class="text-3xl font-bold mb-2">🎊 升级了！</h2>
                        <p class="text-xl mb-2">等级 ${level}</p>
                        <p class="text-lg">获得 ${bonusCoins} 金币奖励！</p>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', levelUpHtml);
            
            setTimeout(() => {
                const element = document.getElementById('level-up');
                if (element) element.remove();
            }, 2000);
            
        } catch (error) {
            errorHandler.handle(error, '显示升级');
        }
    },

    /**
     * 增加难度
     */
    increaseDifficulty() {
        try {
            const state = this.gameState;
            
            if (state.level <= 3) {
                state.difficulty = 'easy';
            } else if (state.level <= 6) {
                state.difficulty = 'medium';
            } else {
                state.difficulty = 'hard';
            }
            
        } catch (error) {
            errorHandler.handle(error, '增加难度');
        }
    },

    /**
     * 保存游戏记录
     */
    saveGameRecord(word, isCorrect, points) {
        try {
            const record = {
                word: word,
                mode: 'game',
                score: isCorrect ? points : 0,
                timeSpent: Date.now() - this.gameState.startTime,
                correct: isCorrect,
                difficulty: this.gameState.difficulty,
                level: this.gameState.level
            };
            
            dataSync.saveLearningRecord(record);
            
            if (!isCorrect) {
                dataSync.saveErrorWord({
                    word: word,
                    errorCount: 1,
                    lastErrorTime: new Date().toISOString()
                });
            }
            
        } catch (error) {
            errorHandler.handle(error, '保存游戏记录');
        }
    },

    /**
     * 开始游戏计时器
     */
    startGameTimer(timeLimit) {
        try {
            this.clearGameTimer();
            
            let timeLeft = timeLimit;
            const timerElement = document.createElement('div');
            timerElement.id = 'game-timer';
            timerElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg font-bold z-80';
            timerElement.innerHTML = `⏱️ ${timeLeft}s`;
            document.body.appendChild(timerElement);
            
            this.gameTimer = setInterval(() => {
                timeLeft--;
                timerElement.innerHTML = `⏱️ ${timeLeft}s`;
                
                if (timeLeft <= 10) {
                    timerElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg font-bold z-80 animate-pulse';
                }
                
                if (timeLeft <= 0) {
                    this.clearGameTimer();
                    this.answerGameQuestion('', false); // 超时算错误
                }
            }, 1000);
            
        } catch (error) {
            errorHandler.handle(error, '开始游戏计时器');
        }
    },

    /**
     * 清除游戏计时器
     */
    clearGameTimer() {
        try {
            if (this.gameTimer) {
                clearInterval(this.gameTimer);
                this.gameTimer = null;
            }
            
            const timerElement = document.getElementById('game-timer');
            if (timerElement) {
                timerElement.remove();
            }
            
        } catch (error) {
            errorHandler.handle(error, '清除游戏计时器');
        }
    },

    /**
     * 更新游戏UI
     */
    updateGameUI() {
        try {
            // 更新分数显示
            const scoreElements = document.querySelectorAll('#game-mode .text-right .text-lg');
            if (scoreElements[0]) {
                scoreElements[0].textContent = `${this.gameState.score}分`;
            }
            
            // 更新金币显示
            const coinElements = document.querySelectorAll('#game-mode .text-right .text-sm');
            if (coinElements[0]) {
                coinElements[0].textContent = `${this.gameState.coins}💰`;
            }
            
            // 更新生命值显示
            const livesContainer = document.querySelector('#game-mode .grid-cols-4 > div:first-child div');
            if (livesContainer) {
                livesContainer.innerHTML = Array(this.gameState.lives).fill('❤️').join('');
            }
            
            // 更新连击显示
            const comboElement = document.querySelectorAll('#game-mode .grid-cols-4 > div')[1];
            if (comboElement) {
                const comboDiv = comboElement.querySelector('.text-lg');
                if (comboDiv) {
                    comboDiv.textContent = `${this.gameState.combo}x`;
                }
            }
            
        } catch (error) {
            errorHandler.handle(error, '更新游戏UI');
        }
    },

    /**
     * 获取难度文本
     */
    getDifficultyText(difficulty) {
        const texts = {
            'easy': '简单',
            'medium': '中等',
            'hard': '困难'
        };
        return texts[difficulty] || '未知';
    },

    /**
     * 完成游戏
     */
    completeGame() {
        try {
            const state = this.gameState;
            const timeSpent = Date.now() - state.startTime;
            const accuracy = ((state.words.length - state.errors.length) / state.words.length * 100).toFixed(1);
            
            // 计算最终得分
            const finalScore = state.score + (state.coins * 2) + (state.maxCombo * 10);
            
            // 保存最终记录
            this.saveGameCompletion(finalScore, accuracy, timeSpent);
            
            // 显示完成界面
            this.showGameCompletion(finalScore, accuracy, timeSpent);
            
        } catch (error) {
            errorHandler.handle(error, '完成游戏');
            this.exitGameMode();
        }
    },

    /**
     * 保存游戏完成记录
     */
    saveGameCompletion(finalScore, accuracy, timeSpent) {
        try {
            const completion = {
                finalScore: finalScore,
                accuracy: accuracy,
                timeSpent: timeSpent,
                maxCombo: this.gameState.maxCombo,
                level: this.gameState.level,
                difficulty: this.gameState.difficulty,
                totalWords: this.gameState.words.length,
                errorCount: this.gameState.errors.length,
                timestamp: new Date().toISOString()
            };
            
            // 保存到本地存储
            const key = `gameCompletion_${auth.getCurrentUser()?.id || 'anonymous'}`;
            const existing = JSON.parse(helpers.memoryStore.get(key) || '[]');
            existing.push(completion);
            
            // 只保留最近10次记录
            if (existing.length > 10) {
                existing.splice(0, existing.length - 10);
            }
            
            helpers.memoryStore.set(key, JSON.stringify(existing));
            
        } catch (error) {
            errorHandler.handle(error, '保存游戏完成记录');
        }
    },

    /**
     * 显示游戏完成
     */
    showGameCompletion(finalScore, accuracy, timeSpent) {
        try {
            const state = this.gameState;
            const minutes = Math.floor(timeSpent / 60000);
            const seconds = Math.floor((timeSpent % 60000) / 1000);
            
            const completionHtml = `
                <div id="game-completion" class="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 z-60 flex items-center justify-center p-4">
                    <div class="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl max-w-2xl w-full p-8 text-center">
                        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <i class="fa-solid fa-trophy text-4xl text-white"></i>
                        </div>
                        
                        <h2 class="text-3xl font-bold text-gray-800 mb-4">🎊 恭喜通关！</h2>
                        
                        <div class="grid grid-cols-2 gap-6 mb-8">
                            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                                <div class="text-2xl font-bold text-blue-600">${finalScore}</div>
                                <div class="text-sm text-gray-600">最终得分</div>
                            </div>
                            <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                                <div class="text-2xl font-bold text-green-600">${accuracy}%</div>
                                <div class="text-sm text-gray-600">正确率</div>
                            </div>
                            <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
                                <div class="text-2xl font-bold text-purple-600">${minutes}:${seconds.toString().padStart(2, '0')}</div>
                                <div class="text-sm text-gray-600">用时</div>
                            </div>
                            <div class="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4">
                                <div class="text-2xl font-bold text-yellow-600">${state.maxCombo}</div>
                                <div class="text-sm text-gray-600">最高连击</div>
                            </div>
                        </div>
                        
                        <div class="mb-8">
                            <div class="text-lg mb-2">获得成就：</div>
                            <div class="flex justify-center space-x-4">
                                ${this.generateGameAchievements(finalScore, accuracy, state.maxCombo)}
                            </div>
                        </div>
                        
                        <div class="flex space-x-4">
                            <button onclick="student.restartGameMode()" 
                                    class="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 rounded-xl font-medium transition shadow-lg">
                                <i class="fa-solid fa-redo mr-2"></i>再玩一次
                            </button>
                            <button onclick="student.exitGameMode()" 
                                    class="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-3 rounded-xl font-medium transition shadow-lg">
                                <i class="fa-solid fa-home mr-2"></i>返回
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', completionHtml);
            
        } catch (error) {
            errorHandler.handle(error, '显示游戏完成');
        }
    },

    /**
     * 生成游戏成就
     */
    generateGameAchievements(score, accuracy, maxCombo) {
        try {
            const achievements = [];
            
            if (accuracy >= 90) {
                achievements.push('<div class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">🏆 完美通关</div>');
            }
            if (maxCombo >= 10) {
                achievements.push('<div class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">🔥 连击大师</div>');
            }
            if (score >= 1000) {
                achievements.push('<div class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">💎 高分达人</div>');
            }
            
            if (achievements.length === 0) {
                achievements.push('<div class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">🌟 完成挑战</div>');
            }
            
            return achievements.join('');
            
        } catch (error) {
            return '<div class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">🌟 完成挑战</div>';
        }
    },

    /**
     * 重新开始游戏模式
     */
    restartGameMode() {
        document.getElementById('game-completion').remove();
        this.createSimpleGameMode(this.gameState.words);
    },

    /**
     * 游戏结束
     */
    gameOver() {
        try {
            this.clearGameTimer();
            
            const gameOverHtml = `
                <div id="game-over" class="fixed inset-0 bg-black/70 z-70 flex items-center justify-center">
                    <div class="bg-white rounded-3xl p-8 text-center shadow-2xl">
                        <div class="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4">
                            <i class="fa-solid fa-heart-crack text-4xl text-white"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-800 mb-4">💔 游戏结束</h2>
                        <p class="text-gray-600 mb-6">生命值耗尽，挑战失败</p>
                        <div class="flex space-x-4">
                            <button onclick="student.restartGameMode()" 
                                    class="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 px-6 rounded-xl font-medium transition shadow-lg">
                                <i class="fa-solid fa-redo mr-2"></i>重新开始
                            </button>
                            <button onclick="student.exitGameMode()" 
                                    class="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-3 px-6 rounded-xl font-medium transition shadow-lg">
                                <i class="fa-solid fa-home mr-2"></i>返回
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', gameOverHtml);
            
        } catch (error) {
            errorHandler.handle(error, '游戏结束');
            this.exitGameMode();
        }
    },

    /**
     * 退出游戏模式
     */
    exitGameMode() {
        try {
            this.clearGameTimer();
            
            const mode = document.getElementById('game-mode');
            const completion = document.getElementById('game-completion');
            const over = document.getElementById('game-over');
            
            if (mode) mode.remove();
            if (completion) completion.remove();
            if (over) over.remove();
            
            this.gameState = null;
            
            // 返回学习模式选择
            if (this.currentWordlistId) {
                this.showSelfLearningModeChoice(this.currentWordlistId);
            }
            
        } catch (error) {
            errorHandler.handle(error, '退出游戏模式');
        }
    },

    /**
     * 创建闯关游戏模式
     */
    createSimpleGameMode(words) {
        try {
            errorHandler.showLoading('正在初始化闯关游戏模式...');
            
            if (!words || words.length === 0) {
                throw new Error('单词列表为空');
            }

            // 打乱单词顺序
            const shuffledWords = [...words].sort(() => Math.random() - 0.5);
            
            const gameState = {
                words: shuffledWords,
                currentIndex: 0,
                score: 0,
                coins: 0,
                errors: [],
                startTime: Date.now(),
                mode: 'game',
                level: 1,
                lives: 3,
                combo: 0,
                maxCombo: 0,
                difficulty: 'easy', // easy, medium, hard
                currentQuestion: null,
                answered: false,
                achievements: [],
                gameType: 'meaning_to_word' // 可以扩展多种游戏类型
            };

            this.gameState = gameState;
            
            errorHandler.hideLoading();
            this.generateGameQuestion();
            
        } catch (error) {
            errorHandler.hideLoading();
            errorHandler.handle(error, '创建闯关游戏模式');
            // 回退到卡片模式
            this.startFlashcardMode(words);
        }
    },

    /**
     * 生成闯关游戏问题
     */
    generateGameQuestion() {
        try {
            const state = this.gameState;
            const currentWord = state.words[state.currentIndex];
            const wordData = this.enrichWordData(currentWord);
            
            // 根据难度生成不同的游戏内容
            const question = this.generateGameContent(currentWord, wordData, state.difficulty);
            
            state.currentQuestion = question;
            state.answered = false;
            this.renderGameMode();
            
        } catch (error) {
            errorHandler.handle(error, '生成闯关游戏问题');
            this.nextGameQuestion();
        }
    },

    /**
     * 生成游戏内容
     */
    generateGameContent(word, wordData, difficulty) {
        try {
            const baseContent = {
                word: word,
                wordData: wordData,
                correctAnswer: word,
                timeLimit: this.getGameTimeLimit(difficulty),
                points: this.getGamePoints(difficulty)
            };

            // 根据难度生成不同的游戏内容
            switch (difficulty) {
                case 'easy':
                    return {
                        ...baseContent,
                        type: 'simple_choice',
                        question: `请选择正确的单词：${wordData.meaning}`,
                        options: this.generateGameOptions(word, wordData, 2, difficulty)
                    };
                    
                case 'medium':
                    return {
                        ...baseContent,
                        type: 'fill_blank',
                        question: `请拼写单词：${wordData.meaning}`,
                        hint: this.generateHint(word, 'medium')
                    };
                    
                case 'hard':
                    return {
                        ...baseContent,
                        type: 'multiple_choice',
                        question: `根据释义选择正确的单词：${wordData.meaning}`,
                        options: this.generateGameOptions(word, wordData, 4, difficulty),
                        distractors: this.generateDistractors(word, wordData, 3)
                    };
                    
                default:
                    return baseContent;
            }
            
        } catch (error) {
            errorHandler.handle(error, '生成游戏内容');
            return {
                word: word,
                wordData: wordData,
                correctAnswer: word,
                question: `请选择：${wordData.meaning}`,
                options: [word, '其他选项1', '其他选项2'],
                timeLimit: 30,
                points: 10
            };
        }
    },

    /**
     * 生成游戏选项
     */
    generateGameOptions(correctWord, wordData, count, difficulty) {
        try {
            const options = [];
            const toStr = (w) => {
                const s = typeof w === 'string' ? w : (w?.word ? w.word : String(w));
                return s;
            };
            const pool = (this.gameState?.words || []).map(toStr).filter(w => w && w !== correctWord);
            
            // 添加正确答案
            options.push({ value: correctWord, display: correctWord, isCorrect: true });
            
            // 根据难度生成干扰项
            const distractors = this.generateDistractors(correctWord, wordData, count - 1, difficulty);
            distractors.forEach(distractor => {
                const val = toStr(distractor).replace(/'/g, '&#39;');
                options.push({ value: val, display: toStr(distractor), isCorrect: false });
            });
            
            // 打乱选项顺序
            return options.sort(() => Math.random() - 0.5);
            
        } catch (error) {
            errorHandler.handle(error, '生成游戏选项');
            return [{
                value: correctWord,
                display: correctWord,
                isCorrect: true
            }];
        }
    },

    /**
     * 生成干扰项
     */
    generateDistractors(correctWord, wordData, count, difficulty = 'easy') {
        try {
            const distractors = [];
            const toStr = (w) => typeof w === 'string' ? w : (w?.word ? w.word : String(w));
            const pool = (this.gameState?.words || []).map(toStr);
            const otherWords = pool.filter(w => w !== correctWord);
            
            if (difficulty === 'easy') {
                // 简单难度：随机选择其他单词
                const shuffled = otherWords.sort(() => Math.random() - 0.5);
                for (let i = 0; i < Math.min(count, shuffled.length); i++) {
                    distractors.push(shuffled[i]);
                }
            } else if (difficulty === 'medium') {
                // 中等难度：选择拼写相似的单词
                const similarWords = otherWords.filter(word => 
                    this.isSpellingSimilar(word, correctWord)
                );
                const shuffled = similarWords.length > 0 ? similarWords : otherWords;
                for (let i = 0; i < Math.min(count, shuffled.length); i++) {
                    distractors.push(shuffled[i]);
                }
            } else {
                // 困难难度：选择释义相关的单词
                const relatedWords = otherWords.filter(w => {
                    const dataW = db.findWord(w) || this.generateDefaultWordData(w);
                    return this.isMeaningRelated(wordData.meaning || '', dataW.meaning || '');
                });
                const shuffled = relatedWords.length > 0 ? relatedWords : otherWords;
                for (let i = 0; i < Math.min(count, shuffled.length); i++) {
                    distractors.push(shuffled[i]);
                }
            }
            
            // 如果还不够，用简单单词填充
            while (distractors.length < count && otherWords.length > distractors.length) {
                const randomWord = otherWords[Math.floor(Math.random() * otherWords.length)];
                if (!distractors.includes(randomWord)) {
                    distractors.push(randomWord);
                }
            }
            
            return distractors;
            
        } catch (error) {
            errorHandler.handle(error, '生成干扰项');
            return [];
        }
    },

    /**
     * 获取游戏时间限制
     */
    getGameTimeLimit(difficulty) {
        const limits = {
            'easy': 45,
            'medium': 30,
            'hard': 20
        };
        return limits[difficulty] || 30;
    },

    /**
     * 获取游戏分数
     */
    getGamePoints(difficulty) {
        const points = {
            'easy': 10,
            'medium': 20,
            'hard': 30
        };
        return points[difficulty] || 15;
    },

    /**
     * 生成提示
     */
    generateHint(word, difficulty) {
        try {
            if (difficulty === 'easy') {
                return `单词长度：${word.length}个字母`;
            } else if (difficulty === 'medium') {
                return `首字母：${word[0]}，长度：${word.length}`;
            } else {
                return `首字母：${word[0]}，尾字母：${word[word.length - 1]}，长度：${word.length}`;
            }
        } catch (error) {
            return `单词长度：${word.length}`;
        }
    },

    /**
     * 检查拼写相似性
     */
    isSpellingSimilar(word1, word2) {
        try {
            if (Math.abs(word1.length - word2.length) > 2) return false;
            
            let differences = 0;
            const minLength = Math.min(word1.length, word2.length);
            
            for (let i = 0; i < minLength; i++) {
                if (word1[i] !== word2[i]) differences++;
            }
            
            differences += Math.abs(word1.length - word2.length);
            return differences <= 3;
            
        } catch (error) {
            return false;
        }
    },

    /**
     * 检查释义相关性
     */
    isMeaningRelated(meaning1, meaning2) {
        try {
            // 简单的关键词匹配
            const keywords1 = meaning1.toLowerCase().split(/[，。、；：]/);
            const keywords2 = meaning2.toLowerCase().split(/[，。、；：]/);
            
            return keywords1.some(keyword => 
                keywords2.some(keyword2 => 
                    keyword.includes(keyword2) || keyword2.includes(keyword)
                )
            );
            
        } catch (error) {
            return false;
        }
    },

    /**
     * 开始错题复习模式
     */
    startErrorReviewMode(wordlistId) {
        // 获取学生的错误单词
        const user = auth.getCurrentUser();
        // 此处需要实现 getStudentErrorWords 方法，或模拟数据
        // const errorWords = this.getStudentErrorWords(user.id, wordlistId);
        
        // 临时模拟：如果没有错题，提示用户；如果有，进入卡片模式
        // 为了演示，这里假设没有错题记录时，获取词表的前5个单词作为错题演示
        const wordlist = db.findWordList(wordlistId);
        let errorWords = [];
        
        if (wordlist && wordlist.words) {
            errorWords = wordlist.words.slice(0, 5); // 模拟错题
        }
        
        if (errorWords.length === 0) {
            helpers.showToast('暂无错误单词需要复习！', 'info');
            return;
        }
        
        // 使用卡片模式进行复习，并传入上下文以便正确返回
        if (typeof flashcardLearning !== 'undefined') {
            // 构造上下文，指明是“错题复习”模式
            const ctx = { 
                mode: 'error-review',
                wordlistId: wordlistId,
                onExit: () => {
                    this.showSelfLearningModeChoice(wordlistId);
                }
            };
            
            flashcardLearning.start(errorWords, (result) => {
                // 复习完成后的回调
                this.onSelfLearningComplete(result);
            }, ctx);
        } else {
            this.createSimpleFlashcardMode(errorWords);
        }
    },

    /**
     * 显示学习计划界面
     */
    showStudyPlanInterface(wordlistId) {
        const planHtml = `
            <div id="study-plan-interface" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
                    <div class="text-center mb-8">
                        <div class="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                            <i class="fa-solid fa-calendar-check text-3xl"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-slate-800 mb-2">制定学习计划</h2>
                        <p class="text-slate-500 text-sm">合理规划，高效学习</p>
                    </div>
                    
                    <div class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">每日目标单词数</label>
                            <div class="relative">
                                <input type="number" id="daily-words" min="5" max="50" value="20" 
                                    class="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition font-bold text-slate-700">
                                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">词/天</span>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">每日提醒时间</label>
                            <input type="time" id="reminder-time" value="20:00" 
                                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition font-bold text-slate-700">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 mt-8">
                        <button onclick="document.getElementById('study-plan-interface').remove(); student.showSelfLearningModeChoice('${wordlistId}')" 
                            class="py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition">
                            取消
                        </button>
                        <button onclick="student.saveStudyPlan('${wordlistId}')" 
                            class="py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] transition">
                            保存计划
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', planHtml);
    },

    /**
     * 保存学习计划
     */
    saveStudyPlan(wordlistId) {
        const dailyWords = document.getElementById('daily-words').value;
        const reminderTime = document.getElementById('reminder-time').value;
        
        // 模拟保存
        helpers.showToast('学习计划已保存！', 'success');
        
        // 关闭弹窗并返回模式选择
        document.getElementById('study-plan-interface').remove();
        this.showSelfLearningModeChoice(wordlistId);
    },

    /**
     * 获取学生的错误单词
     */
    getStudentErrorWords(studentId, wordlistId) {
        // 简化的错误单词获取逻辑
        // 在实际应用中，应该从学习记录中提取错误单词
        // 这里暂时返回空数组或本地存储中的数据
        try {
            const errorWords = JSON.parse(helpers.memoryStore.get(`errorWords_${studentId}_${wordlistId}`) || '[]');
            return errorWords;
        } catch (e) {
            return [];
        }
    },

    /**
     * 自主学习完成回调
     */
    onSelfLearningComplete(result) {
        // 此时已在各个模块内部调用了 RewardSystem.grantReward 发放奖励
        // 这里只需要处理页面导航和提示即可
        
        // 如果有返回回调（如错题复习模式），则执行它
        // 注意：result 对象可能不包含上下文信息，需要在调用 start 时传入 context
        // 但目前的实现是模块内部直接调用 onComplete
        
        // 简单处理：提示并刷新
        helpers.showToast('学习完成！', 'success');
        
        // 如果是在错题复习模式下，通常会传入上下文来控制返回
        // 这里为了简化，直接返回主页或根据情况处理
        // 但根据用户需求，需要返回自主学习中心
        // 由于 onSelfLearningComplete 是通用回调，我们无法直接得知是哪个词表
        // 这是一个架构上的小限制，但可以通过 result 传递更多信息来解决
        // 或者简单地返回到上一个已知的 wordlistId
        
        if (this.currentWordlistId) {
            this.showSelfLearningModeChoice(this.currentWordlistId);
        } else {
            this.render(); // 回到主页
        }
    },

    /**
     * 直接开始检测（不需要先学习）
     */
    startTestDirectly(words, taskId) {
        const task = db._data.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // 获取难词清单并合并
        const user = auth.getCurrentUser();
        const difficultWords = db.getDifficultWords(user.id) || [];
        const difficultWordList = difficultWords.map(dw => dw.word);
        const allWords = [...new Set([...words, ...difficultWordList])];

        // Ensure taskModes is an array of supported modes, defaulting to all if empty or missing
        const supportedModes = ['spelling', 'context', 'matching'];
        let taskModes = supportedModes;
        if (task && Array.isArray(task.taskTypes) && task.taskTypes.length > 0) {
            const validModes = task.taskTypes.filter(mode => supportedModes.includes(mode));
            if (validModes.length > 0) {
                taskModes = validModes;
            }
        }

        this.showTestModeChoice(allWords, taskModes, taskId);
    },

    /**
     * 显示检测模式选择界面
     */
    showTestModeChoice(words, modes, taskId) {
        // 使用固定的三种模式数组作为渲染依据，这样哪怕modes参数只包含了部分模式，也能显示完整的列表
        const modeOrder = ['spelling', 'context', 'matching'];
        const modeConfig = {
            'spelling': { name: '听音拼写填空', description: '考查发音与拼写的绝对准确率', icon: 'fa-headphones', color: 'amber', required: true },
            'context': { name: '场景语境选择', description: '锻炼结合上下文推断词义的能力', icon: 'fa-book-open', color: 'indigo' },
            'matching': { name: '词义匹配', description: '快速识别单词与中文释义的对应关系', icon: 'fa-link', color: 'emerald' }
        };

        const testHtml = `
            <div id="test-mode-choice" class="fixed inset-0 bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center z-50 overflow-y-auto animate-fade-in">
                <div class="glass-card rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl relative overflow-hidden bg-white/95 backdrop-blur-xl">
                    <!-- 背景装饰 -->
                    <div class="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div class="absolute bottom-0 left-0 w-24 h-24 bg-orange-50 rounded-full blur-2xl -ml-10 -mb-10"></div>
                    
                    <div class="text-center mb-8 relative z-10">
                        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-rose-100">
                            <i class="fa-solid fa-clipboard-check text-4xl text-white"></i>
                        </div>
                        <h2 class="text-3xl font-black text-slate-800 mb-2 tracking-tight">学习检测</h2>
                        <p class="text-slate-500 text-sm">检验阶段性学习成果</p>
                    </div>

                    <div class="bg-slate-50 rounded-2xl p-1 border border-slate-200 mb-8">
                        <div class="space-y-1" id="test-mode-selection-container">
                            ${modeOrder.map(mode => {
                                const config = modeConfig[mode];
                                const isRequired = config.required;
                                const isChecked = (modes && modes.includes(mode)) || isRequired; 
                                const checkedAttr = isChecked ? 'checked' : '';
                                
                                return `
                                    <label class="test-mode-option group flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 ${isRequired ? 'bg-orange-50 border border-orange-200' : 'hover:bg-white border border-transparent hover:border-slate-200'}" data-mode="${mode}">
                                        <div class="relative flex items-center justify-center mr-4">
                                            <input type="checkbox" value="${mode}" 
                                                ${checkedAttr} 
                                                ${isRequired ? 'disabled' : ''}
                                                onchange="student.toggleTestMode('${mode}')" 
                                                class="peer appearance-none w-6 h-6 rounded-lg border-2 border-slate-300 checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer">
                                            <i class="fa-solid fa-check text-white text-xs absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"></i>
                                        </div>
                                        
                                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-${config.color}-400 to-${config.color}-600 flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform">
                                            <i class="fa-solid ${config.icon} text-white text-lg"></i>
                                        </div>
                                        
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center mb-0.5">
                                                <span class="font-bold text-slate-700 text-lg">${config.name}</span>
                                                ${isRequired ? '<span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-amber-900">必选</span>' : ''}
                                            </div>
                                            <div class="text-xs text-slate-500 truncate">${config.description}</div>
                                        </div>
                                    </label>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <div id="test-mode-error" class="hidden mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center text-rose-600 text-sm animate-shake">
                        <i class="fa-solid fa-circle-exclamation mr-2 text-rose-500"></i>
                        <span>请至少选择一个检测模式</span>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="document.getElementById('test-mode-choice').remove()" class="py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition flex items-center justify-center">
                            <i class="fa-solid fa-arrow-left mr-2"></i>返回
                        </button>
                        <button onclick="student.confirmTestModeSelection()" class="py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] transition flex items-center justify-center">
                            <i class="fa-solid fa-play mr-2"></i>开始检测
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', testHtml);
        
        // 保存状态
        this._testWords = words;
        this._testTaskId = taskId;
        this._selectedTestModes = [...new Set(modes || ['spelling', 'context', 'matching'])];
    },

    /**
     * 切换检测模式选择
     */
    toggleTestMode(mode) {
        const index = this._selectedTestModes.indexOf(mode);
        if (index > -1) {
            this._selectedTestModes.splice(index, 1);
        } else {
            this._selectedTestModes.push(mode);
        }
        
        const countEl = document.getElementById('selected-test-mode-count');
        if (countEl) countEl.innerText = this._selectedTestModes.length;
        const errorEl = document.getElementById('test-mode-error');
        if (errorEl) errorEl.classList.add('hidden');
        
        const option = document.querySelector(`.test-mode-option[data-mode="${mode}"]`);
        if (option) {
            if (this._selectedTestModes.includes(mode)) {
                option.classList.add('bg-opacity-30', 'border-2', 'border-white');
            } else {
                option.classList.remove('bg-opacity-30', 'border-2', 'border-white');
            }
        }
    },

    /**
     * 确认检测模式选择
     */
    confirmTestModeSelection() {
        if (!this._selectedTestModes.length) {
            const errorEl = document.getElementById('test-mode-error');
            if (errorEl) errorEl.classList.remove('hidden');
            return;
        }
        
        const choice = document.getElementById('test-mode-choice');
        if (choice) choice.remove();
        
        // 启动检测引擎
        this.startTestEngine(this._testWords, this._selectedTestModes, this._testTaskId);
    },

    /**
     * 启动检测引擎
     */
    startTestEngine(words, modes, taskId) {
        // 使用简化的检测流程
        testEngine.start(words, modes, taskId, () => {
            this.onLearningComplete(taskId, words.length);
        });
    },

    launchZootopiaGame() {
        try {
            const all = db.getAllWords ? db.getAllWords() : [];
            const compact = all.map(w => ({ en: w.word || w.en || '', cn: w.meaning || w.cn || '' }))
                .filter(w => w.en && w.cn);
            helpers.memoryStore.set('zootopia_words', compact);
            
            // 尝试打开游戏文件
            const gameUrl = './zootopia.html';
                  const gameWindow = window.open(gameUrl, '_blank');
                  
                  // V11: 增强的弹窗检测
                  setTimeout(() => {
                      if (!gameWindow || gameWindow.closed || typeof gameWindow.closed === 'undefined') {
                          helpers.showToast('游戏窗口被拦截，请允许弹窗后重试。', 'error');
                      }
                  }, 500);
        } catch (e) {
            alert('无法启动游戏，请直接在本机打开游戏HTML文件。');
            console.error(e);
        }
    },

    /**
     * 保存任务进度
     */
    saveTaskProgress(taskId, completedCount) {
        const user = auth.getCurrentUser();
        const key = `task_progress_${user.id}_${taskId}`;
        const progress = helpers.memoryStore.get(key) || { completed: 0 };
        progress.completed += completedCount;
        progress.lastTime = new Date().toISOString();
        helpers.memoryStore.set(key, progress);
    },

    /**
     * 获取任务进度
     */
    getTaskProgress(taskId) {
        const user = auth.getCurrentUser();
        const key = `task_progress_${user.id}_${taskId}`;
        return helpers.memoryStore.get(key) || { completed: 0 };
    },

    /**
     * 学习完成回调
     * 实时更新统计数据
     */
    onLearningComplete(taskId, learnedCount) {
        helpers.showToast(`已完成 ${learnedCount} 个单词的学习！`, 'success');
        
        // 实时更新统计数据
        this.updateDashboardStats();
        
        this.renderTasks();
    },

    /**
     * 更新仪表盘统计数据
     */
    updateDashboardStats() {
        const user = auth.getCurrentUser();
        const stats = db.getStudentStats(user.id);
        if (!stats) return;
        auth.updateCurrentUser({
            ...stats,
            role: 'student'
        });
        
        const learnedEl = document.getElementById('student-learned-count');
        if (learnedEl) {
            learnedEl.innerText = stats.totalLearned || 0;
        }
        
        const streakEl = document.getElementById('student-streak-count');
        if (streakEl) {
            streakEl.innerText = stats.streak || 0;
        }

        const coinsEl = document.getElementById('student-coins-count');
        if (coinsEl) {
            coinsEl.innerText = stats.coins || 0;
        }

        app.updateNav();
    },

    /**
     * 返回学生主页
     */
    backToDashboard() {
        // 刷新学生数据
        const user = auth.getCurrentUser();
        const freshStudent = db.findStudent(user.id);
        if (freshStudent) {
            auth.updateCurrentUser(freshStudent);
        }
        
        router.navigate('student');
    },

    // ==================== 新增功能 ====================

    /**
     * 切换单词列表展开/收起
     */
    toggleWordList(type) {
        const content = document.getElementById(`${type}-words`);
        const arrow = document.getElementById(`${type}-arrow`);
        
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            arrow.style.transform = 'rotate(180deg)';
            // 加载数据
            if (type === 'unlearned') {
                this.renderUnlearnedWords();
            } else if (type === 'difficult') {
                this.renderDifficultWords();
            }
        } else {
            content.classList.add('hidden');
            arrow.style.transform = 'rotate(0deg)';
        }
    },

    /**
     * 渲染未学单词
     */
    renderUnlearnedWords() {
        const user = auth.getCurrentUser();
        const allWords = this.getAllTaskWords();
        const learnedWords = this.getLearnedWords(user.id);
        
        // 找出未学单词
        const unlearned = allWords.filter(w => !learnedWords.includes(w.toLowerCase()));
        
        const container = document.getElementById('unlearned-words-list');
        const countEl = document.getElementById('unlearned-count');
        
        countEl.innerText = `${unlearned.length} 个单词待学习`;
        
        if (unlearned.length === 0) {
            container.innerHTML = '<p class="text-slate-400 text-sm">太棒了！所有单词都已学习</p>';
            return;
        }
        
        container.innerHTML = unlearned.map(word => `
            <span class="inline-block bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-sm border border-rose-200">
                ${word}
            </span>
        `).join('');
    },

    /**
     * 渲染重点记忆单词
     */
    renderDifficultWords() {
        const user = auth.getCurrentUser();
        const difficultWords = this.getDifficultWords(user.id);
        
        const container = document.getElementById('difficult-words-list');
        const countEl = document.getElementById('difficult-count');
        
        countEl.innerText = `${difficultWords.length} 个难词需加强`;
        
        if (difficultWords.length === 0) {
            container.innerHTML = '<p class="text-slate-400 text-sm">很好！没有难词需要复习</p>';
            return;
        }
        
        container.innerHTML = difficultWords.map(item => `
            <div class="flex justify-between items-center bg-purple-50 p-3 rounded-lg border border-purple-200">
                <div>
                    <span class="font-bold text-purple-700">${item.word}</span>
                    <span class="text-xs text-purple-500 ml-2">错误 ${item.errorCount} 次</span>
                </div>
                <button onclick="speech.speakWord('${item.word}')" class="text-purple-400 hover:text-purple-600">
                    <i class="fa-solid fa-volume-high"></i>
                </button>
            </div>
        `).join('');
    },

    /**
     * 获取所有任务单词
     */
    getAllTaskWords() {
        const user = auth.getCurrentUser();
        const tasks = db.getTasksByStudent(user.id);
        const words = new Set();
        
        tasks.forEach(task => {
            const wordlist = db.findWordList(task.wordListId);
            if (wordlist && wordlist.words) {
                wordlist.words.forEach(w => words.add(w));
            }
        });
        
        return Array.from(words);
    },

    /**
     * 获取已学单词
     */
    getLearnedWords(studentId) {
        const logs = db.getLearningLogsByStudent(studentId);
        const words = new Set();
        
        logs.forEach(log => {
            if (log.learnedWords) {
                log.learnedWords.forEach(w => words.add(w.toLowerCase()));
            }
        });
        
        return Array.from(words);
    },

    /**
     * 获取难词列表
     */
    getDifficultWords(studentId) {
        return db.getDifficultWords(studentId) || [];
    },

    /**
     * 添加难词
     */
    addDifficultWord(studentId, word) {
        const key = `difficult_words_${studentId}`;
        const data = JSON.parse(helpers.memoryStore.get(key) || '[]');
        
        const existing = data.find(item => item.word.toLowerCase() === word.toLowerCase());
        if (existing) {
            existing.errorCount++;
            existing.lastError = new Date().toISOString();
        } else {
            data.push({
                word: word,
                errorCount: 1,
                firstError: new Date().toISOString(),
                lastError: new Date().toISOString()
            });
        }
        
        helpers.memoryStore.set(key, JSON.stringify(data));
    },

    /**
     * 快速学习未学单词
     */
    quickLearnUnlearned() {
        const allWords = this.getAllTaskWords();
        const learnedWords = this.getLearnedWords(auth.getCurrentUser().id);
        const unlearned = allWords.filter(w => !learnedWords.includes(w.toLowerCase()));
        
        if (unlearned.length === 0) {
            helpers.showToast('没有未学单词！', 'info');
            return;
        }
        
        // 显示学习模式选择（快速学习流）
        this.showLearningModeChoiceQuick(unlearned, 'unlearned');
    },

    /**
     * 快速学习难词
     */
    quickLearnDifficult() {
        const difficultWords = this.getDifficultWords(auth.getCurrentUser().id);
        
        if (difficultWords.length === 0) {
            helpers.showToast('没有难词需要复习！', 'info');
            return;
        }
        
        const words = difficultWords.map(item => item.word);
        this.showLearningModeChoiceQuick(words, 'difficult');
    },

    /**
     * 显示学习模式选择
     */
    showLearningModeChoiceQuick(words, source) {
        const modalHtml = `
            <div id="learning-mode-modal" class="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50">
                <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl m-4">
                    <h3 class="text-xl font-bold text-slate-800 mb-2">选择学习模式</h3>
                    <p class="text-sm text-slate-500 mb-6">共 ${words.length} 个单词</p>
                    
                    <div class="space-y-3">
                        <button onclick="student.startLearningWithMode('${source}', 'detailed')" 
                            class="w-full p-4 rounded-xl border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition text-left">
                            <div class="flex items-center">
                                <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mr-3">
                                    <i class="fa-solid fa-layer-group"></i>
                                </div>
                                <div>
                                    <div class="font-bold text-slate-800">音形意用模式</div>
                                    <div class="text-xs text-slate-500">全面学习单词四个维度</div>
                                </div>
                            </div>
                        </button>
                        
                        <button onclick="student.startLearningWithMode('${source}', 'flashcard')" 
                            class="w-full p-4 rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition text-left">
                            <div class="flex items-center">
                                <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mr-3">
                                    <i class="fa-solid fa-clone"></i>
                                </div>
                                <div>
                                    <div class="font-bold text-slate-800">卡片记忆模式</div>
                                    <div class="text-xs text-slate-500">翻转卡片快速记忆</div>
                                </div>
                            </div>
                        </button>
                    </div>
                    
                    <button onclick="document.getElementById('learning-mode-modal').remove()" 
                        class="w-full mt-4 text-slate-500 hover:text-slate-700 py-2 transition">
                        取消
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 保存当前单词列表
        this._tempWords = words;
    },

    /**
     * 开始学习（指定模式）
     */
    startLearningWithMode(source, mode) {
        const modal = document.getElementById('learning-mode-modal');
        if (modal) modal.remove();
        
        const words = this._tempWords;
        delete this._tempWords;
        
        if (mode === 'detailed') {
            flexibleLearning.start(words, `quick_${source}`, () => {
                this.onQuickLearningComplete(source, words.length);
            });
        } else {
            flashcardLearning.start(words, (result) => {
                this.onQuickLearningComplete(source, result.learnedWords?.length || 0);
            });
        }
    },

    /**
     * 快速学习完成回调
     */
    onQuickLearningComplete(source, count) {
        helpers.showToast(`已完成 ${count} 个单词的学习！`, 'success');
        this.updateDashboardStats();
        this.renderUnlearnedWords();
        this.renderDifficultWords();
    },

    /**
     * 渲染学习历史
     */
    renderLearningHistory() {
        const user = auth.getCurrentUser();
        const logs = db.getLearningLogsByStudent(user.id).slice(0, 10);
        
        const container = document.getElementById('learning-history');
        
        if (logs.length === 0) {
            container.innerHTML = '<p class="text-slate-400 text-sm text-center">暂无学习记录</p>';
            return;
        }
        
        container.innerHTML = logs.map(log => {
            const date = new Date(log.date);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
            
            return `
                <div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-xs">
                            ${dateStr}
                        </div>
                        <div>
                            <div class="text-sm font-medium text-slate-700">学习了 ${log.learnedCount} 个单词</div>
                            <div class="text-xs text-slate-400">复习 ${log.reviewCount} 次</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-bold text-emerald-600">${log.correctRate}%</div>
                        <div class="text-xs text-slate-400">正确率</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * 检查艾宾浩斯复习提醒
     */
    checkEbbinghausReminder() {
        const user = auth.getCurrentUser();
        const reminder = document.getElementById('ebbinghaus-reminder');
        const list = document.getElementById('review-words-list');
        
        // 获取需要复习的单词（根据艾宾浩斯曲线）
        const reviewWords = this.getEbbinghausReviewWords(user.id);
        
        if (reviewWords.length > 0) {
            reminder.classList.remove('hidden');
            list.innerHTML = reviewWords.slice(0, 8).map(w => `
                <span class="inline-block bg-white text-amber-700 px-2 py-1 rounded text-xs border border-amber-200">
                    ${w}
                </span>
            `).join('');
            
            if (reviewWords.length > 8) {
                list.innerHTML += `<span class="text-xs text-amber-600">+${reviewWords.length - 8} 更多</span>`;
            }
        } else {
            reminder.classList.add('hidden');
        }
    },

    /**
     * 获取艾宾浩斯复习单词
     * 复习时间点：5分钟、30分钟、12小时、1天、2天、4天、7天、15天
     */
    getEbbinghausReviewWords(studentId) {
        const key = `learning_history_${studentId}`;
        const history = JSON.parse(helpers.memoryStore.get(key) || '[]');
        const now = new Date();
        const reviewWords = [];
        
        // 艾宾浩斯复习间隔（分钟）
        const intervals = [5, 30, 12 * 60, 24 * 60, 2 * 24 * 60, 4 * 24 * 60, 7 * 24 * 60, 15 * 24 * 60];
        
        history.forEach(item => {
            const learnTime = new Date(item.time);
            const minutesPassed = (now - learnTime) / (1000 * 60);
            
            // 检查是否到达复习时间点（允许±10%误差）
            for (const interval of intervals) {
                const diff = Math.abs(minutesPassed - interval);
                if (diff < interval * 0.1 && !item.reviewedAt) {
                    reviewWords.push(item.word);
                    break;
                }
            }
        });
        
        return [...new Set(reviewWords)];
    },

    /**
     * 开始复习模式
     */
    startReviewMode() {
        const user = auth.getCurrentUser();
        const reviewWords = this.getEbbinghausReviewWords(user.id);
        
        if (reviewWords.length === 0) {
            helpers.showToast('暂时没有需要复习的单词', 'info');
            return;
        }
        
        this.showLearningModeChoiceQuick(reviewWords, 'review');
    },

    /**
     * 记录学习时间（用于艾宾浩斯曲线）
     */
    recordLearningTime(word) {
        const user = auth.getCurrentUser();
        const key = `learning_history_${user.id}`;
        const history = JSON.parse(helpers.memoryStore.get(key) || '[]');
        
        history.push({
            word: word,
            time: new Date().toISOString(),
            reviewedAt: null
        });
        
        // 只保留最近1000条记录
        if (history.length > 1000) {
            history.shift();
        }
        
        helpers.memoryStore.set(key, JSON.stringify(history));
    },

    /**
     * 开始自主学习模式
     */
    startLearningMode() {
        const user = auth.getCurrentUser();
        const student = db.ensureCurrentStudentRecord ? db.ensureCurrentStudentRecord() : db.findStudent(user.id);
        
        if (!student) {
            helpers.showToast('学生信息不存在', 'error');
            return;
        }

        const tasks = db.getTasksByStudent(user.id).filter(task => task.status === 'active');
        const wordlists = [];
        const seenWordlists = new Set();

        tasks.forEach(task => {
            const wordlist = db.findWordList(task.wordListId);
            if (!wordlist || seenWordlists.has(wordlist.id)) return;
            seenWordlists.add(wordlist.id);
            wordlists.push({
                ...wordlist,
                taskTitle: task.title
            });
        });

        if (wordlists.length === 0) {
            helpers.showToast('暂时没有学习任务，请联系老师分配', 'info');
            return;
        }

        if (wordlists.length === 1) {
            this.showSelfLearningModeChoice(wordlists[0].id);
            return;
        }

        const selectorHtml = `
            <div id="student-learning-selector" class="fixed inset-0 bg-slate-900/75 flex items-center justify-center z-50">
                <div class="w-full max-w-2xl mx-4 rounded-3xl bg-white shadow-2xl overflow-hidden">
                    <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 class="text-2xl font-bold text-slate-800">选择学习词表</h3>
                            <p class="text-sm text-slate-500 mt-1">从老师布置的任务中选择一份开始学习</p>
                        </div>
                        <button onclick="document.getElementById('student-learning-selector').remove()" class="w-10 h-10 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div class="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                        ${wordlists.map(wordlist => `
                            <button onclick="student.openLearningWordlist('${wordlist.id}')" class="w-full text-left rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:bg-indigo-50 transition">
                                <div class="flex items-start justify-between gap-4">
                                    <div>
                                        <div class="text-lg font-bold text-slate-800">${wordlist.title || '未命名词表'}</div>
                                        <div class="text-sm text-slate-500 mt-1">${wordlist.taskTitle || '学习任务'}</div>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <div class="text-sm font-bold text-indigo-600">${(wordlist.words || []).length} 个单词</div>
                                        <div class="text-xs text-slate-400 mt-1">${[wordlist.grade, wordlist.volume, helpers.formatUnitLabel(wordlist.unit || '')].filter(Boolean).join(' · ') || '任务词表'}</div>
                                    </div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', selectorHtml);
    },

    openLearningWordlist(wordlistId) {
        const selector = document.getElementById('student-learning-selector');
        if (selector) selector.remove();
        this.showSelfLearningModeChoice(wordlistId);
    },

    startGameMode() {
        try {
            this.showGameDatasetSelector();
        } catch (error) {
            errorHandler.handle(error, '显示游戏词表选择器');
            helpers.showToast('无法打开闯关词表选择器', 'error');
        }
    },

    showGameDatasetSelector() {
        const all = db.getWordLists().filter(wl => wl.type === '教材');
        if (all.length === 0) {
            helpers.showToast('暂无教材词表可用于闯关', 'warning');
            return;
        }
        const groups = {};
        all.forEach(wl => {
            const key = `${wl.grade || '未标注年级'} · ${wl.volume || '未标注册别'}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(wl);
        });
        Object.keys(groups).forEach(k => {
            groups[k].sort((a, b) => {
                const na = parseInt(a.unit); const nb = parseInt(b.unit);
                if (!isNaN(na) && !isNaN(nb)) return na - nb;
                return String(a.unit || '').localeCompare(String(b.unit || ''));
            });
        });

        let listHtml = '';
        Object.entries(groups).forEach(([groupName, wls]) => {
            listHtml += `
                <div class="mb-4">
                    <div class="text-xs text-indigo-200 mb-2">${groupName}</div>
                    <div class="grid grid-cols-1 gap-2">
                        ${wls.map(wl => `
                            <button 
                                class="text-left p-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white transition"
                                onclick="student.prepareZootopiaDatasetFromWordlist('${wl.id}')">
                                <div class="font-bold">${helpers.formatUnitLabel(wl.unit || wl.title) || '未命名单元'}</div>
                                <div class="text-xs text-indigo-200 mt-1">
                                    ${[wl.textbook, wl.grade, wl.volume, helpers.formatUnitLabel(wl.unit || wl.title)].filter(Boolean).join(' · ')}
                                </div>
                                <div class="text-xs text-indigo-300 mt-1">单词数：${(wl.words || []).length}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        const modalHtml = `
            <div id="game-dataset-selector" class="fixed inset-0 bg-gradient-to-br from-slate-900/80 to-indigo-900/80 flex items-center justify-center z-50">
                <div class="w-full max-w-3xl bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6 text-white">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-bold">选择闯关单元</h3>
                        <button class="text-indigo-200 hover:text-white" onclick="document.getElementById('game-dataset-selector').remove()">
                            <i class="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>
                    <div class="max-h-[60vh] overflow-y-auto pr-1 custom-scroll">
                        ${listHtml}
                    </div>
                    <div class="mt-4 text-xs text-indigo-300">
                        提示：选择具体单元后开始游戏，只加载该单元的单词；后续可在游戏页面“词库管理”中切换/管理数据集。
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    prepareZootopiaDatasetFromWordlist(wordlistId) {
        try {
            const wl = db.findWordList(wordlistId);
            if (!wl || !Array.isArray(wl.words) || wl.words.length === 0) {
                helpers.showToast('该单元暂无单词', 'warning');
                return;
            }
            
            // 确保上下文有 currentWordlistId，以便 enrichWordData 能够读取教师审核的数据
            const originalWordlistId = this.currentWordlistId;
            this.currentWordlistId = wordlistId;
            
            const formatted = wl.words.map((w, idx) => {
                const wd = this.enrichWordData(w) || {};
                const cn = wd.meaning || `[未翻译] ${w}`;
                const tag = this.inferZootopiaTag(cn);
                return { id: idx + 1, en: w, cn, tag };
            });
            
            // 恢复上下文
            this.currentWordlistId = originalWordlistId;
            
            const allDict = db.getAllWords ? db.getAllWords() : [];
            const systemWords = allDict.slice(0, 300).map((wd, i) => ({
                id: i + 1, en: wd.word, cn: wd.meaning || '', tag: this.inferZootopiaTag(wd.meaning || '')
            }));
            const datasets = [
                { name: [wl.textbook, wl.grade, wl.volume, helpers.formatUnitLabel(wl.unit || wl.title)].filter(Boolean).join(' ') || helpers.formatUnitLabel(wl.title) || '所选单元', words: formatted },
                { name: '系统词库', words: systemWords }
            ];
            // 同时存储到localStorage，确保Zootopia页面能读取到
            localStorage.setItem('zootopia_datasets', JSON.stringify(datasets));
            const user = auth.getCurrentUser();
            const className = user ? (user.class || user.className || user.classId || '') : '';
            const classId = user ? (user.classId || user.class || '') : '';
            const userInfo = user 
                ? { name: user.name || '学生', className: className || undefined, classId: classId || undefined, groupId: user.groupId || '1' }
                : { name: '学生', className: '', classId: '', groupId: '1' };
            localStorage.setItem('zootopia_user', JSON.stringify(userInfo));

            const selector = document.getElementById('game-dataset-selector');
            if (selector) selector.remove();
            const gameWindow = window.open('zootopia.html', '_blank');
            if (!gameWindow) {
                helpers.showToast('弹窗被阻止，请允许弹窗后重试', 'error');
                return;
            }
            helpers.showToast('闯关游戏已启动', 'success');
        } catch (error) {
            errorHandler.handle(error, '准备闯关数据集');
            helpers.showToast('准备闯关数据失败', 'error');
        }
    },

    inferZootopiaTag(cn) {
        const m = (cn || '').toLowerCase();
        if (/动物|兽|猫|狗|兔|虎|象|狮/.test(cn || '')) return 'Animal';
        if (/食物|吃|面|饭|肉|蔬菜|水果|饮料|甜/.test(cn || '')) return 'Food';
        if (/老师|学生|医生|工人|警察|市长|演员|歌手|职业/.test(cn || '')) return 'Job';
        if (/交通|城市|街|路|车|站|票|公园|图书馆/.test(cn || '')) return 'City';
        if (/物品|东西|工具|器|书|桌|椅|衣|鞋|包|表|电脑|电话/.test(cn || '')) return 'Item';
        return 'General';
    },
    /**
     * 显示学习模式选择（保留旧任务流程版本，避免与上方重载冲突）
     */
    showLearningModeChoiceFromWordlist(wordlistId) {
        try {
            const wordlist = db.findWordList(wordlistId);
            if (wordlist && Array.isArray(wordlist.words) && wordlist.words.length > 0) {
                wordLearning.start(wordlist.words, () => {
                    this.onLearningComplete(wordlistId, wordlist.words.length);
                });
                router.navigate('learning');
            } else {
                helpers.showToast('词表中没有单词', 'error');
            }
        } catch (error) {
            errorHandler.handle(error, '从词表启动学习模式');
            helpers.showToast('启动学习模式失败', 'error');
        }
    },

    // ==================== 修改密码 ====================

    /**
     * 显示修改密码模态框
     */
    showChangePasswordModal() {
        const modal = document.getElementById('modal-student-change-password');
        if (!modal) return;
        document.getElementById('student-pwd-current').value = '';
        document.getElementById('student-pwd-new').value = '';
        document.getElementById('student-pwd-confirm').value = '';
        modal.classList.remove('hidden');
        modal.offsetHeight;
        modal.classList.remove('opacity-0');
    },

    /**
     * 隐藏修改密码模态框
     */
    hideChangePasswordModal() {
        const modal = document.getElementById('modal-student-change-password');
        if (!modal) return;
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    /**
     * 确认修改密码
     */
    async confirmChangePassword() {
        const currentPwd = document.getElementById('student-pwd-current').value.trim();
        const newPwd = document.getElementById('student-pwd-new').value.trim();
        const confirmPwd = document.getElementById('student-pwd-confirm').value.trim();

        if (!currentPwd || !newPwd || !confirmPwd) {
            helpers.showToast('请填写全部密码字段', 'warning');
            return;
        }
        if (newPwd !== confirmPwd) {
            helpers.showToast('两次输入的新密码不一致', 'error');
            return;
        }
        if (newPwd.length < 4) {
            helpers.showToast('新密码长度至少 4 位', 'warning');
            return;
        }

        try {
            const result = await api.changeStudentPassword(currentPwd, newPwd);
            // 记录密码修改时间到本地学生数据（教师端可查看）
            const user = auth.getCurrentUser();
            if (user) {
                const student = db.findStudent(user.id);
                if (student) {
                    if (!student.passwordChangeLogs) student.passwordChangeLogs = [];
                    student.passwordChangeLogs.push({
                        changedAt: result.changedAt
                            ? new Date(result.changedAt).toLocaleString('zh-CN')
                            : new Date().toLocaleString('zh-CN')
                    });
                    db.save();
                }
            }
            this.hideChangePasswordModal();
            helpers.showToast('✅ 密码修改成功！下次登录请使用新密码', 'success');
        } catch (err) {
            helpers.showToast(`修改失败：${err.message}`, 'error');
        }
    }
};
