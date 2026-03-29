/**
 * 教师账户管理 API
 * GET  /api/admin/teachers        — 列出所有教师
 * POST /api/admin/teachers        — 创建教师账户（需 ADMIN 权限）
 * DELETE /api/admin/teachers      — 删除教师账户（需 ADMIN 权限，body: { userId }）
 */
const { prisma } = require('../_lib/prisma');
const { getAuthUser, hashPassword } = require('../_lib/auth');
const { ok, created, fail, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    return methodNotAllowed(req, res, ['GET', 'POST', 'DELETE']);
  }

  try {
    const operator = await getAuthUser(req);
    if (!operator) return fail(res, 401, '未登录');

    // ── GET: 列出所有教师 ──────────────────────────────────────────────────────
    if (req.method === 'GET') {
      if (operator.role !== 'ADMIN') return fail(res, 403, '权限不足');

      const teachers = await prisma.user.findMany({
        where: { role: 'TEACHER' },
        select: {
          id: true,
          username: true,
          passwordChanged: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return ok(res, teachers);
    }

    // ── POST: 创建教师账户 ───────────────────────────────────────────────────
    if (req.method === 'POST') {
      if (operator.role !== 'ADMIN') return fail(res, 403, '权限不足');

      const { username, password } = req.body || {};
      if (!username) return fail(res, 400, '请提供工号/用户名');

      const passwordHash = await hashPassword(String(password || '123456'));

      const user = await prisma.user.create({
        data: {
          username: String(username).trim(),
          role: 'TEACHER',
          passwordHash,
          passwordChanged: false,
        },
      });

      return created(res, {
        id: user.id,
        username: user.username,
        role: 'teacher',
        passwordChanged: user.passwordChanged,
      });
    }

    // ── DELETE: 删除教师账户 ────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      if (operator.role !== 'ADMIN') return fail(res, 403, '权限不足');

      const { userId } = req.body || {};
      if (!userId) return fail(res, 400, '请提供 userId');

      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) return fail(res, 404, '用户不存在');
      if (target.role !== 'TEACHER') return fail(res, 400, '只能删除教师账户');

      await prisma.user.delete({ where: { id: userId } });
      return ok(res, { deleted: userId });
    }
  } catch (error) {
    if (error.code === 'P2002') return fail(res, 409, '该用户名已存在');
    return fail(res, 500, '教师管理接口失败', error.message);
  }
};
