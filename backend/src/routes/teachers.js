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
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const rows = await withConn((conn) =>
      conn.query('SELECT id, username, name, subject, role, password_changed AS passwordChanged, created_at AS createdAt FROM teachers ORDER BY created_at DESC')
    );
    return ok(res, rows);
  })
);

const createSchema = z.object({
  body: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
    name: z.string().min(1),
    subject: z.string().optional(),
    role: z.enum(['admin', 'teacher']).optional(),
    password: z.string().min(6).optional()
  })
});

router.post(
  '/',
  requireAuth(),
  requireRole(['admin']),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { id, username, name, subject, role, password } = req.validated.body;
    const passwordHash = await bcrypt.hash(password || '123456', 10);
    await withConn((conn) =>
      conn.query(
        'INSERT INTO teachers (id, username, name, subject, role, password_hash, password_changed) VALUES (?,?,?,?,?,?,0)',
        [id, username, name, subject || null, role || 'teacher', passwordHash]
      )
    );
    return ok(res, { id });
  })
);

const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    username: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    subject: z.string().optional(),
    role: z.enum(['admin', 'teacher']).optional()
  })
});

router.put(
  '/:id',
  requireAuth(),
  requireRole(['admin']),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const { username, name, subject, role } = req.validated.body;

    const fields = [];
    const values = [];
    if (username !== undefined) {
      fields.push('username=?');
      values.push(username);
    }
    if (name !== undefined) {
      fields.push('name=?');
      values.push(name);
    }
    if (subject !== undefined) {
      fields.push('subject=?');
      values.push(subject);
    }
    if (role !== undefined) {
      fields.push('role=?');
      values.push(role);
    }

    if (fields.length === 0) return ok(res, { id });

    values.push(id);
    await withConn((conn) => conn.query(`UPDATE teachers SET ${fields.join(', ')} WHERE id=?`, values));
    return ok(res, { id });
  })
);

router.delete(
  '/:id',
  requireAuth(),
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await withConn((conn) => conn.query('DELETE FROM teachers WHERE id=?', [id]));
    return ok(res, { id });
  })
);

module.exports = router;

