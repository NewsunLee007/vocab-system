/**
 * 数据同步模块 - 处理学习数据的本地存储和云端同步
 */

const dataSync = {
    // 同步配置
    config: {
        syncInterval: 30000, // 30秒同步一次
        maxRetries: 3,
        retryDelay: 1000,
        batchSize: 50
    },

    // 同步状态
    syncStatus: {
        isOnline: navigator.onLine,
        lastSyncTime: null,
        pendingSync: [],
        isSyncing: false
    },

    /**
     * 初始化数据同步
     */
    init() {
        this.setupEventListeners();
        this.loadPendingSync();
        this.startPeriodicSync();
        
        console.log('Data sync initialized');
    },

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 网络状态变化
        window.addEventListener('online', () => {
            this.syncStatus.isOnline = true;
            this.processPendingSync();
        });

        window.addEventListener('offline', () => {
            this.syncStatus.isOnline = false;
        });

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.syncStatus.isOnline) {
                this.processPendingSync();
            }
        });

        // 窗口关闭前保存数据
        window.addEventListener('beforeunload', () => {
            this.saveAllData();
        });
    },

    /**
     * 保存学习进度
     */
    saveLearningProgress(wordlistId, progressData) {
        try {
            const user = auth.getCurrentUser();
            if (!user) return false;

            const key = `learningProgress_${user.id}_${wordlistId}`;
            const existingData = this.getLearningProgress(wordlistId) || {};
            
            const updatedProgress = {
                ...existingData,
                ...progressData,
                wordlistId: wordlistId,
                userId: user.id,
                lastUpdated: new Date().toISOString(),
                synced: false // 标记为未同步
            };

            localStorage.setItem(key, JSON.stringify(updatedProgress));
            
            // 添加到待同步队列
            this.addToPendingSync('learningProgress', updatedProgress);
            
            return true;
        } catch (error) {
            errorHandler.handle(error, 'Save learning progress');
            return false;
        }
    },

    /**
     * 获取学习进度
     */
    getLearningProgress(wordlistId) {
        try {
            const user = auth.getCurrentUser();
            if (!user) return null;

            const key = `learningProgress_${user.id}_${wordlistId}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            errorHandler.handle(error, 'Get learning progress');
            return null;
        }
    },

    /**
     * 保存学习记录
     */
    saveLearningRecord(record) {
        try {
            const user = auth.getCurrentUser();
            if (!user) return false;

            const key = `learningRecords_${user.id}`;
            const existingRecords = this.getLearningRecords() || [];
            
            const newRecord = {
                id: Date.now().toString(),
                userId: user.id,
                word: record.word,
                wordlistId: record.wordlistId,
                mode: record.mode, // 学习模式
                score: record.score,
                timeSpent: record.timeSpent,
                correct: record.correct,
                timestamp: new Date().toISOString(),
                synced: false
            };

            existingRecords.push(newRecord);
            
            // 限制记录数量，保留最近1000条
            if (existingRecords.length > 1000) {
                existingRecords.splice(0, existingRecords.length - 1000);
            }

            localStorage.setItem(key, JSON.stringify(existingRecords));
            
            // 添加到待同步队列
            this.addToPendingSync('learningRecord', newRecord);
            
            return true;
        } catch (error) {
            errorHandler.handle(error, 'Save learning record');
            return false;
        }
    },

    /**
     * 获取学习记录
     */
    getLearningRecords(limit = null) {
        try {
            const user = auth.getCurrentUser();
            if (!user) return [];

            const key = `learningRecords_${user.id}`;
            const data = localStorage.getItem(key);
            const records = data ? JSON.parse(data) : [];
            
            return limit ? records.slice(-limit) : records;
        } catch (error) {
            errorHandler.handle(error, 'Get learning records');
            return [];
        }
    },

    /**
     * 保存错误单词
     */
    saveErrorWord(word, wordlistId, errorType, correctAnswer) {
        try {
            const user = auth.getCurrentUser();
            if (!user) return false;

            const key = `errorWords_${user.id}`;
            const existingErrors = this.getErrorWords() || [];
            
            // 检查是否已存在
            const existingError = existingErrors.find(e => e.word === word);
            
            if (existingError) {
                // 更新错误次数和最后错误时间
                existingError.errorCount = (existingError.errorCount || 1) + 1;
                existingError.lastErrorTime = new Date().toISOString();
                existingError.wordlistId = wordlistId;
            } else {
                // 添加新错误
                existingErrors.push({
                    word: word,
                    wordlistId: wordlistId,
                    errorType: errorType,
                    correctAnswer: correctAnswer,
                    errorCount: 1,
                    firstErrorTime: new Date().toISOString(),
                    lastErrorTime: new Date().toISOString(),
                    synced: false
                });
            }

            localStorage.setItem(key, JSON.stringify(existingErrors));
            
            // 添加到待同步队列
            this.addToPendingSync('errorWord', existingErrors.find(e => e.word === word));
            
            return true;
        } catch (error) {
            errorHandler.handle(error, 'Save error word');
            return false;
        }
    },

    /**
     * 获取错误单词
     */
    getErrorWords() {
        try {
            const user = auth.getCurrentUser();
            if (!user) return [];

            const key = `errorWords_${user.id}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            errorHandler.handle(error, 'Get error words');
            return [];
        }
    },

    /**
     * 清除错误单词
     */
    clearErrorWord(word) {
        try {
            const user = auth.getCurrentUser();
            if (!user) return false;

            const key = `errorWords_${user.id}`;
            const existingErrors = this.getErrorWords() || [];
            
            const filteredErrors = existingErrors.filter(e => e.word !== word);
            localStorage.setItem(key, JSON.stringify(filteredErrors));
            
            return true;
        } catch (error) {
            errorHandler.handle(error, 'Clear error word');
            return false;
        }
    },

    /**
     * 添加到待同步队列
     */
    addToPendingSync(type, data) {
        const syncItem = {
            id: Date.now().toString(),
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            retryCount: 0
        };

        this.syncStatus.pendingSync.push(syncItem);
        this.savePendingSync();
        
        // 如果在线，立即尝试同步
        if (this.syncStatus.isOnline) {
            this.processPendingSync();
        }
    },

    /**
     * 处理待同步数据
     */
    async processPendingSync() {
        if (!this.syncStatus.isOnline || this.syncStatus.isSyncing || this.syncStatus.pendingSync.length === 0) {
            return;
        }

        this.syncStatus.isSyncing = true;
        errorHandler.showLoading('同步数据中...');

        try {
            const batch = this.syncStatus.pendingSync.slice(0, this.config.batchSize);
            const results = await Promise.allSettled(
                batch.map(item => this.syncItem(item))
            );

            // 处理同步结果
            const successful = [];
            const failed = [];

            results.forEach((result, index) => {
                const item = batch[index];
                if (result.status === 'fulfilled') {
                    successful.push(item);
                } else {
                    failed.push(item);
                    item.retryCount++;
                }
            });

            // 移除成功的项目
            this.syncStatus.pendingSync = this.syncStatus.pendingSync.filter(
                item => !successful.includes(item)
            );

            // 重试失败的项目（如果未达到最大重试次数）
            const retryable = failed.filter(item => item.retryCount < this.config.maxRetries);
            this.syncStatus.pendingSync.push(...retryable);

            // 永久失败的错误处理
            const permanentFailures = failed.filter(item => item.retryCount >= this.config.maxRetries);
            if (permanentFailures.length > 0) {
                errorHandler.handle(
                    new Error(`Failed to sync ${permanentFailures.length} items after ${this.config.maxRetries} retries`),
                    'Sync process'
                );
            }

            this.syncStatus.lastSyncTime = new Date().toISOString();
            this.savePendingSync();

            if (successful.length > 0) {
                errorHandler.showSuccess(`已同步 ${successful.length} 条学习记录`);
            }

        } catch (error) {
            errorHandler.handle(error, 'Process pending sync');
        } finally {
            this.syncStatus.isSyncing = false;
            errorHandler.hideLoading();
        }
    },

    /**
     * 同步单个项目
     */
    async syncItem(item) {
        // 这里实现实际的同步逻辑
        // 例如：发送到服务器API
        console.log('Syncing item:', item);
        
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 标记为已同步
        await this.markAsSynced(item.type, item.data);
        
        return true;
    },

    /**
     * 标记为已同步
     */
    async markAsSynced(type, data) {
        try {
            const user = auth.getCurrentUser();
            if (!user) return;

            switch (type) {
                case 'learningProgress':
                    const progressKey = `learningProgress_${user.id}_${data.wordlistId}`;
                    const progress = JSON.parse(localStorage.getItem(progressKey));
                    if (progress) {
                        progress.synced = true;
                        localStorage.setItem(progressKey, JSON.stringify(progress));
                    }
                    break;

                case 'learningRecord':
                    const recordsKey = `learningRecords_${user.id}`;
                    const records = JSON.parse(localStorage.getItem(recordsKey)) || [];
                    const record = records.find(r => r.id === data.id);
                    if (record) {
                        record.synced = true;
                        localStorage.setItem(recordsKey, JSON.stringify(records));
                    }
                    break;

                case 'errorWord':
                    const errorsKey = `errorWords_${user.id}`;
                    const errors = JSON.parse(localStorage.getItem(errorsKey)) || [];
                    const error = errors.find(e => e.word === data.word);
                    if (error) {
                        error.synced = true;
                        localStorage.setItem(errorsKey, JSON.stringify(errors));
                    }
                    break;
            }
        } catch (error) {
            errorHandler.handle(error, 'Mark as synced');
        }
    },

    /**
     * 保存待同步数据
     */
    savePendingSync() {
        try {
            localStorage.setItem('pendingSync', JSON.stringify(this.syncStatus.pendingSync));
        } catch (error) {
            errorHandler.handle(error, 'Save pending sync');
        }
    },

    /**
     * 加载待同步数据
     */
    loadPendingSync() {
        try {
            const data = localStorage.getItem('pendingSync');
            if (data) {
                this.syncStatus.pendingSync = JSON.parse(data);
            }
        } catch (error) {
            errorHandler.handle(error, 'Load pending sync');
            this.syncStatus.pendingSync = [];
        }
    },

    /**
     * 开始定期同步
     */
    startPeriodicSync() {
        setInterval(() => {
            if (this.syncStatus.isOnline && !this.syncStatus.isSyncing) {
                this.processPendingSync();
            }
        }, this.config.syncInterval);
    },

    /**
     * 保存所有数据
     */
    saveAllData() {
        // 确保所有待同步数据都被保存
        this.savePendingSync();
    },

    /**
     * 获取同步状态
     */
    getSyncStatus() {
        return {
            ...this.syncStatus,
            pendingCount: this.syncStatus.pendingSync.length
        };
    },

    /**
     * 清除所有本地数据
     */
    clearAllData() {
        try {
            const user = auth.getCurrentUser();
            if (!user) return;

            // 清除学习进度
            const progressKeys = Object.keys(localStorage).filter(key => 
                key.startsWith(`learningProgress_${user.id}_`)
            );
            progressKeys.forEach(key => localStorage.removeItem(key));

            // 清除学习记录
            localStorage.removeItem(`learningRecords_${user.id}`);

            // 清除错误单词
            localStorage.removeItem(`errorWords_${user.id}`);

            // 清除待同步数据
            localStorage.removeItem('pendingSync');

            this.syncStatus.pendingSync = [];
            this.syncStatus.lastSyncTime = null;

            console.log('All learning data cleared');
        } catch (error) {
            errorHandler.handle(error, 'Clear all data');
        }
    }
};

// 初始化数据同步
window.dataSync = dataSync;