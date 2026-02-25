/**
 * 新纪元英语词汇系统 - 词义匹配测试模块
 * 词义匹配：快速识别单词与中文释义的对应关系
 */

const matchingTest = {
    session: {
        words: [],
        currentIndex: 0,
        score: 0,
        weakWords: [],
        onComplete: null
    },

    start(words, onComplete) {
        this.session.words = helpers.shuffle([...words]);
        this.session.currentIndex = 0;
        this.session.score = 0;
        this.session.weakWords = [];
        this.session.onComplete = onComplete;

        this.showTestView();
        this.renderQuestion();
    },

    showTestView() {
        const viewHtml = `
            <div id="matching-test-view" class="fixed inset-0 bg-slate-50 z-40 flex flex-col">
                <div class="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
                    <button onclick="matchingTest.exit()" class="text-slate-500 hover:text-slate-800 transition">
                        <i class="fa-solid fa-arrow-left mr-2"></i>退出
                    </button>
                    <div class="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        词义匹配 <span id="matching-progress">1/${this.session.words.length}</span>
                    </div>
                    <div class="w-16"></div>
                </div>

                <div class="w-full h-1 bg-slate-200">
                    <div id="matching-progress-bar" class="h-full bg-emerald-500 transition-all duration-300" style="width: 0%"></div>
                </div>

                <div class="flex-1 flex items-center justify-center p-4">
                    <div class="w-full max-w-xl">
                        <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
                            <div class="text-slate-400 font-medium text-sm mb-6 text-center">
                                <i class="fa-solid fa-link mr-2 text-emerald-400"></i>
                                选择单词对应的中文释义
                            </div>
                            
                            <!-- 单词显示 -->
                            <div class="text-center mb-8">
                                <div id="matching-word" class="text-4xl font-bold text-slate-800 mb-2"></div>
                                <div id="matching-phonetic" class="text-slate-400"></div>
                                <button id="matching-speak-btn" onclick="matchingTest.playCurrentWord()" 
                                    class="mt-3 w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition">
                                    <i class="fa-solid fa-volume-high"></i>
                                </button>
                            </div>

                            <!-- 选项 -->
                            <div id="matching-options" class="grid grid-cols-1 gap-3">
                                <!-- JS注入 -->
                            </div>

                            <!-- 反馈 -->
                            <div id="matching-feedback" class="hidden mt-6 p-4 rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', viewHtml);
    },

    renderQuestion() {
        if (this.session.currentIndex >= this.session.words.length) {
            this.finish();
            return;
        }

        const word = this.session.words[this.session.currentIndex];
        const wordData = this.getWordDataWithReview(word) || { word: word, phonetic: `/${word}/`, meaning: '' };
        const question = this.generateQuestion(word, wordData);

        // 更新进度
        const progress = ((this.session.currentIndex / this.session.words.length) * 100);
        document.getElementById('matching-progress').innerText = 
            `${this.session.currentIndex + 1}/${this.session.words.length}`;
        document.getElementById('matching-progress-bar').style.width = `${progress}%`;

        // 显示单词
        document.getElementById('matching-word').innerText = word;
        document.getElementById('matching-phonetic').innerText = wordData.phonetic || `/${word}/`;

        // 渲染选项
        const optionsContainer = document.getElementById('matching-options');
        optionsContainer.innerHTML = '';

        question.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'matching-option w-full text-left px-6 py-4 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700 transition';
            btn.innerHTML = `<span class="font-medium">${option}</span>`;
            btn.onclick = () => this.checkAnswer(index, question.correctIndex, word);
            optionsContainer.appendChild(btn);
        });

        // 隐藏反馈
        document.getElementById('matching-feedback').classList.add('hidden');

        // 自动播放发音
        setTimeout(() => this.playCurrentWord(), 500);
    },

    generateQuestion(word, wordData) {
        const wl = taskEngine?.state?.wordlist || (typeof student !== 'undefined' && student.currentWordlistId ? db.findWordList(student.currentWordlistId) : null);
        if (wl && wl.id && wl.teacherId) {
            const review = db.getTeacherReviewedSentences(wl.teacherId, wl.id);
            const r = review?.sentences?.[word];
            if (r && (r.status === 'approved' || r.status === 'modified') && Array.isArray(r.options) && r.options.length >= 4) {
                const opts = r.options;
                const corrIdx = r.correctIndex || 0;
                return { options: opts, correctIndex: corrIdx };
            }
        }
        const correctMeaning = wordData.meaning || word;
        const allWords = db.getAllWords ? db.getAllWords() : [];
        const distractorMeanings = allWords
            .filter(w => w.word.toLowerCase() !== word.toLowerCase() && w.meaning)
            .map(w => w.meaning)
            .slice(0, 10);
        const shuffledDistractors = helpers.shuffle(distractorMeanings).slice(0, 3);
        const options = [correctMeaning, ...shuffledDistractors];
        const shuffledOptions = helpers.shuffle(options);
        const correctIndex = shuffledOptions.indexOf(correctMeaning);
        return { options: shuffledOptions, correctIndex };
    },
    
    getWordDataWithReview(word) {
        let data = db.findWord(word) || {};
        const wl = taskEngine?.state?.wordlist || (typeof student !== 'undefined' && student.currentWordlistId ? db.findWordList(student.currentWordlistId) : null);
        if (wl && wl.id && wl.teacherId) {
            const review = db.getTeacherReviewedSentences(wl.teacherId, wl.id);
            if (review && review.sentences && review.sentences[word]) {
                const r = review.sentences[word];
                if (r.status === 'approved' || r.status === 'modified') {
                    data = {
                        word: word,
                        phonetic: r.phonetic || data.phonetic,
                        meaning: r.meaning || data.meaning
                    };
                }
            }
        }
        return data;
    },

    playCurrentWord() {
        const word = this.session.words[this.session.currentIndex];
        speech.speakWord(word);

        // 动画
        const btn = document.getElementById('matching-speak-btn');
        btn.classList.add('scale-110');
        setTimeout(() => btn.classList.remove('scale-110'), 200);
    },

    checkAnswer(selectedIndex, correctIndex, word) {
        const isCorrect = selectedIndex === correctIndex;
        const options = document.querySelectorAll('.matching-option');

        // 禁用所有选项
        options.forEach(btn => {
            btn.onclick = null;
            btn.classList.add('cursor-not-allowed');
        });

        // 标记正确/错误
        if (isCorrect) {
            options[selectedIndex].classList.add('border-emerald-400', 'bg-emerald-50');
            this.session.score++;
        } else {
            options[selectedIndex].classList.add('border-rose-400', 'bg-rose-50');
            options[correctIndex].classList.add('border-emerald-400', 'bg-emerald-50');
            this.session.weakWords.push(word);
        }

        this.showFeedback(isCorrect, word);

        setTimeout(() => {
            this.session.currentIndex++;
            this.renderQuestion();
        }, 2000);
    },

    showFeedback(isCorrect, word) {
        const feedback = document.getElementById('matching-feedback');
        const wordData = db.findWord(word) || {};
        
        feedback.classList.remove('hidden');
        
        if (isCorrect) {
            feedback.className = 'mt-6 p-4 rounded-xl bg-emerald-50';
            feedback.innerHTML = `
                <div class="flex items-center">
                    <span class="text-2xl mr-2">✅</span>
                    <span class="font-bold text-emerald-700">回答正确！</span>
                </div>
            `;
        } else {
            feedback.className = 'mt-6 p-4 rounded-xl bg-rose-50';
            feedback.innerHTML = `
                <div class="flex items-center">
                    <span class="text-2xl mr-2">❌</span>
                    <div>
                        <div class="font-bold text-rose-700">回答错误</div>
                        <div class="text-sm text-rose-600">
                            ${wordData.word || word} - ${wordData.meaning || ''}
                        </div>
                    </div>
                </div>
            `;
        }
    },

    finish() {
        const accuracy = Math.round((this.session.score / this.session.words.length) * 100);
        const coins = this.session.score * 10;

        const view = document.getElementById('matching-test-view');
        if (view) view.remove();

        if (this.session.onComplete) {
            this.session.onComplete({
                accuracy: accuracy,
                coins: coins,
                weakWords: this.session.weakWords
            });
        }
    },

    exit() {
        if (confirm('确定要退出测试吗？进度将不会保存。')) {
            window.speechSynthesis.cancel();
            const view = document.getElementById('matching-test-view');
            if (view) view.remove();
            
            if (this.session.onComplete) {
                this.session.onComplete({
                    accuracy: 0,
                    coins: 0,
                    weakWords: []
                });
            }
        }
    }
};
