const { prisma } = require('../_lib/prisma');
const { ok, fail, methodNotAllowed } = require('../_lib/http');
const { signToken, verifyPassword, hashPassword } = require('../_lib/auth');

const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'root';

async function ensureDefaultAdmin() {
  const admin = await prisma.user.findFirst({
    where: { username: 'admin', role: 'ADMIN' },
  });
  if (admin) return admin;
  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  return prisma.user.create({
    data: {
      username: 'admin',
      role: 'ADMIN',
      passwordHash,
      passwordChanged: false,
    },
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);

  try {
    await ensureDefaultAdmin();

    const { username, className, password, role } = req.body || {};
    if (!username || !password || !role) {
      return fail(res, 400, '缺少登录参数');
    }

    const normalizedRole = String(role).toUpperCase();
    const query = {
      username: String(username).trim(),
      role: normalizedRole,
      className:
        normalizedRole === 'STUDENT'
          ? String(className || '').trim() || null
          : null,
    };

    if (normalizedRole === 'STUDENT' && !query.className) {
      return fail(res, 400, '学生登录必须提供班级');
    }

    const user = await prisma.user.findFirst({ where: query });
    if (!user) return fail(res, 404, '用户不存在');

    if (user.lockUntil && user.lockUntil > new Date()) {
      return fail(res, 403, '账号已锁定，请稍后重试');
    }

    const matched = await verifyPassword(String(password), user.passwordHash);
    if (!matched) {
      const attempts = user.loginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: attempts,
          lockUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });
      return fail(res, 401, `密码错误（${attempts}/5）`);
    }

    if (user.loginAttempts > 0 || user.lockUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockUntil: null },
      });
    }

    const token = signToken(user);
    return ok(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role.toLowerCase(),
        className: user.className,
        passwordChanged: user.passwordChanged,
      },
    });
  } catch (error) {
    return fail(res, 500, '登录失败', error.message);
  }
};
