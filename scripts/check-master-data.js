import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkMasterData() {
  try {
    console.log('=== 检查 Master 用户的数据 ===');
    
    const masterUser = await prisma.user.findUnique({
      where: { email: 'master@example.com' },
      select: { id: true, email: true, name: true }
    });
    
    if (!masterUser) {
      console.log('❌ Master 用户不存在');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`Master 用户信息: ${masterUser.name} (${masterUser.email}) - ID: ${masterUser.id}`);
    
    // 检查日志数据
    const logs = await prisma.log.findMany({
      where: { userId: masterUser.id },
      select: { id: true, content: true, createdAt: true }
    });
    console.log(`\n📝 日志数量: ${logs.length}`);
    logs.forEach((log, index) => {
      const content = log.content ? log.content.substring(0, 50) + '...' : '无内容';
      console.log(`  ${index + 1}. ${content} (${log.createdAt.toISOString().split('T')[0]})`);
    });
    
    // 检查宝藏数据
    const treasures = await prisma.treasure.findMany({
      where: { userId: masterUser.id },
      select: { id: true, title: true, type: true, createdAt: true }
    });
    console.log(`\n💎 宝藏数量: ${treasures.length}`);
    treasures.forEach((treasure, index) => {
      console.log(`  ${index + 1}. ${treasure.title} (${treasure.type}) - ${treasure.createdAt.toISOString().split('T')[0]}`);
    });
    
    // 检查其他可能的数据
    const todos = await prisma.todo.findMany({
      where: { userId: masterUser.id },
      select: { id: true, text: true, createdAt: true }
    });
    console.log(`\n✅ 待办事项数量: ${todos.length}`);
    todos.forEach((todo, index) => {
      console.log(`  ${index + 1}. ${todo.text} - ${todo.createdAt.toISOString().split('T')[0]}`);
    });
    
    const timerTasks = await prisma.timerTask.findMany({
      where: { userId: masterUser.id },
      select: { id: true, name: true, createdAt: true }
    });
    console.log(`\n⏰ 定时任务数量: ${timerTasks.length}`);
    timerTasks.forEach((task, index) => {
      console.log(`  ${index + 1}. ${task.name} - ${task.createdAt.toISOString().split('T')[0]}`);
    });
    
    console.log('\n=== 检查 a1634 用户的数据 ===');
    const a1634User = await prisma.user.findUnique({
      where: { email: 'a1634358912@gmail.com' },
      select: { id: true, email: true, name: true }
    });
    
    if (!a1634User) {
      console.log('❌ a1634 用户不存在');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`a1634 用户信息: ${a1634User.name} (${a1634User.email}) - ID: ${a1634User.id}`);
    
    // 检查 a1634 的现有数据
    const a1634Logs = await prisma.log.findMany({
      where: { userId: a1634User.id },
      select: { id: true, content: true, createdAt: true }
    });
    console.log(`\n📝 a1634 现有日志数量: ${a1634Logs.length}`);
    
    const a1634Treasures = await prisma.treasure.findMany({
      where: { userId: a1634User.id },
      select: { id: true, title: true, type: true, createdAt: true }
    });
    console.log(`\n💎 a1634 现有宝藏数量: ${a1634Treasures.length}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('检查数据时出错:', error);
    await prisma.$disconnect();
  }
}

checkMasterData();
