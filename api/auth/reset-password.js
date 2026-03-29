const { prisma } = require('../_lib/prisma');
const { getAuthUser, hashPassword } = require('../_lib/auth');
const { ok, fail, methodNotAllowed } = require('../_lib/http');

/**
 * 重置学生密码（教师/教务处权限）
 * POST /api/auth/reset-password
 * Body: { username, className, newPassword }
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);

  try {
    const operator = await getAuthUser(req);
    if (!operator) return fail(res, 401, '未登录');

    if (!['TEACHER', 'ADMIN'].includes(operator.role)) {
      return fail(res, 403, '权限不足');
    }

    const { username, className, newPassword } = req.body || {};
    if (!username || !newPassword) {
      return fail(res, 400, '参数错误：需要 username 和 newPassword');
    }

    const query = {
      username: String(username).trim(),
      role: 'STUDENT',
    };
    if (className) {
      query.className = String(className).trim();
    }

    const student = await prisma.user.findFirst({ where: query });
    if (!student) return fail(res, 404, '学生账号不存在');

    const passwordHash = await hashPassword(String(newPassword));
    await prisma.user.update({
      where: { id: student.id },
      data: {
        passwordHash,
        passwordChanged: false,  // 重置后要求学生重新修改密码
        loginAttempts: 0,
        lockUntil: null,
      },
    });

    return ok(res, { success: true, message: '密码已重置' });
  } catch (error) {
    return fail(res, 500, '重置密码失败', error.message);
  }
};
