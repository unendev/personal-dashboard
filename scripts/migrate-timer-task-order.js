import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 为现有的计时器任务添加排序字段
 * 这个脚本会为所有现有的任务设置默认的排序值
 */
async function migrateTimerTaskOrder() {
  try {
    console.log('开始迁移计时器任务排序字段...');
    
    // 获取所有任务，按用户和日期分组
    const tasks = await prisma.timerTask.findMany({
      orderBy: [
        { userId: 'asc' },
        { date: 'desc' },
        { createdAt: 'asc' }
      ]
    });
    
    console.log(`找到 ${tasks.length} 个任务需要迁移`);
    
    // 按用户和日期分组，为每组任务设置排序
    const tasksByUserAndDate = new Map<string, any[]>();
    
    tasks.forEach(task => {
      const key = `${task.userId}-${task.date}`;
      if (!tasksByUserAndDate.has(key)) {
        tasksByUserAndDate.set(key, []);
      }
      tasksByUserAndDate.get(key)!.push(task);
    });
    
    let updatedCount = 0;
    
    // 为每组任务设置排序
    for (const [key, taskGroup] of tasksByUserAndDate) {
      console.log(`处理用户日期组: ${key}, 任务数量: ${taskGroup.length}`);
      
      // 按创建时间排序，然后设置order字段
      const sortedTasks = taskGroup.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      // 批量更新排序
      const updatePromises = sortedTasks.map((task, index) =>
        prisma.timerTask.update({
          where: { id: task.id },
          data: { order: index }
        })
      );
      
      await Promise.all(updatePromises);
      updatedCount += sortedTasks.length;
      
      console.log(`✅ 已更新 ${sortedTasks.length} 个任务的排序`);
    }
    
    console.log(`\n=== 迁移完成 ===`);
    console.log(`总任务数: ${tasks.length}`);
    console.log(`已更新: ${updatedCount}`);
    console.log(`用户日期组数: ${tasksByUserAndDate.size}`);
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateTimerTaskOrder();
}

export { migrateTimerTaskOrder };
