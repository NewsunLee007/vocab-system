/**
 * 新纪元英语词汇系统 - 数据层
 * 封装 localStorage 操作，提供数据持久化
 */

const db = {
    // 存储键名
    KEYS: {
        DB: 'xinji_vocabulary_db',
        CURRENT_USER: 'xinji_current_user',
        SYSTEM: 'xinji_system'
    },

    // 内存中的数据缓存
    _data: null,

    /**
     * 初始化数据库
     */
    async init() {
        // 1. 尝试从 localStorage 加载缓存
        const saved = helpers.storage.get(this.KEYS.DB);
        if (saved) {
            this._data = saved;
        } else {
            // 首次使用，加载种子数据作为兜底
            this._data = helpers.deepClone(SEED_DATA);
            this.save();
        }

        // 2. 尝试从云端拉取最新学校数据 (需已登录)
        // 注意：如果是未登录状态，api.fetchSchoolData 会返回 null
        try {
            const cloudData = await api.fetchSchoolData();
            if (cloudData && cloudData.data) {
                console.log('Fetching school data from cloud...');
                // 合并逻辑：保留本地的用户进度，更新学校基础数据（词表、学生名单等）
                // 这里简单粗暴地覆盖非进度数据
                // 实际应用中可能需要更精细的 merge
                
                this._data.teachers = cloudData.data.teachers || this._data.teachers;
                this._data.students = cloudData.data.students || this._data.students;
                this._data.wordlists = cloudData.data.wordlists || this._data.wordlists;
                this._data.tasks = cloudData.data.tasks || this._data.tasks;
                
                // 保存合并后的数据
                this.save(); 
                console.log('School data synced from cloud.');
            }
        } catch (e) {
            console.warn('Failed to fetch school data:', e);
        }

        return this;
    },

    /**
     * 保存数据到 localStorage 并尝试同步到云端
     */
    save() {
        helpers.storage.set(this.KEYS.DB, this._data);
        
        // 尝试同步到云端 (防抖)
        if (this._syncTimeout) clearTimeout(this._syncTimeout);
        this._syncTimeout = setTimeout(() => {
            this.syncToCloud();
        }, 2000);
        
        return true;
    },

    /**
     * 同步到云端
     */
    async syncToCloud() {
        try {
            const user = auth.getCurrentUser();
            if (!user) return;
            
            // 1. 同步个人进度 (Student)
            if (user.role === 'student') {
                const myState = this._data.studentStates[user.id];
                if (myState) {
                    await api.syncPush(myState);
                }
            }
            
            // 2. 同步学校数据 (Admin/Teacher) - 仅当有关键数据变更时
            // 为了简化，我们假设每次 save 都会触发全量更新（在实际生产中应优化为 diff 更新）
            if (user.role === 'admin' || user.role === 'teacher') {
                 const schoolData = {
                     teachers: this._data.teachers,
                     students: this._data.students,
                     wordlists: this._data.wordlists,
                     tasks: this._data.tasks
                 };
                 await api.updateSchoolData(schoolData);
                 console.log('School data pushed to cloud.');
            }
        } catch (e) {
            console.warn('Cloud sync failed:', e);
        }
    },

    /**
     * 重置数据库（用于测试）
     */
    reset() {
        this._data = helpers.deepClone(SEED_DATA);
        this.save();
        helpers.storage.remove(this.KEYS.CURRENT_USER);
        return this;
    },

    /**
     * 获取完整数据
     */
    getAll() {
        return this._data;
    },

    // ==================== 管理员操作 ====================
    
    getAdmins() {
        return this._data.admins;
    },

    findAdmin(id) {
        return this._data.admins.find(a => a.id === id);
    },

    updateAdminPassword(id, hashedPassword) {
        const admin = this._data.admins.find(a => a.id === id);
        if (admin) {
            admin.pwd = hashedPassword;
            admin.passwordChanged = true;
            admin.passwordChangedAt = Date.now();
            this.save();
            return true;
        }
        return false;
    },

    // ==================== 教师操作 ====================
    
    getTeachers() {
        return this._data.teachers;
    },

    findTeacher(id) {
        return this._data.teachers.find(t => t.id === id);
    },

    findTeacherByCredentials(id, password) {
        const teacher = this.findTeacher(id);
        if (teacher && helpers.verifyPassword(password, teacher.pwd)) {
            return teacher;
        }
        return null;
    },

    addTeacher(teacherData) {
        const newTeacher = {
            id: teacherData.id,
            pwd: helpers.hash(teacherData.pwd || '123'),
            name: teacherData.name,
            subject: teacherData.subject || '英语',
            passwordChanged: false
        };
        this._data.teachers.push(newTeacher);
        this.save();
        return newTeacher;
    },

    updateTeacherPassword(id, hashedPassword) {
        const teacher = this._data.teachers.find(t => t.id === id);
        if (teacher) {
            teacher.pwd = hashedPassword;
            teacher.passwordChanged = true;
            teacher.passwordChangedAt = Date.now();
            this.save();
            return true;
        }
        return false;
    },

    markPasswordChanged(role, id) {
        if (role === 'admin') {
            const admin = this._data.admins.find(a => a.id === id);
            if (admin) {
                admin.passwordChanged = true;
                admin.passwordChangedAt = Date.now();
                this.save();
                return true;
            }
        } else if (role === 'teacher') {
            const teacher = this._data.teachers.find(t => t.id === id);
            if (teacher) {
                teacher.passwordChanged = true;
                teacher.passwordChangedAt = Date.now();
                this.save();
                return true;
            }
        }
        return false;
    },

    // ==================== 学生操作 ====================
    
    getStudents() {
        return this._data.students;
    },

    getStudentsByTeacher(teacherId) {
        return this._data.students.filter(s => s.teacherId === teacherId);
    },

    findStudent(id) {
        return this._data.students.find(s => s.id === id);
    },

    findStudentByClassAndName(className, name) {
        return this._data.students.find(s => s.class === className && s.name === name);
    },

    addStudent(studentData) {
        const newStudent = {
            id: studentData.id || helpers.generateId('s'),
            teacherId: studentData.teacherId,
            class: studentData.class,
            name: studentData.name,
            pwd: studentData.pwd ? helpers.hash(studentData.pwd) : helpers.hash('123456'), // 默认密码
            passwordChanged: false,
            coins: 0,
            badges: [],
            streak: 0,
            totalLearned: 0,
            totalTests: 0,
            totalCorrect: 0,
            totalQuestions: 0
        };
        this._data.students.push(newStudent);
        
        // 初始化学生记忆状态
        this._data.studentStates[newStudent.id] = {
            learned: [],
            queue: {}
        };
        
        this.save();
        return newStudent;
    },

    updateStudentPassword(id, hashedPassword) {
        const student = this.findStudent(id);
        if (student) {
            student.pwd = hashedPassword;
            student.passwordChanged = true;
            this.save();
            return true;
        }
        return false;
    },

    resetStudentPassword(id) {
        const student = this.findStudent(id);
        if (student) {
            student.pwd = helpers.hash('123456');
            student.passwordChanged = false;
            this.save();
            return true;
        }
        return false;
    },

    updateStudent(studentId, updates) {
        const student = this.findStudent(studentId);
        if (student) {
            Object.assign(student, updates);
            this.save();
            return student;
        }
        return null;
    },

    addCoins(studentId, amount) {
        const student = this.findStudent(studentId);
        if (student) {
            student.coins += amount;
            this.save();
            return student.coins;
        }
        return null;
    },

    // ==================== 词表操作 ====================
    
    getWordLists() {
        return this._data.wordLists;
    },

    getWordListsByTeacher(teacherId) {
        return this._data.wordLists.filter(wl => wl.teacherId === teacherId);
    },

    findWordList(id) {
        return this._data.wordLists.find(wl => wl.id === id);
    },

    addWordList(wordlistData) {
        const newWordList = {
            id: helpers.generateId('wl'),
            teacherId: wordlistData.teacherId,
            title: wordlistData.title,
            type: wordlistData.type,
            words: wordlistData.words || [],
            createdAt: helpers.getTodayDate()
        };
        
        // 保存教材、年级、册别、单元等额外字段
        if (wordlistData.textbook) newWordList.textbook = wordlistData.textbook;
        if (wordlistData.grade) newWordList.grade = wordlistData.grade;
        if (wordlistData.volume) newWordList.volume = wordlistData.volume;
        if (wordlistData.unit) newWordList.unit = wordlistData.unit;
        
        this._data.wordLists.push(newWordList);
        this.save();
        return newWordList;
    },

    /**
     * 删除词表
     */
    deleteWordList(wordlistId) {
        const index = this._data.wordLists.findIndex(wl => wl.id === wordlistId);
        if (index !== -1) {
            this._data.wordLists.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    },

    // ==================== 词库操作 ====================
    
    getDict() {
        return this._data.dict;
    },

    getAllWords() {
        return Object.values(this._data.dict);
    },

    findWord(word) {
        return this._data.dict[word.toLowerCase()];
    },

    addWord(wordData) {
        this._data.dict[wordData.word.toLowerCase()] = {
            word: wordData.word,
            phonetic: wordData.phonetic,
            meaning: wordData.meaning,
            sentence: wordData.sentence,
            options: wordData.options,
            answerIndex: wordData.answerIndex
        };
        this.save();
        return this._data.dict[wordData.word.toLowerCase()];
    },

    /**
     * 更新单词的例句
     * @param {string} word - 单词
     * @param {string} sentence - 例句
     * @param {string} phonetic - 音标（可选）
     * @param {string} meaning - 释义（可选）
     * @returns {Object} 更新后的单词数据
     */
    updateWordSentence(word, sentence, phonetic = null, meaning = null) {
        const wordKey = word.toLowerCase();
        if (this._data.dict[wordKey]) {
            this._data.dict[wordKey].sentence = sentence;
            if (phonetic) this._data.dict[wordKey].phonetic = phonetic;
            if (meaning) this._data.dict[wordKey].meaning = meaning;
            this.save();
            return this._data.dict[wordKey];
        }
        return null;
    },

    /**
     * 批量更新单词例句
     * @param {Array} materials - AI生成的素材数组
     * @returns {number} 更新的单词数量
     */
    batchUpdateWordSentences(materials) {
        let updatedCount = 0;
        if (materials && materials.flashcard) {
            materials.flashcard.forEach((item, idx) => {
                const word = item.word;
                // 使用flashcard中的完整例句（已替换___为实际单词）
                const sentence = item.sentence || '';
                const phonetic = item.phonetic || '';
                const meaning = item.meaning || '';
                
                if (this.updateWordSentence(word, sentence, phonetic, meaning)) {
                    updatedCount++;
                } else {
                    // 如果单词不存在，添加到词典
                    this.addWord({
                        word: word,
                        phonetic: phonetic || `/${word}/`,
                        meaning: meaning || '',
                        sentence: sentence,
                        options: materials.context?.[idx]?.options,
                        answerIndex: materials.context?.[idx]?.correctIndex
                    });
                    updatedCount++;
                }
            });
        }
        return updatedCount;
    },

    // ==================== 任务操作 ====================
    
    getTasks() {
        return this._data.tasks;
    },

    getTasksByTeacher(teacherId) {
        return this._data.tasks.filter(t => t.teacherId === teacherId);
    },

    getTasksByStudent(studentId) {
        const student = this.findStudent(studentId);
        if (!student) {
            console.warn('getTasksByStudent: Student not found', studentId);
            return [];
        }
        
        // 返回分配给该学生的、未撤回的任务（包括active、paused、completed）
        return this._data.tasks.filter(t => {
            // 检查任务是否分配给了该学生
            const assignedStudents = t.assignedStudents || [];
            const isAssigned = assignedStudents.includes(studentId);
            // 检查任务状态不是已撤回
            const notWithdrawn = t.status !== 'withdrawn';
            return isAssigned && notWithdrawn;
        });
    },

    addTask(taskData) {
        const newTask = {
            id: helpers.generateId('task'),
            teacherId: taskData.teacherId,
            title: taskData.title,
            wordListId: taskData.wordListId,
            wordListTitle: taskData.wordListTitle || '',
            type: taskData.type,
            date: helpers.getTodayDate(),
            status: 'active',
            createdAt: taskData.createdAt || Date.now()
        };
        
        // 保存分配的学生
        if (taskData.assignedStudents) {
            newTask.assignedStudents = taskData.assignedStudents;
        }
        
        // 保存任务类型信息（支持多选）
        if (taskData.taskTypes) {
            newTask.taskTypes = taskData.taskTypes;
        }
        if (taskData.taskTypeNames) {
            newTask.taskTypeNames = taskData.taskTypeNames;
        }
        if (taskData.deadline) {
            newTask.deadline = taskData.deadline;
        }
        if (taskData.aiAnalysis) {
            newTask.aiAnalysis = taskData.aiAnalysis;
        }
        if (taskData.aiMaterials) {
            newTask.aiMaterials = taskData.aiMaterials;
        }
        
        this._data.tasks.push(newTask);
        this.save();
        return newTask;
    },

    // ==================== 学习日志操作 ====================
    
    getLearningLogs() {
        return this._data.learningLogs;
    },

    getLearningLogsByTeacher(teacherId) {
        return this._data.learningLogs.filter(l => l.teacherId === teacherId);
    },

    getLearningLogsByStudent(studentId) {
        return this._data.learningLogs.filter(l => l.studentId === studentId);
    },

    addLearningLog(logData) {
        const newLog = {
            id: helpers.generateId('L'),
            studentId: logData.studentId,
            teacherId: logData.teacherId,
            date: helpers.getTodayDate(),
            learnedCount: logData.learnedCount || 0,
            reviewCount: logData.reviewCount || 0,
            correctRate: logData.correctRate || 0,
            weakWord: logData.weakWord || '-',
            taskType: logData.taskType || 'learn'
        };
        this._data.learningLogs.push(newLog);
        this.save();
        return newLog;
    },

    // ==================== 学生记忆状态操作 ====================
    
    getStudentState(studentId) {
        return this._data.studentStates[studentId] || { learned: [], queue: {} };
    },

    updateStudentState(studentId, state) {
        this._data.studentStates[studentId] = state;
        this.save();
        return state;
    },

    addLearnedWord(studentId, word) {
        const state = this.getStudentState(studentId);
        if (!state.learned.includes(word)) {
            state.learned.push(word);
            state.queue[word] = {
                nextReview: Date.now() + 86400000, // 1天后复习
                level: 1
            };
            this.updateStudentState(studentId, state);
        }
        return state;
    },

    // ==================== 系统操作 ====================
    
    getSystem() {
        return this._data.system;
    },

    updateSystem(updates) {
        Object.assign(this._data.system, updates);
        this.save();
        return this._data.system;
    },

    // ==================== 统计数据 ====================
    
    getStats() {
        return {
            teacherCount: this._data.teachers.length,
            studentCount: this._data.students.length,
            todayLearningCount: this._data.learningLogs.filter(l => l.date === helpers.getTodayDate()).length,
            totalWords: Object.keys(this._data.dict).length,
            totalTasks: this._data.tasks.length,
            wordlistCount: this._data.wordLists.length
        };
    },

    getTeacherStats(teacherId) {
        const students = this.getStudentsByTeacher(teacherId);
        const logs = this.getLearningLogsByTeacher(teacherId);
        const wordlists = this.getWordListsByTeacher(teacherId);
        const tasks = this.getTasksByTeacher(teacherId);
        
        return {
            studentCount: students.length,
            totalLogs: logs.length,
            todayLogs: logs.filter(l => l.date === helpers.getTodayDate()).length,
            wordlistCount: wordlists.length,
            taskCount: tasks.length,
            avgCorrectRate: logs.length > 0 
                ? Math.round(logs.reduce((sum, l) => sum + l.correctRate, 0) / logs.length)
                : 0
        };
    },

    getStudentStats(studentId) {
        const student = this.findStudent(studentId);
        if (!student) return null;
        
        const logs = this.getLearningLogsByStudent(studentId);
        const accuracy = student.totalQuestions > 0 
            ? Math.round((student.totalCorrect / student.totalQuestions) * 100)
            : 0;
        
        return {
            ...student,
            logCount: logs.length,
            accuracy: accuracy,
            title: helpers.getTitle(student.coins)
        };
    },

    // ==================== AI配置操作 ====================

    /**
     * 获取AI配置
     */
    getAIConfig() {
        // 从system存储中获取AI配置
        const system = this._data.system || {};
        return system.aiConfig || {
            provider: 'builtin',
            apiKey: '',
            endpoint: '',
            model: '',
            temperature: 0.7,
            maxTokens: 2000,
            systemPrompt: '你是一个专业的英语教育助手，擅长为单词生成真实语境例句和干扰选项。',
            lastUpdated: null
        };
    },

    /**
     * 保存AI配置
     */
    saveAIConfig(config) {
        if (!this._data.system) {
            this._data.system = {};
        }
        this._data.system.aiConfig = config;
        this.save();
        return config;
    },

    getDictionaryCache(word) {
        if (!word) return null;
        if (!this._data.system) this._data.system = {};
        if (!this._data.system.dictionaryCache) this._data.system.dictionaryCache = {};
        const key = word.toLowerCase();
        const item = this._data.system.dictionaryCache[key];
        if (!item) return null;
        const ttl = 14 * 24 * 60 * 60 * 1000;
        if (item.savedAt && Date.now() - item.savedAt > ttl) return null;
        return item.data || null;
    },

    saveDictionaryCache(word, data) {
        if (!word) return null;
        if (!this._data.system) this._data.system = {};
        if (!this._data.system.dictionaryCache) this._data.system.dictionaryCache = {};
        const key = word.toLowerCase();
        this._data.system.dictionaryCache[key] = { savedAt: Date.now(), data };
        this.save();
        return data;
    },

    upsertWord(wordData) {
        if (!wordData || !wordData.word) return null;
        const key = wordData.word.toLowerCase();
        const existing = this._data.dict[key] || { word: wordData.word };
        this._data.dict[key] = {
            word: existing.word || wordData.word,
            phonetic: existing.phonetic || wordData.phonetic,
            meaning: existing.meaning || wordData.meaning,
            sentence: existing.sentence || wordData.sentence,
            options: wordData.options !== undefined ? wordData.options : existing.options,
            answerIndex: wordData.answerIndex !== undefined ? wordData.answerIndex : existing.answerIndex
        };
        this.save();
        return this._data.dict[key];
    },

    /**
     * 检查是否使用外部AI
     */
    isExternalAIEnabled() {
        const config = this.getAIConfig();
        return config.provider !== 'builtin' && config.apiKey;
    },

    /**
     * 获取AI配置（用于API调用）
     */
    getAIConfigForAPI() {
        const config = this.getAIConfig();
        if (config.provider === 'builtin') {
            return null;
        }
        return {
            provider: config.provider,
            apiKey: config.apiKey,
            endpoint: config.endpoint,
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            systemPrompt: config.systemPrompt
        };
    },

    // ==================== 难词清单操作 ====================

    /**
     * 获取学生的难词列表
     */
    getDifficultWords(studentId) {
        if (!this._data.difficultWords) {
            this._data.difficultWords = {};
        }
        return this._data.difficultWords[studentId] || [];
    },

    /**
     * 保存学生的难词列表
     */
    saveDifficultWords(studentId, words) {
        if (!this._data.difficultWords) {
            this._data.difficultWords = {};
        }
        this._data.difficultWords[studentId] = words;
        this.save();
        return words;
    },

    /**
     * 添加难词
     */
    addDifficultWord(studentId, wordData) {
        const words = this.getDifficultWords(studentId);
        const exists = words.find(w => w.word === wordData.word);
        if (!exists) {
            words.push({
                ...wordData,
                addedAt: Date.now(),
                errorCount: 1
            });
            this.saveDifficultWords(studentId, words);
        } else {
            exists.errorCount = (exists.errorCount || 1) + 1;
            exists.lastErrorAt = Date.now();
            this.saveDifficultWords(studentId, words);
        }
        return words;
    },

    /**
     * 从难词列表中移除
     */
    removeDifficultWord(studentId, word) {
        const words = this.getDifficultWords(studentId);
        const filtered = words.filter(w => w.word !== word);
        return this.saveDifficultWords(studentId, filtered);
    },

    /**
     * 获取学习历史记录
     */
    getLearningHistory(studentId) {
        if (!this._data.learningHistory) {
            this._data.learningHistory = {};
        }
        return this._data.learningHistory[studentId] || [];
    },

    /**
     * 添加学习历史记录
     */
    addLearningHistory(studentId, historyData) {
        if (!this._data.learningHistory) {
            this._data.learningHistory = {};
        }
        if (!this._data.learningHistory[studentId]) {
            this._data.learningHistory[studentId] = [];
        }
        this._data.learningHistory[studentId].push({
            ...historyData,
            id: helpers.generateId('h'),
            timestamp: Date.now()
        });
        this.save();
        return this._data.learningHistory[studentId];
    }
    ,
    /**
     * AI草稿存储
     */
    getAIDraft(wordlistId, teacherId) {
        if (!this._data.aiDrafts) {
            this._data.aiDrafts = {};
        }
        if (teacherId) {
            if (!this._data.aiDrafts[teacherId]) {
                this._data.aiDrafts[teacherId] = {};
            }
            return this._data.aiDrafts[teacherId][wordlistId] || null;
        }
        return this._data.aiDrafts[wordlistId] || null;
    },
    saveAIDraft(wordlistId, draft, teacherId) {
        if (!this._data.aiDrafts) {
            this._data.aiDrafts = {};
        }
        if (teacherId) {
            if (!this._data.aiDrafts[teacherId]) {
                this._data.aiDrafts[teacherId] = {};
            }
            this._data.aiDrafts[teacherId][wordlistId] = draft;
        } else {
            this._data.aiDrafts[wordlistId] = draft;
        }
        this.save();
        return draft;
    },
    clearAIDraft(wordlistId, teacherId) {
        if (!this._data.aiDrafts) return true;
        if (teacherId) {
            if (this._data.aiDrafts[teacherId] && this._data.aiDrafts[teacherId][wordlistId]) {
                delete this._data.aiDrafts[teacherId][wordlistId];
                this.save();
            }
            return true;
        }
        if (this._data.aiDrafts[wordlistId]) {
            delete this._data.aiDrafts[wordlistId];
            this.save();
        }
        return true;
    },

    // ==================== 教师审核句子存储 ====================

    /**
     * 保存教师审核过的句子
     * @param {string} teacherId - 教师ID
     * @param {string} wordlistId - 词表ID
     * @param {Object} reviewData - 审核数据
     */
    saveTeacherReviewedSentences(teacherId, wordlistId, reviewData) {
        if (!this._data.teacherReviewedSentences) {
            this._data.teacherReviewedSentences = {};
        }
        if (!this._data.teacherReviewedSentences[teacherId]) {
            this._data.teacherReviewedSentences[teacherId] = {};
        }
        
        this._data.teacherReviewedSentences[teacherId][wordlistId] = {
            ...reviewData,
            savedAt: Date.now()
        };
        
        this.save();
        return reviewData;
    },

    /**
     * 获取教师审核过的句子
     * @param {string} teacherId - 教师ID
     * @param {string} wordlistId - 词表ID
     * @returns {Object|null} 审核数据
     */
    getTeacherReviewedSentences(teacherId, wordlistId) {
        if (!this._data.teacherReviewedSentences) {
            return null;
        }
        return this._data.teacherReviewedSentences[teacherId]?.[wordlistId] || null;
    },

    /**
     * 获取教师所有审核记录
     * @param {string} teacherId - 教师ID
     * @returns {Object} 所有审核记录
     */
    getAllTeacherReviewedSentences(teacherId) {
        if (!this._data.teacherReviewedSentences) {
            return {};
        }
        return this._data.teacherReviewedSentences[teacherId] || {};
    },

    /**
     * 删除教师审核记录
     * @param {string} teacherId - 教师ID
     * @param {string} wordlistId - 词表ID
     */
    deleteTeacherReviewedSentences(teacherId, wordlistId) {
        if (!this._data.teacherReviewedSentences) {
            return true;
        }
        if (this._data.teacherReviewedSentences[teacherId]) {
            delete this._data.teacherReviewedSentences[teacherId][wordlistId];
            this.save();
        }
        return true;
    },

    /**
     * 检查词表是否有教师审核记录
     * @param {string} teacherId - 教师ID
     * @param {string} wordlistId - 词表ID
     * @returns {boolean} 是否有审核记录
     */
    hasTeacherReviewedSentences(teacherId, wordlistId) {
        const review = this.getTeacherReviewedSentences(teacherId, wordlistId);
        return review && review.sentences && Object.keys(review.sentences).length > 0;
    },

    // ==================== 数据备份与恢复 ====================

    /**
     * 导出全量数据
     */
    exportData() {
        const data = this._data;
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `xinji_vocab_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * 导入全量数据
     * @param {string} jsonStr - JSON字符串
     */
    importData(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            // 简单校验数据结构
            if (!data.users && !data.students && !data.teachers) {
                throw new Error('Invalid data format');
            }
            this._data = data;
            this.save();
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    }
};
