const express = require('express');
const { z } = require('zod');
const { withConn } = require('../db/pool');
const { ok, fail } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/',
  requireAuth(),
  requireRole(['admin', 'teacher', 'student']),
  asyncHandler(async (req, res) => {
    const qStudentId = req.query.studentId;
    const studentId = req.user.role === 'student' ? req.user.sub : (qStudentId || null);
    if (!studentId) return fail(res, 400, 'VALIDATION_ERROR', 'studentId is required');

    const type = req.query.type || null;
    const limit = Math.min(Number(req.query.limit || 100), 500);

    const params = [studentId];
    let where = 'WHERE student_id=?';
    if (type) {
      where += ' AND record_type=?';
      params.push(type);
    }
    params.push(limit);

    const rows = await withConn((conn) =>
      conn.query(
        `SELECT id, student_id AS studentId, vocabulary_id AS vocabularyId, record_type AS recordType, payload, score, created_at AS createdAt, updated_at AS updatedAt
         FROM learning_records ${where} ORDER BY created_at DESC LIMIT ?`,
        params
      )
    );
    return ok(res, rows.map((r) => ({ ...r, payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload })));
  })
);

const createSchema = z.object({
  body: z.object({
    studentId: z.string().min(1).optional(),
    vocabularyId: z.string().min(1).optional(),
    recordType: z.string().min(1),
    payload: z.any(),
    score: z.number().int().optional()
  })
});

router.post(
  '/',
  requireAuth(),
  requireRole(['admin', 'teacher', 'student']),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const b = req.validated.body;
    const studentId = req.user.role === 'student' ? req.user.sub : b.studentId;
    if (!studentId) return fail(res, 400, 'VALIDATION_ERROR', 'studentId is required');

    const result = await withConn((conn) =>
      conn.query(
        'INSERT INTO learning_records (student_id, vocabulary_id, record_type, payload, score) VALUES (?,?,?,?,?)',
        [studentId, b.vocabularyId || null, b.recordType, JSON.stringify(b.payload ?? {}), b.score ?? null]
      )
    );
    return ok(res, { id: Number(result.insertId) });
  })
);

module.exports = router;

