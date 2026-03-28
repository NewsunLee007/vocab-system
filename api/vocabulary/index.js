const { prisma } = require('../_lib/prisma');
const { getAuthUser } = require('../_lib/auth');
const { ok, created, fail, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return methodNotAllowed(req, res, ['GET', 'POST']);
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
  } catch (error) {
    return fail(res, 500, '词汇接口失败', error.message);
  }
};
