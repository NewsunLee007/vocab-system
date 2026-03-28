/**
 * 新纪元英语词汇系统 - 灵活学习模块
 * 支持分批次学习、随时退出、进度保存
 */

const flexibleLearning = {
    session: {
        words: [],
        currentIndex: 0,
        learnedWords: [],
        weakWords: [],
        taskId: null,
        onComplete: null,
        progressKey: null
    },

    /**
     * 开始学习
     * @param {array} words - 单词列表
     * @param {string} taskId - 任务ID
     * @param {function} onComplete - 完成回调
     */
    start(words, taskId, onComplete) {
        this.session.words = [...words];
        this.session.currentIndex = 0;
        this.session.learnedWords = [];
        this.session.weakWords = [];
        this.session.taskId = taskId;
        this.session.onComplete = onComplete;
        
        const user = auth.getCurrentUser();
        this.session.progressKey = `flexible_learning_${user.id}_${taskId}`;
        
        // 尝试恢复进度
        this.restoreProgress();
        
        this.showLearningView();
        this.renderWord();
    },

    /**
     * 显示学习界面
     */
    showLearningView() {
        const viewHtml = `
            <div id="flexible-learning-view" class="fixed inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 z-40 flex flex-col">
                <!-- 头部 -->
                <div class="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
                    <button onclick="flexibleLearning.pause()" class="text-slate-500 hover:text-slate-800 transition flex items-center">
                        <i class="fa-solid fa-pause mr-2"></i>暂停
                    </button>
                    <div class="text-sm font-medium text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full">
                        <i class="fa-solid fa-graduation-cap mr-1"></i>
                        单词学习 <span id="flexible-progress">1/${this.session.words.length}</span>
                    </div>
                    <button onclick="flexibleLearning.saveAndExit()" class="text-slate-500 hover:text-rose-600 transition flex items-center">
                        <i class="fa-solid fa-floppy-disk mr-2"></i>保存退出
                    </button>
                </div>

                <!-- 进度条 -->
                <div class="w-full h-1.5 bg-slate-200">
                    <div id="flexible-progress-bar" class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style="width: 0%"></div>
                </div>

                <!-- 主要内容 -->
                <div class="flex-1 flex items-center justify-center p-4 overflow-y-auto">
                    <div class="w-full max-w-3xl">
                        <!-- 学习卡片 -->
                        <div class="bg-white rounded-3xl shadow-xl p-8 mb-6">
                            <!-- 单词头部 -->
                            <div class="text-center mb-8">
                                <div id="flexible-word" class="text-5xl md:text-6xl font-bold text-slate-800 mb-3 tracking-wide"></div>
                                <div class="flex items-center justify-center space-x-4">
                                    <span id="flexible-phonetic" class="text-xl text-slate-400 font-mono"></span>
                                    <button onclick="flexibleLearning.speakCurrentWord()" 
                                        class="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition flex items-center justify-center group">
                                        <i class="fa-solid fa-volume-high text-xl group-hover:scale-110 transition"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- 四维学习区 -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <!-- 音 -->
                                <div class="bg-indigo-50 rounded-2xl p-5 border-2 border-indigo-100 hover:border-indigo-300 transition">
                                    <div class="flex items-center mb-3">
                                        <div class="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center mr-3">
                                            <i class="fa-solid fa-ear-listen"></i>
                                        </div>
                                        <h3 class="font-bold text-indigo-800">音 · Pronunciation</h3>
                                    </div>
                                    <div class="text-indigo-700">
                                        <div class="text-lg font-mono mb-2" id="flexible-phonetic-detail"></div>
                                        <button onclick="flexibleLearning.speakCurrentWord()" 
                                            class="text-sm bg-indigo-200 hover:bg-indigo-300 text-indigo-800 px-3 py-1.5 rounded-lg transition">
                                            <i class="fa-solid fa-play mr-1"></i>再听一遍
                                        </button>
                                    </div>
                                </div>

                                <!-- 形 -->
                                <div class="bg-purple-50 rounded-2xl p-5 border-2 border-purple-100 hover:border-purple-300 transition">
                                    <div class="flex items-center mb-3">
                                        <div class="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center mr-3">
                                            <i class="fa-solid fa-font"></i>
                                        </div>
                                        <h3 class="font-bold text-purple-800">形 · Spelling</h3>
                                    </div>
                                    <div class="text-purple-700">
                                        <div class="text-lg mb-2" id="flexible-spelling"></div>
                                        <div class="text-sm text-purple-600" id="flexible-word-formation"></div>
                                    </div>
                                </div>

                                <!-- 意 -->
                                <div class="bg-emerald-50 rounded-2xl p-5 border-2 border-emerald-100 hover:border-emerald-300 transition">
                                    <div class="flex items-center mb-3">
                                        <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mr-3">
                                            <i class="fa-solid fa-language"></i>
                                        </div>
                                        <h3 class="font-bold text-emerald-800">意 · Meaning</h3>
                                    </div>
                                    <div class="text-emerald-700">
                                        <div class="text-lg font-medium mb-1" id="flexible-meaning"></div>
                                        <div class="text-sm text-emerald-600" id="flexible-pos"></div>
                                    </div>
                                </div>

                                <!-- 用 -->
                                <div class="bg-amber-50 rounded-2xl p-5 border-2 border-amber-100 hover:border-amber-300 transition">
                                    <div class="flex items-center mb-3">
                                        <div class="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center mr-3">
                                            <i class="fa-solid fa-pen-fancy"></i>
                                        </div>
                                        <h3 class="font-bold text-amber-800">用 · Usage</h3>
                                    </div>
                                    <div class="text-amber-700">
                                        <div class="text-base italic mb-2" id="flexible-example"></div>
                                        <div class="text-sm text-amber-600" id="flexible-example-cn"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- 掌握程度选择 -->
                            <div class="border-t pt-6">
                                <div class="text-center text-slate-500 text-sm mb-4">你掌握这个单词了吗？</div>
                                <div class="grid grid-cols-3 gap-4">
                                    <button onclick="flexibleLearning.handleResult('forgot')" 
                                        class="bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 hover:border-rose-300 text-rose-700 font-bold py-4 rounded-xl transition flex flex-col items-center">
                                        <i class="fa-solid fa-face-frown text-2xl mb-2"></i>
                                        <span>不认识</span>
                                        <span class="text-xs font-normal text-rose-500 mt-1">需要加强</span>
                                    </button>
                                    <button onclick="flexibleLearning.handleResult('vague')" 
                                        class="bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 hover:border-amber-300 text-amber-700 font-bold py-4 rounded-xl transition flex flex-col items-center">
                                        <i class="fa-solid fa-face-meh text-2xl mb-2"></i>
                                        <span>有点印象</span>
                                        <span class="text-xs font-normal text-amber-500 mt-1">需要复习</span>
                                    </button>
                                    <button onclick="flexibleLearning.handleResult('know')" 
                                        class="bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-300 text-emerald-700 font-bold py-4 rounded-xl transition flex flex-col items-center">
                                        <i class="fa-solid fa-face-smile-beam text-2xl mb-2"></i>
                                        <span>完全掌握</span>
                                        <span class="text-xs font-normal text-emerald-500 mt-1">已学会</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 提示 -->
                        <div class="text-center text-slate-400 text-sm">
                            <i class="fa-solid fa-lightbulb mr-1"></i>
                            建议：先看形、听音，再理解意，最后看用法例句
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', viewHtml);
    },

    /**
     * 渲染当前单词
     */
    renderWord() {
        if (this.session.currentIndex >= this.session.words.length) {
            this.finish();
            return;
        }

        const word = this.session.words[this.session.currentIndex];
        const wordData = db.findWord(word) || this.generateDefaultWordData(word);

        // 更新进度
        const progress = ((this.session.currentIndex / this.session.words.length) * 100);
        document.getElementById('flexible-progress').innerText = 
            `${this.session.currentIndex + 1}/${this.session.words.length}`;
        document.getElementById('flexible-progress-bar').style.width = `${progress}%`;

        // 填充内容
        document.getElementById('flexible-word').innerText = wordData.word;
        document.getElementById('flexible-phonetic').innerText = wordData.phonetic || `/${word}/`;
        document.getElementById('flexible-phonetic-detail').innerText = wordData.phonetic || `/${word}/`;
        document.getElementById('flexible-spelling').innerText = wordData.word;
        document.getElementById('flexible-word-formation').innerText = this.getWordFormation(wordData.word);
        
        // 解析词性和释义
        const { pos, meaning } = this.parseMeaning(wordData.meaning);
        document.getElementById('flexible-meaning').innerText = meaning;
        document.getElementById('flexible-pos').innerText = pos;

        // 例句 - 将___替换为实际单词
        let example = wordData.sentence || wordData.example || this.generateExample(wordData.word, meaning);
        // 如果例句中有___，替换为实际单词
        if (example.includes('___')) {
            example = example.replace('___', wordData.word);
        }
        document.getElementById('flexible-example').innerText = `"${example}"`;
        document.getElementById('flexible-example-cn').innerText = '（理解句子含义，掌握单词用法）';

        // 自动播放发音
        setTimeout(() => this.speakCurrentWord(), 800);
    },

    /**
     * 播放当前单词发音
     */
    speakCurrentWord() {
        const word = this.session.words[this.session.currentIndex];
        speech.speakWord(word);
    },

    /**
     * 处理学习结果
     */
    handleResult(type) {
        const word = this.session.words[this.session.currentIndex];

        if (type === 'know') {
            this.session.learnedWords.push(word);
        } else if (type === 'forgot' || type === 'vague') {
            this.session.weakWords.push(word);
        }

        // 保存进度
        this.saveProgress();

        // 下一单词
        this.session.currentIndex++;
        this.renderWord();
    },

    /**
     * 保存进度到本地存储
     */
    saveProgress() {
        const progress = {
            currentIndex: this.session.currentIndex,
            learnedWords: this.session.learnedWords,
            weakWords: this.session.weakWords,
            words: this.session.words,
            taskId: this.session.taskId,
            savedAt: new Date().toISOString()
        };
        helpers.memoryStore.set(this.session.progressKey, JSON.stringify(progress));
    },

    /**
     * 恢复进度
     */
    restoreProgress() {
        const saved = helpers.memoryStore.get(this.session.progressKey);
        if (saved) {
            const progress = JSON.parse(saved);
            // 检查是否是同一批单词
            if (progress.taskId === this.session.taskId && 
                progress.words && 
                progress.words.length === this.session.words.length) {
                this.session.currentIndex = progress.currentIndex || 0;
                this.session.learnedWords = progress.learnedWords || [];
                this.session.weakWords = progress.weakWords || [];
            }
        }
    },

    /**
     * 保存并退出
     */
    saveAndExit() {
        this.saveProgress();
        
        const modalHtml = `
            <div id="save-exit-modal" class="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50">
                <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl m-4 text-center">
                    <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-check text-emerald-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">进度已保存</h3>
                    <p class="text-slate-500 mb-6">你已学习 ${this.session.currentIndex}/${this.session.words.length} 个单词<br>下次可继续学习</p>
                    <div class="space-y-3">
                        <button onclick="flexibleLearning.confirmExit()" class="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition">
                            退出学习
                        </button>
                        <button onclick="document.getElementById('save-exit-modal').remove()" class="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition">
                            继续学习
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * 确认退出
     */
    confirmExit() {
        const modal = document.getElementById('save-exit-modal');
        if (modal) modal.remove();
        
        speech.stop();
        const view = document.getElementById('flexible-learning-view');
        if (view) view.remove();
        
        if (this.session.onComplete) {
            this.session.onComplete({
                learnedWords: this.session.learnedWords,
                weakWords: this.session.weakWords,
                completed: this.session.currentIndex,
                total: this.session.words.length
            });
        }
    },

    /**
     * 暂停
     */
    pause() {
        speech.pause();
        
        const modalHtml = `
            <div id="pause-modal" class="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50">
                <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl m-4 text-center">
                    <div class="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-pause text-amber-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">学习已暂停</h3>
                    <p class="text-slate-500 mb-6">休息一下，准备好再继续</p>
                    <button onclick="flexibleLearning.resume()" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition">
                        <i class="fa-solid fa-play mr-2"></i>继续学习
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * 恢复学习
     */
    resume() {
        speech.resume();
        const modal = document.getElementById('pause-modal');
        if (modal) modal.remove();
    },

    /**
     * 完成学习
     */
    finish() {
        // 清除进度
        helpers.memoryStore.remove(this.session.progressKey);
        
        speech.stop();
        const view = document.getElementById('flexible-learning-view');
        if (view) view.remove();

        // 显示完成界面
        this.showCompleteView();
    },

    /**
     * 显示完成界面
     */
    showCompleteView() {
        const accuracy = Math.round((this.session.learnedWords.length / this.session.words.length) * 100);
        
        const completeHtml = `
            <div id="learning-complete" class="fixed inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center z-50">
                <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl m-4 text-center">
                    <div class="text-6xl mb-4">🎉</div>
                    <h2 class="text-2xl font-bold text-slate-800 mb-2">学习完成！</h2>
                    <p class="text-slate-500 mb-6">本次共学习 ${this.session.words.length} 个单词</p>
                    
                    <div class="bg-slate-50 rounded-xl p-6 mb-6">
                        <div class="grid grid-cols-3 gap-4">
                            <div class="text-center">
                                <div class="text-2xl font-bold text-emerald-600">${this.session.learnedWords.length}</div>
                                <div class="text-xs text-slate-500">已掌握</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-amber-600">${this.session.weakWords.length}</div>
                                <div class="text-xs text-slate-500">需复习</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-indigo-600">${accuracy}%</div>
                                <div class="text-xs text-slate-500">掌握率</div>
                            </div>
                        </div>
                    </div>
                    
                    <button onclick="flexibleLearning.closeComplete()" class="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition">
                        返回任务列表
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', completeHtml);
    },

    /**
     * 关闭完成界面
     */
    closeComplete() {
        const complete = document.getElementById('learning-complete');
        if (complete) complete.remove();
        
        if (this.session.onComplete) {
            this.session.onComplete({
                learnedWords: this.session.learnedWords,
                weakWords: this.session.weakWords,
                completed: this.session.words.length,
                total: this.session.words.length
            });
        }
    },

    // 工具方法
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

    parseMeaning(meaning) {
        if (!meaning) return { pos: '', meaning: '' };
        const match = meaning.match(/^([a-z]+)\.\s*(.+)$/i);
        if (match) {
            return { pos: match[1] + '.', meaning: match[2] };
        }
        return { pos: '', meaning: meaning };
    },

    getWordFormation(word) {
        const length = word.length;
        const syllables = Math.ceil(length / 2.5);
        return `${length}个字母 · 约${syllables}个音节`;
    },

    generateExample(word, meaning) {
        return `This is an example with the word "${word}".`;
    }
};
