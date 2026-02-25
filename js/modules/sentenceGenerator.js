/**
 * 新纪元英语词汇系统 - 例句生成器模块
 * 基于词表信息生成高质量、符合年级难度的例句
 * 
 * 核心原则：
 * 1. 严格基于原词表的词性和中文含义
 * 2. 例句符合年级英语水平
 * 3. 使用常用词汇和真实语境
 * 4. 多重校验机制确保准确性
 */

const sentenceGenerator = {
    // 年级难度配置
    gradeConfig: {
        primary: {
            maxWordLength: 6,
            maxSentenceLength: 12,
            vocabularyLevel: 'simple',
            complexity: 'low'
        },
        middle: {
            maxWordLength: 10,
            maxSentenceLength: 18,
            vocabularyLevel: 'intermediate',
            complexity: 'medium'
        },
        high: {
            maxWordLength: 15,
            maxSentenceLength: 25,
            vocabularyLevel: 'advanced',
            complexity: 'high'
        }
    },

    // 常用简单词汇表（用于生成例句时避免偏僻词）
    commonWords: {
        primary: new Set([
            'the', 'a', 'an', 'is', 'are', 'am', 'was', 'were', 'be', 'been',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
            'I', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her',
            'this', 'that', 'these', 'those', 'in', 'on', 'at', 'to', 'for', 'with',
            'and', 'but', 'or', 'so', 'if', 'when', 'where', 'what', 'who', 'how',
            'big', 'small', 'good', 'bad', 'new', 'old', 'hot', 'cold', 'happy', 'sad',
            'go', 'come', 'see', 'look', 'get', 'make', 'take', 'give', 'put', 'say',
            'book', 'school', 'teacher', 'student', 'friend', 'family', 'home', 'room',
            'day', 'time', 'year', 'morning', 'afternoon', 'evening', 'night', 'today',
            'like', 'love', 'want', 'need', 'know', 'think', 'help', 'work', 'play'
        ]),
        middle: new Set([
            'about', 'after', 'again', 'all', 'also', 'always', 'another', 'any',
            'around', 'away', 'back', 'because', 'before', 'best', 'better', 'between',
            'both', 'call', 'change', 'child', 'children', 'city', 'close', 'country',
            'different', 'during', 'each', 'early', 'earth', 'eat', 'end', 'enough',
            'every', 'example', 'eye', 'face', 'fact', 'feel', 'few', 'find', 'first',
            'follow', 'food', 'form', 'found', 'four', 'from', 'front', 'full', 'game',
            'gave', 'girl', 'give', 'great', 'group', 'grow', 'hand', 'happen', 'hard',
            'head', 'hear', 'heart', 'high', 'hold', 'hour', 'house', 'idea', 'important',
            'inside', 'keep', 'kind', 'know', 'land', 'large', 'last', 'late', 'learn',
            'leave', 'left', 'life', 'light', 'line', 'list', 'little', 'live', 'long',
            'look', 'made', 'man', 'many', 'may', 'mean', 'men', 'might', 'mile', 'miss',
            'money', 'more', 'most', 'mother', 'move', 'much', 'must', 'name', 'near',
            'never', 'next', 'often', 'once', 'only', 'open', 'other', 'over', 'own',
            'page', 'paper', 'part', 'people', 'person', 'picture', 'place', 'point',
            'right', 'same', 'seem', 'set', 'several', 'show', 'side', 'something',
            'sound', 'spell', 'start', 'state', 'still', 'stop', 'study', 'such', 'tell',
            'than', 'their', 'them', 'then', 'there', 'thing', 'think', 'three', 'through',
            'together', 'told', 'too', 'took', 'tree', 'try', 'turn', 'two', 'under',
            'until', 'upon', 'use', 'very', 'want', 'water', 'way', 'well', 'went',
            'while', 'white', 'whole', 'why', 'world', 'years', 'young'
        ]),
        high: new Set([
            'ability', 'absence', 'academic', 'accept', 'access', 'accident', 'according',
            'account', 'achieve', 'across', 'action', 'activity', 'actually', 'addition',
            'address', 'administration', 'admit', 'adult', 'advance', 'advantage',
            'advertise', 'advice', 'affair', 'affect', 'afraid', 'agency', 'agent',
            'agree', 'agreement', 'ahead', 'allow', 'almost', 'alone', 'along', 'already',
            'although', 'amount', 'analysis', 'analyze', 'announce', 'annual', 'another',
            'answer', 'anxiety', 'anyone', 'anything', 'anyway', 'apartment', 'apparent',
            'apparently', 'appeal', 'appear', 'appearance', 'application', 'apply',
            'appoint', 'approach', 'appropriate', 'approval', 'approve', 'area', 'argue',
            'argument', 'arise', 'around', 'arrange', 'arrangement', 'arrive', 'article',
            'artist', 'aside', 'aspect', 'assess', 'assessment', 'assign', 'assignment',
            'assist', 'assistance', 'assistant', 'associate', 'association', 'assume',
            'assumption', 'assure', 'attempt', 'attend', 'attention', 'attitude',
            'attract', 'audience', 'author', 'authority', 'available', 'average',
            'avoid', 'background', 'balance', 'barrier', 'base', 'basic', 'basis',
            'beautiful', 'because', 'become', 'before', 'begin', 'behavior', 'behind',
            'believe', 'benefit', 'beside', 'better', 'between', 'beyond', 'billion',
            'birth', 'black', 'blood', 'board', 'body', 'book', 'born', 'both', 'break',
            'bring', 'brother', 'budget', 'build', 'building', 'business', 'button'
        ])
    },

    // 词性映射
    posMapping: {
        'n.': 'noun',
        'noun': 'noun',
        '名词': 'noun',
        'v.': 'verb',
        'verb': 'verb',
        '动词': 'verb',
        'adj.': 'adjective',
        'adjective': 'adjective',
        '形容词': 'adjective',
        'adv.': 'adverb',
        'adverb': 'adverb',
        '副词': 'adverb',
        'prep.': 'preposition',
        'preposition': 'preposition',
        '介词': 'preposition',
        'conj.': 'conjunction',
        'conjunction': 'conjunction',
        '连词': 'conjunction',
        'pron.': 'pronoun',
        'pronoun': 'pronoun',
        '代词': 'pronoun',
        'int.': 'interjection',
        'interjection': 'interjection',
        '感叹词': 'interjection'
    },

    // 场景模板库 - 按词性和年级分类
    sentenceTemplates: {
        noun: {
            primary: [
                { template: "I have a {word} in my bag.", context: "school" },
                { template: "The {word} is on the table.", context: "home" },
                { template: "My {word} is very nice.", context: "personal" },
                { template: "This is my favorite {word}.", context: "preference" },
                { template: "Can you see the {word}?", context: "observation" },
                { template: "I like this {word} very much.", context: "preference" },
                { template: "The {word} is red and big.", context: "description" },
                { template: "We have a {word} at home.", context: "home" },
                { template: "Please give me the {word}.", context: "request" },
                { template: "Where is my {word}?", context: "location" }
            ],
            middle: [
                { template: "The {word} plays an important role in our daily life.", context: "general" },
                { template: "Students should understand the meaning of this {word}.", context: "education" },
                { template: "Many people are interested in learning about {word}.", context: "interest" },
                { template: "The concept of {word} is fundamental to this subject.", context: "academic" },
                { template: "We discussed the {word} in class today.", context: "education" },
                { template: "The {word} helps us solve many problems.", context: "utility" },
                { template: "Understanding {word} is essential for students.", context: "education" },
                { template: "The {word} has changed our lives significantly.", context: "impact" },
                { template: "Experts have studied {word} for many years.", context: "research" },
                { template: "The development of {word} continues to progress.", context: "progress" }
            ],
            high: [
                { template: "The theoretical framework of {word} requires careful analysis.", context: "academic" },
                { template: "Contemporary research on {word} has yielded significant insights.", context: "research" },
                { template: "The implications of {word} extend beyond initial expectations.", context: "analysis" },
                { template: "Scholars have debated the nature of {word} for decades.", context: "academic" },
                { template: "The complexity inherent in {word} demands thorough examination.", context: "analysis" },
                { template: "Understanding {word} is crucial for advanced study.", context: "education" },
                { template: "The evolution of {word} reflects broader societal changes.", context: "society" },
                { template: "Critical analysis of {word} reveals important patterns.", context: "analysis" }
            ]
        },
        verb: {
            primary: [
                { template: "I {word} every day after school.", context: "routine" },
                { template: "We can {word} together in the park.", context: "activity" },
                { template: "She likes to {word} with her friends.", context: "social" },
                { template: "The teacher asks us to {word} carefully.", context: "education" },
                { template: "They often {word} during break time.", context: "routine" },
                { template: "Please {word} this for me.", context: "request" },
                { template: "I want to {word} with you.", context: "desire" },
                { template: "Can you {word} this word?", context: "ability" },
                { template: "We {word} at home every evening.", context: "routine" },
                { template: "He will {word} tomorrow morning.", context: "future" }
            ],
            middle: [
                { template: "Students should {word} regularly to improve their skills.", context: "education" },
                { template: "The ability to {word} effectively is crucial for success.", context: "ability" },
                { template: "Many people find it challenging to {word} under pressure.", context: "challenge" },
                { template: "We need to {word} systematically to achieve our goals.", context: "goal" },
                { template: "The process of {word} requires patience and dedication.", context: "process" },
                { template: "Teachers encourage students to {word} actively.", context: "education" },
                { template: "It is important to {word} according to the rules.", context: "rule" },
                { template: "Scientists continue to {word} new methods.", context: "research" },
                { template: "We must {word} carefully before making decisions.", context: "caution" }
            ],
            high: [
                { template: "The phenomenon of {word} has attracted significant academic attention.", context: "research" },
                { template: "Researchers continue to explore the mechanisms underlying {word}.", context: "research" },
                { template: "The capacity to {word} under diverse conditions demonstrates adaptability.", context: "ability" },
                { template: "Contemporary theories attempt to explain why individuals {word} differently.", context: "theory" },
                { template: "The tendency to {word} reflects broader behavioral patterns.", context: "behavior" },
                { template: "Understanding how to {word} effectively is essential.", context: "education" },
                { template: "The decision to {word} involves multiple factors.", context: "decision" }
            ]
        },
        adjective: {
            primary: [
                { template: "This book is very {word} and interesting.", context: "description" },
                { template: "The weather today is {word} and comfortable.", context: "weather" },
                { template: "Her room looks {word} and beautiful.", context: "appearance" },
                { template: "The food tastes {word} and delicious.", context: "taste" },
                { template: "My new toy is {word} and fun to play with.", context: "toy" },
                { template: "This is a {word} day for a picnic.", context: "weather" },
                { template: "The puppy is so {word} and friendly.", context: "animal" },
                { template: "I feel {word} when I am with my friends.", context: "emotion" },
                { template: "The flowers are {word} and colorful.", context: "nature" }
            ],
            middle: [
                { template: "The situation became increasingly {word} as time passed.", context: "change" },
                { template: "Students found the lecture both {word} and enlightening.", context: "education" },
                { template: "The results were surprisingly {word} to most observers.", context: "result" },
                { template: "Her approach proved remarkably {word} in solving the problem.", context: "method" },
                { template: "The atmosphere in the classroom remained {word} throughout.", context: "environment" },
                { template: "It is {word} to review notes after class.", context: "education" },
                { template: "The solution appears {word} in retrospect.", context: "reflection" },
                { template: "His explanation was clear and {word}.", context: "communication" }
            ],
            high: [
                { template: "The fundamentally {word} nature of this concept requires deeper examination.", context: "analysis" },
                { template: "Contemporary discourse reveals increasingly {word} perspectives on this issue.", context: "discourse" },
                { template: "The inherently {word} characteristics distinguish this phenomenon.", context: "characteristic" },
                { template: "Scholarly analysis suggests that {word} elements persist across contexts.", context: "research" },
                { template: "The remarkably {word} implications continue to generate debate.", context: "implication" },
                { template: "Critical examination reveals the {word} aspects of this theory.", context: "analysis" }
            ]
        },
        adverb: {
            primary: [
                { template: "She speaks {word} to everyone.", context: "manner" },
                { template: "Please sit {word} in your seat.", context: "position" },
                { template: "He runs {word} in the race.", context: "speed" },
                { template: "I {word} finish my homework.", context: "frequency" },
                { template: "The bird sings {word} in the morning.", context: "manner" }
            ],
            middle: [
                { template: "She completed the task {word} before the deadline.", context: "time" },
                { template: "The theory {word} explains the observed phenomena.", context: "explanation" },
                { template: "He responded {word} to the criticism.", context: "reaction" },
                { template: "The data {word} supports this hypothesis.", context: "evidence" },
                { template: "Students should {word} review their notes.", context: "education" }
            ],
            high: [
                { template: "The argument {word} addresses the core issues.", context: "argument" },
                { template: "The results {word} contradict earlier findings.", context: "research" },
                { template: "She {word} analyzed the complex data set.", context: "analysis" },
                { template: "The theory {word} applies to diverse contexts.", context: "theory" }
            ]
        },
        preposition: {
            primary: [
                { template: "The book is {word} the table.", context: "location" },
                { template: "I put my bag {word} the chair.", context: "location" },
                { template: "The cat is sleeping {word} the bed.", context: "location" },
                { template: "Please write your name {word} the paper.", context: "writing" },
                { template: "The ball rolled {word} the door.", context: "movement" }
            ],
            middle: [
                { template: "The meeting is scheduled {word} Friday afternoon.", context: "time" },
                { template: "She placed the document {word} the folder.", context: "organization" },
                { template: "The store is located {word} the main street.", context: "location" },
                { template: "We discussed the topic {word} great detail.", context: "discussion" },
                { template: "The answer can be found {word} page ten.", context: "reference" }
            ],
            high: [
                { template: "The theory is based {word} extensive research.", context: "research" },
                { template: "The decision was made {word} careful consideration.", context: "decision" },
                { template: "The results vary {word} different conditions.", context: "variation" },
                { template: "The argument rests {word} solid evidence.", context: "argument" }
            ]
        }
    },

    /**
     * 解析词性
     * @param {string} meaning - 单词含义字符串
     * @returns {string} 标准化的词性
     */
    parsePartOfSpeech(meaning) {
        if (!meaning) return 'noun';
        
        // 提取词性标记
        const posMatch = meaning.match(/^([a-z]+)\.\s*/i);
        if (posMatch) {
            const pos = posMatch[1].toLowerCase();
            return this.posMapping[pos] || 'noun';
        }
        
        // 根据中文关键词判断
        const meaningLower = meaning.toLowerCase();
        if (meaningLower.includes('名词') || meaningLower.includes('n.')) return 'noun';
        if (meaningLower.includes('动词') || meaningLower.includes('v.')) return 'verb';
        if (meaningLower.includes('形容词') || meaningLower.includes('adj.')) return 'adjective';
        if (meaningLower.includes('副词') || meaningLower.includes('adv.')) return 'adverb';
        if (meaningLower.includes('介词') || meaningLower.includes('prep.')) return 'preposition';
        
        return 'noun';
    },

    /**
     * 提取中文含义
     * @param {string} meaning - 单词含义字符串
     * @returns {string} 中文含义
     */
    extractChineseMeaning(meaning) {
        if (!meaning) return '';
        // 移除词性标记
        return meaning.replace(/^[a-z]+\.\s*/i, '').trim();
    },

    /**
     * 根据年级确定难度级别
     * @param {string} grade - 年级信息
     * @returns {string} 难度级别
     */
    determineGradeLevel(grade) {
        if (!grade) return 'middle';
        const gradeLower = grade.toLowerCase();
        
        if (gradeLower.includes('七') || gradeLower.includes('八') || gradeLower.includes('九') ||
            gradeLower.includes('7') || gradeLower.includes('8') || gradeLower.includes('9')) {
            return 'middle';
        }
        if (gradeLower.includes('一') || gradeLower.includes('二') || gradeLower.includes('三') ||
            gradeLower.includes('四') || gradeLower.includes('五') || gradeLower.includes('六') ||
            gradeLower.includes('1') || gradeLower.includes('2') || gradeLower.includes('3') ||
            gradeLower.includes('4') || gradeLower.includes('5') || gradeLower.includes('6')) {
            return 'primary';
        }
        if (gradeLower.includes('高') || gradeLower.includes('10') || gradeLower.includes('11') || gradeLower.includes('12')) {
            return 'high';
        }
        
        return 'middle';
    },

    /**
     * 验证句子是否符合年级难度
     * @param {string} sentence - 句子
     * @param {string} gradeLevel - 年级级别
     * @returns {boolean} 是否通过验证
     */
    validateSentenceDifficulty(sentence, gradeLevel) {
        const config = this.gradeConfig[gradeLevel] || this.gradeConfig.middle;
        const words = sentence.toLowerCase().match(/\b[a-z]+\b/g) || [];
        
        // 检查句子长度
        if (words.length > config.maxSentenceLength) {
            return false;
        }
        
        // 检查单词长度
        const longWords = words.filter(w => w.length > config.maxWordLength);
        if (longWords.length > words.length * 0.1) {
            return false;
        }
        
        // 检查是否使用了过于复杂的词汇
        const commonWordSet = this.commonWords[gradeLevel] || this.commonWords.middle;
        const uncommonWords = words.filter(w => w.length > 4 && !commonWordSet.has(w));
        if (uncommonWords.length > words.length * 0.2) {
            return false;
        }
        
        return true;
    },

    /**
     * 验证例句与单词的匹配度
     * @param {string} sentence - 例句
     * @param {string} word - 单词
     * @param {string} pos - 词性
     * @param {string} meaning - 含义
     * @returns {boolean} 是否匹配
     */
    validateSentenceMatch(sentence, word, pos, meaning) {
        // 检查句子中是否包含目标词
        const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
        if (!wordRegex.test(sentence.replace('___', word))) {
            return false;
        }
        
        // 检查句子语法结构是否适合该词性
        const sentenceLower = sentence.toLowerCase();
        
        // 名词通常跟在冠词或形容词后
        if (pos === 'noun') {
            // 名词可以出现在多种位置，基本语法检查即可
            return true;
        }
        
        // 动词检查
        if (pos === 'verb') {
            // 动词通常跟在主语后或情态动词后
            const verbPatterns = [
                /\b(can|could|will|would|should|must|may|might)\s+___/i,
                /\b(i|you|he|she|it|we|they)\s+___/i,
                /\bto\s+___/i,
                /\b___\s+(the|a|an|it|him|her|them|us|me)\b/i
            ];
            return verbPatterns.some(p => p.test(sentenceLower));
        }
        
        // 形容词检查
        if (pos === 'adjective') {
            // 形容词通常跟在be动词后或名词前
            const adjPatterns = [
                /\b(is|are|was|were|be|been)\s+(very|quite|so|really)?\s*___/i,
                /\b(the|a|an|my|your|his|her)\s+___\s+\w+/i,
                /\b___\s+(day|weather|book|room|place|idea)\b/i
            ];
            return adjPatterns.some(p => p.test(sentenceLower));
        }
        
        // 副词检查
        if (pos === 'adverb') {
            // 副词通常修饰动词或形容词
            const advPatterns = [
                /\b\w+\s+___\s+(verb|speak|run|walk|do|work)/i,
                /\b___\s+(good|bad|happy|sad|quick|slow)\b/i
            ];
            return advPatterns.some(p => p.test(sentenceLower));
        }
        
        // 介词检查
        if (pos === 'preposition') {
            // 介词通常表示位置或时间关系
            const prepPatterns = [
                /\b(is|are|was|were)\s+___\s+\b/i,
                /\b\w+\s+___\s+(the|a|an|my|this|that)\b/i
            ];
            return prepPatterns.some(p => p.test(sentenceLower));
        }
        
        return true;
    },

    /**
     * 生成例句
     * @param {string} word - 单词
     * @param {string} meaning - 含义（包含词性）
     * @param {string} grade - 年级信息
     * @returns {Object} 生成的例句信息
     */
    generateSentence(word, meaning, grade = 'middle') {
        const pos = this.parsePartOfSpeech(meaning);
        const chineseMeaning = this.extractChineseMeaning(meaning);
        const gradeLevel = this.determineGradeLevel(grade);
        
        // 获取该词性和年级的模板
        const templates = this.sentenceTemplates[pos]?.[gradeLevel] || 
                         this.sentenceTemplates.noun[gradeLevel];
        
        if (!templates || templates.length === 0) {
            return this.generateFallbackSentence(word, pos, gradeLevel);
        }
        
        // 随机选择一个模板
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        // 生成例句
        let sentence = template.template.replace('{word}', '___');
        
        // 验证生成的句子
        if (!this.validateSentenceDifficulty(sentence, gradeLevel)) {
            return this.generateFallbackSentence(word, pos, gradeLevel);
        }
        
        return {
            sentence: sentence,
            word: word,
            pos: pos,
            meaning: meaning,
            chineseMeaning: chineseMeaning,
            gradeLevel: gradeLevel,
            context: template.context,
            isGenerated: true
        };
    },

    /**
     * 生成备用例句（当模板生成失败时）
     * @param {string} word - 单词
     * @param {string} pos - 词性
     * @param {string} gradeLevel - 年级级别
     * @returns {Object} 例句信息
     */
    generateFallbackSentence(word, pos, gradeLevel) {
        const fallbackTemplates = {
            primary: {
                noun: "This is my ___.",
                verb: "I can ___ every day.",
                adjective: "This is very ___.",
                adverb: "She speaks ___.",
                preposition: "The book is ___ the table."
            },
            middle: {
                noun: "The ___ is important for students.",
                verb: "Students should ___ carefully.",
                adjective: "This ___ concept helps us learn.",
                adverb: "He completed the task ___.",
                preposition: "The answer is ___ page five."
            },
            high: {
                noun: "The ___ represents a significant concept.",
                verb: "Students must ___ systematically to succeed.",
                adjective: "This ___ principle underlies the theory.",
                adverb: "The theory ___ explains the phenomenon.",
                preposition: "The argument rests ___ solid evidence."
            }
        };
        
        const levelTemplates = fallbackTemplates[gradeLevel] || fallbackTemplates.middle;
        const sentence = levelTemplates[pos] || levelTemplates.noun;
        
        return {
            sentence: sentence,
            word: word,
            pos: pos,
            meaning: '',
            chineseMeaning: '',
            gradeLevel: gradeLevel,
            context: 'general',
            isGenerated: true,
            isFallback: true
        };
    },

    /**
     * 批量生成例句
     * @param {Array} words - 单词列表
     * @param {string} grade - 年级信息
     * @returns {Array} 例句列表
     */
    generateSentencesForWords(words, grade = 'middle') {
        return words.map(word => {
            // 优先从词库获取已有数据
            const wordData = db.findWord(word.toLowerCase());
            
            if (wordData && wordData.sentence && this.isValidSentence(wordData.sentence)) {
                // 使用词库中的例句
                let sentence = wordData.sentence;
                // 确保例句包含填空
                if (!sentence.includes('___')) {
                    sentence = sentence.replace(new RegExp(`\\b${word}\\b`, 'gi'), '___');
                }
                return {
                    word: word,
                    sentence: sentence,
                    meaning: wordData.meaning || '',
                    pos: this.parsePartOfSpeech(wordData.meaning),
                    isFromDict: true
                };
            }
            
            // 生成新例句
            const meaning = wordData?.meaning || '';
            const generated = this.generateSentence(word, meaning, grade);
            
            return {
                word: word,
                sentence: generated.sentence,
                meaning: meaning,
                pos: generated.pos,
                isGenerated: true
            };
        });
    },

    /**
     * 验证句子是否有效
     * @param {string} sentence - 句子
     * @returns {boolean} 是否有效
     */
    isValidSentence(sentence) {
        if (!sentence || sentence.length < 10) return false;
        
        // 检查是否以标点符号结尾
        if (!/[.!?]$/.test(sentence)) return false;
        
        // 检查单词数量
        const words = sentence.split(/\s+/);
        if (words.length < 4 || words.length > 25) return false;
        
        return true;
    },

    /**
     * 质量评分
     * @param {Object} sentenceData - 例句数据
     * @returns {number} 质量分数 (0-100)
     */
    calculateQualityScore(sentenceData) {
        let score = 100;
        
        // 检查是否有填空
        if (!sentenceData.sentence.includes('___')) {
            score -= 30;
        }
        
        // 检查句子长度
        const words = sentenceData.sentence.split(/\s+/);
        if (words.length < 5) score -= 10;
        if (words.length > 20) score -= 10;
        
        // 检查是否有含义信息
        if (!sentenceData.meaning) score -= 15;
        
        // 检查词性是否明确
        if (!sentenceData.pos) score -= 10;
        
        // 检查是否为回退模板
        if (sentenceData.isFallback) score -= 20;
        
        return Math.max(0, score);
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = sentenceGenerator;
}
