/**
 * 新纪元英语词汇系统 - 语境选择测试模块
 * 场景语境选择：锻炼结合上下文推断词义的能力
 */

const contextTest = {
    // 会话状态
    session: {
        words: [],
        currentIndex: 0,
        score: 0,
        answers: [],
        weakWords: [],
        onComplete: null,
        questionIds: [],
        teacherId: null,
        wordlistId: null,
        studentId: null
    },
    gradeLevel: 'middle',
    setGradeLevel(level) {
        const allowed = ['primary', 'middle', 'high'];
        this.gradeLevel = allowed.includes(level) ? level : 'middle';
    },

    /**
     * 开始测试
     */
    start(words, onComplete, options = {}) {
        // 重置智能洗牌的位置追踪器
        if (typeof aiSentenceService !== 'undefined') {
            aiSentenceService.resetPositionTracker();
        }
        
        this.session.words = helpers.shuffle([...words]);
        this.session.currentIndex = 0;
        this.session.score = 0;
        this.session.answers = [];
        this.session.weakWords = [];
        this.session.onComplete = onComplete;
        this.session.questionIds = [];
        this.session.teacherId = options.teacherId || null;
        this.session.wordlistId = options.wordlistId || null;
        this.session.studentId = options.studentId || (typeof student !== 'undefined' && student.currentUser?.id);

        // 显示测试视图
        this.showTestView();
        this.renderQuestion();
    },

    /**
     * 显示测试视图
     */
    showTestView() {
        const viewHtml = `
            <div id="context-test-view" class="fixed inset-0 bg-slate-50 z-[100] flex flex-col">
                <!-- 头部 -->
                <div class="bg-white shadow-sm px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
                    <button onclick="contextTest.saveAndExit()" class="text-slate-500 hover:text-slate-800 transition flex items-center">
                        <i class="fa-solid fa-floppy-disk mr-1 sm:mr-2"></i><span class="hidden sm:inline">保存退出</span>
                    </button>
                    <div class="text-xs sm:text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                        语境选择 <span id="context-progress">1/${this.session.words.length}</span>
                    </div>
                    <button onclick="contextTest.pause()" class="text-slate-500 hover:text-amber-600 transition flex items-center">
                        <i class="fa-solid fa-pause mr-1 sm:mr-2"></i><span class="hidden sm:inline">暂停</span>
                    </button>
                </div>

                <!-- 进度条 -->
                <div class="w-full h-1 bg-slate-200">
                    <div id="context-progress-bar" class="h-full bg-indigo-500 transition-all duration-300" style="width: 0%"></div>
                </div>

                <!-- 主要内容 -->
                <div class="flex-1 flex items-center justify-center p-4">
                    <div class="w-full max-w-2xl">
                        <!-- 题目卡片 -->
                        <div class="bg-white rounded-2xl shadow-lg p-4 sm:p-8 mb-4 sm:mb-6">
                            <div class="text-slate-400 font-medium text-xs sm:text-sm mb-4 flex items-center">
                                <i class="fa-solid fa-book-open mr-1 sm:mr-2 text-indigo-400"></i>
                                阅读句子，选择最合适的单词填空
                            </div>
                            
                            <!-- 句子 -->
                            <div id="context-sentence" class="text-lg sm:text-xl md:text-2xl font-medium text-slate-800 leading-relaxed mb-6 sm:mb-8 break-words">
                                <!-- JS注入 -->
                            </div>

                            <!-- 选项 -->
                            <div id="context-options" class="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                                <!-- JS注入 -->
                            </div>

                            <!-- 反馈 -->
                            <div id="context-feedback" class="hidden mt-6 p-4 rounded-xl">
                                <!-- JS注入 -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', viewHtml);
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
        const question = this.generateQuestion(word);

        // 更新进度
        const progress = ((this.session.currentIndex / this.session.words.length) * 100);
        document.getElementById('context-progress').innerText = 
            `${this.session.currentIndex + 1}/${this.session.words.length}`;
        document.getElementById('context-progress-bar').style.width = `${progress}%`;

        // 渲染句子（挖空）
        const sentenceHtml = question.sentence.replace(
            '___',
            '<span class="inline-block border-b-4 border-indigo-300 w-24 mx-1 text-center text-indigo-600 font-bold">?</span>'
        );
        document.getElementById('context-sentence').innerHTML = sentenceHtml;

        // 渲染选项
        const optionsContainer = document.getElementById('context-options');
        optionsContainer.innerHTML = '';

        question.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'context-option w-full text-center px-6 py-5 rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-800 font-bold text-xl transition group';
            btn.innerHTML = `
                <span class="inline-block w-10 h-10 rounded-full bg-slate-100 text-slate-500 text-center leading-10 mr-3 group-hover:bg-indigo-200 group-hover:text-indigo-700 transition text-lg">
                    ${String.fromCharCode(65 + index)}
                </span>
                <span>${option.word}</span>
            `;
            btn.onclick = () => this.checkAnswer(index, question.correctIndex, word, option);
            optionsContainer.appendChild(btn);
        });

        // 隐藏反馈
        document.getElementById('context-feedback').classList.add('hidden');
    },

    /**
     * 生成题目
     * 使用词库中的真实例句和预定义选项
     * 优先使用教师审核过的句子
     */
    generateQuestion(word) {
        // 获取单词数据
        let wordData = db.findWord(word);
        
        // 检查是否有教师审核过的句子
        let teacherReviewData = null;
        const wl = (typeof taskEngine !== 'undefined' && taskEngine.state?.wordlist) || (typeof testEngine !== 'undefined' && testEngine.state?.wordlist) || (typeof student !== 'undefined' && student.currentWordlistId ? db.findWordList(student.currentWordlistId) : null);
        if (wl && wl.id) {
            const teacherReview = db.getTeacherReviewedSentences(wl.teacherId || 'system', wl.id);
            if (teacherReview && teacherReview.sentences && teacherReview.sentences[word]) {
                const reviewedSentence = teacherReview.sentences[word];
                // 只使用已审核或已修改的句子
                if (reviewedSentence.status === 'approved' || reviewedSentence.status === 'modified') {
                    teacherReviewData = reviewedSentence;
                }
            }
        }
        
        // 如果有教师审核过的句子，优先使用
        if (teacherReviewData) {
            let sentence = teacherReviewData.sentence;
            // 确保例句中有填空位置
            if (!sentence.includes('___')) {
                sentence = sentence.replace(new RegExp(`\\b${word}\\b`, 'gi'), '___');
            }
            
            // 使用审核过的选项
            let options = [];
            let correctIndex = 0;
            
            if (teacherReviewData.options && teacherReviewData.options.length >= 4) {
                options = teacherReviewData.options.map(opt => ({ word: opt }));
                correctIndex = teacherReviewData.correctIndex || 0;
                
                // 保存到题库并跟踪ID
                const teacherId = this.session.teacherId || wl?.teacherId;
                const wordlistId = this.session.wordlistId || wl?.id;
                if (teacherId && wordlistId) {
                    const plainOptions = teacherReviewData.options;
                    const qid = db.saveQuestionToBank(teacherId, wordlistId, word, {
                        options: plainOptions,
                        correctIndex: correctIndex,
                        meaning: teacherReviewData.meaning,
                        sentence: sentence,
                        type: 'context'
                    });
                    this.session.questionIds.push(qid);
                }
            } else {
                // 如果没有选项，生成默认选项
                const generated = this.generateSmartOptions(word, wordData || { meaning: teacherReviewData.meaning }, 
                    teacherReviewData.pos || 'noun');
                options = generated.options;
                correctIndex = generated.correctIndex;
            }
            
            return {
                sentence: sentence,
                options: options,
                correctIndex: correctIndex,
                wordData: {
                    word: word,
                    meaning: teacherReviewData.meaning,
                    phonetic: teacherReviewData.phonetic,
                    sentence: sentence
                },
                isFromTeacherReview: true
            };
        }
        
        // 如果没有教师审核数据，使用原有逻辑
        // 如果没有数据，生成有意义的默认数据
        if (!wordData) {
            wordData = this.generateSmartDefaultData(word);
        }

        // 使用词库中的例句
        let sentence = wordData.sentence || wordData.example;
        
        // 确保例句中有填空位置
        if (!sentence) {
            // 没有例句，使用新的例句生成器
            const grade = wl?.grade || 'middle';
            const generated = sentenceGenerator.generateSentence(word, wordData.meaning, grade);
            sentence = generated.sentence;
        }
        
        // 如果例句中没有___，需要将单词替换为___
        if (!sentence.includes('___')) {
            // 尝试替换单词为填空（不区分大小写）
            const lowerWord = word.toLowerCase();
            const lowerSentence = sentence.toLowerCase();
            const index = lowerSentence.indexOf(lowerWord);
            
            if (index !== -1) {
                // 找到单词位置，替换为___
                sentence = sentence.substring(0, index) + '___' + sentence.substring(index + word.length);
            } else {
                // 单词不在例句中，使用新的例句生成器
                const grade = wl?.grade || 'middle';
                const generated = sentenceGenerator.generateSentence(word, wordData.meaning, grade);
                sentence = generated.sentence;
            }
        }

        // 期望词性基于句型进行检测
        const parsed = this.parseMeaning(wordData.meaning);
        const targetPos = this.normalizePos(parsed.posShort);
        const expectedPos = this.detectExpectedPos(sentence);
        const actualPos = targetPos || this.detectPosFromMeaning(wordData.meaning);

        if (!this.validateContextSentence(sentence, (wordData.meaning || '').toLowerCase())) {
            const grade = wl?.grade || 'middle';
            const generated = sentenceGenerator.generateSentence(word, wordData.meaning, grade);
            sentence = generated.sentence;
        } else if (expectedPos && actualPos && expectedPos !== actualPos) {
            const grade = wl?.grade || 'middle';
            const generated = sentenceGenerator.generateSentence(word, wordData.meaning, grade);
            sentence = generated.sentence;
        }

        // 使用预定义的选项，如果没有则智能生成
        let options, correctIndex, plainOptions = [];
        if (wordData.options && wordData.options.length >= 4 && wordData.answerIndex !== undefined) {
            // 使用预定义选项
            options = wordData.options.map((opt, idx) => {
                return { word: opt };
            });
            plainOptions = wordData.options;
            correctIndex = wordData.answerIndex;
        } else {
            // 智能生成选项
            const generated = this.generateSmartOptions(word, wordData, targetPos || expectedPos || actualPos);
            options = generated.options.map(o => ({ word: o.word }));
            plainOptions = generated.options.map(o => o.word);
            correctIndex = generated.correctIndex;
        }
        
        // 保存到题库
        const teacherId = this.session.teacherId || wl?.teacherId;
        const wordlistId = this.session.wordlistId || wl?.id;
        if (teacherId && wordlistId && plainOptions.length >= 4) {
            const qid = db.saveQuestionToBank(teacherId, wordlistId, word, {
                options: plainOptions,
                correctIndex: correctIndex,
                meaning: wordData.meaning,
                sentence: sentence,
                type: 'context'
            });
            this.session.questionIds.push(qid);
        }

        return {
            sentence: sentence,
            options: options,
            correctIndex: correctIndex,
            wordData: wordData
        };
    },

    detectPosFromMeaning(meaning) {
        const m = (meaning || '').toLowerCase();
        if (m.startsWith('v.') || m.includes(' 动词')) return 'verb';
        if (m.startsWith('n.') || m.includes(' 名词')) return 'noun';
        if (m.startsWith('adj.') || m.includes(' 形容词')) return 'adj';
        if (m.startsWith('adv.') || m.includes(' 副词')) return 'adv';
        if (m.startsWith('prep.') || m.includes(' 介词')) return 'prep';
        return null;
    },

    detectExpectedPos(sentence) {
        const s = (sentence || '').toLowerCase();
        if (/can you (please )?___/.test(s) || /\bto ___\b/.test(s) || /\bshould ___\b/.test(s)) return 'verb';
        if (/\bis very ___\b/.test(s) || /\bquite ___\b/.test(s) || /\bso ___\b/.test(s)) return 'adj';
        if (/\b___ the\b/.test(s) || /\b(in|on|at|under|over|through) ___\b/.test(s)) return 'prep';
        if (/\bthe ___\b/.test(s) || /\ba ___\b/.test(s) || /\ban ___\b/.test(s)) return 'noun';
        return null;
    },
    
    parseMeaning(meaning) {
        if (!meaning) return { posShort: null, cn: '' };
        const m = meaning.trim();
        const match = m.match(/^([a-z]+)\.\s*(.+)$/i);
        if (match) return { posShort: match[1].toLowerCase(), cn: match[2] };
        return { posShort: null, cn: m };
    },
    
    normalizePos(short) {
        if (!short) return null;
        const map = { n: 'noun', v: 'verb', adj: 'adj', adv: 'adv', prep: 'prep' };
        return map[short] || null;
    },

    generateSentenceByPos(word, pos) {
        const grade = this.gradeLevel || 'middle';
        const templates = {
            noun: {
                primary: [`This ___ is in the box.`],
                middle: [`The ___ of the city is very beautiful.`],
                high: [`The sudden ___ sparked a heated debate among scholars.`]
            },
            verb: {
                primary: [`Please ___ the door.`],
                middle: [`Can you please ___ the door?`],
                high: [`We must ___ the risks before proceeding.`]
            },
            adj: {
                primary: [`This book is very ___ .`],
                middle: [`The weather is very ___ today.`],
                high: [`His remarks were strikingly ___ and thought-provoking.`]
            },
            prep: {
                primary: [`The book is ___ the table.`],
                middle: [`He arrived ___ time for the meeting.`],
                high: [`Ideas spread ___ the community rapidly.`]
            }
        };
        const groups = templates[pos] || templates.noun;
        const tpl = helpers.shuffle([...groups[grade]])[0];
        return tpl;
    },

    /**
     * 生成智能默认数据
     */
    generateSmartDefaultData(word) {
        // 根据单词特征生成合理的默认数据
        const defaultDataMap = {
            'routine': {
                meaning: 'n. 常规；日常事务',
                sentence: 'Doing morning exercises is part of his daily ___.',
                options: ['routine', 'festival', 'library', 'instrument'],
                answerIndex: 0
            },
            'geography': {
                meaning: 'n. 地理(学)',
                sentence: 'In our ___ class, we learn about mountains and rivers.',
                options: ['history', 'math', 'geography', 'music'],
                answerIndex: 2
            },
            'instrument': {
                meaning: 'n. 乐器；工具',
                sentence: 'The piano is a beautiful musical ___.',
                options: ['animal', 'instrument', 'clothes', 'subject'],
                answerIndex: 1
            },
            'exercise': {
                meaning: 'n. 锻炼；练习 v. 锻炼',
                sentence: 'Swimming is good ___. It helps me stay healthy.',
                options: ['exercise', 'homework', 'housework', 'cooking'],
                answerIndex: 0
            },
            'festival': {
                meaning: 'n. 节日',
                sentence: 'The Spring Festival is the most important ___ in China.',
                options: ['festival', 'weekend', 'morning', 'season'],
                answerIndex: 0
            },
            'ready': {
                meaning: 'adj. 准备好(做某事)的',
                sentence: 'Are you ___ for the test tomorrow?',
                options: ['ready', 'happy', 'sorry', 'afraid'],
                answerIndex: 0
            },
            'textbook': {
                meaning: 'n. 教科书；课本',
                sentence: 'Please bring your ___ to class every day.',
                options: ['textbook', 'lunch', 'friend', 'homework'],
                answerIndex: 0
            },
            'hold': {
                meaning: 'v. 拿；握；举办',
                sentence: 'Can you ___ this bag for me?',
                options: ['hold', 'see', 'eat', 'buy'],
                answerIndex: 0
            },
            'junior high': {
                meaning: 'n. 初中',
                sentence: 'He is a student at a ___ school.',
                options: ['primary', 'junior high', 'high', 'college'],
                answerIndex: 1
            },
            'problem': {
                meaning: 'n. 问题；难题',
                sentence: 'I have a ___ with my homework.',
                options: ['problem', 'book', 'friend', 'teacher'],
                answerIndex: 0
            }
        };

        const lowerWord = word.toLowerCase();
        if (defaultDataMap[lowerWord]) {
            return {
                word: word,
                phonetic: `/${word}/`,
                ...defaultDataMap[lowerWord]
            };
        }

        // 根据单词生成合理的例句
        const sentence = this.generateContextSentence(word, '');
        
        return {
            word: word,
            phonetic: `/${word}/`,
            meaning: 'n. 单词',
            sentence: sentence,
            options: this.generateSmartOptions(word, { meaning: '' }).options.map(o => o.word),
            answerIndex: this.generateSmartOptions(word, { meaning: '' }).correctIndex
        };
    },

    /**
     * 生成语境例句（带填空）- 完全基于原始词表数据，带年级匹配度和可读性验证
     */
    generateContextSentence(word, meaning) {
        // 首先获取原始词表中的完整数据
        const originalWordData = db.findWord(word.toLowerCase());
        
        // 提取原始词表中的关键信息
        let originalMeaning = '';
        let originalPos = '';
        let originalSentence = '';
        
        if (originalWordData) {
            originalMeaning = originalWordData.meaning || originalWordData.chinese || '';
            originalPos = this.detectPosFromMeaning(originalMeaning) || this.detectPosFromMeaning(meaning);
            originalSentence = originalWordData.sentence || originalWordData.example || '';
        }
        
        // 优先使用原始词表中的例句，并进行年级匹配度和可读性验证
        if (originalSentence && this.isValidSentence(originalSentence)) {
            // 进行年级匹配度和可读性验证
            if (this.validateGradeLevel(originalSentence, this.gradeLevel)) {
                // 将原词替换为填空
                const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
                let filledSentence = originalSentence.replace(wordRegex, '___');
                
                // 确保只有一个填空
                const blankCount = (filledSentence.match(/___/g) || []).length;
                if (blankCount === 1) {
                    return filledSentence;
                }
            }
        }
        
        // 如果没有合适的原始例句，基于词性和中文含义生成
        const grade = this.gradeLevel || 'middle';
        const pos = originalPos || this.detectPosFromMeaning(meaning) || 'noun';
        const chineseHint = originalMeaning || meaning || '';
        
        // 基于词性和中文含义生成完整句子
        return this.generateSentenceFromPosAndMeaning(word, pos, chineseHint, grade);
    },
    
    /**
     * 验证是否为完整句子（不是短语）
     */
    isValidSentence(text) {
        if (!text || text.length < 10) return false;
        
        // 必须包含主谓结构的基本特征
        const hasSubject = /\\b(he|she|it|they|we|you|I|the|a|an)\\b/i.test(text);
        const hasVerb = /\\b(is|are|was|were|has|have|had|will|would|can|could|should|may|might|do|does|did)\\b/i.test(text) || 
                       /\\b(\\w+ing|\\w+ed|\\w+s)\\b/i.test(text);
        
        // 必须以句号、问号或感叹号结尾
        const hasProperEnding = /[.!?]\\s*$/.test(text);
        
        // 长度检查（完整句子通常比短语长）
        const wordCount = text.split(/\\s+/).length;
        
        return hasProperEnding && wordCount >= 4 && (hasSubject || hasVerb);
    },
    
    /**
     * 基于词性和中文含义生成完整句子 - 带语义忠实性和场景优先约束
     */
    generateSentenceFromPosAndMeaning(word, pos, chineseMeaning, grade) {
        // 首先验证语义忠实性
        if (!this.validateSemanticFidelity(word, chineseMeaning, pos)) {
            // 如果语义不忠实，使用更保守的生成方式
            return this.generateConservativeSentence(word, pos, grade);
        }
        
        // 根据词性和中文含义生成语境，考虑场景优先级
        const sentencePatterns = this.getContextualSentencePatterns(word, pos, chineseMeaning, grade);
        
        // 选择最适合当前场景的句子模板
        const selectedPattern = this.selectOptimalContext(sentencePatterns, word, chineseMeaning, grade);
        
        // 验证场景适用性
        if (!this.validateContextualAppropriateness(selectedPattern, grade)) {
            // 如果场景不合适，重新选择
            const alternativePatterns = sentencePatterns.filter(p => this.validateContextualAppropriateness(p, grade));
            if (alternativePatterns.length > 0) {
                const alt = alternativePatterns[Math.floor(Math.random() * alternativePatterns.length)];
                return this.replaceChinesePlaceholder(alt, chineseMeaning);
            }
        }
        
        // 替换中文含义为目标词（兼容模板占位符）
        return this.replaceChinesePlaceholder(selectedPattern, chineseMeaning);
    },
    
    /**
     * 将模板中的中文含义占位替换为“___”
     * 支持三种占位方式：{CN} | chineseMeaning | 实际中文含义文本
     */
    replaceChinesePlaceholder(pattern, chineseMeaning) {
        if (!pattern) return pattern;
        // 1) 明确占位符 {CN}
        if (pattern.includes('{CN}')) {
            return pattern.replace(/\{CN\}/g, '___');
        }
        // 2) 兼容字符串 chineseMeaning
        if (pattern.includes('chineseMeaning')) {
            return pattern.replace(/chineseMeaning/g, '___');
        }
        // 3) 尝试用真实中文含义替换
        if (chineseMeaning && chineseMeaning.trim()) {
            // 转义正则特殊字符
            const escaped = chineseMeaning.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            try {
                const replaced = pattern.replace(new RegExp(escaped, 'g'), '___');
                if (replaced !== pattern) return replaced;
            } catch (e) {
                // 忽略正则错误，进入兜底逻辑
            }
        }
        // 4) 兜底：如果模板中没有空格位，则在合理位置追加
        return pattern.includes('___') ? pattern : `${pattern.replace(/[.!?]\s*$/, '')} ___.`;
    },

    /**
     * 验证语义忠实性
     */
    validateSemanticFidelity(word, chineseMeaning, pos) {
        if (!word || !chineseMeaning || !pos) return false;
        
        // 检查词性是否匹配中文含义
        const posChineseMapping = {
            noun: ['名词', '人', '物', '地方', '概念', '想法'],
            verb: ['动词', '做', '行动', '移动', '变化'],
            adjective: ['形容词', '描述', '特征', '性质'],
            adverb: ['副词', '方式', '程度', '时间', '地点'],
            preposition: ['介词', '在', '从', '到', '关于']
        };
        
        const expectedKeywords = posChineseMapping[pos] || [];
        const hasValidMapping = expectedKeywords.some(keyword => chineseMeaning.includes(keyword));
        
        // 检查是否有明显的语义冲突
        const semanticConflicts = [
            { word: 'happy', forbidden: ['悲伤', '难过', '痛苦'] },
            { word: 'fast', forbidden: ['缓慢', '慢'] },
            { word: 'big', forbidden: ['小', '微小'] },
            { word: 'hot', forbidden: ['冷', '寒冷'] }
        ];
        
        const conflict = semanticConflicts.find(c => word.toLowerCase().includes(c.word));
        if (conflict && conflict.forbidden.some(forbidden => chineseMeaning.includes(forbidden))) {
            return false;
        }
        
        return hasValidMapping || chineseMeaning.length > 2; // 至少有一些中文描述
    },
    
    /**
     * 获取带场景优先级的句子模板
     */
    getContextualSentencePatterns(word, pos, chineseMeaning, grade) {
        // 根据年级和词性获取基础模板
        const basePatterns = this.getBaseSentencePatterns(pos, grade);
        
        // 根据中文含义选择最相关的场景
        const relevantContexts = this.identifyRelevantContexts(chineseMeaning, grade);
        
        // 生成带场景优先级的模板
        const contextualPatterns = [];
        
        relevantContexts.forEach(context => {
            const contextTemplates = this.getContextSpecificTemplates(context, pos, grade);
            contextualPatterns.push(...contextTemplates);
        });
        
        // 如果没有找到合适的场景，返回基础模板
        return contextualPatterns.length > 0 ? contextualPatterns : basePatterns;
    },
    
    /**
     * 识别相关场景
     */
    identifyRelevantContexts(chineseMeaning, grade) {
        const contexts = [];
        
        // 学校场景
        const schoolKeywords = ['学生', '老师', '教室', '学习', '作业', '考试', '课本', '知识'];
        if (schoolKeywords.some(keyword => chineseMeaning.includes(keyword))) {
            contexts.push('school');
        }
        
        // 家庭场景
        const familyKeywords = ['家', '父母', '兄弟姐妹', '房子', '房间', '家人'];
        if (familyKeywords.some(keyword => chineseMeaning.includes(keyword))) {
            contexts.push('family');
        }
        
        // 日常生活场景
        const dailyKeywords = ['食物', '衣服', '天气', '时间', '朋友', '游戏', '运动'];
        if (dailyKeywords.some(keyword => chineseMeaning.includes(keyword))) {
            contexts.push('daily');
        }
        
        // 根据年级调整场景优先级
        if (grade === 'primary') {
            // 小学生优先家庭和学校场景
            return contexts.length > 0 ? contexts : ['family', 'school', 'daily'];
        } else if (grade === 'middle') {
            // 中学生优先学校和日常场景
            return contexts.length > 0 ? contexts : ['school', 'daily', 'family'];
        } else {
            // 高中生可以更广泛
            return contexts.length > 0 ? contexts : ['daily', 'school', 'social'];
        }
    },
    
    /**
     * 获取场景特定的模板
     */
    getContextSpecificTemplates(context, pos, grade) {
        const contextTemplates = {
            school: {
                primary: {
                    noun: [`The ${'chineseMeaning'} is in our classroom.`, `My teacher likes this ${'chineseMeaning'}.`],
                    verb: [`We ${'chineseMeaning'} in class every day.`, `Students ${'chineseMeaning'} after school.`],
                    adjective: [`This ${'chineseMeaning'} book is fun to read.`, `Our classroom is ${'chineseMeaning'} and bright.`]
                },
                middle: {
                    noun: [`The ${'chineseMeaning'} helps students learn better.`, `Teachers use ${'chineseMeaning'} to explain concepts.`],
                    verb: [`Students should ${'chineseMeaning'} regularly to improve.`, `We ${'chineseMeaning'} systematically in our studies.`],
                    adjective: [`The ${'chineseMeaning'} approach makes learning easier.`, `Her ${'chineseMeaning'} explanation clarified the topic.`]
                },
                high: {
                    noun: [`The theoretical ${'chineseMeaning'} underpins modern pedagogy.`, `Contemporary ${'chineseMeaning'} reflects educational trends.`],
                    verb: [`Students must ${'chineseMeaning'} critically to succeed academically.`, `The ability to ${'chineseMeaning'} distinguishes excellent students.`],
                    adjective: [`The fundamentally ${'chineseMeaning'} nature of education requires analysis.`, `Scholars consider this ${'chineseMeaning'} perspective essential.`]
                }
            },
            family: {
                primary: {
                    noun: [`My family has a ${'chineseMeaning'} at home.`, `The ${'chineseMeaning'} belongs to my sister.`],
                    verb: [`We ${'chineseMeaning'} together on weekends.`, `My parents ${'chineseMeaning'} every evening.`],
                    adjective: [`Our home is ${'chineseMeaning'} and comfortable.`, `My room looks ${'chineseMeaning'} after cleaning.`]
                },
                middle: {
                    noun: [`The ${'chineseMeaning'} strengthens family bonds.`, `Families value ${'chineseMeaning'} in their daily lives.`],
                    verb: [`Family members ${'chineseMeaning'} to support each other.`, `We ${'chineseMeaning'} traditions from generation to generation.`],
                    adjective: [`The ${'chineseMeaning'} atmosphere promotes harmony.`, `Her ${'chineseMeaning'} attitude benefits everyone.`]
                },
                high: {
                    noun: [`The sociological ${'chineseMeaning'} influences family dynamics.`, `Contemporary ${'chineseMeaning'} reflects changing family structures.`],
                    verb: [`Families must ${'chineseMeaning'} adaptively to societal changes.`, `The capacity to ${'chineseMeaning'} demonstrates familial resilience.`],
                    adjective: [`The inherently ${'chineseMeaning'} characteristics define family identity.`, `Scholars analyze ${'chineseMeaning'} elements in family systems.`]
                }
            },
            daily: {
                primary: {
                    noun: [`People use ${'chineseMeaning'} every day.`, `The ${'chineseMeaning'} helps us in daily life.`],
                    verb: [`We ${'chineseMeaning'} regularly to stay healthy.`, `People ${'chineseMeaning'} to make life better.`],
                    adjective: [`Daily life becomes ${'chineseMeaning'} with good habits.`, `The ${'chineseMeaning'} routine improves our day.`]
                },
                middle: {
                    noun: [`The ${'chineseMeaning'} facilitates daily activities.`, `Modern life requires ${'chineseMeaning'} for efficiency.`],
                    verb: [`Individuals ${'chineseMeaning'} systematically throughout their day.`, `We ${'chineseMeaning'} purposefully to achieve daily goals.`],
                    adjective: [`The ${'chineseMeaning'} approach simplifies daily tasks.`, `Her ${'chineseMeaning'} method saves time and energy.`]
                },
                high: {
                    noun: [`The phenomenological ${'chineseMeaning'} shapes daily experiences.`, `Contemporary ${'chineseMeaning'} reflects lifestyle evolution.`],
                    verb: [`Humans ${'chineseMeaning'} complexly within daily social frameworks.`, `The tendency to ${'chineseMeaning'} reveals behavioral patterns.`],
                    adjective: [`The fundamentally ${'chineseMeaning'} nature of daily life requires examination.`, `Scholars study ${'chineseMeaning'} aspects of routine existence.`]
                }
            }
        };
        
        const templates = contextTemplates[context] && contextTemplates[context][grade] && contextTemplates[context][grade][pos];
        return templates || [];
    },
    
    /**
     * 选择最优场景上下文
     */
    selectOptimalContext(patterns, word, chineseMeaning, grade) {
        if (patterns.length === 0) return this.generateConservativeSentence(word, 'noun', grade);
        
        // 评分每个模板的适用性
        const scoredPatterns = patterns.map(pattern => {
            let score = 0;
            
            // 长度适宜性评分
            const wordCount = pattern.split(/\s+/).length;
            const optimalLength = grade === 'primary' ? 8 : grade === 'middle' ? 12 : 15;
            const lengthScore = Math.max(0, 10 - Math.abs(wordCount - optimalLength));
            score += lengthScore;
            
            // 词汇复杂度评分
            const complexWords = this.identifyComplexWords(pattern.split(/\s+/));
            const complexityScore = Math.max(0, 10 - complexWords.length * 2);
            score += complexityScore;
            
            // 场景相关性评分
            const relevanceScore = this.calculateContextualRelevance(pattern, chineseMeaning);
            score += relevanceScore;
            
            return { pattern, score };
        });
        
        // 选择评分最高的模板
        scoredPatterns.sort((a, b) => b.score - a.score);
        return scoredPatterns[0].pattern;
    },
    
    /**
     * 计算场景相关性
     */
    calculateContextualRelevance(pattern, chineseMeaning) {
        // 简单的相关性计算
        const commonWords = ['the', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with'];
        const patternWords = pattern.toLowerCase().split(/\s+/).filter(word => !commonWords.includes(word));
        
        // 如果模板中包含中文含义的关键词，认为更相关
        if (patternWords.some(word => chineseMeaning.toLowerCase().includes(word))) {
            return 5;
        }
        
        return 0;
    },
    
    /**
     * 验证场景适宜性
     */
    validateContextualAppropriateness(sentence, grade) {
        // 检查是否包含不当内容
        const inappropriateContent = [
            'violence', 'weapon', 'drug', 'alcohol', 'adult', 'politics',
            'religion', 'death', 'dying', 'kill', 'murder', 'war'
        ];
        
        if (inappropriateContent.some(content => sentence.toLowerCase().includes(content))) {
            return false;
        }
        
        // 根据年级检查内容复杂度
        if (grade === 'primary') {
            // 小学生内容应该简单、积极
            const primaryInappropriate = ['complex', 'theoretical', 'philosophical', 'existential'];
            if (primaryInappropriate.some(word => sentence.toLowerCase().includes(word))) {
                return false;
            }
        }
        
        return true;
    },
    
    /**
     * 生成保守的句子（当其他方法失败时）
     */
    generateConservativeSentence(word, pos, grade) {
        const conservativeTemplates = {
            primary: {
                noun: `This is a good ${word}.`,
                verb: `We can ${word} here.`,
                adjective: `This is very ${word}.`
            },
            middle: {
                noun: `The ${word} is important for students.`,
                verb: `Students should ${word} carefully.`,
                adjective: `This ${word} concept helps us learn.`
            },
            high: {
                noun: `The ${word} represents a significant concept.`,
                verb: `Students must ${word} systematically to succeed.`,
                adjective: `This ${word} principle underlies the theory.`
            }
        };
        
        const templates = conservativeTemplates[grade] || conservativeTemplates.middle;
        const template = templates[pos] || templates.noun;
        
        return template.replace(new RegExp(word, 'g'), '___');
    },
    
    /**
     * 验证句子是否符合指定年级的可读性标准
     * 使用Flesch-Kincaid评分系统
     */
    validateGradeLevel(sentence, grade) {
        if (!sentence || sentence.length < 10) return false;
        
        // 计算Flesch-Kincaid可读性评分
        const readabilityScore = this.calculateFleschKincaidScore(sentence);
        
        // 根据年级设置可读性标准
        const gradeStandards = {
            primary: {
                maxScore: 100,  // 非常容易
                minScore: 80,
                maxWordLength: 6,
                maxSentenceLength: 12
            },
            middle: {
                maxScore: 90,   // 容易到中等
                minScore: 60,
                maxWordLength: 10,
                maxSentenceLength: 20
            },
            high: {
                maxScore: 80,   // 中等到困难
                minScore: 30,
                maxWordLength: 15,
                maxSentenceLength: 25
            }
        };
        
        const standard = gradeStandards[grade] || gradeStandards.middle;
        
        // 基本可读性检查
        if (readabilityScore < standard.minScore || readabilityScore > standard.maxScore) {
            return false;
        }
        
        // 句子长度检查
        const words = sentence.split(/\s+/);
        if (words.length > standard.maxSentenceLength) {
            return false;
        }
        
        // 单词长度检查
        const longWords = words.filter(word => word.length > standard.maxWordLength);
        if (longWords.length > words.length * 0.1) { // 超过10%的单词过长
            return false;
        }
        
        // 复杂词汇检查
        const complexWords = this.identifyComplexWords(words);
        if (complexWords.length > words.length * 0.15) { // 超过15%的复杂词汇
            return false;
        }
        
        return true;
    },
    
    /**
     * 计算Flesch-Kincaid可读性评分
     */
    calculateFleschKincaidScore(sentence) {
        const words = sentence.split(/\s+/).filter(word => word.length > 0);
        const sentences = sentence.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        if (words.length === 0 || sentences.length === 0) return 0;
        
        // 计算音节数（简化版本）
        const syllables = words.reduce((total, word) => {
            return total + this.countSyllables(word);
        }, 0);
        
        // Flesch阅读容易度公式
        const score = 206.835 - (1.015 * (words.length / sentences.length)) - (84.6 * (syllables / words.length));
        
        return Math.max(0, Math.min(100, score)); // 限制在0-100范围内
    },
    
    /**
     * 计算单词音节数（简化版本）
     */
    countSyllables(word) {
        word = word.toLowerCase().replace(/[^a-z]/g, '');
        if (word.length === 0) return 0;
        
        const vowels = 'aeiouy';
        let syllableCount = 0;
        let previousWasVowel = false;
        
        for (let i = 0; i < word.length; i++) {
            const isVowel = vowels.includes(word[i]);
            if (isVowel && !previousWasVowel) {
                syllableCount++;
            }
            previousWasVowel = isVowel;
        }
        
        // 处理特殊情况
        if (word.endsWith('e') && syllableCount > 1) {
            syllableCount--;
        }
        
        return Math.max(1, syllableCount);
    },
    
    /**
     * 识别复杂词汇
     */
    identifyComplexWords(words) {
        const complexWords = [];
        const simpleWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must'
        ]);
        
        words.forEach(word => {
            const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
            if (cleanWord.length > 8 && !simpleWords.has(cleanWord)) {
                complexWords.push(word);
            }
        });
        
        return complexWords;
    },
    simplifySentence(sentence, word) {
        // 移除复杂从句
        sentence = sentence.replace(/, which[^,]+,/g, '');
        sentence = sentence.replace(/, where[^,]+,/g, '');
        sentence = sentence.replace(/, who[^,]+,/g, '');
        
        // 替换复杂词汇
        const simpleWords = {
            'therefore': 'so',
            'however': 'but',
            'furthermore': 'also',
            'moreover': 'also',
            'consequently': 'so',
            'nevertheless': 'but',
            'additionally': 'also',
            'specifically': 'clearly',
            'particularly': 'very',
            'especially': 'very'
        };
        
        Object.keys(simpleWords).forEach(complex => {
            sentence = sentence.replace(new RegExp(`\\b${complex}\\b`, 'gi'), simpleWords[complex]);
        });
        
        return sentence;
    },

    /**
     * 校验语境挖空句是否合理
     * 规则：包含一个且仅一个“___”；以句号或问号结尾；介词模板需有介词位置；避免过度简化模式
     */
    validateContextSentence(sentence, meaningLower) {
        const blanks = (sentence.match(/___/g) || []).length;
        if (blanks !== 1) return false;
        if (!/[.!?]\s*$/.test(sentence)) return false;
        if (meaningLower.includes('prep.') || meaningLower.includes('介词')) {
            // 介词应填在固定位置：the/at/in/on 等模式
            if (!/___\s(the|a|an|the)?/i.test(sentence) && !/(in|on|at|under|over|through)\s___/i.test(sentence)) {
                return false;
            }
        }
        return true;
    },

    /**
     * 获取基础句子模板
     */
    getBaseSentencePatterns(pos, grade) {
        const basePatterns = {
            noun: {
                primary: [
                    `The chineseMeaning is on the table.`,
                    `I like this chineseMeaning very much.`,
                    `We have a chineseMeaning in our classroom.`,
                    `That chineseMeaning is new and beautiful.`,
                    `My teacher showed us the chineseMeaning.`
                ],
                middle: [
                    `The chineseMeaning plays an important role in our daily life.`,
                    `Students should understand the significance of this chineseMeaning.`,
                    `The development of chineseMeaning has changed our world significantly.`,
                    `Many people are interested in learning about different chineseMeaning.`,
                    `The concept of chineseMeaning is fundamental to this subject.`
                ],
                high: [
                    `The theoretical framework surrounding chineseMeaning continues to evolve.`,
                    `Contemporary research on chineseMeaning has yielded fascinating insights.`,
                    `The implications of chineseMeaning extend far beyond initial expectations.`,
                    `Scholars have debated the nature of chineseMeaning for decades.`,
                    `The complexity inherent in chineseMeaning requires careful analysis.`
                ]
            },
            verb: {
                primary: [
                    `I chineseMeaning every day after school.`,
                    `We can chineseMeaning together in the playground.`,
                    `She likes to chineseMeaning with her friends.`,
                    `The teacher asks us to chineseMeaning carefully.`,
                    `They often chineseMeaning during break time.`
                ],
                middle: [
                    `Students should chineseMeaning regularly to improve their skills.`,
                    `The ability to chineseMeaning effectively is crucial for success.`,
                    `Many people find it challenging to chineseMeaning under pressure.`,
                    `We need to chineseMeaning systematically to achieve our goals.`,
                    `The process of chineseMeaning requires patience and dedication.`
                ],
                high: [
                    `The phenomenon of chineseMeaning has attracted significant academic attention.`,
                    `Researchers continue to explore the mechanisms underlying chineseMeaning.`,
                    `The capacity to chineseMeaning under diverse conditions demonstrates adaptability.`,
                    `Contemporary theories attempt to explain why individuals chineseMeaning differently.`,
                    `The evolution of chineseMeaning reflects broader societal changes.`
                ]
            },
            adjective: {
                primary: [
                    `This book is very chineseMeaning and interesting.`,
                    `The weather today is chineseMeaning and comfortable.`,
                    `Her room looks chineseMeaning and beautiful.`,
                    `The food tastes chineseMeaning and delicious.`,
                    `My new toy is chineseMeaning and fun to play with.`
                ],
                middle: [
                    `The situation became increasingly chineseMeaning as time passed.`,
                    `Students found the lecture both chineseMeaning and enlightening.`,
                    `The results were surprisingly chineseMeaning to most observers.`,
                    `Her approach proved remarkably chineseMeaning in solving the problem.`,
                    `The atmosphere in the classroom remained chineseMeaning throughout.`
                ],
                high: [
                    `The fundamentally chineseMeaning nature of this concept requires deeper examination.`,
                    `Contemporary discourse reveals increasingly chineseMeaning perspectives on this issue.`,
                    `The inherently chineseMeaning characteristics distinguish this phenomenon from others.`,
                    `Scholarly analysis suggests that chineseMeaning elements persist across contexts.`,
                    `The remarkably chineseMeaning implications continue to generate debate.`
                ]
            }
        };
        
        const patterns = basePatterns[pos] || basePatterns.noun;
        return patterns[grade] || patterns.middle;
    },
    
    /**
     * 生成智能选项 - 增强版
     * 确保干扰项与正确答案有相似性但又有区分度
     */
    generateSmartOptions(word, wordData, expectedPos) {
        const correct = {
            word: word,
            meaning: wordData.meaning || ''
        };

        // 获取所有单词
        const allWords = db.getAllWords ? db.getAllWords() : [];
        
        // 获取词性信息
        const wordPosMatch = wordData.meaning ? wordData.meaning.match(/^(\w+)\./) : null;
        const currentPos = wordPosMatch ? wordPosMatch[1] : (expectedPos || 'noun');
        
        // 智能筛选干扰项
        let distractors = [];
        
        // 1. 优先选择同词性但不同主题的词汇
        const sameCategory = allWords.filter(w => {
            if (w.word.toLowerCase() === word.toLowerCase()) return false;
            const wPos = w.meaning ? w.meaning.match(/^(\w+)\./) : null;
            if (expectedPos) {
                const map = { noun: 'n', verb: 'v', adj: 'adj', adv: 'adv', prep: 'prep' };
                const short = map[expectedPos];
                return wPos && wPos[1] && wPos[1].toLowerCase().startsWith(short);
            }
            return wordPosMatch && wPos && wordPosMatch[1] === wPos[1];
        });
        
        // 2. 根据年级选择不同难度的干扰项
        if (sameCategory.length > 0) {
            const grade = this.gradeLevel || 'middle';
            const difficultyFilter = {
                primary: w => w.word.length <= 6 && !w.word.includes('-'),
                middle: w => w.word.length <= 10,
                high: w => true
            };
            
            const filteredSameCategory = sameCategory.filter(difficultyFilter[grade]);
            if (filteredSameCategory.length >= 3) {
                distractors = helpers.shuffle(filteredSameCategory).slice(0, 3);
            }
        }
        
        // 3. 如果同词性词汇不足，选择不同词性但语义相关的词汇
        if (distractors.length < 3) {
            const differentCategory = allWords.filter(w => {
                if (w.word.toLowerCase() === word.toLowerCase()) return false;
                if (distractors.some(d => d.word === w.word)) return false;
                const wPos = w.meaning ? w.meaning.match(/^(\w+)\./) : null;
                return wordPosMatch && wPos && wordPosMatch[1] !== wPos[1];
            });
            
            if (differentCategory.length > 0) {
                const needed = 3 - distractors.length;
                const additional = helpers.shuffle(differentCategory).slice(0, needed);
                distractors.push(...additional);
            }
        }
        
        // 4. 如果仍然不足，使用随机但过滤的词汇
        if (distractors.length < 3) {
            const grade = this.gradeLevel || 'middle';
            const difficultyFilter = {
                primary: w => w.word.length <= 6 && !w.word.includes('-') && w.word.length > 2,
                middle: w => w.word.length <= 10 && w.word.length > 3,
                high: w => w.word.length > 3
            };
            
            const filteredRandom = allWords.filter(w => 
                w.word.toLowerCase() !== word.toLowerCase() &&
                !distractors.some(d => d.word === w.word) &&
                difficultyFilter[grade](w)
            );
            
            const needed = 3 - distractors.length;
            const randomDistractors = helpers.shuffle(filteredRandom).slice(0, needed);
            distractors.push(...randomDistractors);
        }

        // 确保有足够的干扰项
        while (distractors.length < 3) {
            distractors.push({
                word: 'option' + (distractors.length + 1),
                meaning: 'n. 选项'
            });
        }

        const options = [correct, ...distractors];
        const shuffledOptions = helpers.shuffle(options);
        const correctIndex = shuffledOptions.findIndex(o => 
            o.word.toLowerCase() === word.toLowerCase()
        );

        return { options: shuffledOptions, correctIndex };
    },

    /**
     * 检查答案
     */
    checkAnswer(selectedIndex, correctIndex, word, selectedOption) {
        const isCorrect = selectedIndex === correctIndex;
        const options = document.querySelectorAll('.context-option');

        // 禁用所有选项
        options.forEach(btn => {
            btn.onclick = null;
            btn.classList.add('cursor-not-allowed');
        });

        // 标记正确/错误
        if (isCorrect) {
            options[selectedIndex].classList.add('border-emerald-400', 'bg-emerald-50');
            options[selectedIndex].querySelector('span:first-child').classList.add('bg-emerald-200', 'text-emerald-700');
            this.session.score++;
        } else {
            options[selectedIndex].classList.add('border-rose-400', 'bg-rose-50');
            options[selectedIndex].querySelector('span:first-child').classList.add('bg-rose-200', 'text-rose-700');
            options[correctIndex].classList.add('border-emerald-400', 'bg-emerald-50');
            options[correctIndex].querySelector('span:first-child').classList.add('bg-emerald-200', 'text-emerald-700');
            this.session.weakWords.push(word);
        }

        // 记录答案
        this.session.answers.push({
            word: word,
            correct: isCorrect
        });

        // 显示反馈
        this.showFeedback(isCorrect, word);

        // 根据正误设置间隔时间
        setTimeout(() => {
            this.nextQuestion();
        }, isCorrect ? 800 : 2000);
    },

    /**
     * 显示反馈
     */
    showFeedback(isCorrect, word) {
        const feedback = document.getElementById('context-feedback');
        const wordData = db.findWord(word) || { word: word, meaning: '', phonetic: `/${word}/` };

        feedback.classList.remove('hidden', 'bg-emerald-50', 'bg-rose-50');

        if (isCorrect) {
            feedback.classList.add('bg-emerald-50');
            feedback.innerHTML = `
                <div class="flex items-center">
                    <span class="text-2xl mr-3">✅</span>
                    <div>
                        <div class="font-bold text-emerald-700">回答正确！</div>
                        <div class="text-sm text-emerald-600">
                            <span class="font-bold">${wordData.word}</span>
                            <span class="text-slate-400 mx-2">${wordData.phonetic || `/${word}/`}</span>
                            <span>${wordData.meaning || ''}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            feedback.classList.add('bg-rose-50');
            feedback.innerHTML = `
                <div class="flex items-center">
                    <span class="text-2xl mr-3">❌</span>
                    <div>
                        <div class="font-bold text-rose-700">回答错误</div>
                        <div class="text-sm text-rose-600">
                            正确答案是 <span class="font-bold">${wordData.word}</span>
                            <span class="text-slate-400 mx-2">${wordData.phonetic || `/${word}/`}</span>
                            <span>${wordData.meaning || ''}</span>
                        </div>
                    </div>
                </div>
            `;
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
     * 完成测试
     */
    finish() {
        const accuracy = Math.round((this.session.score / this.session.words.length) * 100);
        const coins = this.session.score * 10;

        // 记录测试历史
        if (this.session.questionIds.length > 0 && this.session.studentId && this.session.teacherId && this.session.wordlistId) {
            db.recordStudentTestHistory(
                this.session.studentId,
                this.session.teacherId,
                this.session.wordlistId,
                this.session.questionIds
            );
        }

        // 移除视图
        const view = document.getElementById('context-test-view');
        if (view) view.remove();

        // 回调结果
        if (this.session.onComplete) {
            this.session.onComplete({
                accuracy: accuracy,
                coins: coins,
                weakWords: this.session.weakWords,
                answers: this.session.answers
            });
        }
    },

    /**
     * 保存进度
     */
    saveProgress() {
        const progress = {
            currentIndex: this.session.currentIndex,
            score: this.session.score,
            weakWords: this.session.weakWords,
            answers: this.session.answers,
            words: this.session.words,
            savedAt: new Date().toISOString()
        };
        const key = `context_test_progress_${this.session.words.join('_')}`;
        helpers.memoryStore.set(key, progress);
    },

    /**
     * 保存并退出
     */
    saveAndExit() {
        this.saveProgress();
        
        // 更新统计数据（即使中途退出也记录已答对的题目）
        this.updateStats();
        
        const modalHtml = `
            <div id="save-exit-modal" class="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50">
                <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl m-4 text-center">
                    <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-check text-emerald-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">进度已保存</h3>
                    <p class="text-slate-500 mb-6">已完成 ${this.session.currentIndex}/${this.session.words.length} 题<br>答对 ${this.session.score} 题</p>
                    <div class="space-y-3">
                        <button onclick="contextTest.confirmExit()" class="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition">
                            退出检测
                        </button>
                        <button onclick="document.getElementById('save-exit-modal').remove()" class="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition">
                            继续检测
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
        
        const view = document.getElementById('context-test-view');
        if (view) view.remove();
        
        if (this.session.onComplete) {
            const accuracy = this.session.currentIndex > 0 
                ? Math.round((this.session.score / this.session.currentIndex) * 100) 
                : 0;
            this.session.onComplete({
                accuracy: accuracy,
                coins: this.session.score * 10,
                weakWords: this.session.weakWords,
                answers: this.session.answers,
                completed: this.session.currentIndex,
                total: this.session.words.length
            });
        }
    },

    /**
     * 更新统计数据
     */
    updateStats() {
        if (this.session.score > 0) {
            const user = auth.getCurrentUser();
            // 更新学习统计
            db.updateStudent(user.id, {
                totalTests: user.totalTests + 1,
                totalCorrect: user.totalCorrect + this.session.score,
                totalQuestions: user.totalQuestions + this.session.currentIndex
            });
            // 刷新当前用户数据
            auth.updateCurrentUser({
                totalTests: user.totalTests + 1,
                totalCorrect: user.totalCorrect + this.session.score,
                totalQuestions: user.totalQuestions + this.session.currentIndex
            });
        }
    },

    /**
     * 暂停
     */
    pause() {
        const modalHtml = `
            <div id="pause-modal" class="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50">
                <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl m-4 text-center">
                    <div class="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-pause text-amber-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">检测已暂停</h3>
                    <p class="text-slate-500 mb-6">休息一下，准备好再继续</p>
                    <button onclick="contextTest.resume()" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition">
                        <i class="fa-solid fa-play mr-2"></i>继续检测
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * 恢复检测
     */
    resume() {
        const modal = document.getElementById('pause-modal');
        if (modal) modal.remove();
    },

    /**
     * 退出测试（旧方法，保留兼容）
     */
    exit() {
        this.saveAndExit();
    }
};
