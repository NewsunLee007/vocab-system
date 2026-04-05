/**
 * ESL词汇学习系统 - 卡片学习模块
 * 优化版：简化卡片翻转实现
 */

const flashcardLearning = {
    session: {
        words: [],
        currentIndex: 0,
        learnedWords: [],
        weakWords: [],
        onComplete: null,
        isFlipped: false,
        teacherId: null,
        wordlistId: null
    },

    getViewElement() {
        return document.getElementById('flashcard-learning-view');
    },

    getEl(id) {
        const view = this.getViewElement();
        if (view) {
            const el = view.querySelector(`#${id}`);
            if (el) return el;
        }
        return document.getElementById(id);
    },

    /**
     * 启动卡片学习
     */
    start(words, onComplete, context = null) {
        this.session = {
            words: helpers.shuffle([...words]),
            currentIndex: 0,
            learnedWords: [],
            weakWords: [],
            onComplete: onComplete,
            isFlipped: false,
            teacherId: null,
            wordlistId: null
        };
        
        let wl = null;
        if (context && context.wordlistId && context.teacherId) {
            this.session.wordlistId = context.wordlistId;
            this.session.teacherId = context.teacherId;
        } else {
            wl = taskEngine?.state?.wordlist || (typeof student !== 'undefined' && student.currentWordlistId ? db.findWordList(student.currentWordlistId) : null);
            if (wl) {
                this.session.wordlistId = wl.id;
                this.session.teacherId = wl.teacherId;
            }
        }

        this.showLearningView();
        this.renderCard();
    },

    /**
     * 显示学习界面
     */
    showLearningView() {
        const viewHtml = `
            <div id="flashcard-learning-view" class="fixed inset-0 z-[100] flex flex-col mesh-bg pt-16 animate-fade-in">
                <!-- Top Control Bar -->
                <div class="px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center relative z-10">
                    <button onclick="flashcardLearning.exit()" class="text-white/80 hover:text-white transition absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10">
                        <i class="fa-solid fa-arrow-left mr-1 sm:mr-2"></i><span class="hidden sm:inline">退出学习</span>
                    </button>
                    <div class="w-full text-center pointer-events-none">
                        <div class="text-xs sm:text-sm font-medium text-indigo-100 bg-indigo-900/40 border border-indigo-500/30 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full inline-block backdrop-blur-sm">
                            卡片认知 <span id="flashcard-progress" class="text-white ml-1">1/${this.session.words.length}</span>
                        </div>
                    </div>
                </div>

                <!-- Progress Bar -->
                <div class="w-full h-1 bg-white/10">
                    <div id="flashcard-progress-bar" class="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-300 shadow-[0_0_10px_rgba(52,211,153,0.5)]" style="width: 0%"></div>
                </div>

                <div class="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
                    <div class="w-full max-w-md my-auto">
                        <!-- 卡片容器 - 3D翻转 -->
                        <div id="flashcard-container" class="relative w-full h-96 mb-8 cursor-pointer perspective-1000 group" onclick="flashcardLearning.flipCard()">
                            <div id="flashcard-inner" class="w-full h-full relative transition-transform duration-600 transform-style-3d">
                                <!-- 正面 -->
                                <div id="flashcard-front" class="absolute w-full h-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center backface-hidden border border-white/40 group-hover:scale-[1.02] transition-transform duration-300">
                                    <div class="text-slate-400 text-sm mb-6 font-medium tracking-wide">点击翻转查看释义</div>
                                    <div id="flashcard-front-word" class="text-6xl font-black text-slate-800 mb-8 tracking-tight"></div>
                                    <button onclick="event.stopPropagation(); flashcardLearning.speakCurrentWord()" 
                                        class="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-110 transition flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/30">
                                        <i class="fa-solid fa-volume-high text-2xl"></i>
                                    </button>
                                </div>
                                
                                <!-- 背面 -->
                                <div id="flashcard-back" class="absolute w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-[0_0_30px_rgba(79,70,229,0.4)] flex flex-col items-center justify-center p-8 text-white backface-hidden rotate-y-180 border border-white/10">
                                    <div class="text-center w-full">
                                        <div id="flashcard-back-word" class="text-4xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-100"></div>
                                        <div id="flashcard-back-phonetic" class="text-indigo-200 text-xl mb-6 font-mono bg-black/20 px-3 py-1 rounded-lg inline-block"></div>
                                        <div id="flashcard-back-meaning" class="text-2xl mb-6 font-medium leading-relaxed"></div>
                                        <div class="w-12 h-1 bg-white/20 mx-auto my-6 rounded-full"></div>
                                        <div id="flashcard-back-sentence" class="text-lg italic text-indigo-100 leading-relaxed opacity-90"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 控制按钮 -->
                        <div id="flashcard-controls" class="hidden space-y-4 animate-fade-in-up">
                            <div class="text-center text-white/60 text-sm mb-2 font-medium tracking-wide">你掌握这个单词了吗？</div>
                            <div class="grid grid-cols-3 gap-4">
                                <button onclick="flashcardLearning.handleResult('forgot')" 
                                    class="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 hover:text-white py-4 rounded-2xl transition backdrop-blur-sm group">
                                    <i class="fa-solid fa-face-frown mb-2 block text-2xl group-hover:scale-110 transition-transform"></i>
                                    <span class="font-bold">不认识</span>
                                </button>
                                <button onclick="flashcardLearning.handleResult('vague')" 
                                    class="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 hover:text-white py-4 rounded-2xl transition backdrop-blur-sm group">
                                    <i class="fa-solid fa-face-meh mb-2 block text-2xl group-hover:scale-110 transition-transform"></i>
                                    <span class="font-bold">模糊</span>
                                </button>
                                <button onclick="flashcardLearning.handleResult('know')" 
                                    class="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-200 hover:text-white py-4 rounded-2xl transition backdrop-blur-sm group">
                                    <i class="fa-solid fa-face-smile-beam mb-2 block text-2xl group-hover:scale-110 transition-transform"></i>
                                    <span class="font-bold">秒懂</span>
                                </button>
                            </div>
                        </div>

                        <!-- 提示 -->
                        <div id="flashcard-hint" class="text-center text-white/30 text-sm mt-8 font-light">
                            点击卡片翻转 · 使用发音按钮听读音
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', viewHtml);
    },

    renderCard() {
        if (this.session.currentIndex >= this.session.words.length) {
            this.finish();
            return;
        }

        const word = this.session.words[this.session.currentIndex];
        let wordData = db.findWord(word) || {
            word: word,
            phonetic: `/${word}/`,
            meaning: '暂无释义'
        };
        
        let reviewed = null;
        if (this.session.teacherId && this.session.wordlistId) {
            const review = db.getTeacherReviewedSentences(this.session.teacherId, this.session.wordlistId);
            if (review && review.sentences && review.sentences[word]) {
                const data = review.sentences[word];
                if (data.status === 'approved' || data.status === 'modified') {
                    reviewed = data;
                    wordData = {
                        word: word,
                        phonetic: data.phonetic || wordData.phonetic,
                        meaning: data.meaning || wordData.meaning,
                        sentence: (data.sentence || '').replace('___', word)
                    };
                }
            }
        }

        // 更新进度
        const progress = ((this.session.currentIndex / this.session.words.length) * 100);
        this.getEl('flashcard-progress').innerText = 
            `${this.session.currentIndex + 1}/${this.session.words.length}`;
        this.getEl('flashcard-progress-bar').style.width = `${progress}%`;

        // 重置翻转状态 - 显示正面
        this.session.isFlipped = false;
        const cardInner = this.getEl('flashcard-inner');
        cardInner.classList.remove('rotate-y-180');

        // 设置卡片内容
        this.getEl('flashcard-front-word').innerText = wordData.word;
        this.getEl('flashcard-back-word').innerText = wordData.word;
        this.getEl('flashcard-back-phonetic').innerText = wordData.phonetic || '';
        this.getEl('flashcard-back-meaning').innerText = wordData.meaning || '暂无释义';
        // 先渲染占位，再异步加载AI例句
        const sentenceEl = this.getEl('flashcard-back-sentence');
        const initialSentence = wordData.sentence ? wordData.sentence.replace('___', wordData.word) : '';
        sentenceEl.innerText = initialSentence || '正在生成AI例句…';
        if (reviewed) {
            // 已有教师审核内容则不调用AI
        } else {
            this.loadAISentence(wordData.word, initialSentence);
        }


        // 隐藏控制按钮
        this.getEl('flashcard-controls').classList.add('hidden');
        this.getEl('flashcard-hint').classList.remove('hidden');

        // 自动播放发音
        setTimeout(() => this.speakCurrentWord(), 500);
    },

    /**
     * 异步加载AI例句并更新到卡片和词典
     */
    async loadAISentence(word, currentSentence) {
        try {
            // 若已有较为自然的句子，则不重复生成（保留用户/系统已有的优质内容）
            if (currentSentence && currentSentence.length > 8 && !/___/.test(currentSentence)) {
                return;
            }
            // 调用AI服务生成单词材料（自动选择外部/内置引擎）
            const material = await aiSentenceService.regenerateWord(word, 'middle');
            const sentence = material?.flashcard?.sentence || material?.context?.sentence?.replace('___', word) || '';
            const phonetic = material?.flashcard?.phonetic || `/${word}/`;
            const meaning = material?.flashcard?.meaning || '';

            if (sentence) {
                // 更新UI
                const el = this.getEl('flashcard-back-sentence');
                if (el) el.innerText = sentence;
                const phoneticEl = this.getEl('flashcard-back-phonetic');
                if (phoneticEl && phonetic) phoneticEl.innerText = phonetic;
                const meaningEl = this.getEl('flashcard-back-meaning');
                if (meaningEl && meaning) meaningEl.innerText = meaning;

                // 持久化到词典
                db.updateWordSentence(word, sentence, phonetic, meaning);
            } else {
                // 无法生成则使用内置句子生成器作为兜底
                const wordData = db.findWord(word) || {};
                const generated = sentenceGenerator.generateSentence(word, wordData?.meaning || '', 'middle');
                const fallbackSentence = (generated?.sentence || '').replace('___', word);
                const el = this.getEl('flashcard-back-sentence');
                if (el) el.innerText = fallbackSentence || '例句暂不可用';
                db.updateWordSentence(word, fallbackSentence, wordData?.phonetic || `/${word}/`, wordData?.meaning || '');
            }
        } catch (e) {
            console.warn('AI例句生成失败:', e);
            const el = this.getEl('flashcard-back-sentence');
            if (el && (!el.innerText || /正在生成AI例句/.test(el.innerText))) {
                el.innerText = '例句暂不可用';
            }
        }
    },

    flipCard() {
        this.session.isFlipped = !this.session.isFlipped;
        const cardInner = this.getEl('flashcard-inner');
        
        if (this.session.isFlipped) {
            cardInner.classList.add('rotate-y-180');
            setTimeout(() => {
                this.getEl('flashcard-controls').classList.remove('hidden');
                this.getEl('flashcard-hint').classList.add('hidden');
            }, 300);
        } else {
            cardInner.classList.remove('rotate-y-180');
            this.getEl('flashcard-controls').classList.add('hidden');
            this.getEl('flashcard-hint').classList.remove('hidden');
        }
    },

    speakCurrentWord() {
        const word = this.session.words[this.session.currentIndex];
        speech.speakWord(word);
    },

    handleResult(type) {
        const word = this.session.words[this.session.currentIndex];

        if (type === 'know') {
            this.session.learnedWords.push(word);
        } else if (type === 'forgot') {
            this.session.weakWords.push(word);
        } else {
            // 模糊也算部分掌握
            this.session.learnedWords.push(word);
        }

        // 下一卡片
        this.session.currentIndex++;
        this.renderCard();
    },

    finish() {
        const accuracy = this.session.words.length > 0 
            ? Math.round((this.session.learnedWords.length / this.session.words.length) * 100) 
            : 0;
        const coins = RewardSystem.calculateFlashcardReward(this.session.learnedWords.length);

        const view = document.getElementById('flashcard-learning-view');
        if (view) view.remove();

        if (this.session.onComplete) {
            this.session.onComplete({
                accuracy: accuracy,
                coins: coins,
                weakWords: this.session.weakWords,
                learnedWords: this.session.learnedWords
            });
        }
        
        // 返回自主学习中心选择页
        if (typeof student !== 'undefined' && student.currentWordlistId) {
            student.showSelfLearningModeChoice(student.currentWordlistId);
        }
    },

    exit() {
        if (confirm('确定要退出学习吗？进度将不会保存。')) {
            window.speechSynthesis.cancel();
            const view = document.getElementById('flashcard-learning-view');
            if (view) view.remove();
            if (typeof student !== 'undefined' && student.currentWordlistId) {
                student.showSelfLearningModeChoice(student.currentWordlistId);
            }
        }
    }
};
