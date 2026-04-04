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
      const where = {
        OR: [
          { createdById: user.id },
          { isPublic: true }
        ]
      };

      if (user.role === 'ADMIN') {
        // 管理员可以看到所有词表
        delete where.OR;
      }

      const wordLists = await prisma.wordList.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, username: true, name: true }
          }
        }
      });

      return ok(res, wordLists);
    }

    if (req.method === 'POST') {
      if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
        return fail(res, 403, '只有教师和管理员可以创建词表');
      }

      const { name, description, words, isPublic } = req.body;

      if (!name) return fail(res, 400, '词表名称必填');

      const wordList = await prisma.wordList.create({
        data: {
          name,
          description: description || '',
          words: words || [],
          isPublic: isPublic || false,
          createdById: user.id
        }
      });

      return created(res, wordList);
    }
  } catch (error) {
    console.error('词表接口错误:', error);
    return fail(res, 500, '词表接口失败', error.message);
  }
};
