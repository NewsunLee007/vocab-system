const { getAuthUser } = require('../_lib/auth');
const { ok, fail, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
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
};
