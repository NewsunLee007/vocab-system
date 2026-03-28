/**
 * 新纪元英语词汇系统 - 听音拼写测试模块
 * 听音拼写填空：考查发音与拼写的绝对准确率
 */

const spellingTest = {
    session: {
        words: [],
        currentIndex: 0,
        score: 0,
        weakWords: [],
        onComplete: null
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
                        meaning: r.meaning || data.meaning,
                        sentence: (r.sentence || data.sentence)
                    };
                }
            }
        }
        return data;
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
            <div id="spelling-test-view" class="fixed inset-0 bg-slate-50 z-40 flex flex-col">
                <div class="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
                    <button onclick="spellingTest.exit()" class="text-slate-500 hover:text-slate-800 transition">
                        <i class="fa-solid fa-arrow-left mr-2"></i>退出
                    </button>
                    <div class="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                        听音拼写 <span id="spelling-progress">1/${this.session.words.length}</span>
                    </div>
                    <div class="w-16"></div>
                </div>

                <div class="w-full h-1 bg-slate-200">
                    <div id="spelling-progress-bar" class="h-full bg-amber-500 transition-all duration-300" style="width: 0%"></div>
                </div>

                <div class="flex-1 flex items-center justify-center p-4">
                    <div class="w-full max-w-xl">
                        <div class="bg-white rounded-2xl shadow-lg p-8 mb-6 text-center">
                            <div class="text-slate-400 font-medium text-sm mb-6">
                                <i class="fa-solid fa-headphones mr-2 text-amber-400"></i>
                                点击播放按钮听发音，然后拼写单词
                            </div>
                            
                            <!-- 播放按钮 -->
                            <button id="spelling-play-btn" onclick="spellingTest.playCurrentWord()" 
                                class="w-24 h-24 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 transition mx-auto mb-8 flex items-center justify-center">
                                <i class="fa-solid fa-volume-high text-3xl"></i>
                            </button>

                            <!-- 输入框 -->
                            <div class="mb-6">
                                <input type="text" id="spelling-input" 
                                    class="w-full text-center text-2xl font-bold border-b-4 border-amber-300 py-4 focus:outline-none focus:border-amber-500 uppercase"
                                    placeholder="输入听到的单词" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                            </div>

                            <!-- 提示按钮 -->
                            <button onclick="spellingTest.showHint()" class="text-sm text-slate-400 hover:text-amber-600 mb-4">
                                <i class="fa-solid fa-lightbulb mr-1"></i>需要提示？
                            </button>

                            <!-- 提交按钮 -->
                            <button onclick="spellingTest.checkAnswer()" 
                                class="w-full bg-amber-500 text-white font-bold py-4 rounded-xl hover:bg-amber-600 transition">
                                提交答案
                            </button>

                            <!-- 反馈 -->
                            <div id="spelling-feedback" class="hidden mt-6 p-4 rounded-xl text-left"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', viewHtml);
        
        // 自动播放第一个单词
        setTimeout(() => this.playCurrentWord(), 500);
        
        // 绑定回车键
        document.getElementById('spelling-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkAnswer();
        });
    },

    renderQuestion() {
        if (this.session.currentIndex >= this.session.words.length) {
            this.finish();
            return;
        }

        const progress = ((this.session.currentIndex / this.session.words.length) * 100);
        document.getElementById('spelling-progress').innerText = 
            `${this.session.currentIndex + 1}/${this.session.words.length}`;
        document.getElementById('spelling-progress-bar').style.width = `${progress}%`;

        // 清空输入
        const input = document.getElementById('spelling-input');
        input.value = '';
        input.focus();

        // 隐藏反馈
        document.getElementById('spelling-feedback').classList.add('hidden');

        // 自动播放
        setTimeout(() => this.playCurrentWord(), 300);
    },

    playCurrentWord() {
        const word = this.session.words[this.session.currentIndex];
        speech.speakWord(word);
        
        // 播放动画
        const btn = document.getElementById('spelling-play-btn');
        btn.classList.add('scale-110');
        setTimeout(() => btn.classList.remove('scale-110'), 200);
    },

    showHint() {
        const word = this.session.words[this.session.currentIndex];
        const wordData = this.getWordDataWithReview(word) || {};
        
        const hint = wordData.meaning || `这是一个${word.length}个字母的单词`;
        
        document.getElementById('spelling-feedback').classList.remove('hidden');
        document.getElementById('spelling-feedback').innerHTML = `
            <div class="bg-amber-50 p-4 rounded-lg">
                <div class="font-bold text-amber-700 mb-1"><i class="fa-solid fa-lightbulb mr-2"></i>提示</div>
                <div class="text-amber-600">${hint}</div>
                <div class="text-sm text-slate-400 mt-2">首字母: ${word.charAt(0).toUpperCase()}</div>
            </div>
        `;
    },

    checkAnswer() {
        const input = document.getElementById('spelling-input');
        const userAnswer = input.value.trim().toLowerCase();
        const correctWord = this.session.words[this.session.currentIndex].toLowerCase();
        
        if (!userAnswer) {
            helpers.showToast('请输入单词', 'warning');
            return;
        }

        const isCorrect = userAnswer === correctWord;
        
        if (isCorrect) {
            this.session.score++;
        } else {
            this.session.weakWords.push(correctWord);
        }

        this.showFeedback(isCorrect, correctWord);

        // 3秒后下一题
        setTimeout(() => {
            this.session.currentIndex++;
            this.renderQuestion();
        }, 3000);
    },

    showFeedback(isCorrect, word) {
        const feedback = document.getElementById('spelling-feedback');
        const wordData = this.getWordDataWithReview(word) || {};
        
        feedback.classList.remove('hidden');
        
        if (isCorrect) {
            feedback.innerHTML = `
                <div class="bg-emerald-50 p-4 rounded-lg">
                    <div class="flex items-center mb-2">
                        <span class="text-2xl mr-2">✅</span>
                        <span class="font-bold text-emerald-700">拼写正确！</span>
                    </div>
                    <div class="text-emerald-600">
                        <span class="font-bold">${wordData.word}</span>
                        <span class="text-slate-400 mx-2">${wordData.phonetic || `/${word}/`}</span>
                        <span>${wordData.meaning || ''}</span>
                    </div>
                </div>
            `;
        } else {
            feedback.innerHTML = `
                <div class="bg-rose-50 p-4 rounded-lg">
                    <div class="flex items-center mb-2">
                        <span class="text-2xl mr-2">❌</span>
                        <span class="font-bold text-rose-700">拼写错误</span>
                    </div>
                    <div class="text-rose-600 mb-2">
                        正确拼写: <span class="font-bold text-lg">${word}</span>
                    </div>
                    <div class="text-slate-500">
                        <span class="text-slate-400">${wordData.phonetic || `/${word}/`}</span>
                        <span class="mx-2">${wordData.meaning || ''}</span>
                    </div>
                    <button onclick="speech.speakWord('${word}')" class="mt-3 text-sm text-amber-600 hover:text-amber-700">
                        <i class="fa-solid fa-volume-high mr-1"></i>再听一遍
                    </button>
                </div>
            `;
        }
    },

    finish() {
        const accuracy = Math.round((this.session.score / this.session.words.length) * 100);
        const coins = this.session.score * 15;

        const view = document.getElementById('spelling-test-view');
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
            const view = document.getElementById('spelling-test-view');
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
