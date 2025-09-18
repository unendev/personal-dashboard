import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createMasterAccount() {
  try {
    // 检查是否已存在 master 账户
    const existingUser = await prisma.user.findUnique({
      where: { email: 'master@example.com' }
    });

    if (existingUser) {
      console.log('master 账户已存在:', existingUser.email);
      return;
    }

    // 创建 master 账户
    const hashedPassword = await bcrypt.hash('masterPswd', 12);
    
    const user = await prisma.user.create({
      data: {
        email: 'master@example.com',
        name: 'Master 用户',
        password: hashedPassword,
        emailVerified: new Date(),
      }
    });

    console.log('master 账户创建成功:');
    console.log('邮箱:', user.email);
    console.log('密码: masterPswd');
    console.log('用户ID:', user.id);
    console.log('姓名:', user.name);
  } catch (error) {
    console.error('创建 master 账户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMasterAccount();
