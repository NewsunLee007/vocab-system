const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const schoolData = await prisma.schoolData.findUnique({ where: { id: 'school' } });
  if (!schoolData || !schoolData.payload || !schoolData.payload.students) {
    console.log('No students in payload');
    return;
  }

  const oldStudents = schoolData.payload.students;
  let updated = 0;
  for (const s of oldStudents) {
    if (s.teacherId) {
      try {
        await prisma.user.update({
          where: { id: s.id },
          data: { teacherId: s.teacherId }
        });
        updated++;
        console.log(`Updated student ${s.name} (${s.id}) with teacherId ${s.teacherId}`);
      } catch (e) {
        console.log(`Failed to update ${s.id}: ${e.message}`);
      }
    }
  }
  console.log(`Finished updating ${updated} students.`);
}

fix().catch(console.error).finally(() => prisma.$disconnect());
