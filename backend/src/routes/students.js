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
  '/',
  requireAuth(),
  requireRole(['admin', 'teacher']),
  asyncHandler(async (req, res) => {
    const teacherId = req.user.role === 'teacher' ? req.user.sub : (req.query.teacherId || null);
    const params = [];
    let where = '';
    if (teacherId) {
      where = 'WHERE teacher_id=?';
      params.push(teacherId);
    }

    const rows = await withConn((conn) =>
      conn.query(
        `SELECT id, teacher_id AS teacherId, class_name AS className, name, password_changed AS passwordChanged, coins, badges, streak, total_learned AS totalLearned, total_tests AS totalTests, total_correct AS totalCorrect, total_questions AS totalQuestions, created_at AS createdAt
         FROM students ${where} ORDER BY created_at DESC`,
        params
      )
    );
    return ok(res, rows);
  })
);

const createSchema = z.object({
  body: z.object({
    id: z.string().min(1).optional(),
    teacherId: z.string().min(1).optional(),
    className: z.string().min(1),
    name: z.string().min(1),
    password: z.string().min(6).optional()
  })
});

router.post(
  '/',
  requireAuth(),
  requireRole(['admin', 'teacher']),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { id, teacherId, className, name, password } = req.validated.body;
    const studentId = id || `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const assignedTeacherId = req.user.role === 'teacher' ? req.user.sub : (teacherId || null);
    const passwordHash = await bcrypt.hash(password || '123456', 10);

    await withConn((conn) =>
      conn.query(
        'INSERT INTO students (id, teacher_id, class_name, name, password_hash, password_changed, badges) VALUES (?,?,?,?,?,0,?)',
        [studentId, assignedTeacherId, className, name, passwordHash, JSON.stringify([])]
      )
    );

    return ok(res, { id: studentId });
  })
);

const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    teacherId: z.string().min(1).nullable().optional(),
    className: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    coins: z.number().int().optional(),
    badges: z.array(z.any()).optional(),
    streak: z.number().int().optional(),
    totalLearned: z.number().int().optional(),
    totalTests: z.number().int().optional(),
    totalCorrect: z.number().int().optional(),
    totalQuestions: z.number().int().optional()
  })
});

router.put(
  '/:id',
  requireAuth(),
  requireRole(['admin', 'teacher']),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const b = req.validated.body;

    const fields = [];
    const values = [];

    if (b.teacherId !== undefined) {
      if (req.user.role === 'teacher') {
        fields.push('teacher_id=?');
        values.push(req.user.sub);
      } else {
        fields.push('teacher_id=?');
        values.push(b.teacherId);
      }
    }
    if (b.className !== undefined) {
      fields.push('class_name=?');
      values.push(b.className);
    }
    if (b.name !== undefined) {
      fields.push('name=?');
      values.push(b.name);
    }
    if (b.coins !== undefined) {
      fields.push('coins=?');
      values.push(b.coins);
    }
    if (b.badges !== undefined) {
      fields.push('badges=?');
      values.push(JSON.stringify(b.badges));
    }
    if (b.streak !== undefined) {
      fields.push('streak=?');
      values.push(b.streak);
    }
    if (b.totalLearned !== undefined) {
      fields.push('total_learned=?');
      values.push(b.totalLearned);
    }
    if (b.totalTests !== undefined) {
      fields.push('total_tests=?');
      values.push(b.totalTests);
    }
    if (b.totalCorrect !== undefined) {
      fields.push('total_correct=?');
      values.push(b.totalCorrect);
    }
    if (b.totalQuestions !== undefined) {
      fields.push('total_questions=?');
      values.push(b.totalQuestions);
    }

    if (fields.length === 0) return ok(res, { id });

    values.push(id);
    await withConn((conn) => conn.query(`UPDATE students SET ${fields.join(', ')} WHERE id=?`, values));
    return ok(res, { id });
  })
);

router.delete(
  '/:id',
  requireAuth(),
  requireRole(['admin', 'teacher']),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await withConn((conn) => conn.query('DELETE FROM students WHERE id=?', [id]));
    return ok(res, { id });
  })
);

module.exports = router;

