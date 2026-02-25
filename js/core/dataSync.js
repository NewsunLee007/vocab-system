const dataSync = {
    init() {},

    async saveLearningProgress(wordlistId, progressData) {
        try {
            await fetch(api._url('/learning-records'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    recordType: 'learningProgress',
                    payload: {
                        wordlistId,
                        ...progressData,
                        timestamp: new Date().toISOString()
                    },
                    score: typeof progressData?.score === 'number' ? progressData.score : undefined
                })
            });
            return true;
        } catch (error) {
            errorHandler.handle(error, 'Save learning progress');
            return false;
        }
    },

    async saveLearningRecord(record) {
        try {
            await fetch(api._url('/learning-records'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    recordType: 'learningRecord',
                    payload: {
                        ...record,
                        timestamp: new Date().toISOString()
                    },
                    score: typeof record?.score === 'number' ? record.score : undefined
                })
            });
            return true;
        } catch (error) {
            errorHandler.handle(error, 'Save learning record');
            return false;
        }
    },

    async saveErrorWord(word, wordlistId, errorType, correctAnswer) {
        try {
            await fetch(api._url('/learning-records'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    recordType: 'errorWord',
                    payload: {
                        word,
                        wordlistId,
                        errorType,
                        correctAnswer,
                        timestamp: new Date().toISOString()
                    }
                })
            });
            return true;
        } catch (error) {
            errorHandler.handle(error, 'Save error word');
            return false;
        }
    },

    clearAllData() {}
};

window.dataSync = dataSync;

