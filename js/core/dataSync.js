const dataSync = {
    _initialized: false,
    
    init() {
        if (this._initialized) return;
        this._initialized = true;
        console.log('dataSync initialized');
        if (window.api && typeof window.api.initToken === 'function') {
            window.api.initToken();
        }
    },

    async saveStudentData(studentData) {
        try {
            this.init();
            
            if (!window.api) {
                console.log('API not available, cannot save student data');
                return false;
            }

            const user = window.auth && window.auth.getCurrentUser ? window.auth.getCurrentUser() : null;
            if (!user) {
                console.log('No user logged in, cannot save student data');
                return false;
            }

            if (user.role !== 'STUDENT') {
                console.log('User is not a student, skipping student data save');
                return false;
            }

            console.log('Saving student data:', studentData);
            const result = await window.api.updateStudentData(user.id, studentData);
            console.log('Student data saved:', result);
            return true;
        } catch (error) {
            console.warn('Save student data error:', error.message || error);
            return false;
        }
    },

    async fetchStudentData() {
        try {
            this.init();
            
            if (!window.api) {
                console.log('API not available, cannot fetch student data');
                return null;
            }

            const user = window.auth && window.auth.getCurrentUser ? window.auth.getCurrentUser() : null;
            if (!user) {
                console.log('No user logged in, cannot fetch student data');
                return null;
            }

            if (user.role !== 'STUDENT') {
                console.log('User is not a student, skipping student data fetch');
                return null;
            }

            const result = await window.api.fetchStudentData(user.id);
            console.log('Student data fetched:', result);
            return result;
        } catch (error) {
            console.warn('Fetch student data error:', error.message || error);
            return null;
        }
    },

    async saveWordList(wordList) {
        try {
            this.init();
            
            if (!window.api) {
                console.log('API not available, cannot save wordlist');
                return null;
            }

            console.log('Saving wordlist:', wordList);
            const result = await window.api.createWordList(wordList);
            console.log('Wordlist saved:', result);
            return result;
        } catch (error) {
            console.warn('Save wordlist error:', error.message || error);
            return null;
        }
    },

    async fetchWordLists() {
        try {
            this.init();
            
            if (!window.api) {
                console.log('API not available, cannot fetch wordlists');
                return [];
            }

            const result = await window.api.fetchWordLists();
            console.log('Wordlists fetched:', result);
            return result;
        } catch (error) {
            console.warn('Fetch wordlists error:', error.message || error);
            return [];
        }
    },

    async saveLearningProgress(wordlistId, progressData) {
        try {
            console.log('saveLearningProgress:', { wordlistId, progressData });
            return true;
        } catch (error) {
            console.warn('Save learning progress:', error);
            return false;
        }
    },

    async saveLearningRecord(record) {
        try {
            this.init();
            
            console.log('saveLearningRecord:', record);
            
            if (!window.api) {
                console.log('API not available, saving to local storage only');
                return true;
            }

            let vocabularyId = record.vocabularyId;
            
            if (!vocabularyId && record.word) {
                vocabularyId = await this.ensureVocabularyExists(record.word, record.cn || record.meaning || record.definition);
            }

            if (vocabularyId) {
                const payload = {
                    vocabularyId: vocabularyId,
                    attempts: 1,
                    correct: record.correct ? 1 : 0,
                    mastery: record.correct ? 0.5 : 0,
                    recordType: record.mode || 'learning',
                    payload: record
                };

                try {
                    const result = await window.api.createLearningRecord(payload);
                    console.log('Learning record saved to server:', result);
                    
                    // 同时更新学生积分
                    const user = window.auth && window.auth.getCurrentUser ? window.auth.getCurrentUser() : null;
                    if (user && user.role === 'STUDENT' && record.correct) {
                        this.saveStudentData({
                            coins: { increment: 10 },
                            totalLearned: { increment: 1 }
                        });
                    }
                    
                    return true;
                } catch (apiError) {
                    console.warn('Failed to save to server, using local only:', apiError.message || apiError);
                    return false;
                }
            } else {
                console.warn('No vocabulary ID found for word:', record.word);
                return false;
            }
        } catch (error) {
            console.warn('Save learning record error:', error.message || error);
            return false;
        }
    },

    async saveErrorWord(word, wordlistId, errorType, correctAnswer) {
        try {
            this.init();
            
            console.log('saveErrorWord:', { word, wordlistId, errorType, correctAnswer });
            
            const success = await this.saveLearningRecord({
                word: word,
                wordlistId: wordlistId,
                correct: false,
                mode: 'error',
                errorType: errorType,
                correctAnswer: correctAnswer
            });

            return success;
        } catch (error) {
            console.warn('Save error word error:', error.message || error);
            return false;
        }
    },

    async ensureVocabularyExists(word, definition) {
        try {
            this.init();
            
            if (!window.api) {
                console.log('API not available, cannot ensure vocabulary exists');
                return null;
            }

            const keyword = word.toLowerCase();
            console.log('Checking if vocabulary exists:', keyword);
            
            try {
                const result = await window.api.fetchVocabularies({ keyword, pageSize: 10 });
                console.log('Fetch vocabularies result:', result);
                
                if (result && result.items && result.items.length > 0) {
                    const existing = result.items.find(item => item.word.toLowerCase() === keyword);
                    if (existing) {
                        console.log('Vocabulary found:', existing.id);
                        return existing.id;
                    }
                }
            } catch (fetchError) {
                console.warn('Failed to fetch vocabularies:', fetchError.message || fetchError);
            }

            try {
                console.log('Creating new vocabulary:', { word, definition });
                const newVocab = await window.api.createVocabulary({
                    word: word,
                    definition: definition || word,
                    phonetic: null,
                    example: null,
                    difficulty: 1
                });
                console.log('Vocabulary created:', newVocab.id);
                return newVocab.id;
            } catch (createError) {
                console.warn('Failed to create vocabulary:', createError.message || createError);
                return null;
            }
        } catch (error) {
            console.warn('Ensure vocabulary exists error:', error.message || error);
            return null;
        }
    },

    async syncWordlistsToServer() {
        try {
            this.init();
            
            if (!window.db || !window.api) {
                console.log('DB or API not available, cannot sync wordlists');
                return false;
            }

            const wordLists = window.db.getWordLists ? window.db.getWordLists() : [];
            console.log('Syncing wordlists to server:', wordLists.length);
            
            for (const wordList of wordLists) {
                try {
                    await this.saveWordList({
                        name: wordList.title || wordList.name,
                        description: wordList.description || '',
                        words: wordList.words || []
                    });
                } catch (e) {
                    console.warn('Failed to save wordlist:', wordList.name, e);
                }
                
                if (wordList.words && Array.isArray(wordList.words)) {
                    console.log(`Syncing words: ${wordList.name || 'Unnamed'} (${wordList.words.length} words)`);
                    for (const word of wordList.words) {
                        const wordData = window.db.findWord ? window.db.findWord(word.toLowerCase()) : null;
                        if (wordData) {
                            await this.ensureVocabularyExists(
                                wordData.word || word,
                                wordData.meaning || wordData.definition || word
                            );
                        } else {
                            await this.ensureVocabularyExists(word, word);
                        }
                    }
                }
            }
            
            console.log('Wordlists synced to server');
            return true;
        } catch (error) {
            console.warn('Sync wordlists to server error:', error.message || error);
            return false;
        }
    },

    clearAllData() {
        console.log('clearAllData called');
    }
};

window.dataSync = dataSync;
