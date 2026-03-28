/**
 * 新纪元英语词汇系统 - 例句质量验证器
 * 
 * 提供多重校验机制确保AI生成例句的质量
 */

const sentenceValidator = {
    // 质量检查规则
    validationRules: {
        // 检查句子是否包含填空
        hasBlank: (sentence) => {
            return sentence.includes('___');
        },

        // 检查句子长度是否合理
        validLength: (sentence, gradeLevel = 'middle') => {
            const wordCount = sentence.split(/\s+/).length;
            const limits = {
                primary: { min: 4, max: 12 },
                middle: { min: 5, max: 18 },
                high: { min: 6, max: 25 }
            };
            const limit = limits[gradeLevel] || limits.middle;
            return wordCount >= limit.min && wordCount <= limit.max;
        },

        // 检查句子是否以标点结尾
        hasEndingPunctuation: (sentence) => {
            return /[.!?]$/.test(sentence.trim());
        },

        // 检查是否包含目标单词（或填空位置）
        containsTarget: (sentence, word) => {
            return sentence.includes('___') || 
                   sentence.toLowerCase().includes(word.toLowerCase());
        },

        // 检查是否有明显的语法错误模式
        noGrammarErrors: (sentence) => {
            // 检查常见错误模式
            const errorPatterns = [
                /\s{2,}/,  // 多个空格
                /^[a-z]/,   // 小写开头
                /[.!?]{2,}/, // 多个标点
                /\s+[.!?]/  // 标点前有空格
            ];
            return !errorPatterns.some(pattern => pattern.test(sentence));
        },

        // 检查是否使用偏僻词汇
        noObscureWords: (sentence, gradeLevel = 'middle') => {
            // 简单的偏僻词检查 - 长单词比例
            const words = sentence.toLowerCase().match(/\b[a-z]+\b/g) || [];
            const longWords = words.filter(w => w.length > 10);
            return longWords.length <= words.length * 0.1; // 不超过10%的长单词
        }
    },

    /**
     * 执行完整验证
     * @param {Object} sentenceData - 句子数据
     * @param {string} word - 目标单词
     * @param {string} gradeLevel - 年级级别
     * @returns {Object} 验证结果
     */
    validate(sentenceData, word, gradeLevel = 'middle') {
        const sentence = sentenceData.sentence || sentenceData;
        const results = {
            passed: true,
            checks: {},
            errors: [],
            warnings: []
        };

        // 执行各项检查
        const checks = [
            { name: 'hasBlank', fn: () => this.validationRules.hasBlank(sentence), error: '句子缺少填空位置' },
            { name: 'validLength', fn: () => this.validationRules.validLength(sentence, gradeLevel), error: '句子长度不符合年级要求' },
            { name: 'hasEndingPunctuation', fn: () => this.validationRules.hasEndingPunctuation(sentence), error: '句子缺少结尾标点' },
            { name: 'containsTarget', fn: () => this.validationRules.containsTarget(sentence, word), error: '句子未包含目标单词' },
            { name: 'noGrammarErrors', fn: () => this.validationRules.noGrammarErrors(sentence), error: '句子存在语法错误模式' },
            { name: 'noObscureWords', fn: () => this.validationRules.noObscureWords(sentence, gradeLevel), warning: '句子可能包含偏僻词汇' }
        ];

        checks.forEach(check => {
            const passed = check.fn();
            results.checks[check.name] = passed;
            
            if (!passed) {
                if (check.error) {
                    results.errors.push(check.error);
                    results.passed = false;
                } else if (check.warning) {
                    results.warnings.push(check.warning);
                }
            }
        });

        // 计算质量分数
        results.qualityScore = this.calculateQualityScore(results);

        return results;
    },

    /**
     * 计算质量分数
     * @param {Object} validationResults - 验证结果
     * @returns {number} 质量分数 (0-100)
     */
    calculateQualityScore(validationResults) {
        let score = 100;
        
        // 错误扣分
        score -= validationResults.errors.length * 20;
        
        // 警告扣分
        score -= validationResults.warnings.length * 5;
        
        return Math.max(0, score);
    },

    /**
     * 批量验证
     * @param {Array} sentences - 句子列表
     * @param {string} gradeLevel - 年级级别
     * @returns {Object} 批量验证结果
     */
    validateBatch(sentences, gradeLevel = 'middle') {
        const results = {
            total: sentences.length,
            passed: 0,
            failed: 0,
            items: [],
            averageScore: 0
        };

        let totalScore = 0;

        sentences.forEach(item => {
            const validation = this.validate(
                item.sentence || item, 
                item.word, 
                gradeLevel
            );
            
            results.items.push({
                word: item.word,
                sentence: item.sentence || item,
                ...validation
            });

            if (validation.passed) {
                results.passed++;
            } else {
                results.failed++;
            }

            totalScore += validation.qualityScore;
        });

        results.averageScore = results.total > 0 
            ? Math.round(totalScore / results.total) 
            : 0;

        results.passRate = results.total > 0 
            ? Math.round((results.passed / results.total) * 100) 
            : 0;

        return results;
    },

    /**
     * 生成验证报告
     * @param {Object} batchResults - 批量验证结果
     * @returns {string} 报告文本
     */
    generateReport(batchResults) {
        const lines = [
            '=== 例句质量验证报告 ===',
            '',
            `总计: ${batchResults.total} 个句子`,
            `通过: ${batchResults.passed} 个`,
            `失败: ${batchResults.failed} 个`,
            `通过率: ${batchResults.passRate}%`,
            `平均质量分: ${batchResults.averageScore}`,
            '',
            '--- 详细结果 ---',
            ''
        ];

        batchResults.items.forEach((item, index) => {
            lines.push(`${index + 1}. ${item.word}`);
            lines.push(`   句子: ${item.sentence}`);
            lines.push(`   状态: ${item.passed ? '✅ 通过' : '❌ 失败'}`);
            lines.push(`   质量分: ${item.qualityScore}`);
            
            if (item.errors.length > 0) {
                lines.push(`   错误: ${item.errors.join(', ')}`);
            }
            
            if (item.warnings.length > 0) {
                lines.push(`   警告: ${item.warnings.join(', ')}`);
            }
            
            lines.push('');
        });

        return lines.join('\n');
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = sentenceValidator;
}
