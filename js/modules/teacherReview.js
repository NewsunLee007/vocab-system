/**
 * 新纪元英语词汇系统 - 教师审核模块
 * 
 * 功能：
 * 1. 教师审核AI生成的配套练习句子
 * 2. 保存审核通过的句子到教师个人账户
 * 3. 复用已审核的句子（当教师再次调取相同词表时）
 * 4. 支持对已保存句子的再次审核和修改
 */

const teacherReview = {
    // 当前审核状态
    state: {
        currentWordlistId: null,
        currentWord: null,
        currentIndex: 0,
        words: [],
        reviewedSentences: {},
        isModified: false
    },

    // 审核状态常量
    REVIEW_STATUS: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        MODIFIED: 'modified'
    },

    /**
     * 初始化审核会话
     * @param {string} wordlistId - 词表ID
     * @param {Array} words - 单词列表
     * @param {string} grade - 年级信息
     */
    initReviewSession(wordlistId, words, grade = 'middle') {
        this.state.currentWordlistId = wordlistId;
        this.state.words = words;
        this.state.currentIndex = 0;
        this.state.isModified = false;
        
        const user = auth.getCurrentUser();
        
        // 尝试加载已保存的审核记录
        const savedReview = this.loadReviewedSentences(wordlistId, user.id);
        
        if (savedReview && savedReview.sentences) {
            // 有已保存的审核记录，加载它
            this.state.reviewedSentences = savedReview.sentences;
            
            // 检查是否有新增单词
            words.forEach(word => {
                if (!this.state.reviewedSentences[word]) {
                    // 新增单词，生成新句子
                    this.state.reviewedSentences[word] = this.generateNewSentenceData(word, grade);
                }
            });
        } else {
            // 没有保存记录，为所有单词生成句子
            this.state.reviewedSentences = {};
            words.forEach(word => {
                this.state.reviewedSentences[word] = this.generateNewSentenceData(word, grade);
            });
        }
        
        return this.state;
    },

    /**
     * 使用AI生成的素材初始化审核会话
     * @param {string} wordlistId - 词表ID
     * @param {Array} words - 单词列表
     * @param {string} grade - 年级信息
     * @param {Object} materials - AI生成的素材
     */
    initReviewSessionWithMaterials(wordlistId, words, grade = 'middle', materials) {
        this.state.currentWordlistId = wordlistId;
        this.state.words = words;
        this.state.currentIndex = 0;
        this.state.isModified = true;
        this.state.reviewedSentences = {};
        
        // 使用AI生成的素材创建审核数据
        materials.context.forEach((item, idx) => {
            const word = item.word;
            this.state.reviewedSentences[word] = {
                word: word,
                sentence: item.sentence,
                meaning: materials.flashcard?.[idx]?.meaning || '',
                pos: sentenceGenerator.parsePartOfSpeech(materials.flashcard?.[idx]?.meaning || ''),
                phonetic: materials.flashcard?.[idx]?.phonetic || `/${word}/`,
                options: item.options,
                correctIndex: item.correctIndex,
                status: this.REVIEW_STATUS.PENDING,
                createdAt: Date.now(),
                modifiedAt: Date.now(),
                isFromAIMaterials: true
            };
        });
        
        // 自动保存到数据库
        this.saveReviewedSentences();
        
        return this.state;
    },

    /**
     * 生成新句子数据
     * @param {string} word - 单词
     * @param {string} grade - 年级
     * @returns {Object} 句子数据
     */
    generateNewSentenceData(word, grade) {
        // 优先从词库获取
        const wordData = db.findWord(word.toLowerCase());
        
        // 使用新的例句生成器
        const generated = sentenceGenerator.generateSentence(
            word, 
            wordData?.meaning || '', 
            grade
        );
        
        return {
            word: word,
            sentence: generated.sentence,
            meaning: wordData?.meaning || generated.meaning || '',
            pos: generated.pos || 'noun',
            phonetic: wordData?.phonetic || `/${word}/`,
            options: wordData?.options || this.generateDefaultOptions(word, generated.pos),
            correctIndex: wordData?.answerIndex || 0,
            status: this.REVIEW_STATUS.PENDING,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            isGenerated: true
        };
    },

    /**
     * 生成默认选项
     * @param {string} word - 单词
     * @param {string} pos - 词性
     * @returns {Array} 选项数组
     */
    generateDefaultOptions(word, pos) {
        // 获取同词性的其他单词作为干扰项
        const allWords = db.getAllWords ? db.getAllWords() : [];
        const distractors = allWords
            .filter(w => {
                if (w.word.toLowerCase() === word.toLowerCase()) return false;
                const wPos = sentenceGenerator.parsePartOfSpeech(w.meaning);
                return wPos === pos;
            })
            .slice(0, 3)
            .map(w => w.word);
        
        // 确保有4个选项
        while (distractors.length < 3) {
            distractors.push(`option${distractors.length + 1}`);
        }
        
        const options = [word, ...distractors];
        // 随机打乱
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        
        return options;
    },

    /**
     * 获取当前单词的审核数据
     * @returns {Object} 当前单词数据
     */
    getCurrentWordData() {
        const word = this.state.words[this.state.currentIndex];
        return this.state.reviewedSentences[word];
    },

    /**
     * 移动到下一个单词
     */
    nextWord() {
        if (this.state.currentIndex < this.state.words.length - 1) {
            this.state.currentIndex++;
            // 重新渲染界面
            const container = document.getElementById('ai-pane-verify');
            if (container) {
                this.renderReviewInterface(container);
            }
            return this.getCurrentWordData();
        }
        return null;
    },

    /**
     * 移动到上一个单词
     */
    previousWord() {
        if (this.state.currentIndex > 0) {
            this.state.currentIndex--;
            // 重新渲染界面
            const container = document.getElementById('ai-pane-verify');
            if (container) {
                this.renderReviewInterface(container);
            }
            return this.getCurrentWordData();
        }
        return null;
    },

    /**
     * 跳转到指定单词
     * @param {number} index - 索引
     */
    goToWord(index) {
        if (index >= 0 && index < this.state.words.length) {
            this.state.currentIndex = index;
            return this.getCurrentWordData();
        }
        return null;
    },

    /**
     * 审核通过当前句子
     * @param {string} notes - 审核备注（可选）
     */
    approveCurrent(notes = '') {
        const word = this.state.words[this.state.currentIndex];
        const data = this.state.reviewedSentences[word];
        
        data.status = this.REVIEW_STATUS.APPROVED;
        data.reviewedAt = Date.now();
        data.reviewNotes = notes;
        data.reviewerId = auth.getCurrentUser().id;
        
        this.state.isModified = true;
        
        // 自动保存
        this.saveReviewedSentences();
        
        // 显示成功提示
        if (typeof helpers !== 'undefined' && helpers.showToast) {
            helpers.showToast('审核通过', 'success');
        }
        
        // 自动跳转到下一个（如果还有）
        if (this.state.currentIndex < this.state.words.length - 1) {
            this.nextWord();
        } else {
            // 已经是最后一个，重新渲染显示完成状态
            const container = document.getElementById('ai-pane-verify');
            if (container) {
                this.renderReviewInterface(container);
            }
            if (typeof helpers !== 'undefined' && helpers.showToast) {
                helpers.showToast('所有单词已审核完成！', 'success');
            }
        }
        
        return data;
    },

    /**
     * 拒绝当前句子
     * @param {string} reason - 拒绝原因
     */
    async rejectCurrent(reason = '') {
        const word = this.state.words[this.state.currentIndex];
        const data = this.state.reviewedSentences[word];
        
        data.status = this.REVIEW_STATUS.REJECTED;
        data.reviewedAt = Date.now();
        data.rejectReason = reason;
        data.reviewerId = auth.getCurrentUser().id;
        
        this.state.isModified = true;
        
        // 自动生成新句子替换
        await this.regenerateCurrentSentence();
        
        return data;
    },

    /**
     * 修改当前句子
     * @param {Object} updates - 修改内容
     */
    modifyCurrent(updates) {
        const word = this.state.words[this.state.currentIndex];
        const data = this.state.reviewedSentences[word];
        
        // 应用修改
        if (updates.sentence) data.sentence = updates.sentence;
        if (updates.meaning) data.meaning = updates.meaning;
        if (updates.phonetic) data.phonetic = updates.phonetic;
        if (updates.options) data.options = updates.options;
        if (updates.correctIndex !== undefined) data.correctIndex = updates.correctIndex;
        
        data.status = this.REVIEW_STATUS.MODIFIED;
        data.modifiedAt = Date.now();
        data.modifiedBy = auth.getCurrentUser().id;
        
        this.state.isModified = true;
        
        // 自动保存
        this.saveReviewedSentences();
        
        return data;
    },

    /**
     * 重新生成当前句子 - 调用AI服务
     */
    async regenerateCurrentSentence() {
        const word = this.state.words[this.state.currentIndex];
        const grade = this.getGradeFromWordlist(this.state.currentWordlistId);
        
        // 显示加载状态
        const container = document.getElementById('ai-pane-verify');
        if (container) {
            container.innerHTML = `
                <div class="bg-white rounded-2xl shadow-lg p-6 text-center">
                    <div class="w-12 h-12 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-spinner fa-spin text-xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-800 mb-2">正在重新生成...</h3>
                    <p class="text-sm text-slate-500">AI正在为 "${word}" 生成新的例句</p>
                </div>
            `;
        }
        
        try {
            // 调用AI服务重新生成
            const material = await aiSentenceService.regenerateWord(word, grade);
            
            // 构建新的句子数据
            const newData = {
                word: word,
                sentence: material.context.sentence,
                meaning: material.matching.meaning,
                pos: sentenceGenerator.parsePartOfSpeech(material.matching.meaning),
                phonetic: material.spelling.phonetic,
                options: material.context.options,
                correctIndex: material.context.correctIndex,
                status: this.REVIEW_STATUS.PENDING,
                regeneratedFrom: {
                    sentence: this.state.reviewedSentences[word]?.sentence,
                    regeneratedAt: Date.now()
                },
                isGenerated: true
            };
            
            this.state.reviewedSentences[word] = newData;
            this.state.isModified = true;
            
            // 重新渲染界面
            if (container) {
                this.renderReviewInterface(container);
            }
            
            // 显示成功提示
            if (typeof helpers !== 'undefined' && helpers.showToast) {
                helpers.showToast('已重新生成例句', 'success');
            }
            
            return newData;
        } catch (error) {
            console.error('重新生成失败:', error);
            
            // 使用备用方案
            const newData = this.generateNewSentenceData(word, grade);
            newData.status = this.REVIEW_STATUS.PENDING;
            newData.regeneratedFrom = {
                sentence: this.state.reviewedSentences[word]?.sentence,
                regeneratedAt: Date.now()
            };
            
            this.state.reviewedSentences[word] = newData;
            this.state.isModified = true;
            
            // 重新渲染界面
            if (container) {
                this.renderReviewInterface(container);
            }
            
            if (typeof helpers !== 'undefined' && helpers.showToast) {
                helpers.showToast('使用备用方案生成例句', 'warning');
            }
            
            return newData;
        }
    },

    /**
     * 从词表获取年级信息
     * @param {string} wordlistId - 词表ID
     * @returns {string} 年级
     */
    getGradeFromWordlist(wordlistId) {
        const wordlist = db.findWordList(wordlistId);
        if (wordlist && wordlist.grade) {
            return wordlist.grade;
        }
        return 'middle';
    },

    /**
     * 保存审核过的句子到教师账户
     */
    saveReviewedSentences() {
        const user = auth.getCurrentUser();
        if (!user) return false;
        
        const wordlist = db.findWordList(this.state.currentWordlistId);
        
        const reviewData = {
            wordlistId: this.state.currentWordlistId,
            wordlistTitle: wordlist?.title || '',
            teacherId: user.id,
            teacherName: user.name,
            sentences: this.state.reviewedSentences,
            wordCount: this.state.words.length,
            approvedCount: this.getApprovedCount(),
            modifiedAt: Date.now(),
            version: 1
        };
        
        // 使用db模块保存
        db.saveTeacherReviewedSentences(user.id, this.state.currentWordlistId, reviewData);
        
        this.state.isModified = false;
        return true;
    },

    /**
     * 加载已审核的句子
     * @param {string} wordlistId - 词表ID
     * @param {string} teacherId - 教师ID
     * @returns {Object|null} 审核数据
     */
    loadReviewedSentences(wordlistId, teacherId) {
        return db.getTeacherReviewedSentences(teacherId, wordlistId);
    },

    /**
     * 获取已审核的句子数量
     * @returns {number} 数量
     */
    getApprovedCount() {
        let count = 0;
        Object.values(this.state.reviewedSentences).forEach(data => {
            if (data.status === this.REVIEW_STATUS.APPROVED || 
                data.status === this.REVIEW_STATUS.MODIFIED) {
                count++;
            }
        });
        return count;
    },

    /**
     * 获取审核进度
     * @returns {Object} 进度信息
     */
    getReviewProgress() {
        const total = this.state.words.length;
        const approved = this.getApprovedCount();
        const pending = total - approved;
        
        return {
            total: total,
            approved: approved,
            pending: pending,
            percentage: total > 0 ? Math.round((approved / total) * 100) : 0,
            currentIndex: this.state.currentIndex,
            currentWord: this.state.words[this.state.currentIndex]
        };
    },

    /**
     * 批量审核通过
     * @param {Array} words - 要批量审核的单词列表
     */
    batchApprove(words) {
        const user = auth.getCurrentUser();
        
        words.forEach(word => {
            if (this.state.reviewedSentences[word]) {
                this.state.reviewedSentences[word].status = this.REVIEW_STATUS.APPROVED;
                this.state.reviewedSentences[word].reviewedAt = Date.now();
                this.state.reviewedSentences[word].reviewerId = user.id;
            }
        });
        
        this.state.isModified = true;
        this.saveReviewedSentences();
    },

    /**
     * 获取所有已审核的句子（用于发布任务）
     * @returns {Array} 句子列表
     */
    getAllApprovedSentences() {
        const result = [];
        
        this.state.words.forEach(word => {
            const data = this.state.reviewedSentences[word];
            if (data && (data.status === this.REVIEW_STATUS.APPROVED || 
                         data.status === this.REVIEW_STATUS.MODIFIED)) {
                result.push(data);
            }
        });
        
        return result;
    },

    /**
     * 检查是否可以发布
     * @returns {boolean} 是否可以发布
     */
    canPublish() {
        const progress = this.getReviewProgress();
        // 至少80%的句子需要通过审核才能发布
        return progress.percentage >= 80;
    },

    /**
     * 导出审核报告
     * @returns {Object} 审核报告
     */
    exportReviewReport() {
        const wordlist = db.findWordList(this.state.currentWordlistId);
        const progress = this.getReviewProgress();
        
        return {
            wordlistId: this.state.currentWordlistId,
            wordlistTitle: wordlist?.title || '',
            generatedAt: Date.now(),
            progress: progress,
            sentences: this.state.reviewedSentences,
            quality: this.calculateOverallQuality()
        };
    },

    /**
     * 计算整体质量分数
     * @returns {number} 质量分数
     */
    calculateOverallQuality() {
        let totalScore = 0;
        let count = 0;
        
        Object.values(this.state.reviewedSentences).forEach(data => {
            const score = sentenceGenerator.calculateQualityScore({
                sentence: data.sentence,
                meaning: data.meaning,
                pos: data.pos
            });
            totalScore += score;
            count++;
        });
        
        return count > 0 ? Math.round(totalScore / count) : 0;
    },

    /**
     * 渲染审核界面
     * @param {HTMLElement} container - 容器元素
     */
    renderReviewInterface(container) {
        if (!container) return;
        
        const currentData = this.getCurrentWordData();
        const progress = this.getReviewProgress();
        
        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <!-- 进度条 -->
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm text-slate-600">审核进度</span>
                        <span class="text-sm font-bold text-indigo-600">${progress.approved}/${progress.total}</span>
                    </div>
                    <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div class="h-full bg-indigo-500 transition-all duration-300" style="width: ${progress.percentage}%"></div>
                    </div>
                </div>
                
                <!-- 单词导航 -->
                <div class="flex items-center justify-between mb-6">
                    <button onclick="teacherReview.previousWord()" 
                        class="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition ${progress.currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
                        <i class="fa-solid fa-chevron-left mr-1"></i>上一个
                    </button>
                    <span class="text-lg font-bold text-slate-800">
                        ${progress.currentIndex + 1} / ${progress.total}
                    </span>
                    <button onclick="teacherReview.nextWord()" 
                        class="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition ${progress.currentIndex === progress.total - 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                        下一个<i class="fa-solid fa-chevron-right ml-1"></i>
                    </button>
                </div>
                
                <!-- 当前单词信息 -->
                <div class="bg-slate-50 rounded-xl p-6 mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h3 class="text-2xl font-bold text-slate-800">${currentData.word}</h3>
                            <span class="text-slate-500">${currentData.phonetic}</span>
                        </div>
                        <span class="px-3 py-1 rounded-full text-sm font-medium ${this.getStatusBadgeClass(currentData.status)}">
                            ${this.getStatusLabel(currentData.status)}
                        </span>
                    </div>
                    <div class="text-slate-700 mb-4">${currentData.meaning}</div>
                    
                    <!-- 例句编辑 -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-slate-600 mb-2">语境例句</label>
                        <textarea id="review-sentence" class="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" rows="3">${currentData.sentence}</textarea>
                    </div>
                    
                    <!-- 选项编辑 -->
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        ${currentData.options.map((opt, idx) => `
                            <div class="flex items-center">
                                <span class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold mr-2">${String.fromCharCode(65 + idx)}</span>
                                <input type="text" id="review-opt-${idx}" value="${opt}" class="flex-1 border border-slate-300 rounded-lg p-2 text-sm">
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- 正确答案 -->
                    <div class="flex items-center mb-4">
                        <label class="text-sm text-slate-600 mr-3">正确答案:</label>
                        <select id="review-correct-index" class="border border-slate-300 rounded-lg p-2 text-sm">
                            ${currentData.options.map((_, idx) => `
                                <option value="${idx}" ${idx === currentData.correctIndex ? 'selected' : ''}>${String.fromCharCode(65 + idx)}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                
                <!-- 操作按钮 -->
                <div class="flex space-x-3 mb-4">
                    <button onclick="teacherReview.approveCurrent()" class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition">
                        <i class="fa-solid fa-check mr-2"></i>审核通过
                    </button>
                    <button onclick="teacherReview.modifyCurrentFromUI()" class="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition">
                        <i class="fa-solid fa-pen mr-2"></i>保存修改
                    </button>
                    <button onclick="teacherReview.regenerateCurrentSentence()" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition">
                        <i class="fa-solid fa-rotate mr-2"></i>重新生成
                    </button>
                </div>
                
                <!-- 快捷操作 -->
                <div class="flex justify-between items-center pt-4 border-t border-slate-200">
                    <button onclick="teacherReview.batchApproveAll()" class="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-sm font-semibold rounded-lg transition">
                        <i class="fa-solid fa-check-double mr-1"></i>一键通过所有
                    </button>
                    <button onclick="teacherReview.switchAITab('publish')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">
                        进入发布<i class="fa-solid fa-arrow-right ml-1"></i>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * 从UI获取修改并保存
     */
    modifyCurrentFromUI() {
        const sentence = document.getElementById('review-sentence')?.value;
        const correctIndex = parseInt(document.getElementById('review-correct-index')?.value || '0');
        const options = [];
        
        for (let i = 0; i < 4; i++) {
            const opt = document.getElementById(`review-opt-${i}`)?.value;
            if (opt) options.push(opt);
        }
        
        this.modifyCurrent({
            sentence: sentence,
            options: options,
            correctIndex: correctIndex
        });
        
        // 重新渲染界面以更新状态
        const container = document.getElementById('ai-pane-verify');
        if (container) {
            this.renderReviewInterface(container);
        }
        
        // 显示成功提示
        if (typeof helpers !== 'undefined' && helpers.showToast) {
            helpers.showToast('修改已保存', 'success');
        }
    },

    /**
     * 获取状态标签样式
     * @param {string} status - 状态
     * @returns {string} CSS类
     */
    getStatusBadgeClass(status) {
        const classes = {
            [this.REVIEW_STATUS.PENDING]: 'bg-slate-100 text-slate-600',
            [this.REVIEW_STATUS.APPROVED]: 'bg-emerald-100 text-emerald-700',
            [this.REVIEW_STATUS.REJECTED]: 'bg-rose-100 text-rose-700',
            [this.REVIEW_STATUS.MODIFIED]: 'bg-amber-100 text-amber-700'
        };
        return classes[status] || classes[this.REVIEW_STATUS.PENDING];
    },

    /**
     * 获取状态标签文本
     * @param {string} status - 状态
     * @returns {string} 标签文本
     */
    getStatusLabel(status) {
        const labels = {
            [this.REVIEW_STATUS.PENDING]: '待审核',
            [this.REVIEW_STATUS.APPROVED]: '已通过',
            [this.REVIEW_STATUS.REJECTED]: '已拒绝',
            [this.REVIEW_STATUS.MODIFIED]: '已修改'
        };
        return labels[status] || '待审核';
    },

    /**
     * 检查词表是否有已审核的句子
     * @param {string} wordlistId - 词表ID
     * @param {string} teacherId - 教师ID
     * @returns {boolean} 是否有已审核句子
     */
    hasReviewedSentences(wordlistId, teacherId) {
        const saved = this.loadReviewedSentences(wordlistId, teacherId);
        return saved && saved.sentences && Object.keys(saved.sentences).length > 0;
    },

    /**
     * 获取已审核句子的统计信息
     * @param {string} teacherId - 教师ID
     * @returns {Object} 统计信息
     */
    getReviewStatistics(teacherId) {
        const allReviews = db.getAllTeacherReviewedSentences(teacherId);
        
        let totalWordlists = 0;
        let totalWords = 0;
        let totalApproved = 0;
        
        Object.values(allReviews).forEach(review => {
            totalWordlists++;
            totalWords += review.wordCount || 0;
            totalApproved += review.approvedCount || 0;
        });
        
        return {
            totalWordlists: totalWordlists,
            totalWords: totalWords,
            totalApproved: totalApproved,
            averageApprovalRate: totalWords > 0 ? Math.round((totalApproved / totalWords) * 100) : 0
        };
    },

    /**
     * 一键通过所有核验
     */
    batchApproveAll() {
        // 确认对话框
        if (!confirm('确定要一键通过所有素材的核验吗？\n\n通过后可直接进入发布环节。')) {
            return;
        }
        
        // 批量审核通过
        Object.keys(this.state.reviewedSentences).forEach(word => {
            this.state.reviewedSentences[word].status = this.REVIEW_STATUS.APPROVED;
            this.state.reviewedSentences[word].reviewedAt = Date.now();
            this.state.reviewedSentences[word].reviewerId = auth.getCurrentUser()?.id;
            this.state.reviewedSentences[word].isBatchApproved = true;
        });
        
        this.state.isModified = true;
        this.saveReviewedSentences();
        
        // 刷新显示
        const container = document.getElementById('ai-pane-verify');
        if (container) {
            this.renderReviewInterface(container);
        }
        
        // 显示成功提示
        if (typeof helpers !== 'undefined' && helpers.showToast) {
            helpers.showToast(`已批量通过 ${Object.keys(this.state.reviewedSentences).length} 个素材的核验！`, 'success');
        }
        
        // 自动切换到发布标签
        setTimeout(() => {
            this.switchAITab('publish');
        }, 500);
    },

    /**
     * 切换到指定标签
     */
    switchAITab(tab) {
        if (typeof teacher !== 'undefined' && teacher.switchAITab) {
            teacher.switchAITab(tab);
        }
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = teacherReview;
}
