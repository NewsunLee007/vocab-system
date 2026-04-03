/**
 * 新纪元英语词汇系统 - AI例句生成服务
 * 
 * 功能：
 * 1. 调用AI生成高质量的单词例句
 * 2. 生成填空题选项（正确答案+干扰项）
 * 3. 支持重新生成单个单词的例句
 */

const aiSentenceService = {
    // 生成状态
    state: {
        isGenerating: false,
        progress: 0,
        currentWord: null,
        totalWords: 0,
        completedWords: 0
    },

    // 当前位置分布追踪器（用于平衡ABCD位置）
    _positionTracker: {
        context: [0, 0, 0, 0], // A,B,C,D 各位置正确次数
        matching: [0, 0, 0, 0]
    },

    /**
     * 智能位置平衡洗牌算法
     * 确保正确答案在各位置分布均匀，同时保持随机性
     * @param {Array} options - 选项数组（第一个为正确答案）
     * @param {string} type - 'context' 或 'matching'
     * @returns {Object} { options: 打乱后的选项, correctIndex: 正确答案新位置 }
     */
    smartShuffle(options, type = 'context') {
        if (options.length < 4) {
            return { options, correctIndex: 0 };
        }

        const correctAnswer = options[0];
        const distractors = options.slice(1);
        
        // 统计当前各位置的"负载"
        const tracker = this._positionTracker[type];
        const total = tracker.reduce((a, b) => a + b, 0) || 1;
        
        // 计算每个位置的目标概率（倾向于选择使用较少的位置）
        // 使用加权随机，给使用较少的位置更高权重
        const weights = tracker.map(count => Math.max(1, total - count));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        
        // 70%概率使用平衡算法，30%概率完全随机（保持一定随机性）
        let correctPosition;
        if (Math.random() < 0.7) {
            // 加权随机选择位置
            let random = Math.random() * totalWeight;
            for (let i = 0; i < weights.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    correctPosition = i;
                    break;
                }
            }
            if (correctPosition === undefined) correctPosition = Math.floor(Math.random() * 4);
        } else {
            // 完全随机
            correctPosition = Math.floor(Math.random() * 4);
        }
        
        // 更新追踪器
        tracker[correctPosition]++;
        
        // 构建新的选项数组
        const newOptions = [...distractors];
        
        // 将正确答案插入目标位置
        // Fisher-Yates 洗牌其他选项，但保证正确答案在指定位置
        for (let i = newOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newOptions[i], newOptions[j]] = [newOptions[j], newOptions[i]];
        }
        
        newOptions.splice(correctPosition, 0, correctAnswer);
        
        // 确保数组长度为4
        while (newOptions.length < 4) {
            newOptions.push('选项' + newOptions.length);
        }
        
        return {
            options: newOptions.slice(0, 4),
            correctIndex: correctPosition
        };
    },

    /**
     * 重置位置追踪器（每次开始新测试时调用）
     */
    resetPositionTracker() {
        this._positionTracker = {
            context: [0, 0, 0, 0],
            matching: [0, 0, 0, 0]
        };
    },

    /**
     * 获取位置分布统计
     */
    getPositionStats(type = 'context') {
        const tracker = this._positionTracker[type];
        const total = tracker.reduce((a, b) => a + b, 0) || 1;
        return {
            A: { count: tracker[0], percent: Math.round(tracker[0] / total * 100) },
            B: { count: tracker[1], percent: Math.round(tracker[1] / total * 100) },
            C: { count: tracker[2], percent: Math.round(tracker[2] / total * 100) },
            D: { count: tracker[3], percent: Math.round(tracker[3] / total * 100) }
        };
    },

    /**
     * 批量生成单词的例句和题目
     * @param {Array} words - 单词列表
     * @param {string} grade - 年级
     * @param {Function} onProgress - 进度回调
     * @returns {Object} 生成的材料
     */
    async generateMaterials(words, grade = 'middle', onProgress = null) {
        const aiConfig = db.getAIConfig();
        const useExternalAI = aiConfig.provider !== 'builtin' && aiConfig.apiKey;
        
        this.state.isGenerating = true;
        this.state.totalWords = words.length;
        this.state.completedWords = 0;
        
        // 重置位置追踪器，确保新生成的题目正确答案位置真正随机
        this.resetPositionTracker();
        
        const materials = {
            context: [],
            spelling: [],
            matching: [],
            flashcard: []
        };
        
        try {
            if (useExternalAI) {
                // 使用外部AI批量生成
                await this.generateWithExternalAI(words, grade, materials, onProgress);
            } else {
                // 使用内置引擎逐个生成
                await this.generateWithBuiltIn(words, grade, materials, onProgress);
            }
        } finally {
            this.state.isGenerating = false;
        }
        
        return materials;
    },

    /**
     * 使用外部AI批量生成
     */
    async generateWithExternalAI(words, grade, materials, onProgress) {
        const aiConfig = db.getAIConfig();
        const batchSize = 5; // 每批处理5个单词
        
        for (let i = 0; i < words.length; i += batchSize) {
            const batch = words.slice(i, i + batchSize);
            this.state.currentWord = batch[0];
            
            try {
                const batchResults = await this.callAIBatch(batch, grade, aiConfig);
                
                batchResults.forEach(result => {
                    // 强制打乱 context 选项顺序，确保随机分布
                    if (result.context && result.context.options) {
                        const correctWord = result.context.word;
                        let options = result.context.options;
                        
                        // 关键修复：确保正确答案在选项数组的第一位
                        // 先检查正确答案是否在选项中
                        const correctIndexInOriginal = options.indexOf(correctWord);
                        if (correctIndexInOriginal === -1) {
                            console.warn(`AI 返回的 context 选项中没有正确答案 "${correctWord}"，正在补充`);
                            const distractors = this.generateDistractors(correctWord, 'noun', '');
                            options = [correctWord, ...distractors];
                        } else {
                            // 把正确答案移到第一位
                            if (correctIndexInOriginal !== 0) {
                                options = [...options];
                                options.splice(correctIndexInOriginal, 1);
                                options.unshift(correctWord);
                            }
                        }
                        
                        // 检查并移除重复选项
                        const uniqueOptions = [...new Set(options.map(o => o.toLowerCase()))];
                        if (uniqueOptions.length < options.length) {
                            console.warn('AI 返回的 context 选项有重复，正在补充干扰项');
                            // 补充干扰项
                            const distractors = this.generateDistractors(correctWord, 'noun', '');
                            options = [correctWord, ...distractors];
                        }
                        
                        // 使用智能位置平衡洗牌算法
                        const shuffled = this.smartShuffle(options, 'context');
                        result.context.options = shuffled.options;
                        result.context.correctIndex = shuffled.correctIndex;
                    }
                    
                    // 强制打乱 matching 选项顺序
                    if (result.matching && result.matching.options) {
                        const correctMeaning = result.matching.meaning;
                        let options = result.matching.options;
                        
                        // 关键修复：确保正确答案在选项数组的第一位
                        const correctIndexInOriginal = options.indexOf(correctMeaning);
                        if (correctIndexInOriginal === -1) {
                            console.warn(`AI 返回的 matching 选项中没有正确答案 "${correctMeaning}"，正在补充`);
                            const distractors = this.generateMeaningDistractors(correctMeaning);
                            options = [correctMeaning, ...distractors];
                        } else {
                            // 把正确答案移到第一位
                            if (correctIndexInOriginal !== 0) {
                                options = [...options];
                                options.splice(correctIndexInOriginal, 1);
                                options.unshift(correctMeaning);
                            }
                        }
                        
                        // 检查无效选项（占位符、词性标注等）
                        const hasInvalidOptions = options.some(opt => this.isInvalidOption(opt));
                        if (hasInvalidOptions) {
                            console.warn('AI 返回的 matching 选项包含无效占位符，正在补充干扰项');
                            const distractors = this.generateMeaningDistractors(correctMeaning);
                            options = [correctMeaning, ...distractors];
                        } else {
                            // 检查并移除重复选项
                            const uniqueOptions = [...new Set(options)];
                            if (uniqueOptions.length < options.length) {
                                console.warn('AI 返回的 matching 选项有重复，正在补充干扰项');
                                const distractors = this.generateMeaningDistractors(correctMeaning);
                                options = [correctMeaning, ...distractors];
                            }
                        }
                        
                        // 使用智能位置平衡洗牌算法
                        const shuffled = this.smartShuffle(options, 'matching');
                        result.matching.options = shuffled.options;
                        result.matching.correctIndex = shuffled.correctIndex;
                    }
                    
                    materials.context.push(result.context);
                    materials.spelling.push(result.spelling);
                    materials.matching.push(result.matching);
                    materials.flashcard.push(result.flashcard);
                });
                
                this.state.completedWords += batch.length;
                this.state.progress = Math.round((this.state.completedWords / this.state.totalWords) * 100);
                
                if (onProgress) {
                    onProgress(this.state.progress, this.state.completedWords, this.state.totalWords);
                }
                
                // 添加延迟避免请求过快
                if (i + batchSize < words.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error('AI批量生成失败:', error);
                // 使用备用方案生成
                for (const word of batch) {
                    const fallback = this.generateFallback(word, grade);
                    materials.context.push(fallback.context);
                    materials.spelling.push(fallback.spelling);
                    materials.matching.push(fallback.matching);
                    materials.flashcard.push(fallback.flashcard);
                }
                this.state.completedWords += batch.length;
            }
        }
    },

    /**
     * 调用AI批量生成
     */
    async callAIBatch(words, grade, config) {
        const gradeDesc = {
            primary: '小学（1-6年级）',
            middle: '初中（7-9年级）',
            high: '高中（10-12年级）'
        }[grade] || '初中';
        
        const wordListStr = words.map(w => {
            const wordData = db.findWord(w.toLowerCase());
            return `${w}${wordData?.meaning ? ` (${wordData.meaning})` : ''}`;
        }).join('\n');
        
        const prompt = `请为以下${gradeDesc}英语单词生成学习材料。

单词列表：
${wordListStr}

要求：
1. 例句必须符合${gradeDesc}英语水平，使用常用词汇
2. 例句必须真实、自然、有语境
3. 干扰项必须与正确答案词性相同，但意思不同
4. 确保干扰项不会造成歧义
5. **重要**：正确答案必须随机分布在 A/B/C/D 四个选项中，不要总是放在第一个位置
6. correctIndex 表示正确答案在 options 数组中的索引（0=A, 1=B, 2=C, 3=D）
7. **关键**：options 数组中的4个选项必须完全不同，不能有任何重复！
   - matching 的 options（中文释义选项）必须4个完全不相同的释义
   - 每个选项应该是不同单词的释义，具有迷惑性但可区分
8. **禁止占位符**：选项内容必须是真实的中文释义，禁止使用以下形式：
   - 禁止 "n. 单词或短语"、"v. 动作" 等词性标注+占位符
   - 禁止 "干扰项1"、"干扰释义1" 等示例占位符
   - 禁止空白或无意义的内容
   - 每个选项必须是具体的中文含义，如 "苹果"、"快乐地"、"跑步"

请为每个单词返回以下JSON格式：
{
  "results": [
    {
      "word": "单词",
      "context": {
        "word": "单词",
        "sentence": "包含___的例句",
        "options": ["干扰项1", "正确选项", "干扰项2", "干扰项3"],
        "correctIndex": 1
      },
      "spelling": {
        "word": "单词",
        "phonetic": "/音标/",
        "audio": ""
      },
      "matching": {
        "word": "单词",
        "meaning": "中文释义",
        "options": ["干扰释义1", "正确释义", "干扰释义2", "干扰释义3"],
        "correctIndex": 1
      },
      "flashcard": {
        "word": "单词",
        "phonetic": "/音标/",
        "meaning": "中文释义",
        "sentence": "例句（不含填空）"
      }
    }
  ]
}`;

        const endpoint = config.endpoint || admin.AI_PROVIDERS[config.provider]?.defaultEndpoint;

        // 通过后端代理请求，避免 CORS 问题
        const response = await fetch('/api/ai/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                endpoint,
                apiKey: config.apiKey,
                model: config.model || 'qwen-turbo',
                messages: [
                    { 
                        role: 'system', 
                        content: config.systemPrompt || '你是一位专业的英语教育专家，擅长为不同年级学生设计英语练习题。' 
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: config.temperature ?? 0.7,
                max_tokens: config.maxTokens ?? 4000
            })
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        // 解析JSON
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.results || [];
            }
        } catch (e) {
            console.warn('JSON解析失败:', e);
        }
        
        throw new Error('无法解析AI返回结果');
    },

    /**
     * 使用内置引擎生成
     */
    async generateWithBuiltIn(words, grade, materials, onProgress) {
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            this.state.currentWord = word;
            
            const wordData = db.findWord(word.toLowerCase());
            const generated = sentenceGenerator.generateSentence(
                word, 
                wordData?.meaning || '', 
                grade
            );
            
            // 构建完整的材料
            const material = this.buildMaterialFromGenerated(word, generated, wordData);
            
            materials.context.push(material.context);
            materials.spelling.push(material.spelling);
            materials.matching.push(material.matching);
            materials.flashcard.push(material.flashcard);
            
            this.state.completedWords = i + 1;
            this.state.progress = Math.round((this.state.completedWords / this.state.totalWords) * 100);
            
            if (onProgress) {
                onProgress(this.state.progress, this.state.completedWords, this.state.totalWords);
            }
            
            // 添加小延迟让UI有响应
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    },

    /**
     * 重新生成单个单词的例句
     * @param {string} word - 单词
     * @param {string} grade - 年级
     * @returns {Object} 生成的材料
     */
    async regenerateWord(word, grade = 'middle') {
        const aiConfig = db.getAIConfig();
        const useExternalAI = aiConfig.provider !== 'builtin' && aiConfig.apiKey;
        
        if (useExternalAI) {
            try {
                const results = await this.callAIBatch([word], grade, aiConfig);
                if (results && results.length > 0) {
                    return results[0];
                }
            } catch (error) {
                console.error('AI重新生成失败:', error);
            }
        }
        
        // 使用内置引擎作为备用
        const wordData = db.findWord(word.toLowerCase());
        const generated = sentenceGenerator.generateSentence(
            word, 
            wordData?.meaning || '', 
            grade
        );
        
        return this.buildMaterialFromGenerated(word, generated, wordData);
    },

    /**
     * 从生成的数据构建完整材料
     */
    buildMaterialFromGenerated(word, generated, wordData) {
        const phonetic = wordData?.phonetic || `/${word}/`;
        const meaning = wordData?.meaning || generated.meaning || '';
        
        // 生成干扰项
        const distractors = this.generateDistractors(word, generated.pos, meaning);
        const options = [word, ...distractors];
        
        // 使用智能位置平衡洗牌算法
        const shuffledContext = this.smartShuffle(options, 'context');
        
        // 生成释义干扰项
        const meaningDistractors = this.generateMeaningDistractors(meaning);
        const allMeanings = [meaning, ...meaningDistractors];
        
        // 使用智能位置平衡洗牌算法
        const shuffledMatching = this.smartShuffle(allMeanings, 'matching');
        
        return {
            context: {
                word: word,
                sentence: generated.sentence,
                options: shuffledContext.options,
                correctIndex: shuffledContext.correctIndex
            },
            spelling: {
                word: word,
                phonetic: phonetic,
                audio: ''
            },
            matching: {
                word: word,
                meaning: meaning,
                options: shuffledMatching.options,
                correctIndex: shuffledMatching.correctIndex
            },
            flashcard: {
                word: word,
                phonetic: phonetic,
                meaning: meaning,
                sentence: generated.sentence.replace('___', word)
            }
        };
    },

    /**
     * 生成干扰项 - 确保与正确答案有明显区隔
     */
    generateDistractors(word, pos, meaning) {
        const allWords = db.getAllWords ? db.getAllWords() : [];
        const wordLower = word.toLowerCase();
        
        // 提取正确答案的关键词（用于排除相似词）
        const wordParts = wordLower.split(/\s+/);
        const mainWord = wordParts[wordParts.length - 1]; // 取最后一个词（如 rock music 取 music）
        
        // 按词性和主题分类的干扰项库
        // 原则：干扰项应该与正确答案属于同一类别但不同具体项，或者完全不同类别
        const themedDistractors = {
            // 音乐类型 - 干扰项是其他音乐类型（同类不同项）
            'music': ['classical', 'jazz', 'pop', 'country', 'folk'],
            'rock': ['classical', 'jazz', 'pop', 'country', 'folk'],
            'classical': ['rock', 'jazz', 'pop', 'country', 'folk'],
            'jazz': ['rock', 'classical', 'pop', 'country', 'folk'],
            'pop': ['rock', 'classical', 'jazz', 'country', 'folk'],
            
            // 乐器 - 干扰项是其他乐器
            'guitar': ['piano', 'violin', 'drum', 'flute', 'trumpet'],
            'piano': ['guitar', 'violin', 'drum', 'flute', 'trumpet'],
            'violin': ['guitar', 'piano', 'drum', 'flute', 'trumpet'],
            
            // 音乐相关词汇 - 干扰项是其他艺术形式
            'song': ['story', 'poem', 'novel', 'film', 'dance'],
            'band': ['team', 'group', 'club', 'class', 'family'],
            
            // 学校相关 - 干扰项是其他场所或职业
            'student': ['teacher', 'doctor', 'worker', 'driver', 'farmer'],
            'teacher': ['student', 'doctor', 'worker', 'driver', 'farmer'],
            'school': ['hospital', 'library', 'museum', 'park', 'shop'],
            'class': ['office', 'room', 'hall', 'garden', 'court'],
            'book': ['pen', 'paper', 'bag', 'desk', 'chair'],
            
            // 家庭相关 - 干扰项是其他关系
            'family': ['friend', 'neighbor', 'classmate', 'colleague', 'stranger'],
            'home': ['school', 'office', 'store', 'restaurant', 'hotel'],
            'mother': ['father', 'sister', 'brother', 'aunt', 'uncle'],
            'father': ['mother', 'sister', 'brother', 'aunt', 'uncle'],
            
            // 食物相关 - 干扰项是其他食物
            'food': ['water', 'juice', 'milk', 'tea', 'coffee'],
            'apple': ['orange', 'banana', 'grape', 'pear', 'peach'],
            'orange': ['apple', 'banana', 'grape', 'pear', 'peach'],
            'meal': ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'],
            
            // 动作相关 - 干扰项是其他动作
            'eat': ['drink', 'sleep', 'walk', 'run', 'read'],
            'drink': ['eat', 'sleep', 'walk', 'run', 'read'],
            'play': ['work', 'study', 'rest', 'sleep', 'eat'],
            'go': ['come', 'stay', 'leave', 'arrive', 'return'],
            'make': ['break', 'fix', 'buy', 'sell', 'use'],
            
            // 形容词相关 - 干扰项是反义词或程度不同的词
            'happy': ['sad', 'angry', 'tired', 'bored', 'worried'],
            'sad': ['happy', 'angry', 'tired', 'bored', 'worried'],
            'big': ['small', 'tiny', 'huge', 'little', 'short'],
            'small': ['big', 'tiny', 'huge', 'little', 'short'],
            'good': ['bad', 'poor', 'wrong', 'right', 'fine'],
            'bad': ['good', 'poor', 'wrong', 'right', 'fine'],
            'new': ['old', 'ancient', 'modern', 'young', 'fresh'],
            'old': ['new', 'ancient', 'modern', 'young', 'fresh'],
            'hot': ['cold', 'cool', 'warm', 'freezing', 'burning'],
            'cold': ['hot', 'cool', 'warm', 'freezing', 'burning']
        };
        
        // 通用干扰项（按词性）
        const genericDistractors = {
            noun: ['apple', 'book', 'table', 'chair', 'water', 'school', 'friend', 'family', 'time', 'day'],
            verb: ['run', 'walk', 'eat', 'read', 'write', 'play', 'work', 'sleep', 'talk', 'think'],
            adjective: ['big', 'small', 'good', 'new', 'old', 'happy', 'sad', 'hot', 'cold', 'fast'],
            adverb: ['quickly', 'slowly', 'carefully', 'always', 'never', 'often', 'sometimes', 'usually', 'really', 'very']
        };
        
        const needed = 3;
        const result = [];
        
        // 1. 首先尝试根据主题选择干扰项
        let foundThemed = false;
        for (const [theme, distractors] of Object.entries(themedDistractors)) {
            if (wordLower.includes(theme) || mainWord.includes(theme)) {
                // 找到主题相关的干扰项
                for (const d of distractors) {
                    if (result.length < needed && !result.includes(d) && d !== wordLower) {
                        result.push(d);
                    }
                }
                foundThemed = true;
                break;
            }
        }
        
        // 2. 如果主题干扰项不够，从词库中选择同词性但不同主题的单词
        if (result.length < needed) {
            const candidates = allWords
                .filter(w => {
                    if (w.word.toLowerCase() === wordLower) return false;
                    // 排除包含相同词根的单词
                    const wLower = w.word.toLowerCase();
                    for (const part of wordParts) {
                        if (part.length > 3 && wLower.includes(part)) return false;
                    }
                    const wPos = sentenceGenerator.parsePartOfSpeech(w.meaning);
                    return wPos === pos;
                })
                .map(w => w.word)
                .sort(() => Math.random() - 0.5); // 随机排序
            
            for (let i = 0; i < candidates.length && result.length < needed; i++) {
                if (!result.includes(candidates[i])) {
                    result.push(candidates[i]);
                }
            }
        }
        
        // 3. 如果还不够，使用通用干扰项
        if (result.length < needed) {
            const generic = genericDistractors[pos] || genericDistractors.noun;
            for (const g of generic) {
                if (result.length < needed && !result.includes(g) && g !== wordLower) {
                    result.push(g);
                }
            }
        }
        
        // 4. 如果仍然不够，生成基于词性的占位符
        while (result.length < needed) {
            const placeholders = {
                noun: ['thing', 'object', 'item', 'place'],
                verb: ['action', 'activity', 'movement'],
                adjective: ['quality', 'feature', 'characteristic'],
                adverb: ['manner', 'way', 'style']
            };
            const ph = placeholders[pos] || placeholders.noun;
            const newOption = ph[result.length % ph.length];
            if (!result.includes(newOption)) {
                result.push(newOption);
            } else {
                result.push(`option${result.length + 1}`);
            }
        }
        
        return result.slice(0, needed);
    },

    /**
     * 检测选项是否为无效占位符
     */
    isInvalidOption(option) {
        if (!option || typeof option !== 'string') return true;
        
        const opt = option.trim();
        if (!opt) return true;
        
        // 检测常见占位符模式
        const invalidPatterns = [
            /^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|int\.|pron\.)\s*(单词|短语|动词|名词|形容词|副词|介词|连词|感叹词|代词|word|phrase)/i,
            /^干扰(项|释义|选项)[0-9]*$/i,
            /^选项[0-9]*$/i,
            /^option[0-9]*$/i,
            /^distractor[0-9]*$/i,
            /^[a-z]\.\s*(单词|短语|动作|行为)/i,
            /^[0-9]+$/,
        ];
        
        for (const pattern of invalidPatterns) {
            if (pattern.test(opt)) {
                return true;
            }
        }
        
        // 检测纯英文词性标注（没有实际中文释义）
        if (/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|int\.|pron\.)\s*[a-z\s]*$/i.test(opt) && !/[\u4e00-\u9fa5]/.test(opt)) {
            return true;
        }
        
        return false;
    },

    /**
     * 生成释义干扰项
     */
    generateMeaningDistractors(meaning) {
        const allWords = db.getAllWords ? db.getAllWords() : [];
        const distractors = [];
        
        // 随机选择3个不同的释义
        const shuffled = [...allWords].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < shuffled.length && distractors.length < 3; i++) {
            const m = shuffled[i].meaning;
            if (m && m !== meaning && !distractors.includes(m)) {
                distractors.push(m);
            }
        }
        
        // 如果不够，使用通用释义
        const genericMeanings = ['一个物品', '一种行为', '某种状态', '某个地方'];
        while (distractors.length < 3) {
            distractors.push(genericMeanings[distractors.length]);
        }
        
        return distractors;
    },

    /**
     * 生成备用材料
     */
    generateFallback(word, grade) {
        const wordData = db.findWord(word.toLowerCase());
        const generated = sentenceGenerator.generateSentence(
            word, 
            wordData?.meaning || '', 
            grade
        );
        
        return this.buildMaterialFromGenerated(word, generated, wordData);
    },

    /**
     * 获取生成状态
     */
    getState() {
        return { ...this.state };
    },

    /**
     * 检查是否正在生成
     */
    isGenerating() {
        return this.state.isGenerating;
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = aiSentenceService;
}
