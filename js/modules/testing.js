/**
 * 新纪元英语词汇系统 - 检测模块（语境测试）
 */

const testing = {
    // 检测会话状态
    session: {
        wordListId: null,
        words: [],
        currentIndex: 0,
        score: 0,
        answers: [],
        weakWords: []
    },

    /**
     * 开始检测
     */
    start(wordListId) {
        const wordlist = db.findWordList(wordListId);
        if (!wordlist) {
            helpers.showToast('词表不存在！', 'error');
            return;
        }

        // 初始化会话
        this.session.wordListId = wordListId;
        this.session.words = helpers.shuffle([...wordlist.words]);
        this.session.currentIndex = 0;
        this.session.score = 0;
        this.session.answers = [];
        this.session.weakWords = [];

        // 切换到检测视图
        router.navigate('testing');
        
        // 重置UI
        document.getElementById('testing-finished').classList.add('hidden');
        document.getElementById('test-container').classList.remove('hidden');
        
        // 渲染第一题
        this.renderQuestion();
    },

    /**
     * 获取或生成单词数据
     */
    getWordData(word) {
        // 首先尝试从系统词库获取
        let wordData = db.findWord(word);
        
        if (wordData) {
            return wordData;
        }
        
        // 如果词库中没有，生成默认数据
        return this.generateDefaultWordData(word);
    },

    /**
     * 生成默认单词数据
     */
    generateDefaultWordData(word) {
        // 生成默认的例句和选项
        const defaultSentences = [
            `Please fill in the blank with the word "${word}".`,
            `The teacher asked us to use "${word}" in a sentence.`,
            `Can you tell me the meaning of "${word}"?`,
            `I learned a new word "${word}" today.`
        ];
        
        // 生成干扰项（基于常见单词）
        const commonWords = ['apple', 'book', 'cat', 'dog', 'eat', 'friend', 'good', 'happy', 'is', 'jump', 'kind', 'love', 'my', 'name', 'orange', 'pen', 'quiet', 'run', 'school', 'the', 'up', 'very', 'water', 'yes', 'zoo'];
        
        // 随机选择3个干扰项
        const shuffled = helpers.shuffle([...commonWords]);
        const distractors = shuffled.slice(0, 3).filter(w => w.toLowerCase() !== word.toLowerCase());
        
        // 确保有3个干扰项
        while (distractors.length < 3) {
            const randomWord = commonWords[Math.floor(Math.random() * commonWords.length)];
            if (randomWord.toLowerCase() !== word.toLowerCase() && !distractors.includes(randomWord)) {
                distractors.push(randomWord);
            }
        }
        
        // 构建选项（正确答案 + 3个干扰项）
        const options = [word, ...distractors];
        // 打乱选项顺序
        const shuffledOptions = helpers.shuffle(options);
        
        return {
            word: word,
            phonetic: '/' + word + '/',
            meaning: 'n. 单词',
            sentence: `Please choose the correct word "___" from the options below.`,
            options: shuffledOptions,
            answerIndex: shuffledOptions.indexOf(word)
        };
    },

    /**
     * 渲染当前题目
     */
    renderQuestion() {
        if (this.session.currentIndex >= this.session.words.length) {
            this.finish();
            return;
        }

        const word = this.session.words[this.session.currentIndex];
        const wordData = this.getWordData(word);

        // 更新进度（元素可能被移除，做空值保护）
        const progress = ((this.session.currentIndex / this.session.words.length) * 100);
        const tp = document.getElementById('test-progress-text');
        if (tp) {
            tp.innerText = `${this.session.currentIndex + 1} / ${this.session.words.length}`;
        }
        document.getElementById('test-progress-bar').style.width = `${progress}%`;

        // 渲染句子（挖空）
        const sentenceHtml = wordData.sentence.replace(
            '___',
            '<span class="inline-block border-b-4 border-slate-300 w-24 mx-2 text-center text-rose-500 font-bold">?</span>'
        );
        document.getElementById('test-sentence').innerHTML = sentenceHtml;

        // 渲染选项
        const optionsContainer = document.getElementById('test-options');
        optionsContainer.innerHTML = '';

        wordData.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'test-option w-full text-left px-6 py-4 rounded-xl border-2 border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-700 font-medium text-lg transition group';
            btn.innerHTML = `
                <span class="inline-block w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-center leading-8 mr-3 group-hover:bg-rose-200 group-hover:text-rose-700 transition">
                    ${String.fromCharCode(65 + index)}
                </span>
                ${option}
            `;
            btn.onclick = () => this.checkAnswer(index, wordData.answerIndex, word);
            optionsContainer.appendChild(btn);
        });

        // 隐藏反馈
        document.getElementById('test-feedback').classList.add('hidden');
    },

    /**
     * 检查答案
     */
    checkAnswer(selectedIndex, correctIndex, word) {
        const isCorrect = selectedIndex === correctIndex;
        const options = document.querySelectorAll('.test-option');
        const wordData = this.getWordData(word);

        // 禁用所有选项
        options.forEach(btn => {
            btn.onclick = null;
            btn.classList.add('cursor-not-allowed');
        });

        // 标记正确/错误
        if (isCorrect) {
            options[selectedIndex].classList.add('correct');
            this.session.score++;
        } else {
            options[selectedIndex].classList.add('wrong');
            options[correctIndex].classList.add('correct');
            this.session.weakWords.push(word);
        }

        // 记录答案
        this.session.answers.push({
            word: word,
            correct: isCorrect
        });

        // 显示反馈
        this.showFeedback(isCorrect, wordData);
    },

    /**
     * 显示反馈
     */
    showFeedback(isCorrect, wordData) {
        const feedback = document.getElementById('test-feedback');
        const icon = document.getElementById('feedback-icon');
        const title = document.getElementById('feedback-title');
        const desc = document.getElementById('feedback-desc');

        feedback.classList.remove('hidden', 'bg-emerald-50', 'bg-rose-50');

        if (isCorrect) {
            feedback.classList.add('bg-emerald-50');
            icon.innerHTML = '✅';
            title.innerText = '回答正确！';
            title.className = 'font-bold text-lg mb-1 text-emerald-700';
            desc.innerText = '太棒了，你已经掌握了它在真实语境中的用法。';
        } else {
            feedback.classList.add('bg-rose-50');
            icon.innerHTML = '❌';
            title.innerText = '回答错误！';
            title.className = 'font-bold text-lg mb-1 text-rose-700';
            desc.innerHTML = `正确答案是 <b class="text-emerald-600">${wordData.options[wordData.answerIndex]}</b>。系统已记录你的薄弱点。`;
        }
    },

    /**
     * 下一题
     */
    nextQuestion() {
        this.session.currentIndex++;
        this.renderQuestion();
    },

    /**
     * 完成检测
     */
    finish() {
        // 隐藏题目
        document.getElementById('test-container').classList.add('hidden');
        
        // 显示完成界面
        const finishPanel = document.getElementById('testing-finished');
        finishPanel.classList.remove('hidden');

        // 计算正确率
        const accuracy = Math.round((this.session.score / this.session.words.length) * 100);
        const coinsEarned = this.session.score * 20;

        // 更新显示
        document.getElementById('test-finish-score').innerText = `${accuracy}%`;
        document.getElementById('test-finish-coins').innerText = coinsEarned;

        // 设置表情
        const emoji = document.getElementById('test-finish-emoji');
        if (accuracy === 100) {
            emoji.innerText = '🏆';
        } else if (accuracy >= 80) {
            emoji.innerText = '🌟';
        } else if (accuracy >= 60) {
            emoji.innerText = '👍';
        } else {
            emoji.innerText = '💪';
        }

        // 记录检测日志
        const user = auth.getCurrentUser();
        db.addLearningLog({
            studentId: user.id,
            teacherId: user.teacherId,
            learnedCount: 0,
            reviewCount: this.session.words.length,
            correctRate: accuracy,
            weakWord: this.session.weakWords.length > 0 ? this.session.weakWords.join(', ') : '-',
            taskType: 'test'
        });

        // 更新学生统计
        db.updateStudent(user.id, {
            totalTests: user.totalTests + 1,
            totalCorrect: user.totalCorrect + this.session.score,
            totalQuestions: user.totalQuestions + this.session.words.length
        });

        // 增加金币
        db.addCoins(user.id, coinsEarned);

        // 更新当前用户数据
        auth.updateCurrentUser({
            coins: user.coins + coinsEarned,
            totalTests: user.totalTests + 1,
            totalCorrect: user.totalCorrect + this.session.score,
            totalQuestions: user.totalQuestions + this.session.words.length
        });

        // 显示庆祝动画
        if (accuracy >= 80) {
            helpers.createParticles(document.getElementById('view-testing'), 30);
        }
    }
};
