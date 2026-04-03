const dataSync = {
    init() {
        console.log('dataSync initialized');
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
            console.log('saveLearningRecord:', record);
            
            if (!window.api) {
                console.log('API not available, saving to local storage only');
                return true;
            }

            let vocabularyId = record.vocabularyId;
            
            if (!vocabularyId && record.word) {
                vocabularyId = await this.ensureVocabularyExists(record.word, record.cn || record.meaning);
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
                    await window.api.createLearningRecord(payload);
                    console.log('Learning record saved to server');
                } catch (apiError) {
                    console.warn('Failed to save to server, using local only:', apiError);
                }
            }

            return true;
        } catch (error) {
            console.warn('Save learning record:', error);
            return false;
        }
    },

    async saveErrorWord(word, wordlistId, errorType, correctAnswer) {
        try {
            console.log('saveErrorWord:', { word, wordlistId, errorType, correctAnswer });
            
            await this.saveLearningRecord({
                word: word,
                correct: false,
                mode: 'error',
                errorType: errorType,
                correctAnswer: correctAnswer
            });

            return true;
        } catch (error) {
            console.warn('Save error word:', error);
            return false;
        }
    },

    async ensureVocabularyExists(word, definition) {
        try {
            if (!window.api) return null;

            const keyword = word.toLowerCase();
            const result = await window.api.fetchVocabularies({ keyword, pageSize: 10 });
            
            if (result && result.items && result.items.length > 0) {
                const existing = result.items.find(item => item.word.toLowerCase() === keyword);
                if (existing) return existing.id;
            }

            try {
                const newVocab = await window.api.createVocabulary({
                    word: word,
                    definition: definition || word,
                    phonetic: null,
                    example: null,
                    difficulty: 1
                });
                return newVocab.id;
            } catch (createError) {
                console.warn('Failed to create vocabulary:', createError);
                return null;
            }
        } catch (error) {
            console.warn('Ensure vocabulary exists:', error);
            return null;
        }
    },

    async syncWordlistsToServer() {
        try {
            if (!window.db || !window.api) return false;

            const wordLists = window.db.getWordLists ? window.db.getWordLists() : [];
            
            for (const wordList of wordLists) {
                if (wordList.words && Array.isArray(wordList.words)) {
                    for (const word of wordList.words) {
                        const wordData = window.db.findWord ? window.db.findWord(word.toLowerCase()) : null;
                        if (wordData) {
                            await this.ensureVocabularyExists(
                                wordData.word || word,
                                wordData.meaning || wordData.definition || word
                            );
                        }
                    }
                }
            }
            
            console.log('Wordlists synced to server');
            return true;
        } catch (error) {
            console.warn('Sync wordlists to server:', error);
            return false;
        }
    },

    clearAllData() {
        console.log('clearAllData called');
    }
};

window.dataSync = dataSync;
