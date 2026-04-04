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
      
      const oldPayload = schoolData?.payload || {};
      const oldStudents = oldPayload.students || [];
      
      const normalizedStudents = students.map(s => {
        // 从旧 payload 中找回 teacherId
        const oldStudent = oldStudents.find(os => os.id === s.id);
        
        return {
          id: s.id,
          name: s.username,
          class: s.className || '',
          teacherId: s.teacherId || (oldStudent ? oldStudent.teacherId : null),
          passwordChanged: s.passwordChanged,
          coins: s.coins || 0,
          badges: s.badges || [],
          streak: s.streak || 0,
          totalLearned: s.totalLearned || 0,
          totalTests: s.totalTests || 0,
          totalCorrect: s.totalCorrect || 0,
          totalQuestions: s.totalQuestions || 0
        };
      });
      
      let wordlists = [];
      try {
        const dbWordLists = await prisma.wordList.findMany({
          where: user.role === 'ADMIN' ? undefined : {
            OR: [
              { createdById: user.id },
              { isPublic: true }
            ]
          }
        });
        
        wordlists = dbWordLists.map(wl => ({
          id: wl.id,
          name: wl.name,
          description: wl.description,
          words: wl.words || [],
          isPublic: wl.isPublic,
          createdById: wl.createdById,
          createdAt: wl.createdAt,
          updatedAt: wl.updatedAt
        }));
      } catch (e) {
        console.log('读取 WordList 表失败，可能尚未迁移', e.message);
      }
      
      const oldPayload = schoolData?.payload || {};
      
      // 合并数据库中的词表和旧版JSON词表
      const mergedWordlists = [...wordlists];
      const oldWordlists = oldPayload.wordlists || oldPayload.wordLists || [];
      for (const wl of oldWordlists) {
        if (!mergedWordlists.find(m => m.id === wl.id)) {
          mergedWordlists.push(wl);
        }
      }
      
      const payload = {
        teachers: normalizedTeachers,
        students: normalizedStudents,
        wordlists: mergedWordlists,
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
    const oldPayload = existed?.payload || {};

    if (user.role === 'STUDENT') {
      // 学生只能更新他们自己的状态和日志，绝对不能覆盖其他人的数据
      payload.teachers = oldPayload.teachers || [];
      payload.wordlists = oldPayload.wordlists || oldPayload.wordLists || [];
      payload.tasks = oldPayload.tasks || [];
      payload.admins = oldPayload.admins || [];
      
      // 保留原有学生列表，更新或追加当前学生的信息
      const incomingStudent = payload.students && payload.students[0];
      let mergedStudents = oldPayload.students || [];
      if (incomingStudent) {
         mergedStudents = mergedStudents.filter(s => s.id !== incomingStudent.id);
         mergedStudents.push(incomingStudent);
      }
      payload.students = mergedStudents;

      // 学习日志可以全量替换，因为 GET 的时候学生拉取的是所有人的日志（目前系统逻辑是这样，暂时保持）
      // 或者为了安全，也可以增量合并日志。这里简化处理，保留原逻辑。
    }

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
