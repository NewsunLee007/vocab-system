const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { withConn } = require('../db/pool');
const { ok } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/data',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const teacherId = req.user.role === 'teacher' ? req.user.sub : null;

    // Fetch the student's assigned teacher id if they are a student
    let studentTeacherId = null;
    if (req.user.role === 'student') {
      const studentRows = await withConn(async (conn) => conn.query('SELECT teacher_id FROM students WHERE id=? LIMIT 1', [req.user.sub]));
      if (studentRows && studentRows[0]) {
        studentTeacherId = studentRows[0].teacher_id;
      }
    }
    const filterTeacherId = teacherId || studentTeacherId;

    const [teachers, students, vocabulary, tasks, globalStoreRows] = await withConn(async (conn) => {
      const teachersRows = req.user.role === 'admin'
        ? await conn.query('SELECT id, username, name, subject, role, password_changed AS passwordChanged FROM teachers ORDER BY created_at DESC')
        : await conn.query('SELECT id, username, name, subject, role, password_changed AS passwordChanged FROM teachers WHERE id=? LIMIT 1', [filterTeacherId]);

      const studentsRows = filterTeacherId
      ? await conn.query('SELECT id, teacher_id AS teacherId, class_name AS className, name, plain_password AS plainPassword, password_changed AS passwordChanged, coins, badges, streak, total_learned AS totalLearned, total_tests AS totalTests, total_correct AS totalCorrect, total_questions AS totalQuestions FROM students WHERE teacher_id=? ORDER BY created_at DESC', [filterTeacherId])
      : await conn.query('SELECT id, teacher_id AS teacherId, class_name AS className, name, plain_password AS plainPassword, password_changed AS passwordChanged, coins, badges, streak, total_learned AS totalLearned, total_tests AS totalTests, total_correct AS totalCorrect, total_questions AS totalQuestions FROM students ORDER BY created_at DESC');

      const vocabRows = filterTeacherId
        ? await conn.query('SELECT id, teacher_id AS teacherId, title, type, textbook, grade, volume, unit, words, created_at AS createdAt FROM vocabulary WHERE teacher_id=? ORDER BY created_at DESC', [filterTeacherId])
        : await conn.query('SELECT id, teacher_id AS teacherId, title, type, textbook, grade, volume, unit, words, created_at AS createdAt FROM vocabulary ORDER BY created_at DESC');

      const tasksRows = filterTeacherId
        ? await conn.query('SELECT * FROM tasks WHERE teacher_id=? ORDER BY created_at DESC', [filterTeacherId])
        : await conn.query('SELECT * FROM tasks ORDER BY created_at DESC');

      const gsRows = await conn.query('SELECT payload FROM global_store WHERE id="main"');

      return [teachersRows, studentsRows, vocabRows, tasksRows, gsRows];
    });

    const globalStore = globalStoreRows[0] ? (typeof globalStoreRows[0].payload === 'string' ? JSON.parse(globalStoreRows[0].payload) : globalStoreRows[0].payload) : {};

    const normalizedStudents = students.map((s) => ({ ...s, class: s.className, badges: typeof s.badges === 'string' ? JSON.parse(s.badges || '[]') : s.badges }));
    const normalizedTeachers = teachers.map((t) => ({ id: t.id, name: t.name, subject: t.subject || '英语', passwordChanged: Boolean(t.passwordChanged) }));
    const normalizedWordlists = vocabulary.map((v) => ({
      id: v.id,
      teacherId: v.teacherId,
      title: v.title,
      type: v.type,
      words: typeof v.words === 'string' ? JSON.parse(v.words) : v.words,
      createdAt: v.createdAt
    }));
    const normalizedTasks = tasks.map((t) => ({
      id: t.id,
      teacherId: t.teacher_id,
      title: t.title,
      wordListId: t.word_list_id,
      wordListTitle: t.word_list_title,
      type: t.type,
      date: t.date,
      status: t.status,
      createdAt: t.created_at,
      assignedStudents: typeof t.assigned_students === 'string' ? JSON.parse(t.assigned_students) : t.assigned_students,
      taskTypes: typeof t.task_types === 'string' ? JSON.parse(t.task_types) : t.task_types,
      taskTypeNames: typeof t.task_type_names === 'string' ? JSON.parse(t.task_type_names) : t.task_type_names,
      deadline: t.deadline,
      aiAnalysis: typeof t.ai_analysis === 'string' ? JSON.parse(t.ai_analysis) : t.ai_analysis,
      aiMaterials: typeof t.ai_materials === 'string' ? JSON.parse(t.ai_materials) : t.ai_materials
    }));

    const payload = {
      ...globalStore,
      teachers: normalizedTeachers,
      students: normalizedStudents,
      wordlists: normalizedWordlists,
      tasks: normalizedTasks,
      admins: []
    };

    return ok(res, { data: payload });
  })
);

const upsertSchema = z.object({
  body: z.object({
    data: z.object({
      teachers: z.array(z.any()).optional(),
      students: z.array(z.any()).optional(),
      wordlists: z.array(z.any()).optional(),
      tasks: z.array(z.any()).optional(),
      learningLogs: z.array(z.any()).optional(),
      studentStates: z.record(z.any()).optional()
    })
  })
});

router.post(
  '/data',
  requireAuth(),
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const teacherId = req.user.role === 'teacher' ? req.user.sub : null;
    const { data } = req.validated.body;

    const defaultHashTeacher = await bcrypt.hash('123456', 10);
    const defaultHashStudent = await bcrypt.hash('123456', 10);

    await withConn(async (conn) => {
      await conn.beginTransaction();
      try {
        const wordlists = data.wordlists || [];
        const students = data.students || [];
        const teachers = data.teachers || [];
        const tasks = data.tasks || [];
        const role = req.user.role;

        // 保存除 teacher, student, wordlists, tasks 之外的其他内容到 global_store
        const globalStorePayload = {
          learningLogs: data.learningLogs || [],
          studentStates: data.studentStates || {},
          dict: data.dict || {},
          aiDrafts: data.aiDrafts || {},
          difficultWords: data.difficultWords || {},
          learningHistory: data.learningHistory || {},
          teacherReviewedSentences: data.teacherReviewedSentences || {},
          testQuestionBank: data.testQuestionBank || {},
          studentTestHistory: data.studentTestHistory || {},
          aiConfig: data.aiConfig || null
        };

        // 获取原有的 global_store，防止学生端覆盖其他内容
        const gsRows = await conn.query('SELECT payload FROM global_store WHERE id="main"');
        const existingGlobalStore = gsRows[0] ? (typeof gsRows[0].payload === 'string' ? JSON.parse(gsRows[0].payload) : gsRows[0].payload) : {};
        
        let mergedGlobalStore = { ...existingGlobalStore };

        if (role === 'student') {
          // 学生只能更新 learningLogs (自己的), studentStates (自己的), learningHistory (自己的), studentTestHistory (自己的)
          // 简便起见，合并这些对象（前端发来的数据可能包含所有的，所以我们只更新前端发来的增量或者覆盖）
          // 由于 db.js 中 student 会读取整个 schoolData，并且保存时也会发整个 schoolData，
          // 直接覆盖会导致其他学生的 state 丢失（如果当前学生端没加载全）。
          // 但由于我们现在允许学生端通过 GET /data 加载所有人的状态，所以覆盖也是安全的（因为它是最新状态）。
          // 但为了更安全，我们进行合并。
          mergedGlobalStore.learningLogs = data.learningLogs || existingGlobalStore.learningLogs || [];
          mergedGlobalStore.studentStates = { ...(existingGlobalStore.studentStates || {}), ...(data.studentStates || {}) };
          mergedGlobalStore.learningHistory = { ...(existingGlobalStore.learningHistory || {}), ...(data.learningHistory || {}) };
          mergedGlobalStore.studentTestHistory = { ...(existingGlobalStore.studentTestHistory || {}), ...(data.studentTestHistory || {}) };
        } else {
          mergedGlobalStore = { ...existingGlobalStore, ...globalStorePayload };
        }

        await conn.query('INSERT INTO global_store (id, payload) VALUES ("main", ?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)', [JSON.stringify(mergedGlobalStore)]);

        if (role === 'admin') {
          for (const t of teachers) {
            if (!t || !t.id) continue;
            await conn.query(
              'INSERT INTO teachers (id, username, name, subject, role, password_hash, password_changed) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), subject=VALUES(subject), role=VALUES(role), password_changed=GREATEST(password_changed, VALUES(password_changed))',
              [t.id, t.id, t.name || t.id, t.subject || '英语', t.role === 'admin' ? 'admin' : 'teacher', defaultHashTeacher, t.passwordChanged ? 1 : 0]
            );
          }
        }

        // 仅允许管理员或老师更新所有学生，学生只能更新自己的进度
        for (const s of students) {
          if (!s || !s.id) continue;
          if (role === 'student' && s.id !== req.user.sub) continue; // 学生只能更新自己的记录
          
          const assignedTeacherId = teacherId || s.teacherId || null;
          await conn.query(
            'INSERT INTO students (id, teacher_id, class_name, name, password_hash, password_changed, coins, badges, streak, total_learned, total_tests, total_correct, total_questions) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE teacher_id=VALUES(teacher_id), class_name=VALUES(class_name), name=VALUES(name), password_changed=GREATEST(password_changed, VALUES(password_changed)), coins=VALUES(coins), badges=VALUES(badges), streak=VALUES(streak), total_learned=VALUES(total_learned), total_tests=VALUES(total_tests), total_correct=VALUES(total_correct), total_questions=VALUES(total_questions)',
            [
              s.id,
              assignedTeacherId,
              s.class || s.className || '',
              s.name || '',
              defaultHashStudent,
              s.passwordChanged ? 1 : 0,
              Number(s.coins || 0),
              JSON.stringify(s.badges || []),
              Number(s.streak || 0),
              Number(s.totalLearned || 0),
              Number(s.totalTests || 0),
              Number(s.totalCorrect || 0),
              Number(s.totalQuestions || 0)
            ]
          );
        }

        if (role === 'admin' || role === 'teacher') {
          for (const wl of wordlists) {
            if (!wl || !wl.id) continue;
            const ownerTeacherId = teacherId || wl.teacherId || null;
            await conn.query(
              'INSERT INTO vocabulary (id, teacher_id, title, type, words) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE teacher_id=VALUES(teacher_id), title=VALUES(title), type=VALUES(type), words=VALUES(words)',
              [wl.id, ownerTeacherId, wl.title || '', wl.type || null, JSON.stringify(wl.words || [])]
            );
          }

          for (const t of tasks) {
            if (!t || !t.id) continue;
            const ownerTeacherId = teacherId || t.teacherId || null;
            await conn.query(
              'INSERT INTO tasks (id, teacher_id, title, word_list_id, word_list_title, type, date, status, created_at, assigned_students, task_types, task_type_names, deadline, ai_analysis, ai_materials) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title), status=VALUES(status), assigned_students=VALUES(assigned_students), task_types=VALUES(task_types), task_type_names=VALUES(task_type_names), deadline=VALUES(deadline), ai_analysis=VALUES(ai_analysis), ai_materials=VALUES(ai_materials)',
              [
                t.id,
                ownerTeacherId,
                t.title || '',
                t.wordListId || null,
                t.wordListTitle || null,
                t.type || null,
                t.date || null,
                t.status || 'active',
                t.createdAt || Date.now(),
                JSON.stringify(t.assignedStudents || []),
                JSON.stringify(t.taskTypes || []),
                JSON.stringify(t.taskTypeNames || []),
                t.deadline || null,
                JSON.stringify(t.aiAnalysis || null),
                JSON.stringify(t.aiMaterials || null)
              ]
            );
          }
        }

        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      }
    });

    return ok(res, { message: 'School data updated' });
  })
);

module.exports = router;
