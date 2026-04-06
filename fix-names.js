const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    await prisma.user.updateMany({
        where: { username: 't001' },
        data: { name: '戴玉琼' }
    });
    await prisma.user.updateMany({
        where: { username: 't002' },
        data: { name: '李蓓蓓' }
    });
    await prisma.user.updateMany({
        where: { username: 't003' },
        data: { name: '王静' }
    });
    await prisma.user.updateMany({
        where: { username: 't027' },
        data: { name: '张瑾' }
    });
    await prisma.user.updateMany({
        where: { username: 't005' },
        data: { name: '陈丹维' }
    });
    await prisma.user.updateMany({
        where: { username: 't006' },
        data: { name: '薛安娜' }
    });
    console.log('Fixed');
}
fix().catch(console.error).finally(() => prisma.$disconnect());
