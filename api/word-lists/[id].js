const { prisma } = require('../_lib/prisma');
const { getAuthUser } = require('../_lib/auth');
const { ok, fail, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') {
    return methodNotAllowed(req, res, ['GET', 'PUT', 'DELETE']);
  }

  try {
    const user = await getAuthUser(req);
    if (!user) return fail(res, 401, '未登录');

    const { id } = req.query;
    if (!id) return fail(res, 400, '词表ID不能为空');

    const wordList = await prisma.wordList.findUnique({
      where: { id }
    });

    if (!wordList) return fail(res, 404, '词表不存在');

    if (req.method === 'GET') {
      return ok(res, wordList);
    }

    if (req.method === 'PUT') {
      if (wordList.createdById !== user.id && user.role !== 'ADMIN') {
        return fail(res, 403, '无权修改此词表');
      }

      const { name, description, words, isPublic } = req.body;

      const updated = await prisma.wordList.update({
        where: { id },
        data: {
          name: name || wordList.name,
          description: description !== undefined ? description : wordList.description,
          words: words !== undefined ? words : wordList.words,
          isPublic: isPublic !== undefined ? isPublic : wordList.isPublic
        }
      });

      return ok(res, updated);
    }

    if (req.method === 'DELETE') {
      if (wordList.createdById !== user.id && user.role !== 'ADMIN') {
        return fail(res, 403, '无权删除此词表');
      }

      await prisma.wordList.delete({ where: { id } });
      return ok(res, { success: true });
    }
  } catch (error) {
    console.error('词表详情接口错误:', error);
    return fail(res, 500, '词表详情接口失败', error.message);
  }
};
