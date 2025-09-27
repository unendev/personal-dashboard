import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        email: true, 
        name: true, 
        createdAt: true 
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('=== 当前数据库中的所有用户 ===');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   邮箱: ${user.email}`);
      console.log(`   姓名: ${user.name}`);
      console.log(`   创建时间: ${user.createdAt}`);
      console.log('---');
    });
    
    console.log(`总计: ${users.length} 个用户`);
    
    // 识别需要保留的用户
    const keepUsers = ['a1634358912@gmail.com', 'master@example.com', 'dev@localhost.com'];
    const usersToDelete = users.filter(user => !keepUsers.includes(user.email));
    
    console.log('\n=== 需要删除的用户 ===');
    usersToDelete.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id} (${user.email})`);
    });
    
    console.log(`\n需要删除: ${usersToDelete.length} 个用户`);
    console.log(`保留: ${users.length - usersToDelete.length} 个用户`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('检查用户时出错:', error);
    await prisma.$disconnect();
  }
}

checkUsers();
