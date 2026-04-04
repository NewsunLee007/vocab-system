const { prisma } = require('../_lib/prisma');
const { getAuthUser } = require('../_lib/auth');
const { ok, fail, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'POST' && req.method !== 'DELETE') {
    return methodNotAllowed(req, res, ['GET', 'PUT', 'POST', 'DELETE']);
  }

  try {
    const user = await getAuthUser(req);
    if (!user) return fail(res, 401, '未登录');

    const urlPath = req.url ? req.url.split('?')[0] : '';
    const segments = urlPath.replace(/\/+$/, '').split('/');
    const lastSegment = segments[segments.length - 1];
    
    // 尝试从路径或 query 中获取 id
    const id = (lastSegment && lastSegment !== 'students' && lastSegment !== '[id].js') 
      ? lastSegment 
      : (req.query.id || null);

    if (!id) return fail(res, 400, '学生ID不能为空');

    if (req.method === 'GET') {
      const student = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          name: true,
          className: true,
          role: true,
          coins: true,
          badges: true,
          streak: true,
          totalLearned: true,
          totalTests: true,
          totalCorrect: true,
          totalQuestions: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!student) return fail(res, 404, '学生不存在');
      if (student.role !== 'STUDENT') return fail(res, 400, '不是学生账号');

      return ok(res, student);
    }

    if (req.method === 'PUT') {
      if (id !== user.id && user.role !== 'ADMIN' && user.role !== 'TEACHER') {
        return fail(res, 403, '无权修改此学生的数据');
      }

      const currentStudent = await prisma.user.findUnique({
        where: { id }
      });

      if (!currentStudent) {
        return fail(res, 404, '学生不存在');
      }

      const { 
        coins, 
        badges, 
        streak, 
        totalLearned, 
        totalTests, 
        totalCorrect, 
        totalQuestions 
      } = req.body;

      const updateData = {};
      
      const handleIncrement = (field, value, defaultValue = 0) => {
        if (value && typeof value === 'object' && value.increment !== undefined) {
          return currentStudent[field] + value.increment;
        }
        return value !== undefined ? value : currentStudent[field];
      };

      if (coins !== undefined) updateData.coins = handleIncrement('coins', coins, 0);
      if (badges !== undefined) updateData.badges = badges;
      if (streak !== undefined) updateData.streak = handleIncrement('streak', streak, 0);
      if (totalLearned !== undefined) updateData.totalLearned = handleIncrement('totalLearned', totalLearned, 0);
      if (totalTests !== undefined) updateData.totalTests = handleIncrement('totalTests', totalTests, 0);
      if (totalCorrect !== undefined) updateData.totalCorrect = handleIncrement('totalCorrect', totalCorrect, 0);
      if (totalQuestions !== undefined) updateData.totalQuestions = handleIncrement('totalQuestions', totalQuestions, 0);

      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          name: true,
          className: true,
          role: true,
          coins: true,
          badges: true,
          streak: true,
          totalLearned: true,
          totalTests: true,
          totalCorrect: true,
          totalQuestions: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return ok(res, updated);
    }

    if (req.method === 'POST') {
      const { coins } = req.body;
      
      if (typeof coins !== 'number') {
        return fail(res, 400, '积分必须是数字');
      }

      // 更新学生积分
      const updatedStudent = await prisma.user.update({
        where: { id },
        data: { coins: coins }
      });

      return ok(res, updatedStudent);
    }

    if (req.method === 'DELETE') {
      if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
        return fail(res, 403, '无权删除学生');
      }

      await prisma.user.delete({
        where: { id }
      });

      return ok(res, { success: true, message: '学生已删除' });
    }
  } catch (error) {
    console.error('学生数据接口错误:', error);
    return fail(res, 500, '学生数据接口失败', error.message);
  }
};
