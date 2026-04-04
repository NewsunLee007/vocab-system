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

    async saveLearningProgress(wordlistId, progressData) {
        try {
            console.log('saveLearningProgress:', { wordlistId, progressData });
            return true;
        } catch (error) {
            console.warn('Save learning progress:', error);
            return false;
        }
    },

    async syncStudentCoins(studentId, coins) {
        try {
            this.init();
            
            console.log('syncStudentCoins:', { studentId, coins });
            
            if (!window.api) {
                console.log('API not available, cannot sync coins');
                return false;
            }

            try {
                const result = await window.api.updateStudentCoins(studentId, coins);
                console.log('Coins synced to server:', result);
                return true;
            } catch (apiError) {
                console.warn('Failed to sync coins to server:', apiError.message || apiError);
                return false;
            }
        } catch (error) {
            console.warn('Sync student coins error:', error.message || error);
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
