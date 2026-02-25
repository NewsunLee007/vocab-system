/**
 * 新纪元英语词汇系统 - 初始测试数据
 * 包含：管理员、教师、学生、词库、任务、学习日志等
 */

const SEED_DATA = {
    // 系统配置
    system: {
        version: '1.0.0',
        mockCurrentIP: '192.168.1.' + Math.floor(Math.random() * 255),
        lastLoginIP: null,
        lastLoginStudentId: null
    },

    // 管理员账号
    admins: [
        { id: 'admin', pwd: btoa('root'), name: '教务处管理员', passwordChanged: false }
    ],

    // 教师账号
    teachers: [
        { id: 't01', pwd: btoa('123'), name: '张三老师', subject: '英语', passwordChanged: false },
        { id: 't02', pwd: btoa('123'), name: '李四老师', subject: '英语', passwordChanged: false }
    ],

    // 学生数据
    students: [
        { 
            id: 's01', 
            teacherId: 't01', 
            class: '七年级1班', 
            name: '李华', 
            coins: 150, 
            badges: ['新手起航'],
            streak: 3,
            totalLearned: 25,
            totalTests: 5,
            totalCorrect: 45,
            totalQuestions: 50
        },
        { 
            id: 's02', 
            teacherId: 't01', 
            class: '七年级1班', 
            name: '王明', 
            coins: 320, 
            badges: ['词汇达人', '连胜王者'],
            streak: 7,
            totalLearned: 68,
            totalTests: 12,
            totalCorrect: 110,
            totalQuestions: 120
        },
        { 
            id: 's03', 
            teacherId: 't02', 
            class: '八年级2班', 
            name: '赵雪', 
            coins: 80, 
            badges: ['新手起航'],
            streak: 1,
            totalLearned: 12,
            totalTests: 2,
            totalCorrect: 15,
            totalQuestions: 20
        },
        { 
            id: 's04', 
            teacherId: 't01', 
            class: '七年级2班', 
            name: '张伟', 
            coins: 0, 
            badges: [],
            streak: 0,
            totalLearned: 0,
            totalTests: 0,
            totalCorrect: 0,
            totalQuestions: 0
        }
    ],

    // 词表数据
    wordLists: [
        { 
            id: 'wl1', 
            teacherId: 't01', 
            title: '人教版 七年级下册 Unit 1', 
            type: '教材', 
            textbook: '人教版',
            grade: '七年级',
            volume: '下册',
            unit: '1',
            words: ['routine', 'geography', 'instrument', 'exercise'],
            createdAt: '2026-02-15'
        },
        { 
            id: 'wl2', 
            teacherId: 't01', 
            title: '新概念 七年级上册 课外', 
            type: '课外', 
            textbook: '新概念',
            grade: '七年级',
            volume: '上册',
            unit: '课外',
            words: ['festival', 'exercise'],
            createdAt: '2026-02-18'
        },
        { 
            id: 'wl3', 
            teacherId: 't02', 
            title: '外研版 八年级上册 Unit 3', 
            type: '教材', 
            textbook: '外研版',
            grade: '八年级',
            volume: '上册',
            unit: '3',
            words: ['geography', 'instrument'],
            createdAt: '2026-02-19'
        }
    ],

    // 公用词库（核心字典池）
    dict: {
        'routine': { 
            word: 'routine', 
            phonetic: '/ruːˈtiːn/', 
            meaning: 'n. 常规；日常事务', 
            sentence: "Doing morning exercises is part of his daily ___.", 
            options: ["routine", "festival", "library", "instrument"], 
            answerIndex: 0 
        },
        'geography': { 
            word: 'geography', 
            phonetic: '/dʒiˈɒɡrəfi/', 
            meaning: 'n. 地理(学)', 
            sentence: "In our ___ class, we learn about mountains and rivers.", 
            options: ["history", "math", "geography", "music"], 
            answerIndex: 2 
        },
        'instrument': { 
            word: 'instrument', 
            phonetic: '/ˈɪnstrəmənt/', 
            meaning: 'n. 乐器；工具', 
            sentence: "The piano is a beautiful musical ___.", 
            options: ["animal", "instrument", "clothes", "subject"], 
            answerIndex: 1 
        },
        'exercise': { 
            word: 'exercise', 
            phonetic: '/ˈeksəsaɪz/', 
            meaning: 'v./n. 锻炼；练习', 
            sentence: "You should ___ every day to keep healthy.", 
            options: ["sleep", "eat", "exercise", "cry"], 
            answerIndex: 2 
        },
        'festival': { 
            word: 'festival', 
            phonetic: '/ˈfestɪvl/', 
            meaning: 'n. 节日', 
            sentence: "The Spring ___ is the most important holiday in China.", 
            options: ["festival", "season", "weather", "month"], 
            answerIndex: 0 
        }
    },

    // 任务数据
    tasks: [
        { 
            id: 'task1', 
            teacherId: 't01', 
            title: '今日必修：Unit 1 词汇学习', 
            wordListId: 'wl1', 
            type: 'learn', 
            date: '2026-02-20',
            status: 'active'
        },
        { 
            id: 'task2', 
            teacherId: 't01', 
            title: 'AI智能检测：Unit 1', 
            wordListId: 'wl1', 
            type: 'test', 
            date: '2026-02-20',
            status: 'active'
        },
        { 
            id: 'task3', 
            teacherId: 't02', 
            title: '八年级词汇预习', 
            wordListId: 'wl3', 
            type: 'learn', 
            date: '2026-02-19',
            status: 'active'
        }
    ],

    // 学习日志
    learningLogs: [
        { 
            id: 'L1', 
            studentId: 's01', 
            teacherId: 't01', 
            date: '2026-02-20', 
            learnedCount: 5, 
            reviewCount: 2, 
            correctRate: 80, 
            weakWord: 'routine',
            taskType: 'learn'
        },
        { 
            id: 'L2', 
            studentId: 's02', 
            teacherId: 't01', 
            date: '2026-02-20', 
            learnedCount: 10, 
            reviewCount: 5, 
            correctRate: 95, 
            weakWord: '-',
            taskType: 'test'
        },
        { 
            id: 'L3', 
            studentId: 's01', 
            teacherId: 't01', 
            date: '2026-02-19', 
            learnedCount: 3, 
            reviewCount: 1, 
            correctRate: 70, 
            weakWord: 'geography',
            taskType: 'learn'
        },
        { 
            id: 'L4', 
            studentId: 's03', 
            teacherId: 't02', 
            date: '2026-02-20', 
            learnedCount: 4, 
            reviewCount: 2, 
            correctRate: 85, 
            weakWord: '-',
            taskType: 'learn'
        }
    ],

    // 学生记忆状态（间隔重复算法用）
    studentStates: {
        's01': { 
            learned: ['routine', 'geography'], 
            queue: {
                'routine': { nextReview: Date.now() + 86400000, level: 1 },
                'geography': { nextReview: Date.now() + 172800000, level: 2 }
            }
        },
        's02': { 
            learned: ['routine', 'geography', 'instrument', 'exercise'], 
            queue: {
                'routine': { nextReview: Date.now() + 86400000, level: 3 },
                'geography': { nextReview: Date.now() + 172800000, level: 2 },
                'instrument': { nextReview: Date.now() + 86400000, level: 1 },
                'exercise': { nextReview: Date.now() + 259200000, level: 3 }
            }
        },
        's03': { 
            learned: ['festival'], 
            queue: {
                'festival': { nextReview: Date.now() + 86400000, level: 1 }
            }
        }
    }
};

// 导出数据供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SEED_DATA;
}
