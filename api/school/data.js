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
      // 先尝试从SchoolData表读取旧数据
      let schoolData = null;
      try {
        schoolData = await prisma.schoolData.findUnique({ where: { id: 'school' } });
      } catch (e) {
        console.log('SchoolData表不存在或读取失败，将使用新数据结构');
      }
      
      // 从User表读取教师和学生数据
      let teachers = [];
      let students = [];
      
      if (user.role === 'ADMIN') {
        // 管理员可以看到所有教师和学生
        teachers = await prisma.user.findMany({
          where: { role: 'TEACHER' },
          orderBy: { createdAt: 'desc' }
        });
        students = await prisma.user.findMany({
          where: { role: 'STUDENT' },
          orderBy: { createdAt: 'desc' }
        });
      } else if (user.role === 'TEACHER') {
        // 教师只能看到自己和所有学生
        teachers = await prisma.user.findMany({
          where: { id: user.id, role: 'TEACHER' }
        });
        students = await prisma.user.findMany({
          where: { role: 'STUDENT' },
          orderBy: { createdAt: 'desc' }
        });
      }
      
      // 格式化数据为前端期望的格式
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
        teacherId: null, // User表中没有teacherId字段
        passwordChanged: s.passwordChanged,
        coins: 0,
        badges: [],
        streak: 0,
        totalLearned: 0,
        totalTests: 0,
        totalCorrect: 0,
        totalQuestions: 0
      }));
      
      // 从SchoolData获取词表、任务等其他数据（如果存在）
      const oldPayload = schoolData?.payload || {};
      
      const payload = {
        teachers: normalizedTeachers,
        students: normalizedStudents,
        wordlists: oldPayload.wordlists || oldPayload.wordLists || [],
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

    // 允许 ADMIN、TEACHER、STUDENT 都可以同步数据
    // 学生需要同步学习记录、积分等数据
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
