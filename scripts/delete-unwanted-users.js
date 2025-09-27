import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function deleteUnwantedUsers() {
  try {
    console.log('=== 开始删除不需要的用户 ===');
    
    // 需要保留的用户邮箱
    const keepUsers = ['a1634358912@gmail.com', 'master@example.com', 'dev@localhost.com'];
    
    // 获取所有用户
    const allUsers = await prisma.user.findMany({
      select: { 
        id: true, 
        email: true, 
        name: true 
      }
    });
    
    // 找出需要删除的用户
    const usersToDelete = allUsers.filter(user => !keepUsers.includes(user.email));
    
    console.log(`找到 ${usersToDelete.length} 个需要删除的用户:`);
    usersToDelete.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name}) - ID: ${user.id}`);
    });
    
    if (usersToDelete.length === 0) {
      console.log('没有需要删除的用户');
      await prisma.$disconnect();
      return;
    }
    
    // 删除用户
    for (const user of usersToDelete) {
      try {
        console.log(`\n正在删除用户: ${user.email}...`);
        
        // 先删除相关的宝藏记录
        const deletedTreasures = await prisma.treasure.deleteMany({
          where: { userId: user.id }
        });
        console.log(`  删除了 ${deletedTreasures.count} 个宝藏记录`);
        
        // 删除用户
        await prisma.user.delete({
          where: { id: user.id }
        });
        
        console.log(`  ✅ 用户 ${user.email} 删除成功`);
      } catch (error) {
        console.error(`  ❌ 删除用户 ${user.email} 时出错:`, error.message);
      }
    }
    
    // 验证删除结果
    console.log('\n=== 验证删除结果 ===');
    const remainingUsers = await prisma.user.findMany({
      select: { 
        id: true, 
        email: true, 
        name: true 
      }
    });
    
    console.log(`剩余用户数量: ${remainingUsers.length}`);
    remainingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name})`);
    });
    
    console.log('\n✅ 用户清理完成！');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('删除用户时出错:', error);
    await prisma.$disconnect();
  }
}

deleteUnwantedUsers();
