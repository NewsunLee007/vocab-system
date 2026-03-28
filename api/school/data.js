const { prisma } = require('../_lib/prisma');
const { getAuthUser } = require('../_lib/auth');
const { ok, created, fail, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return methodNotAllowed(req, res, ['GET', 'POST']);
  }

  try {
    const user = await getAuthUser(req);
    if (!user) return fail(res, 401, 'No token provided');

    if (req.method === 'GET') {
      const school = await prisma.schoolData.findUnique({ where: { id: 'school' } });
      if (!school) return fail(res, 404, '暂无学校数据');
      return ok(res, { id: school.id, data: school.payload, updatedAt: school.updatedAt });
    }

    if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
      return fail(res, 403, '权限不足');
    }

    const payload = req.body?.data;
    if (!payload || typeof payload !== 'object') {
      return fail(res, 400, 'data 字段不能为空');
    }

    const existed = await prisma.schoolData.findUnique({ where: { id: 'school' } });
    const row = await prisma.schoolData.upsert({
      where: { id: 'school' },
      update: { payload, updatedBy: user.id },
      create: { id: 'school', payload, updatedBy: user.id },
    });

    if (existed) return ok(res, { id: row.id, data: row.payload, updatedAt: row.updatedAt });
    return created(res, { id: row.id, data: row.payload, updatedAt: row.updatedAt });
  } catch (error) {
    return fail(res, 500, '学校数据接口失败', error.message);
  }
};
