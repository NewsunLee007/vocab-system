const { prisma } = require('../_lib/prisma');
const { getAuthUser, hashPassword, verifyPassword } = require('../_lib/auth');
const { ok, fail, methodNotAllowed } = require('../_lib/http');

/**
 * 学生修改自己的密码
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);

  try {
    const user = await getAuthUser(req);
    if (!user) return fail(res, 401, '未登录');

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return fail(res, 400, '参数错误：需要 currentPassword 和 newPassword');
    }
    if (String(newPassword).length < 4) {
      return fail(res, 400, '新密码长度至少 4 位');
    }

    // 从数据库取最新记录（含 passwordHash）
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return fail(res, 404, '用户不存在');

    // 验证当前密码
    const valid = await verifyPassword(String(currentPassword), dbUser.passwordHash);
    if (!valid) return fail(res, 400, '当前密码错误');

    const newHash = await hashPassword(String(newPassword));
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        passwordHash: newHash,
        passwordChanged: true,
      },
    });

    return ok(res, { success: true, message: '密码修改成功', changedAt: new Date().toISOString() });
  } catch (error) {
    return fail(res, 500, '修改密码失败', error.message);
  }
};
