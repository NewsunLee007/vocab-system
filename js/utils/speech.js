/**
 * 新纪元英语词汇系统 - 语音合成工具模块
 * 支持多种发音源，提供高质量语音播放
 */

const speech = {
    // 当前使用的语音源
    currentSource: 'native', // 'native' | 'responsive' | 'google'
    
    // 语音合成实例
    synth: window.speechSynthesis,
    
    // 可用的语音列表
    voices: [],
    
    // 首选语音
    preferredVoice: null,
    
    /**
     * 初始化语音合成
     */
    init() {
        if (!('speechSynthesis' in window)) {
            console.warn('浏览器不支持语音合成');
            return;
        }
        
        // 加载语音列表
        this.loadVoices();
        
        // 监听语音列表变化（Chrome需要）
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.loadVoices();
        }
    },
    
    /**
     * 加载可用语音
     */
    loadVoices() {
        this.voices = this.synth.getVoices();
        
        // 优先选择更自然清晰的英语女声，其次男声
        const preferredVoices = [
            'Google UK English Female',
            'Google US English',
            'Microsoft Zira - English (United States)',
            'Samantha',
            'Victoria',
            'Karen',
            'Google UK English Male',
            'Microsoft David - English (United States)',
            'Alex',
            'Daniel'
        ];
        
        for (const voiceName of preferredVoices) {
            const voice = this.voices.find(v => v.name === voiceName);
            if (voice) {
                this.preferredVoice = voice;
                console.log('Selected voice:', voice.name);
                break;
            }
        }
        
        // 如果没有找到首选语音，使用第一个英语语音
        if (!this.preferredVoice) {
            this.preferredVoice = this.voices.find(v => v.lang.startsWith('en'));
        }
    },
    
    /**
     * 播放单词发音
     * @param {string} text - 要播放的文本
     * @param {object} options - 播放选项
     */
    speak(text, options = {}) {
        if (!('speechSynthesis' in window)) {
            console.warn('浏览器不支持语音合成');
            return Promise.reject('不支持语音合成');
        }
        
        // 取消之前的语音
        this.synth.cancel();
        
        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            
            // 设置语音
            if (this.preferredVoice) {
                utterance.voice = this.preferredVoice;
            }
            
            // 设置参数：更自然的节奏与音高
            utterance.lang = options.lang || 'en-US';
            utterance.rate = options.rate || 0.8;   // 更慢一些，清晰可辨
            utterance.pitch = options.pitch || 1.0; // 自然音高
            utterance.volume = options.volume || 1;
            
            // 事件回调
            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(e);
            
            // 播放
            this.synth.speak(utterance);
        });
    },
    
    /**
     * 播放单词（带重试机制）
     */
    async speakWord(word, retryCount = 0) {
        try {
            await this.speak(word);
        } catch (error) {
            // 获取错误类型
            const errorType = error?.error || error?.message || 'unknown';
            
            // interrupted 通常是连续点击导致的正常中断，尝试重新播放
            // 但限制重试次数避免无限循环
            if (errorType === 'interrupted' || errorType === 'canceled') {
                console.log('语音播放被中断，尝试重新播放...');
                if (retryCount < 1) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    return this.speakWord(word, retryCount + 1);
                }
                return;
            }
            
            console.warn('语音播放失败:', errorType, error);
            
            // 其他错误可以重试
            if (retryCount < 2) {
                console.log(`重试语音播放 (${retryCount + 1}/2)...`);
                await new Promise(resolve => setTimeout(resolve, 100));
                return this.speakWord(word, retryCount + 1);
            }
        }
    },
    
    /**
     * 播放句子
     */
    async speakSentence(sentence, options = {}) {
        const opts = {
            rate: 0.9, // 句子稍快
            ...options
        };
        return this.speak(sentence, opts);
    },
    
    /**
     * 播放音标（拼读）
     */
    async speakPhonetic(phonetic) {
        // 将音标转换为可读的字母
        const readable = phonetic
            .replace(/[\/.]/g, '')
            .replace(/[ˈˌ]/g, '')
            .replace(/[ɑɒɔ]/g, 'a')
            .replace(/[ɛeɜ]/g, 'e')
            .replace(/[ɪi]/g, 'i')
            .replace(/[ʊu]/g, 'u')
            .replace(/[θðŋʃʒ]/g, '');
        
        return this.speak(readable, { rate: 0.7 });
    },
    
    /**
     * 停止播放
     */
    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
    },
    
    /**
     * 暂停播放
     */
    pause() {
        if (this.synth) {
            this.synth.pause();
        }
    },
    
    /**
     * 恢复播放
     */
    resume() {
        if (this.synth) {
            this.synth.resume();
        }
    },
    
    /**
     * 检查是否正在播放
     */
    isSpeaking() {
        return this.synth ? this.synth.speaking : false;
    },
    
    /**
     * 获取可用语音列表
     */
    getAvailableVoices() {
        return this.voices.filter(v => v.lang.startsWith('en'));
    },
    
    /**
     * 设置首选语音
     */
    setVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.preferredVoice = voice;
            return true;
        }
        return false;
    }
};

// 初始化
speech.init();
