const { prisma } = require('../_lib/prisma');
const { getAuthUser } = require('../_lib/auth');
const { ok, created, fail, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return methodNotAllowed(req, res, ['GET', 'POST', 'PUT', 'DELETE']);
  }

  try {
    const user = await getAuthUser(req);
    if (!user) return fail(res, 401, '未登录');

    if (req.method === 'GET') {
      const keyword = String(req.query.keyword || '').trim();
      const page = Math.max(Number(req.query.page || 1), 1);
      const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);

      const where = keyword
        ? {
            OR: [
              { word: { contains: keyword, mode: 'insensitive' } },
              { definition: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {};

      const [items, total] = await Promise.all([
        prisma.vocabulary.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.vocabulary.count({ where }),
      ]);

      return ok(res, {
        items,
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      });
    }

    // 处理单个词汇的请求（带id参数）
    const id = String(req.query.id || '').trim();
    if (id) {
      if (req.method === 'GET') {
        const item = await prisma.vocabulary.findUnique({ where: { id } });
        if (!item) return fail(res, 404, '词汇不存在');
        return ok(res, item);
      }

      if (user.role === 'STUDENT') return fail(res, 403, '学生无编辑权限');

      if (req.method === 'DELETE') {
        try {
          await prisma.vocabulary.delete({ where: { id } });
          return ok(res, { id });
        } catch (error) {
          if (error.code === 'P2025') return fail(res, 404, '词汇不存在');
          throw error;
        }
      }

      if (req.method === 'PUT') {
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
      }
    }

    // 处理批量词汇的请求（无id参数）
    if (req.method === 'POST') {
      if (user.role === 'STUDENT') return fail(res, 403, '学生不能新增词汇');
      const { word, phonetic, definition, example, difficulty, tags } = req.body || {};

      if (!word || !definition) return fail(res, 400, 'word 和 definition 必填');

      const item = await prisma.vocabulary.create({
        data: {
          word: String(word).trim(),
          phonetic: phonetic ? String(phonetic).trim() : null,
          definition: String(definition).trim(),
          example: example ? String(example).trim() : null,
          difficulty: Number.isFinite(Number(difficulty)) ? Number(difficulty) : 1,
          tags: tags && typeof tags === 'object' ? tags : null,
          createdById: user.id,
        },
      });

      return created(res, item);
    }
  } catch (error) {
    return fail(res, 500, '词汇接口失败', error.message);
  }
};
