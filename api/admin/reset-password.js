const { prisma } = require('../_lib/prisma');
const { getAuthUser, hashPassword } = require('../_lib/auth');
const { ok, fail, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);

  try {
    const operator = await getAuthUser(req);
    if (!operator) return fail(res, 401, '未登录');
    if (operator.role !== 'ADMIN' && operator.role !== 'TEACHER') {
      return fail(res, 403, '权限不足');
    }

    const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
    if (!userIds.length) return fail(res, 400, 'userIds 不能为空');

    const passwordHash = await hashPassword('123456');
    const result = await prisma.user.updateMany({
      where: {
        id: { in: userIds.map((x) => String(x)) },
        ...(operator.role === 'TEACHER' ? { role: 'STUDENT' } : {}),
      },
      data: { passwordHash, passwordChanged: false, loginAttempts: 0, lockUntil: null },
    });

    return ok(res, { count: result.count });
  } catch (error) {
    return fail(res, 500, '重置密码失败', error.message);
  }
};
