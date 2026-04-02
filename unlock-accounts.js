require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('=== 解锁账号脚本 ===');
console.log('当前环境变量:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');
console.log('DEFAULT_ADMIN_PASSWORD:', process.env.DEFAULT_ADMIN_PASSWORD || 'root');

const prisma = new PrismaClient();

async function unlockAllAccounts() {
  try {
    console.log('\n开始解锁所有被锁定的账号...');
    
    const result = await prisma.user.updateMany({
      where: {
        lockUntil: {
          gt: new Date()
        }
      },
      data: {
        lockUntil: null,
        loginAttempts: 0
      }
    });
    
    console.log(`成功解锁 ${result.count} 个账号`);
    
    // 同时重置管理员密码为默认值
    console.log('\n重置管理员密码为默认值...');
    const bcrypt = require('bcryptjs');
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'root';
    const passwordHash = await bcrypt.hash(defaultAdminPassword, 10);
    
    const adminResult = await prisma.user.updateMany({
      where: {
        role: 'ADMIN'
      },
      data: {
        passwordHash,
        passwordChanged: false,
        lockUntil: null,
        loginAttempts: 0
      }
    });
    
    console.log(`成功重置 ${adminResult.count} 个管理员账号的密码`);
    
    console.log('\n=== 操作完成 ===');
    console.log('所有被锁定的账号已解锁');
    console.log('管理员密码已重置为:', defaultAdminPassword);
    
  } catch (error) {
    console.error('\n解锁账号失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

unlockAllAccounts();