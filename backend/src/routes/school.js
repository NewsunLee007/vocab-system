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
  requireRole(['admin', 'teacher']),
  asyncHandler(async (req, res) => {
    const teacherId = req.user.role === 'teacher' ? req.user.sub : null;

    const [teachers, students, vocabulary] = await withConn(async (conn) => {
      const teachersRows = req.user.role === 'admin'
        ? await conn.query('SELECT id, username, name, subject, role, password_changed AS passwordChanged FROM teachers ORDER BY created_at DESC')
        : await conn.query('SELECT id, username, name, subject, role, password_changed AS passwordChanged FROM teachers WHERE id=? LIMIT 1', [teacherId]);

      const studentsRows = teacherId
      ? await conn.query('SELECT id, teacher_id AS teacherId, class_name AS className, name, plain_password AS plainPassword, password_changed AS passwordChanged, coins, badges, streak, total_learned AS totalLearned, total_tests AS totalTests, total_correct AS totalCorrect, total_questions AS totalQuestions FROM students WHERE teacher_id=? ORDER BY created_at DESC', [teacherId])
      : await conn.query('SELECT id, teacher_id AS teacherId, class_name AS className, name, plain_password AS plainPassword, password_changed AS passwordChanged, coins, badges, streak, total_learned AS totalLearned, total_tests AS totalTests, total_correct AS totalCorrect, total_questions AS totalQuestions FROM students ORDER BY created_at DESC');

      const vocabRows = teacherId
        ? await conn.query('SELECT id, teacher_id AS teacherId, title, type, textbook, grade, volume, unit, words, created_at AS createdAt FROM vocabulary WHERE teacher_id=? ORDER BY created_at DESC', [teacherId])
        : await conn.query('SELECT id, teacher_id AS teacherId, title, type, textbook, grade, volume, unit, words, created_at AS createdAt FROM vocabulary ORDER BY created_at DESC');

      return [teachersRows, studentsRows, vocabRows];
    });

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

    const payload = {
      teachers: normalizedTeachers,
      students: normalizedStudents,
      wordlists: normalizedWordlists,
      tasks: [],
      learningLogs: [],
      studentStates: {},
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
  requireRole(['admin', 'teacher']),
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

        if (req.user.role === 'admin') {
          for (const t of teachers) {
            if (!t || !t.id) continue;
            await conn.query(
              'INSERT INTO teachers (id, username, name, subject, role, password_hash, password_changed) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), subject=VALUES(subject), role=VALUES(role), password_changed=GREATEST(password_changed, VALUES(password_changed))',
              [t.id, t.id, t.name || t.id, t.subject || '英语', t.role === 'admin' ? 'admin' : 'teacher', defaultHashTeacher, t.passwordChanged ? 1 : 0]
            );
          }
        }

        for (const s of students) {
          if (!s || !s.id) continue;
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

        for (const wl of wordlists) {
          if (!wl || !wl.id) continue;
          const ownerTeacherId = teacherId || wl.teacherId || null;
          await conn.query(
            'INSERT INTO vocabulary (id, teacher_id, title, type, words) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE teacher_id=VALUES(teacher_id), title=VALUES(title), type=VALUES(type), words=VALUES(words)',
            [wl.id, ownerTeacherId, wl.title || '', wl.type || null, JSON.stringify(wl.words || [])]
          );
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
