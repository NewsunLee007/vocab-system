const { prisma } = require('../_lib/prisma');
const { ok, fail, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(req, res, ['GET']);
  }

  try {
    // 找出所有 role 为 STUDENT 且 teacherId 为 null 的用户
    const studentsWithoutTeacher = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        teacherId: null
      }
    });

    let updatedCount = 0;
    
    // 如果存在未关联教师的学生，默认将他们关联到 t008 (针对当前工单的快速修复)
    const teacher = await prisma.user.findFirst({
      where: {
        role: 'TEACHER',
        username: 't008'
      }
    });

    if (teacher && studentsWithoutTeacher.length > 0) {
      const result = await prisma.user.updateMany({
        where: {
          role: 'STUDENT',
          teacherId: null
        },
        data: {
          teacherId: teacher.id
        }
      });
      updatedCount = result.count;
    }

    return ok(res, {
      message: 'Teacher association fix completed',
      foundStudentsWithoutTeacher: studentsWithoutTeacher.length,
      updatedStudents: updatedCount,
      teacherFound: !!teacher,
      teacherId: teacher ? teacher.id : null
    });
  } catch (error) {
    console.error('Fix API error:', error);
    return fail(res, 500, 'Fix failed', error.message);
  }
};
