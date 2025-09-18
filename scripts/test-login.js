import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    console.log('测试账户列表:');
    console.log('================');
    
    // 测试账户1
    const user1 = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    if (user1) {
      const isValid1 = await bcrypt.compare('password123', user1.password);
      console.log('测试账户1:');
      console.log('  邮箱: test@example.com');
      console.log('  密码: password123');
      console.log('  密码验证:', isValid1 ? '✅ 正确' : '❌ 错误');
      console.log('  用户ID:', user1.id);
      console.log('');
    }
    
    // 测试账户2
    const user2 = await prisma.user.findUnique({
      where: { email: 'user1@example.com' }
    });
    
    if (user2) {
      const isValid2 = await bcrypt.compare('user123456', user2.password);
      console.log('测试账户2:');
      console.log('  邮箱: user1@example.com');
      console.log('  密码: user123456');
      console.log('  密码验证:', isValid2 ? '✅ 正确' : '❌ 错误');
      console.log('  用户ID:', user2.id);
      console.log('');
    }
    
    console.log('所有账户测试完成！');
    
  } catch (error) {
    console.error('测试登录失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
