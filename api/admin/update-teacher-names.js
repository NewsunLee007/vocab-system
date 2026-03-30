const { PrismaClient } = require('@prisma/client');

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

    for (const teacher of teachers) {
      const updated = await prisma.user.update({
        where: { username: teacher.username },
        data: { name: teacher.name },
        select: { username: true, name: true }
      });
      results.push(updated);
    }

    res.status(200).json({ success: true, updated: results });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};
