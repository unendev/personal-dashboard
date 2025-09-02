import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 模拟本地存储的数据结构
const mockLocalStorageData = [
  {
    id: 'task-1',
    name: '学习 React',
    categoryPath: '学习/前端开发',
    elapsedTime: 3600,
    initialTime: 7200,
    isRunning: false,
    startTime: 1640995200000,
    isPaused: false,
    pausedTime: 0,
    completedAt: 1640998800000,
    date: '2024-01-01'
  },
  {
    id: 'task-2',
    name: '阅读文档',
    categoryPath: '学习/文档阅读',
    elapsedTime: 1800,
    initialTime: 3600,
    isRunning: true,
    startTime: 1640998800000,
    isPaused: false,
    pausedTime: 0,
    date: '2024-01-01'
  }
];

async function migrateTimerTasks() {
  try {
    console.log('开始迁移 TimerTask 数据...');
    
    // 这里应该从实际的本地存储读取数据
    // 由于这是示例，我们使用模拟数据
    const localTasks = mockLocalStorageData;
    
    // 假设有一个默认用户ID
    const defaultUserId = 'default-user-id';
    
    console.log(`找到 ${localTasks.length} 个任务需要迁移`);
    
    for (const task of localTasks) {
      try {
        // 创建新任务，忽略原有的 id
        const { id, ...taskData } = task;
        
        const newTask = await prisma.timerTask.create({
          data: {
            ...taskData,
            userId: defaultUserId
          }
        });
        
        console.log(`✅ 迁移任务: ${task.name} -> ${newTask.id}`);
      } catch (error) {
        console.error(`❌ 迁移任务失败: ${task.name}`, error);
      }
    }
    
    console.log('迁移完成！');
    
    // 验证迁移结果
    const migratedTasks = await prisma.timerTask.findMany({
      where: { userId: defaultUserId }
    });
    
    console.log(`数据库中共有 ${migratedTasks.length} 个任务`);
    
  } catch (error) {
    console.error('迁移过程中出现错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 直接执行迁移
migrateTimerTasks();
