/**
 * Auth 路由合并入口
 * 将 login / logout / me / register / reset-password / change-password 合并为一个 Function
 * 通过请求路径最后一段（action）进行分发，保持原有 URL 不变
 *
 * Vercel Hobby 计划限制 12 个 Serverless Functions，合并后总数：8
 *   auth/index.js (本文件), admin/reset-password, admin/teachers,
 *   school/data, vocabulary/[id], vocabulary/index, ai/proxy, sync
 */

const { prisma } = require('../_lib/prisma');
const { ok, created, fail, methodNotAllowed } = require('../_lib/http');
const { signToken, verifyPassword, hashPassword, getAuthUser } = require('../_lib/auth');

const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'root';

// ─── 默认管理员初始化 ─────────────────────────────────────────────────────────
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

// ─── 各 action 处理器 ─────────────────────────────────────────────────────────

async function handleLogin(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);
  try {
    await ensureDefaultAdmin();
    const { username, className, password, role } = req.body || {};
    if (!username || !password || !role) return fail(res, 400, '缺少登录参数');

    const normalizedRole = String(role).toUpperCase();
    const query = {
      username: String(username).trim(),
      role: normalizedRole,
      className: normalizedRole === 'STUDENT' ? String(className || '').trim() || null : null,
    };
    if (normalizedRole === 'STUDENT' && !query.className) {
      return fail(res, 400, '学生登录必须提供班级');
    }

    const user = await prisma.user.findFirst({ where: query });
    if (!user) return fail(res, 404, '用户不存在');

    // 暂时禁用账号锁定功能
    // if (user.lockUntil && user.lockUntil > new Date()) {
    //   return fail(res, 403, '账号已锁定，请稍后重试');
    // }

    const matched = await verifyPassword(String(password), user.passwordHash);
    if (!matched) {
      // 暂时禁用登录尝试次数限制
      // const attempts = user.loginAttempts + 1;
      // await prisma.user.update({
      //   where: { id: user.id },
      //   data: {
      //     loginAttempts: attempts,
      //     lockUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
      //   },
      // });
      return fail(res, 401, '密码错误');
    }

    // 重置登录尝试次数
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
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);
  return ok(res, { message: '已退出' });
}

async function handleMe(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);
  try {
    const user = await getAuthUser(req);
    if (!user) return fail(res, 401, '未登录');
    return ok(res, {
      user: {
        id: user.id,
        username: user.username,
        role: user.role.toLowerCase(),
        className: user.className,
        passwordChanged: user.passwordChanged,
      },
    });
  } catch (error) {
    return fail(res, 500, '获取会话失败', error.message);
  }
}

async function handleRegister(req, res) {
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
        teacherId: operator.role === 'TEACHER' && normalizedRole === 'STUDENT' ? operator.id : null,
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
}

async function handleResetPassword(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);
  try {
    const operator = await getAuthUser(req);
    if (!operator) return fail(res, 401, '未登录');
    if (!['TEACHER', 'ADMIN'].includes(operator.role)) return fail(res, 403, '权限不足');

    const { username, className, newPassword } = req.body || {};
    if (!username || !newPassword) return fail(res, 400, '参数错误：需要 username 和 newPassword');

    const query = { username: String(username).trim(), role: 'STUDENT' };
    if (className) query.className = String(className).trim();

    const student = await prisma.user.findFirst({ where: query });
    if (!student) return fail(res, 404, '学生账号不存在');

    const passwordHash = await hashPassword(String(newPassword));
    await prisma.user.update({
      where: { id: student.id },
      data: { passwordHash, passwordChanged: false, loginAttempts: 0, lockUntil: null },
    });

    return ok(res, { success: true, message: '密码已重置' });
  } catch (error) {
    return fail(res, 500, '重置密码失败', error.message);
  }
}

async function handleChangePassword(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);
  try {
    const user = await getAuthUser(req);
    if (!user) return fail(res, 401, '未登录');

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return fail(res, 400, '参数错误：需要 currentPassword 和 newPassword');
    if (String(newPassword).length < 4) return fail(res, 400, '新密码长度至少 4 位');

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return fail(res, 404, '用户不存在');

    const valid = await verifyPassword(String(currentPassword), dbUser.passwordHash);
    // If this is a forced password change (passwordChanged === false), we allow skipping the currentPassword check
    // since the frontend might have lost the original password due to a redirect.
    if (!valid && !(dbUser.passwordChanged === false && currentPassword === 'ignored')) {
      return fail(res, 400, '当前密码错误');
    }

    const newHash = await hashPassword(String(newPassword));
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { passwordHash: newHash, passwordChanged: true },
    });

    return ok(res, { success: true, message: '密码修改成功', changedAt: new Date().toISOString() });
  } catch (error) {
    return fail(res, 500, '修改密码失败', error.message);
  }
}

// ─── 主路由分发 ───────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // 从 URL 路径中提取 action，支持 /api/auth/login、/api/auth/me 等
  const urlPath = req.url ? req.url.split('?')[0] : '';
  const segments = urlPath.replace(/\/+$/, '').split('/');
  const action = segments[segments.length - 1]; // 取最后一段

  switch (action) {
    case 'login':          return handleLogin(req, res);
    case 'logout':         return handleLogout(req, res);
    case 'me':             return handleMe(req, res);
    case 'register':       return handleRegister(req, res);
    case 'reset-password': return handleResetPassword(req, res);
    case 'change-password':return handleChangePassword(req, res);
    default:
      return fail(res, 404, `未知的 auth 操作: ${action}`);
  }
};
