import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserData() {
  try {
    console.log('检查用户数据映射情况:');
    console.log('====================');
    
    // 获取所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        _count: {
          select: {
            timerTasks: true,
            todos: true,
            logs: true,
            operationRecords: true,
            aiSummaries: true
          }
        }
      }
    });
    
    console.log('用户列表:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name})`);
      console.log(`  ID: ${user.id}`);
      console.log(`  计时任务: ${user._count.timerTasks}`);
      console.log(`  待办事项: ${user._count.todos}`);
      console.log(`  日志: ${user._count.logs}`);
      console.log(`  操作记录: ${user._count.operationRecords}`);
      console.log(`  AI总结: ${user._count.aiSummaries}`);
      console.log('');
    });
    
    // 检查是否有 user-1 的数据
    const user1Tasks = await prisma.timerTask.findMany({
      where: { userId: 'user-1' },
      select: { id: true, name: true, userId: true }
    });
    
    const user1Todos = await prisma.todo.findMany({
      where: { userId: 'user-1' },
      select: { id: true, text: true, userId: true }
    });
    
    console.log('user-1 的数据:');
    console.log(`计时任务: ${user1Tasks.length} 个`);
    console.log(`待办事项: ${user1Todos.length} 个`);
    
    if (user1Tasks.length > 0) {
      console.log('计时任务示例:');
      user1Tasks.slice(0, 3).forEach(task => {
        console.log(`  - ${task.name} (ID: ${task.id})`);
      });
    }
    
    if (user1Todos.length > 0) {
      console.log('待办事项示例:');
      user1Todos.slice(0, 3).forEach(todo => {
        console.log(`  - ${todo.text} (ID: ${todo.id})`);
      });
    }
    
  } catch (error) {
    console.error('检查用户数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserData();
