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
  requireRole(['student']),
  asyncHandler(async (req, res) => {
    const studentId = req.user.sub;
    const rows = await withConn((conn) =>
      conn.query(
        'SELECT payload FROM learning_records WHERE student_id=? AND record_type=? ORDER BY created_at DESC LIMIT 1',
        [studentId, 'state']
      )
    );
    const row = rows[0];
    const data = row ? (typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload) : {};
    return ok(res, { data });
  })
);

const pushSchema = z.object({
  body: z.object({
    data: z.any()
  })
});

router.post(
  '/',
  requireAuth(),
  requireRole(['student']),
  validate(pushSchema),
  asyncHandler(async (req, res) => {
    const studentId = req.user.sub;
    const payload = req.validated.body.data ?? {};

    await withConn((conn) =>
      conn.query('INSERT INTO learning_records (student_id, record_type, payload) VALUES (?,?,?)', [
        studentId,
        'state',
        JSON.stringify(payload)
      ])
    );

    return ok(res, { message: 'Synced' });
  })
);

router.use((req, res) => fail(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed'));

module.exports = router;

