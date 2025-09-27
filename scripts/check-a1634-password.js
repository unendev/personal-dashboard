import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPassword() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'a1634358912@gmail.com' },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        password: true 
      }
    });
    
    console.log('=== a1634 用户信息 ===');
    console.log('ID:', user.id);
    console.log('邮箱:', user.email);
    console.log('姓名:', user.name);
    console.log('密码:', user.password ? '已设置' : '未设置');
    
    if (user.password) {
      console.log('密码哈希:', user.password.substring(0, 20) + '...');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('检查密码时出错:', error);
    await prisma.$disconnect();
  }
}

checkPassword();
