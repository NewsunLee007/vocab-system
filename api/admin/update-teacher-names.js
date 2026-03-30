const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const teachers = [
      { username: 't001', name: '吴子健' },
      { username: 't002', name: '金乐意' },
      { username: 't003', name: '徐彬' },
      { username: 't004', name: '陈丹维' },
      { username: 't005', name: '陈天思' },
      { username: 't006', name: '沈鸿' },
      { username: 't008', name: '李丕旭' },
    ];

    const results = [];
    const defaultPassword = await bcrypt.hash('123456', 10);

    for (const teacher of teachers) {
      // 查找现有教师（用 $queryRaw 返回结果集）
      const existing = await prisma.$queryRaw`
        SELECT id, name FROM "User" WHERE username = ${teacher.username} AND role = 'TEACHER'
      `;

      if (existing.length > 0) {
        // 更新（只有 name 不同时才更新）
        await prisma.$executeRaw`
          UPDATE "User" 
          SET name = ${teacher.name}
          WHERE username = ${teacher.username} AND role = 'TEACHER'
        `;
        results.push({ action: 'updated', username: teacher.username, name: teacher.name, prevName: existing[0].name });
      } else {
        // 创建
        await prisma.$executeRaw`
          INSERT INTO "User" (id, username, name, "passwordHash", "className", role, "passwordChanged", "loginAttempts", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid()::text,
            ${teacher.username},
            ${teacher.name},
            ${defaultPassword},
            NULL,
            'TEACHER',
            false,
            0,
            NOW(),
            NOW()
          )
        `;
        results.push({ action: 'created', username: teacher.username, name: teacher.name });
      }
    }

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};
