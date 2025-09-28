import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('检查数据库中的用户...');
    
    // 获取所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });
    
    console.log('现有用户:', users);
    
    // 检查 dev-user-1 是否存在
    const devUser = await prisma.user.findUnique({
      where: { id: 'dev-user-1' }
    });
    
    console.log('dev-user-1 用户:', devUser);
    
    // 如果不存在，创建一个
    if (!devUser) {
      console.log('创建 dev-user-1 用户...');
      const newUser = await prisma.user.create({
        data: {
          id: 'dev-user-1',
          email: 'dev@localhost.com',
          name: '开发用户',
          password: 'dev-password'
        }
      });
      console.log('创建成功:', newUser);
    }
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();

