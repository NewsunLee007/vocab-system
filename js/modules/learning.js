/**
 * 新纪元英语词汇系统 - 学习模块（游戏化卡片认知训练）
 */

const learning = {
    // 学习会话状态
    session: {
        wordListId: null,
        words: [],
        currentIndex: 0,
        combo: 0,
        isFlipped: false,
        totalCoins: 0,
        learnedWords: []
    },

    /**
     * 开始学习
     */
    start(wordListId) {
        const wordlist = db.findWordList(wordListId);
        if (!wordlist) {
            helpers.showToast('词表不存在！', 'error');
            return;
        }

        // 初始化会话
        this.session.wordListId = wordListId;
        this.session.words = [...wordlist.words];
        this.session.currentIndex = 0;
        this.session.combo = 0;
        this.session.isFlipped = false;
        this.session.totalCoins = 0;
        this.session.learnedWords = [];

        // 切换到学习视图
        router.navigate('learning');
        
        // 重置UI
        document.getElementById('learning-finished').classList.add('hidden');
        document.getElementById('combo-display').classList.add('hidden');
        document.getElementById('flashcard-inner').parentElement.classList.remove('hidden');
        
        // 渲染第一张卡片
        this.renderCard();
    },

    /**
     * 获取单词数据（如果词库中不存在则生成默认数据）
     */
    getWordData(word) {
        let wordData = db.findWord(word);
        if (wordData) return wordData;
        
        // 生成默认单词数据
        return this.generateDefaultWordData(word);
    },

    /**
     * 生成默认单词数据
     */
    generateDefaultWordData(word) {
        return {
            word: word,
            phonetic: `/${word}/`,
            meaning: 'n. 单词（请完善词库数据）',
            sentence: `This is the word "${word}".`
        };
    },

    /**
     * 渲染当前卡片
     */
    renderCard() {
        if (this.session.currentIndex >= this.session.words.length) {
            this.finish();
            return;
        }

        const word = this.session.words[this.session.currentIndex];
        const wordData = this.getWordData(word);

        // 更新进度（元素可能被移除，做空值保护）
        const lp = document.getElementById('learn-progress');
        if (lp) {
            lp.innerText = `${this.session.currentIndex + 1} / ${this.session.words.length}`;
        }

        // 重置翻转状态
        this.session.isFlipped = false;
        document.getElementById('flashcard-inner').classList.remove('rotate-y-180');

        // 设置卡片内容
        document.getElementById('card-front-word').innerText = wordData.word;
        document.getElementById('card-back-word').innerText = wordData.word;
        document.getElementById('card-back-phonetic').innerText = wordData.phonetic || `/${wordData.word}/`;
        document.getElementById('card-back-meaning').innerText = wordData.meaning || '暂无释义';

        // 隐藏控制按钮
        const controls = document.getElementById('learning-controls');
        controls.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
        controls.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
    },

    /**
     * 翻转卡片
     */
    flipCard() {
        if (this.session.isFlipped) return;

        this.session.isFlipped = true;
        document.getElementById('flashcard-inner').classList.add('rotate-y-180');

        // 显示控制按钮
        setTimeout(() => {
            const controls = document.getElementById('learning-controls');
            controls.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
            controls.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
        }, 200);
    },

    /**
     * 处理学习结果
     */
    handleResult(type) {
        const word = this.session.words[this.session.currentIndex];
        const user = auth.getCurrentUser();

        if (type === 'know') {
            // 秒懂 - 增加连击和金币
            this.session.combo++;
            const baseCoins = 10;
            const comboBonus = this.session.combo * 2;
            const totalCoins = baseCoins + comboBonus;
            
            this.session.totalCoins += totalCoins;
            this.session.learnedWords.push(word);
            
            // 添加到已学单词
            db.addLearnedWord(user.id, word);
            
            // 显示金币动画
            helpers.createCoinAnimation(
                document.getElementById('coin-effect-container'),
                totalCoins
            );
            
            // 更新连击显示
            const comboDisplay = document.getElementById('combo-display');
            comboDisplay.innerText = `Combo x${this.session.combo} 🔥`;
            comboDisplay.classList.remove('hidden');
            comboDisplay.classList.add('combo-animate');
            setTimeout(() => comboDisplay.classList.remove('combo-animate'), 500);
            
            // 增加金币
            db.addCoins(user.id, totalCoins);
            
        } else if (type === 'vague') {
            // 模糊 - 重置连击
            this.session.combo = 0;
            document.getElementById('combo-display').classList.add('hidden');
            
        } else {
            // 不认识 - 重置连击
            this.session.combo = 0;
            document.getElementById('combo-display').classList.add('hidden');
        }

        // 下一张卡片
        this.session.currentIndex++;
        this.renderCard();
    },

    /**
     * 完成学习
     */
    finish() {
        // 隐藏卡片
        document.getElementById('flashcard-inner').parentElement.classList.add('hidden');
        document.getElementById('learning-controls').classList.add('opacity-0', 'pointer-events-none');
        
        // 显示完成界面
        document.getElementById('learning-finished').classList.remove('hidden');
        document.getElementById('learning-total-coins').innerText = this.session.totalCoins;

        // 记录学习日志
        const user = auth.getCurrentUser();
        db.addLearningLog({
            studentId: user.id,
            teacherId: user.teacherId,
            learnedCount: this.session.learnedWords.length,
            reviewCount: 0,
            correctRate: 100,
            weakWord: '-',
            taskType: 'learn'
        });

        // 更新学生学习统计
        db.updateStudent(user.id, {
            totalLearned: user.totalLearned + this.session.learnedWords.length
        });

        // 更新当前用户数据
        auth.updateCurrentUser({
            coins: user.coins + this.session.totalCoins,
            totalLearned: user.totalLearned + this.session.learnedWords.length
        });

        // 显示庆祝动画
        helpers.createParticles(document.getElementById('view-learning'), 20);
    }
};
