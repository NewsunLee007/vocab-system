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
                        
                        // 检查并移除重复选项
                        const uniqueOptions = [...new Set(options.map(o => o.toLowerCase()))];
                        if (uniqueOptions.length < options.length) {
                            console.warn('AI 返回的 context 选项有重复，正在补充干扰项');
                            // 补充干扰项
                            const distractors = this.generateDistractors(correctWord, 'noun', '');
                            options = [correctWord, ...distractors];
                        }
                        
                        // Fisher-Yates 洗牌算法
                        for (let i = options.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [options[i], options[j]] = [options[j], options[i]];
                        }
                        
                        result.context.options = options;
                        // 更新 correctIndex
                        result.context.correctIndex = options.findIndex(opt => 
                            typeof opt === 'string' && opt.toLowerCase() === correctWord.toLowerCase()
                        );
                        if (result.context.correctIndex === -1) result.context.correctIndex = 0;
                    }
                    
                    // 强制打乱 matching 选项顺序
                    if (result.matching && result.matching.options) {
                        const correctMeaning = result.matching.meaning;
                        let options = result.matching.options;
                        
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
                        
                        for (let i = options.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [options[i], options[j]] = [options[j], options[i]];
                        }
                        
                        result.matching.options = options;
                        result.matching.correctIndex = options.findIndex(opt => opt === correctMeaning);
                        if (result.matching.correctIndex === -1) result.matching.correctIndex = 0;
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
        
        // 打乱选项顺序（Fisher-Yates 洗牌算法）
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        
        // 查找正确答案位置（确保能找到）
        let correctIndex = options.findIndex(opt => 
            typeof opt === 'string' && opt.toLowerCase() === word.toLowerCase()
        );
        
        // 如果找不到（不应该发生），强制设为 0
        if (correctIndex === -1) {
            console.warn(`正确答案 "${word}" 在选项中未找到，强制设为第一个选项`);
            correctIndex = 0;
        }
        
        // 生成释义干扰项
        const meaningDistractors = this.generateMeaningDistractors(meaning);
        const allMeanings = [meaning, ...meaningDistractors];
        
        // 打乱释义选项顺序
        for (let i = allMeanings.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allMeanings[i], allMeanings[j]] = [allMeanings[j], allMeanings[i]];
        }
        
        // 查找正确释义位置
        let meaningCorrectIndex = allMeanings.findIndex(m => m === meaning);
        if (meaningCorrectIndex === -1) {
            console.warn(`正确释义在选项中未找到，强制设为第一个选项`);
            meaningCorrectIndex = 0;
        }
        
        return {
            context: {
                word: word,
                sentence: generated.sentence,
                options: options,
                correctIndex: correctIndex
            },
            spelling: {
                word: word,
                phonetic: phonetic,
                audio: ''
            },
            matching: {
                word: word,
                meaning: meaning,
                options: allMeanings,
                correctIndex: meaningCorrectIndex
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
