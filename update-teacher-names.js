const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

async function main() {
  const teachers = [
    { username: 't001', name: '吴子健' },
    { username: 't002', name: '金乐意' },
    { username: 't003', name: '徐彬' },
    { username: 't004', name: '陈丹维' },
    { username: 't005', name: '陈天思' },
    { username: 't006', name: '沈鸿' },
    { username: 't008', name: '李丕旭' },
  ];

  for (const teacher of teachers) {
    const updated = await prisma.user.update({
      where: { username: teacher.username },
      data: { name: teacher.name },
      select: { username: true, name: true }
    });
    console.log(`Updated: ${updated.username} -> ${updated.name}`);
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
