import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function migrateMasterDataToA1634() {
  try {
    console.log('=== 开始数据迁移：Master → a1634 ===');
    
    // 获取用户信息
    const masterUser = await prisma.user.findUnique({
      where: { email: 'master@example.com' },
      select: { id: true, email: true, name: true }
    });
    
    const a1634User = await prisma.user.findUnique({
      where: { email: 'a1634358912@gmail.com' },
      select: { id: true, email: true, name: true }
    });
    
    if (!masterUser || !a1634User) {
      console.log('❌ 用户不存在');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`源用户: ${masterUser.name} (${masterUser.email}) - ID: ${masterUser.id}`);
    console.log(`目标用户: ${a1634User.name} (${a1634User.email}) - ID: ${a1634User.id}`);
    
    // 1. 迁移日志数据
    console.log('\n📝 开始迁移日志数据...');
    const logs = await prisma.log.findMany({
      where: { userId: masterUser.id }
    });
    
    console.log(`找到 ${logs.length} 条日志记录`);
    
    let migratedLogs = 0;
    const batchSize = 50; // 分批处理，每批50条
    
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);
      console.log(`处理第 ${Math.floor(i/batchSize) + 1} 批，共 ${Math.ceil(logs.length/batchSize)} 批...`);
      
      for (const log of batch) {
        try {
          await prisma.log.create({
            data: {
              content: log.content,
              questId: log.questId,
              userId: a1634User.id,
              timestamp: log.timestamp,
              createdAt: log.createdAt,
              updatedAt: log.updatedAt
            }
          });
          migratedLogs++;
        } catch (error) {
          console.error(`迁移日志失败: ${error.message}`);
        }
      }
      
      console.log(`✅ 已完成 ${migratedLogs}/${logs.length} 条日志记录`);
    }
    console.log(`✅ 成功迁移 ${migratedLogs} 条日志记录`);
    
    // 2. 迁移待办事项数据
    console.log('\n✅ 开始迁移待办事项数据...');
    const todos = await prisma.todo.findMany({
      where: { userId: masterUser.id }
    });
    
    console.log(`找到 ${todos.length} 条待办事项`);
    
    let migratedTodos = 0;
    for (const todo of todos) {
      try {
        await prisma.todo.create({
          data: {
            text: todo.text,
            completed: todo.completed,
            createdAtUnix: todo.createdAtUnix,
            priority: todo.priority,
            category: todo.category,
            userId: a1634User.id,
            date: todo.date,
            parentId: todo.parentId,
            order: todo.order,
            createdAt: todo.createdAt,
            updatedAt: todo.updatedAt
          }
        });
        migratedTodos++;
      } catch (error) {
        console.error(`迁移待办事项失败: ${error.message}`);
      }
    }
    console.log(`✅ 成功迁移 ${migratedTodos} 条待办事项`);
    
    // 3. 迁移定时任务数据
    console.log('\n⏰ 开始迁移定时任务数据...');
    const timerTasks = await prisma.timerTask.findMany({
      where: { userId: masterUser.id }
    });
    
    console.log(`找到 ${timerTasks.length} 条定时任务`);
    
    let migratedTimerTasks = 0;
    for (const task of timerTasks) {
      try {
        await prisma.timerTask.create({
          data: {
            name: task.name,
            categoryPath: task.categoryPath,
            elapsedTime: task.elapsedTime,
            initialTime: task.initialTime,
            isRunning: task.isRunning,
            startTime: task.startTime,
            isPaused: task.isPaused,
            pausedTime: task.pausedTime,
            completedAt: task.completedAt,
            date: task.date,
            userId: a1634User.id,
            parentId: task.parentId,
            order: task.order,
            instanceTag: task.instanceTag,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
          }
        });
        migratedTimerTasks++;
      } catch (error) {
        console.error(`迁移定时任务失败: ${error.message}`);
      }
    }
    console.log(`✅ 成功迁移 ${migratedTimerTasks} 条定时任务`);
    
    // 4. 验证迁移结果
    console.log('\n=== 验证迁移结果 ===');
    const a1634Logs = await prisma.log.findMany({
      where: { userId: a1634User.id }
    });
    const a1634Todos = await prisma.todo.findMany({
      where: { userId: a1634User.id }
    });
    const a1634TimerTasks = await prisma.timerTask.findMany({
      where: { userId: a1634User.id }
    });
    
    console.log(`a1634 用户现在拥有:`);
    console.log(`📝 日志: ${a1634Logs.length} 条`);
    console.log(`✅ 待办事项: ${a1634Todos.length} 条`);
    console.log(`⏰ 定时任务: ${a1634TimerTasks.length} 条`);
    
    console.log('\n✅ 数据迁移完成！');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('数据迁移时出错:', error);
    await prisma.$disconnect();
  }
}

migrateMasterDataToA1634();
