import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAISummary() {
  try {
    console.log('开始测试AI总结功能...');
    
    // 创建测试用户
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: '测试用户'
      }
    });
    
    console.log('✅ 测试用户创建/获取成功:', testUser.email);
    
    // 创建一些测试任务
    const today = new Date().toISOString().split('T')[0];
    const testTasks = [
      {
        name: '学习 React',
        categoryPath: '学习/前端开发',
        elapsedTime: 7200, // 2小时
        initialTime: 7200,
        isRunning: false,
        startTime: Date.now() - 7200000,
        isPaused: false,
        pausedTime: 0,
        completedAt: Date.now(),
        date: today,
        userId: testUser.id
      },
      {
        name: '阅读文档',
        categoryPath: '学习/文档阅读',
        elapsedTime: 3600, // 1小时
        initialTime: 3600,
        isRunning: false,
        startTime: Date.now() - 3600000,
        isPaused: false,
        pausedTime: 0,
        completedAt: Date.now(),
        date: today,
        userId: testUser.id
      },
      {
        name: '写代码',
        categoryPath: '工作/编程',
        elapsedTime: 10800, // 3小时
        initialTime: 10800,
        isRunning: false,
        startTime: Date.now() - 10800000,
        isPaused: false,
        pausedTime: 0,
        completedAt: Date.now(),
        date: today,
        userId: testUser.id
      }
    ];
    
    for (const taskData of testTasks) {
      const task = await prisma.timerTask.create({
        data: taskData
      });
      console.log(`✅ 创建任务: ${task.name} (${task.elapsedTime}秒)`);
    }
    
    // 测试AI总结API
    console.log('\n测试AI总结API...');
    const response = await fetch(`http://localhost:3000/api/ai-summary?userId=${testUser.id}&date=${today}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const summary = await response.json();
    console.log('✅ AI总结生成成功:');
    console.log('总结:', summary.summary);
    console.log('总时间:', summary.totalTime, '秒');
    console.log('任务数:', summary.taskCount);
    console.log('洞察:', summary.insights);
    console.log('分类:', summary.categories);
    
    // 清理测试数据
    await prisma.timerTask.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    
    console.log('\n✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testAISummary();
