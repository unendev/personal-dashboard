import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // 检查是否已存在测试用户
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (existingUser) {
      console.log('测试用户已存在:', existingUser.email);
      return;
    }

    // 创建测试用户
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: '测试用户',
        password: hashedPassword,
        emailVerified: new Date(),
      }
    });

    console.log('测试用户创建成功:');
    console.log('邮箱:', user.email);
    console.log('密码: password123');
    console.log('用户ID:', user.id);
  } catch (error) {
    console.error('创建测试用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
