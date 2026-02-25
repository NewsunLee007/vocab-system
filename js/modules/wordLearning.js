/**
 * 新纪元英语词汇系统 - 单词学习模块
 * 音形意用四维学习：发音、形态、意义、用法
 */

const wordLearning = {
    session: {
        words: [],
        currentIndex: 0,
        learnedWords: [],
        weakWords: [],
        onComplete: null
    },

    /**
     * 开始学习
     */
    start(words, onComplete) {
        this.session.words = [...words];
        this.session.currentIndex = 0;
        this.session.learnedWords = [];
        this.session.weakWords = [];
        this.session.onComplete = onComplete;

        this.showLearningView();
        this.renderWord();
    },

    /**
     * 显示学习界面
     */
    showLearningView() {
        const viewHtml = `
            <div id="word-learning-view" class="fixed inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 z-40 flex flex-col">
                <!-- 头部 -->
                <div class="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
                    <button onclick="wordLearning.exit()" class="text-slate-500 hover:text-slate-800 transition">
                        <i class="fa-solid fa-arrow-left mr-2"></i>退出学习
                    </button>
                    <div class="text-sm font-medium text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full">
                        <i class="fa-solid fa-graduation-cap mr-1"></i>
                        单词学习 <span id="learning-progress">1/${this.session.words.length}</span>
                    </div>
                    <div class="w-20"></div>
                </div>

                <!-- 进度条 -->
                <div class="w-full h-1.5 bg-slate-200">
                    <div id="learning-progress-bar" class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style="width: 0%"></div>
                </div>

                <!-- 主要内容 -->
                <div class="flex-1 flex items-center justify-center p-4 overflow-y-auto">
                    <div class="w-full max-w-3xl">
                        <!-- 学习卡片 -->
                        <div class="bg-white rounded-3xl shadow-xl p-8 mb-6">
                            <!-- 单词头部 -->
                            <div class="text-center mb-8">
                                <div id="learning-word" class="text-5xl md:text-6xl font-bold text-slate-800 mb-3 tracking-wide"></div>
                                <div class="flex items-center justify-center space-x-4">
                                    <span id="learning-phonetic" class="text-xl text-slate-400 font-mono"></span>
                                    <button onclick="wordLearning.speakCurrentWord()" 
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
                                        <div class="text-lg font-mono mb-2" id="learning-phonetic-detail"></div>
                                        <button onclick="wordLearning.speakCurrentWord()" 
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
                                        <div class="text-lg mb-2" id="learning-spelling"></div>
                                        <div class="text-sm text-purple-600" id="learning-word-formation"></div>
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
                                        <div class="text-lg font-medium mb-1" id="learning-meaning"></div>
                                        <div class="text-sm text-emerald-600" id="learning-pos"></div>
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
                                        <div class="text-base italic mb-2" id="learning-example"></div>
                                        <div class="text-sm text-amber-600" id="learning-example-cn"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- 掌握程度选择 -->
                            <div class="border-t pt-6">
                                <div class="text-center text-slate-500 text-sm mb-4">你掌握这个单词了吗？</div>
                                <div class="grid grid-cols-3 gap-4">
                                    <button onclick="wordLearning.handleResult('forgot')" 
                                        class="bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 hover:border-rose-300 text-rose-700 font-bold py-4 rounded-xl transition flex flex-col items-center">
                                        <i class="fa-solid fa-face-frown text-2xl mb-2"></i>
                                        <span>不认识</span>
                                        <span class="text-xs font-normal text-rose-500 mt-1">需要加强</span>
                                    </button>
                                    <button onclick="wordLearning.handleResult('vague')" 
                                        class="bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 hover:border-amber-300 text-amber-700 font-bold py-4 rounded-xl transition flex flex-col items-center">
                                        <i class="fa-solid fa-face-meh text-2xl mb-2"></i>
                                        <span>有点印象</span>
                                        <span class="text-xs font-normal text-amber-500 mt-1">需要复习</span>
                                    </button>
                                    <button onclick="wordLearning.handleResult('know')" 
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
        document.getElementById('learning-progress').innerText = 
            `${this.session.currentIndex + 1}/${this.session.words.length}`;
        document.getElementById('learning-progress-bar').style.width = `${progress}%`;

        // 填充内容
        document.getElementById('learning-word').innerText = wordData.word;
        document.getElementById('learning-phonetic').innerText = wordData.phonetic || `/${word}/`;
        document.getElementById('learning-phonetic-detail').innerText = wordData.phonetic || `/${word}/`;
        document.getElementById('learning-spelling').innerText = wordData.word;
        document.getElementById('learning-word-formation').innerText = this.getWordFormation(wordData.word);
        
        // 解析词性和释义
        const { pos, meaning } = this.parseMeaning(wordData.meaning);
        document.getElementById('learning-meaning').innerText = meaning;
        document.getElementById('learning-pos').innerText = pos;

        // 例句 - 将___替换为实际单词
        let example = wordData.sentence || wordData.example || this.generateExample(wordData.word, meaning);
        // 如果例句中有___，替换为实际单词
        if (example.includes('___')) {
            example = example.replace('___', wordData.word);
        }
        document.getElementById('learning-example').innerText = `"${example}"`;
        document.getElementById('learning-example-cn').innerText = this.getExampleTranslation(wordData.word, example);

        // 自动播放发音
        setTimeout(() => this.speakCurrentWord(), 800);
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

    /**
     * 解析词性和释义
     */
    parseMeaning(meaning) {
        if (!meaning) return { pos: '', meaning: '' };
        
        const match = meaning.match(/^([a-z]+)\.\s*(.+)$/i);
        if (match) {
            return {
                pos: match[1] + '.',
                meaning: match[2]
            };
        }
        return { pos: '', meaning: meaning };
    },

    /**
     * 获取单词构成信息
     */
    getWordFormation(word) {
        const length = word.length;
        const syllables = Math.ceil(length / 2.5);
        return `${length}个字母 · 约${syllables}个音节`;
    },

    /**
     * 生成例句
     */
    generateExample(word, meaning) {
        const templates = [
            `I like to use the word "${word}" in my writing.`,
            `The teacher explained the meaning of "${word}" in class.`,
            `"${word}" is an important word to remember.`,
            `Can you make a sentence with "${word}"?`
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    },

    /**
     * 获取例句翻译
     */
    getExampleTranslation(word, example) {
        // 这里可以接入翻译API，暂时返回提示
        return '（理解句子含义，掌握单词用法）';
    },

    /**
     * 播放当前单词发音
     * 使用 speech 模块获得更好的音质
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

        // 下一单词
        this.session.currentIndex++;
        this.renderWord();
    },

    /**
     * 完成学习
     */
    finish() {
        const accuracy = Math.round((this.session.learnedWords.length / this.session.words.length) * 100);
        const coins = RewardSystem.calculateLearningReward(this.session.learnedWords.length);
        
        // 移除视图
        const view = document.getElementById('word-learning-view');
        if (view) view.remove();

        // 回调结果
        if (this.session.onComplete) {
            this.session.onComplete({
                learnedWords: this.session.learnedWords,
                weakWords: this.session.weakWords,
                accuracy: accuracy,
                coins: coins
            });
        }
    },

    /**
     * 退出学习
     */
    exit() {
        if (confirm('确定要退出学习吗？进度将不会保存。')) {
            window.speechSynthesis.cancel();
            const view = document.getElementById('word-learning-view');
            if (view) view.remove();
            
            if (this.session.onComplete) {
                this.session.onComplete({
                    learnedWords: [],
                    weakWords: [],
                    accuracy: 0
                });
            }
        }
    }
};
