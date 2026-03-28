const { prisma } = require('../_lib/prisma');
const { getAuthUser, hashPassword } = require('../_lib/auth');
const { created, fail, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);

  try {
    const operator = await getAuthUser(req);
    if (!operator) return fail(res, 401, '未登录');

    const { username, className, role, password } = req.body || {};
    const normalizedRole = String(role || '').toUpperCase();

    if (!username || !['TEACHER', 'STUDENT'].includes(normalizedRole)) {
      return fail(res, 400, '参数错误');
    }
    if (operator.role === 'TEACHER' && normalizedRole !== 'STUDENT') {
      return fail(res, 403, '教师只能创建学生');
    }
    if (normalizedRole === 'STUDENT' && !className) {
      return fail(res, 400, '学生必须提供班级');
    }

    const passwordHash = await hashPassword(String(password || '123456'));
    const user = await prisma.user.create({
      data: {
        username: String(username).trim(),
        className: normalizedRole === 'STUDENT' ? String(className).trim() : null,
        role: normalizedRole,
        passwordHash,
        passwordChanged: false,
      },
    });

    return created(res, {
      id: user.id,
      username: user.username,
      role: user.role.toLowerCase(),
      className: user.className,
    });
  } catch (error) {
    if (error.code === 'P2002') return fail(res, 409, '用户已存在');
    return fail(res, 500, '创建用户失败', error.message);
  }
};
