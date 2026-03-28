const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { withConn } = require('../db/pool');
const { config } = require('../config');
const { ok, fail } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const loginSchema = z.object({
  body: z.object({
    role: z.enum(['admin', 'teacher', 'student']),
    username: z.string().min(1),
    password: z.string().min(1),
    className: z.string().min(1).optional()
  })
});

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { role, username, password, className } = req.validated.body;

    const user = await withConn(async (conn) => {
      if (role === 'student') {
        const rows = await conn.query(
          'SELECT id, name, class_name AS className, password_hash AS passwordHash, password_changed AS passwordChanged FROM students WHERE class_name=? AND name=? LIMIT 1',
          [className || '', username]
        );
        return rows[0] || null;
      }

      const rows = await conn.query(
        'SELECT id, username, name, role, password_hash AS passwordHash, password_changed AS passwordChanged FROM teachers WHERE username=? LIMIT 1',
        [username]
      );
      const row = rows[0] || null;
      if (!row) return null;
      if (role === 'admin' && row.role !== 'admin') return null;
      if (role === 'teacher' && row.role !== 'teacher') return null;
      return row;
    });

    if (!user) return fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid credentials');

    const payload = {
      sub: user.id,
      role: role,
      username: role === 'student' ? user.name : user.username
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
    res.cookie(config.cookieName, token, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      domain: config.cookieDomain,
      path: '/'
    });

    return ok(res, {
      user: {
        id: user.id,
        username: payload.username,
        role,
        className: role === 'student' ? user.className : undefined,
        passwordChanged: Boolean(user.passwordChanged)
      }
    });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    res.clearCookie(config.cookieName, { path: '/' });
    return ok(res, { message: 'Logged out' });
  })
);

router.get(
  '/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { sub, role } = req.user;
    const user = await withConn(async (conn) => {
      if (role === 'student') {
        const rows = await conn.query(
          'SELECT id, name AS username, class_name AS className, password_changed AS passwordChanged FROM students WHERE id=? LIMIT 1',
          [sub]
        );
        return rows[0] || null;
      }
      const rows = await conn.query(
        'SELECT id, username, role, password_changed AS passwordChanged FROM teachers WHERE id=? LIMIT 1',
        [sub]
      );
      return rows[0] || null;
    });

    if (!user) return fail(res, 401, 'UNAUTHENTICATED', 'Invalid session');

    return ok(res, {
      user: {
        id: user.id,
        username: user.username,
        role: role,
        className: user.className,
        passwordChanged: Boolean(user.passwordChanged)
      }
    });
  })
);

const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(8)
  })
});

router.post(
  '/change-password',
  requireAuth(),
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.validated.body;
    const userId = req.user.sub;
    const role = req.user.role;

    if (role === 'student') {
      await withConn(async (conn) => {
        const rows = await conn.query('SELECT password_hash AS passwordHash FROM students WHERE id=? LIMIT 1', [userId]);
        const row = rows[0];
        if (!row) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'NOT_FOUND' });
        const isMatch = await bcrypt.compare(oldPassword, row.passwordHash);
        if (!isMatch) throw Object.assign(new Error('Old password incorrect'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });
        const hash = await bcrypt.hash(newPassword, 10);
        await conn.query('UPDATE students SET password_hash=?, password_changed=1 WHERE id=?', [hash, userId]);
      });
      return ok(res, { message: 'Password updated successfully.' });
    }

    await withConn(async (conn) => {
      const rows = await conn.query('SELECT password_hash AS passwordHash FROM teachers WHERE id=? LIMIT 1', [userId]);
      const row = rows[0];
      if (!row) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'NOT_FOUND' });
      const isMatch = await bcrypt.compare(oldPassword, row.passwordHash);
      if (!isMatch) throw Object.assign(new Error('Old password incorrect'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });
      const hash = await bcrypt.hash(newPassword, 10);
      await conn.query('UPDATE teachers SET password_hash=?, password_changed=1 WHERE id=?', [hash, userId]);
    });

    return ok(res, { message: 'Password updated successfully.' });
  })
);

module.exports = router;
