const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolData = await prisma.schoolData.findUnique({ where: { id: 'school' } });
  if (!schoolData) {
    console.log("No schoolData found.");
    return;
  }
  const payload = schoolData.payload;
  console.log(JSON.stringify(payload.teacherReviewedSentences, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
