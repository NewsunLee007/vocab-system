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
      const vocabularyId = req.query.vocabularyId || null;
      const limit = Math.min(Number(req.query.limit || 50), 200);

      const where = { userId: user.id };
      if (vocabularyId) where.vocabularyId = String(vocabularyId);

      const records = await prisma.learningRecord.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: { vocabulary: true }
      });

      return ok(res, records);
    }

    if (req.method === 'POST') {
      const { vocabularyId, attempts, correct, mastery, recordType, payload } = req.body || {};

      if (!vocabularyId) return fail(res, 400, 'vocabularyId 必填');

      const vocabulary = await prisma.vocabulary.findUnique({
        where: { id: String(vocabularyId) }
      });

      if (!vocabulary) return fail(res, 404, '词汇不存在');

      const record = await prisma.learningRecord.upsert({
        where: {
          userId_vocabularyId: {
            userId: user.id,
            vocabularyId: String(vocabularyId)
          }
        },
        create: {
          userId: user.id,
          vocabularyId: String(vocabularyId),
          attempts: Number(attempts) || 0,
          correct: Number(correct) || 0,
          mastery: Number(mastery) || 0,
          lastReviewAt: new Date()
        },
        update: {
          attempts: { increment: Number(attempts) || 1 },
          correct: { increment: Number(correct) || 0 },
          mastery: Number(mastery) !== undefined ? Number(mastery) : undefined,
          lastReviewAt: new Date()
        }
      });

      return created(res, record);
    }
  } catch (error) {
    console.error('Learning records API error:', error);
    return fail(res, 500, '学习记录接口失败', error.message);
  }
};
