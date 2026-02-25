const express = require('express');
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
        `SELECT id, teacher_id AS teacherId, title, type, textbook, grade, volume, unit, words, created_at AS createdAt, updated_at AS updatedAt
         FROM vocabulary ${where} ORDER BY created_at DESC`,
        params
      )
    );
    return ok(res, rows.map((r) => ({ ...r, words: typeof r.words === 'string' ? JSON.parse(r.words) : r.words })));
  })
);

const createSchema = z.object({
  body: z.object({
    id: z.string().min(1).optional(),
    teacherId: z.string().min(1).optional(),
    title: z.string().min(1),
    type: z.string().optional(),
    textbook: z.string().optional(),
    grade: z.string().optional(),
    volume: z.string().optional(),
    unit: z.string().optional(),
    words: z.array(z.any())
  })
});

router.post(
  '/',
  requireAuth(),
  requireRole(['admin', 'teacher']),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const b = req.validated.body;
    const id = b.id || `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const teacherId = req.user.role === 'teacher' ? req.user.sub : (b.teacherId || null);

    await withConn((conn) =>
      conn.query(
        'INSERT INTO vocabulary (id, teacher_id, title, type, textbook, grade, volume, unit, words) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, teacherId, b.title, b.type || null, b.textbook || null, b.grade || null, b.volume || null, b.unit || null, JSON.stringify(b.words || [])]
      )
    );
    return ok(res, { id });
  })
);

const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1).optional(),
    type: z.string().optional(),
    textbook: z.string().optional(),
    grade: z.string().optional(),
    volume: z.string().optional(),
    unit: z.string().optional(),
    words: z.array(z.any()).optional()
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
    if (b.title !== undefined) {
      fields.push('title=?');
      values.push(b.title);
    }
    if (b.type !== undefined) {
      fields.push('type=?');
      values.push(b.type);
    }
    if (b.textbook !== undefined) {
      fields.push('textbook=?');
      values.push(b.textbook);
    }
    if (b.grade !== undefined) {
      fields.push('grade=?');
      values.push(b.grade);
    }
    if (b.volume !== undefined) {
      fields.push('volume=?');
      values.push(b.volume);
    }
    if (b.unit !== undefined) {
      fields.push('unit=?');
      values.push(b.unit);
    }
    if (b.words !== undefined) {
      fields.push('words=?');
      values.push(JSON.stringify(b.words));
    }
    if (fields.length === 0) return ok(res, { id });
    values.push(id);
    await withConn((conn) => conn.query(`UPDATE vocabulary SET ${fields.join(', ')} WHERE id=?`, values));
    return ok(res, { id });
  })
);

router.delete(
  '/:id',
  requireAuth(),
  requireRole(['admin', 'teacher']),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await withConn((conn) => conn.query('DELETE FROM vocabulary WHERE id=?', [id]));
    return ok(res, { id });
  })
);

module.exports = router;

