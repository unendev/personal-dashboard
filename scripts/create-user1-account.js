import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createUser1Account() {
  try {
    // 检查是否已存在 user-1 账户
    const existingUser = await prisma.user.findUnique({
      where: { email: 'user1@example.com' }
    });

    if (existingUser) {
      console.log('user-1 账户已存在:', existingUser.email);
      return;
    }

    // 创建 user-1 账户
    const hashedPassword = await bcrypt.hash('user123456', 12);
    
    const user = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        name: '用户一号',
        password: hashedPassword,
        emailVerified: new Date(),
      }
    });

    console.log('user-1 账户创建成功:');
    console.log('邮箱:', user.email);
    console.log('密码: user123456');
    console.log('用户ID:', user.id);
    console.log('姓名:', user.name);
  } catch (error) {
    console.error('创建 user-1 账户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser1Account();
