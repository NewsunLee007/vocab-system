/**
 * 新纪元英语词汇系统 - 疯狂动物城游戏模块
 * 
 * 功能：
 * 1. 与主系统词库联动
 * 2. 游戏积分同步到学生账户
 * 3. 支持按单元/词表选择单词
 */

const zootopiaGame = {
    // 游戏配置
    config: {
        wordsPerGame: 12,      // 每局游戏单词数
        baseScore: 10,         // 基础分数
        streakBonus: 5,        // 连击奖励
        timeBonus: 2,          // 时间奖励系数
    },

    // 当前游戏状态
    state: {
        isPlaying: false,
        currentWordlist: null,
        score: 0,
        correctCount: 0,
        streak: 0,
        startTime: null,
        words: []
    },

    /**
     * 初始化游戏
     * @param {string} wordlistId - 词表ID（可选）
     */
    init(wordlistId = null) {
        // 获取可用的词表
        const wordlists = db.getWordLists();
        
        if (wordlistId) {
            this.state.currentWordlist = db.findWordList(wordlistId);
        } else {
            // 默认使用第一个词表
            this.state.currentWordlist = wordlists[0] || null;
        }

        // 准备游戏单词
        this.prepareGameWords();
        
        return this.state;
    },

    /**
     * 准备游戏单词
     */
    prepareGameWords() {
        let words = [];
        
        if (this.state.currentWordlist && this.state.currentWordlist.words) {
            // 从词表中获取单词
            words = this.state.currentWordlist.words.map((word, index) => {
                const wordData = db.findWord(word.toLowerCase());
                return {
                    id: index + 1,
                    en: word,
                    cn: wordData?.meaning || word,
                    tag: this.getWordTag(wordData),
                    phonetic: wordData?.phonetic || ''
                };
            });
        } else {
            // 使用默认单词
            words = this.getDefaultWords();
        }

        // 随机选择指定数量的单词
        this.state.words = this.shuffleArray(words).slice(0, this.config.wordsPerGame);
    },

    /**
     * 获取单词标签
     */
    getWordTag(wordData) {
        if (!wordData || !wordData.meaning) return 'General';
        
        const meaning = wordData.meaning.toLowerCase();
        if (meaning.includes('动物') || meaning.includes('兽')) return 'Animal';
        if (meaning.includes('食物') || meaning.includes('吃')) return 'Food';
        if (meaning.includes('职业') || meaning.includes('师') || meaning.includes('员')) return 'Job';
        if (meaning.includes('交通') || meaning.includes('车')) return 'City';
        if (meaning.includes('物品') || meaning.includes('器')) return 'Item';
        return 'General';
    },

    /**
     * 获取默认单词
     */
    getDefaultWords() {
        return [
            {id: 1, en: "Police", cn: "警察", tag: "Job"},
            {id: 2, en: "Fox", cn: "狐狸", tag: "Animal"},
            {id: 3, en: "Car", cn: "汽车", tag: "Item"},
            {id: 4, en: "Badge", cn: "徽章", tag: "Item"},
            {id: 5, en: "Rabbit", cn: "兔子", tag: "Animal"},
            {id: 6, en: "Carrot", cn: "胡萝卜", tag: "Food"},
            {id: 7, en: "Mayor", cn: "市长", tag: "Job"},
            {id: 8, en: "Traffic", cn: "交通", tag: "City"},
            {id: 9, en: "Ticket", cn: "罚单", tag: "Item"},
            {id: 10, en: "Detective", cn: "侦探", tag: "Job"},
            {id: 11, en: "Donut", cn: "甜甜圈", tag: "Food"},
            {id: 12, en: "Predator", cn: "食肉动物", tag: "Animal"}
        ];
    },

    /**
     * 打乱数组
     */
    shuffleArray(array) {
        return [...array].sort(() => Math.random() - 0.5);
    },

    /**
     * 开始游戏
     */
    startGame() {
        this.state.isPlaying = true;
        this.state.score = 0;
        this.state.correctCount = 0;
        this.state.streak = 0;
        this.state.startTime = Date.now();
        
        return this.state;
    },

    /**
     * 计算得分
     * @param {boolean} isCorrect - 是否答对
     * @param {number} timeSpent - 花费时间（秒）
     */
    calculateScore(isCorrect, timeSpent) {
        if (!isCorrect) {
            this.state.streak = 0;
            return 0;
        }

        this.state.correctCount++;
        this.state.streak++;

        // 基础分 + 连击奖励 + 时间奖励
        let score = this.config.baseScore;
        score += Math.min(this.state.streak * this.config.streakBonus, 50); // 最高50连击奖励
        score += Math.max(0, Math.floor((10 - timeSpent) * this.config.timeBonus)); // 时间奖励

        this.state.score += score;
        return score;
    },

    /**
     * 结束游戏并同步积分
     */
    endGame() {
        this.state.isPlaying = false;
        
        // 同步积分到学生账户
        this.syncScoreToStudent();
        
        return {
            score: this.state.score,
            correctCount: this.state.correctCount,
            totalWords: this.state.words.length,
            accuracy: Math.round((this.state.correctCount / this.state.words.length) * 100)
        };
    },

    /**
     * 同步积分到学生账户
     */
    syncScoreToStudent() {
        const user = auth.getCurrentUser();
        if (user && user.role === 'student') {
            // 计算获得的星级
            let stars = 1;
            const accuracy = this.state.correctCount / this.state.words.length;
            if (accuracy === 1) stars = 3;
            else if (accuracy >= 0.8) stars = 2;
            
            // 计算金币奖励
            const coins = RewardSystem.calculateGameReward(stars);
            
            // 发放奖励
            if (coins > 0) {
                RewardSystem.grantReward(user.id, coins, `闯关挑战 · ${stars}星奖励`);
            }
            
            // 更新导航栏显示
            const student = db.findStudent(user.id);
            if (student) {
                app.updateStudentNav(student);
                
                // 记录学习日志
                db.addLearningLog({
                    studentId: user.id,
                    type: 'game',
                    wordlistId: this.state.currentWordlist?.id || null,
                    score: this.state.score,
                    coins: coins,
                    correctCount: this.state.correctCount,
                    totalCount: this.state.words.length,
                    timestamp: Date.now()
                });
                
                console.log(`游戏积分已同步: +${coins} 金币`);
            }
        }
    },

    /**
     * 获取可用的词表列表
     */
    getAvailableWordlists() {
        return db.getWordLists().map(wl => ({
            id: wl.id,
            title: wl.title,
            wordCount: wl.words.length,
            grade: wl.grade
        }));
    },

    /**
     * 切换词表
     */
    switchWordlist(wordlistId) {
        this.state.currentWordlist = db.findWordList(wordlistId);
        this.prepareGameWords();
        return this.state.words;
    },

    /**
     * 获取游戏单词
     */
    getGameWords() {
        return this.state.words;
    },

    /**
     * 获取当前状态
     */
    getState() {
        return { ...this.state };
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = zootopiaGame;
}
