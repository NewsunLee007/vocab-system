const { prisma } = require('../_lib/prisma');
const { getAuthUser, verifyPassword, hashPassword } = require('../_lib/auth');
const { ok, fail, methodNotAllowed } = require('../_lib/http');

function validatePassword(password) {
  if (!password || password.length < 8) return false;
  if (!/[A-Za-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  return true;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return methodNotAllowed(req, res, ['POST', 'PUT']);
  }

  try {
    const user = await getAuthUser(req);
    if (!user) return fail(res, 401, '未登录');

    const { oldPassword, newPassword } = req.body || {};
    if (!validatePassword(String(newPassword || ''))) {
      return fail(res, 400, '新密码至少8位，且包含字母和数字');
    }

    if (user.passwordChanged) {
      const matched = await verifyPassword(String(oldPassword || ''), user.passwordHash);
      if (!matched) return fail(res, 401, '旧密码不正确');
    }

    const passwordHash = await hashPassword(String(newPassword));
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChanged: true,
        loginAttempts: 0,
        lockUntil: null,
      },
    });

    return ok(res, { message: '密码修改成功' });
  } catch (error) {
    return fail(res, 500, '修改密码失败', error.message);
  }
};
