import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testTimerTasks() {
  try {
    console.log('开始测试 TimerTask 创建功能...');
    
    // 确保用户存在
    const user = await prisma.user.upsert({
      where: { id: 'user-1' },
      update: {},
      create: {
        id: 'user-1',
        email: 'user-1@localhost.local',
        name: 'User user-1',
      },
    });
    
    console.log('✅ 用户确认存在:', user.email);
    
    // 测试创建定时任务
    const testTask = {
      name: '测试任务',
      categoryPath: '测试/功能验证',
      elapsedTime: 0,
      initialTime: 3600,
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      completedAt: null,
      date: new Date().toISOString().split('T')[0],
      userId: 'user-1'
    };
    
    const createdTask = await prisma.timerTask.create({
      data: testTask
    });
    
    console.log('✅ 定时任务创建成功:', createdTask.name);
    console.log('任务ID:', createdTask.id);
    console.log('用户ID:', createdTask.userId);
    
    // 验证任务可以正确查询
    const tasks = await prisma.timerTask.findMany({
      where: { userId: 'user-1' }
    });
    
    console.log(`✅ 查询到 ${tasks.length} 个任务`);
    
    // 清理测试数据
    await prisma.timerTask.delete({
      where: { id: createdTask.id }
    });
    
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTimerTasks();
