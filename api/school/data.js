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
        
        wordlists = dbWordLists.map(wl => {
          let meta = {};
          try {
            if (wl.description && wl.description.startsWith('{')) {
              meta = JSON.parse(wl.description);
            } else {
              meta = { description: wl.description };
            }
          } catch (e) {
            meta = { description: wl.description };
          }
          
          return {
            id: wl.id,
            title: wl.name,
            name: wl.name,
            description: meta.description || wl.description,
            type: meta.type || '自定义',
            textbook: meta.textbook,
            grade: meta.grade,
            volume: meta.volume,
            unit: meta.unit,
            sourceWordlistId: meta.sourceWordlistId,
            words: wl.words || [],
            isPublic: wl.isPublic,
            teacherId: wl.createdById,
            createdById: wl.createdById,
            createdAt: wl.createdAt,
            updatedAt: wl.updatedAt
          };
        });
      } catch (e) {
        console.log('读取 WordList 表失败，可能尚未迁移', e.message);
      }
      
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
        admins: oldPayload.admins || [],
        dict: oldPayload.dict || {},
        aiDrafts: oldPayload.aiDrafts || {},
        aiConfig: oldPayload.aiConfig || null,
        difficultWords: oldPayload.difficultWords || {},
        learningHistory: oldPayload.learningHistory || {},
        teacherReviewedSentences: oldPayload.teacherReviewedSentences || {},
        testQuestionBank: oldPayload.testQuestionBank || {},
        studentTestHistory: oldPayload.studentTestHistory || {}
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

    const mergedPayload = { ...oldPayload, ...payload };

    if (user.role === 'STUDENT') {
      mergedPayload.teachers = oldPayload.teachers || [];
      mergedPayload.wordlists = oldPayload.wordlists || oldPayload.wordLists || [];
      mergedPayload.tasks = oldPayload.tasks || [];
      mergedPayload.admins = oldPayload.admins || [];
      mergedPayload.aiConfig = oldPayload.aiConfig || null;
      mergedPayload.dict = oldPayload.dict || {};
      mergedPayload.aiDrafts = oldPayload.aiDrafts || {};
      mergedPayload.teacherReviewedSentences = oldPayload.teacherReviewedSentences || {};
      mergedPayload.testQuestionBank = oldPayload.testQuestionBank || {};
      
      const incomingStudent = payload.students && payload.students.find(s => s.id === user.id);
      let mergedStudents = oldPayload.students || [];
      if (incomingStudent) {
         mergedStudents = mergedStudents.filter(s => s.id !== incomingStudent.id);
         mergedStudents.push(incomingStudent);
      }
      mergedPayload.students = mergedStudents;
    } else if (user.role === 'TEACHER') {
      const incomingTeacher = payload.teachers && payload.teachers.find(t => t.id === user.id);
      let mergedTeachers = oldPayload.teachers || [];
      if (incomingTeacher) {
          mergedTeachers = mergedTeachers.filter(t => t.id !== incomingTeacher.id);
          mergedTeachers.push(incomingTeacher);
      }
      mergedPayload.teachers = mergedTeachers;
      
      if (!payload.aiConfig) {
          mergedPayload.aiConfig = oldPayload.aiConfig || null;
      }
      if (!payload.admins) {
          mergedPayload.admins = oldPayload.admins || [];
      }
    }

    const row = await prisma.schoolData.upsert({
      where: { id: 'school' },
      update: { payload: mergedPayload, updatedBy: user.id },
      create: { id: 'school', payload: mergedPayload, updatedBy: user.id },
    });

    if (existed) return ok(res, { id: row.id, data: row.payload, updatedAt: row.updatedAt });
    return created(res, { id: row.id, data: row.payload, updatedAt: row.updatedAt });
  } catch (error) {
    console.error('学校数据接口错误:', error);
    return fail(res, 500, '学校数据接口失败', error.message);
  }
};
