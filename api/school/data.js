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
      let schoolData = null;
      try {
        schoolData = await prisma.schoolData.findUnique({ where: { id: 'school' } });
      } catch (e) {
        console.log('SchoolData表不存在或读取失败，将使用新数据结构');
      }
      
      let teachers = [];
      let students = [];
      
      if (user.role === 'ADMIN') {
        teachers = await prisma.user.findMany({
          where: { role: 'TEACHER' },
          orderBy: { createdAt: 'desc' }
        });
        students = await prisma.user.findMany({
          where: { role: 'STUDENT' },
          orderBy: { createdAt: 'desc' }
        });
      } else if (user.role === 'TEACHER') {
        teachers = await prisma.user.findMany({
          where: { id: user.id, role: 'TEACHER' }
        });
        students = await prisma.user.findMany({
          where: { role: 'STUDENT' },
          orderBy: { createdAt: 'desc' }
        });
      } else if (user.role === 'STUDENT') {
        teachers = [];
        students = await prisma.user.findMany({
          where: { id: user.id, role: 'STUDENT' }
        });
      }
      
      const normalizedTeachers = teachers.map(t => ({
        id: t.id,
        name: t.name || t.username,
        username: t.username,
        passwordChanged: t.passwordChanged
      }));
      
      const normalizedStudents = students.map(s => ({
        id: s.id,
        name: s.username,
        class: s.className || '',
        teacherId: null,
        passwordChanged: s.passwordChanged,
        coins: s.coins || 0,
        badges: s.badges || [],
        streak: s.streak || 0,
        totalLearned: s.totalLearned || 0,
        totalTests: s.totalTests || 0,
        totalCorrect: s.totalCorrect || 0,
        totalQuestions: s.totalQuestions || 0
      }));
      
      let wordlists = [];
      try {
        if (user.role === 'ADMIN') {
          wordlists = await prisma.wordList.findMany({
            orderBy: { updatedAt: 'desc' },
            include: { createdBy: true }
          });
        } else if (user.role === 'TEACHER') {
          wordlists = await prisma.wordList.findMany({
            where: {
              OR: [
                { createdById: user.id },
                { isPublic: true }
              ]
            },
            orderBy: { updatedAt: 'desc' },
            include: { createdBy: true }
          });
        }
      } catch (e) {
        console.log('WordList表不存在或读取失败');
      }
      
      const normalizedWordLists = wordlists.map(wl => ({
        id: wl.id,
        title: wl.name,
        name: wl.name,
        description: wl.description,
        words: wl.words || [],
        teacherId: wl.createdById,
        createdAt: wl.createdAt,
        updatedAt: wl.updatedAt
      }));
      
      const oldPayload = schoolData?.payload || {};
      
      const payload = {
        teachers: normalizedTeachers,
        students: normalizedStudents,
        wordlists: normalizedWordLists.length > 0 ? normalizedWordLists : (oldPayload.wordlists || oldPayload.wordLists || []),
        tasks: oldPayload.tasks || [],
        learningLogs: oldPayload.learningLogs || [],
        studentStates: oldPayload.studentStates || {},
        admins: oldPayload.admins || []
      };
      
      console.log('=== 返回学校数据 ===', { 
        teacherCount: normalizedTeachers.length, 
        studentCount: normalizedStudents.length,
        wordlistCount: payload.wordlists.length
      });
      
      return ok(res, { 
        id: 'school', 
        data: payload, 
        updatedAt: schoolData?.updatedAt || new Date() 
      });
    }

    if (user.role !== 'ADMIN' && user.role !== 'TEACHER' && user.role !== 'STUDENT') {
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
    console.error('学校数据接口错误:', error);
    return fail(res, 500, '学校数据接口失败', error.message);
  }
};
