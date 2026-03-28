const { prisma } = require('../_lib/prisma');
const { getAuthUser } = require('../_lib/auth');
const { ok, fail, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
    return methodNotAllowed(req, res, ['GET', 'PUT', 'DELETE']);
  }

  try {
    const user = await getAuthUser(req);
    if (!user) return fail(res, 401, '未登录');

    const id = String(req.query.id || '').trim();
    if (!id) return fail(res, 400, 'id 不能为空');

    if (req.method === 'GET') {
      const item = await prisma.vocabulary.findUnique({ where: { id } });
      if (!item) return fail(res, 404, '词汇不存在');
      return ok(res, item);
    }

    if (user.role === 'STUDENT') return fail(res, 403, '学生无编辑权限');

    if (req.method === 'DELETE') {
      await prisma.vocabulary.delete({ where: { id } });
      return ok(res, { id });
    }

    const { word, phonetic, definition, example, difficulty, tags } = req.body || {};
    const item = await prisma.vocabulary.update({
      where: { id },
      data: {
        ...(word !== undefined ? { word: String(word).trim() } : {}),
        ...(phonetic !== undefined ? { phonetic: phonetic ? String(phonetic).trim() : null } : {}),
        ...(definition !== undefined ? { definition: String(definition).trim() } : {}),
        ...(example !== undefined ? { example: example ? String(example).trim() : null } : {}),
        ...(difficulty !== undefined ? { difficulty: Number(difficulty) } : {}),
        ...(tags !== undefined ? { tags: tags && typeof tags === 'object' ? tags : null } : {}),
      },
    });
    return ok(res, item);
  } catch (error) {
    if (error.code === 'P2025') return fail(res, 404, '词汇不存在');
    return fail(res, 500, '词汇接口失败', error.message);
  }
};
