import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function migrateMasterToUser1() {
  try {
    console.log('开始迁移 master 账户到 user-1...');
    
    // 获取 master 账户
    const masterUser = await prisma.user.findUnique({
      where: { email: 'master@example.com' }
    });
    
    if (!masterUser) {
      console.log('master 账户不存在');
      return;
    }
    
    // 获取现有的 user-1 账户
    const user1Account = await prisma.user.findUnique({
      where: { id: 'user-1' }
    });
    
    if (!user1Account) {
      console.log('user-1 账户不存在');
      return;
    }
    
    console.log('当前 master 账户 ID:', masterUser.id);
    console.log('当前 user-1 账户 ID:', user1Account.id);
    console.log('当前 user-1 账户邮箱:', user1Account.email);
    
    // 先删除 master 账户
    await prisma.user.delete({
      where: { id: masterUser.id }
    });
    
    console.log('✅ master 账户已删除');
    
    // 更新 user-1 账户的信息为 master 账户的信息
    const hashedPassword = await bcrypt.hash('masterPswd', 12);
    
    const updatedUser = await prisma.user.update({
      where: { id: 'user-1' },
      data: {
        email: 'master@example.com',
        name: 'Master 用户',
        password: hashedPassword,
        emailVerified: new Date(),
      }
    });
    
    console.log('✅ user-1 账户已更新为 master 账户信息');
    console.log('新邮箱:', updatedUser.email);
    console.log('新姓名:', updatedUser.name);
    console.log('新密码: masterPswd');
    console.log('现在可以使用 master@example.com + masterPswd 登录，并且能看到所有数据！');
    
  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateMasterToUser1();
