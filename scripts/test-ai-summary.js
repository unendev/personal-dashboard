import { PrismaClient } from '@prisma/client';
import { AIService } from '../app/lib/ai-service.js';

const prisma = new PrismaClient();

async function testAISummary() {
  try {
    console.log('开始测试 AI 总结功能...');
    
    // 确保测试用户存在
    const testUser = await prisma.user.upsert({
      where: { id: 'user-1' },
      update: {},
      create: {
        id: 'user-1',
        email: 'test@example.com',
        name: '测试用户'
      }
    });
    
    console.log('✅ 测试用户确认存在:', testUser.email);
    
    // 创建一些测试任务数据
    const today = new Date().toISOString().split('T')[0];
    const testTasks = [
      {
        name: '学习 React',
        categoryPath: '价值投资/技能学习',
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
        categoryPath: '价值投资/技能学习',
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
        categoryPath: '价值投资/核心工作',
        elapsedTime: 10800, // 3小时
        initialTime: 10800,
        isRunning: false,
        startTime: Date.now() - 10800000,
        isPaused: false,
        pausedTime: 0,
        completedAt: Date.now(),
        date: today,
        userId: testUser.id
      },
      {
        name: '休息娱乐',
        categoryPath: '精力补充/纯粹娱乐',
        elapsedTime: 1800, // 30分钟
        initialTime: 1800,
        isRunning: false,
        startTime: Date.now() - 1800000,
        isPaused: false,
        pausedTime: 0,
        completedAt: Date.now(),
        date: today,
        userId: testUser.id
      }
    ];
    
    // 清理旧数据
    await prisma.timerTask.deleteMany({
      where: { userId: testUser.id, date: today }
    });
    
    // 创建测试任务
    for (const taskData of testTasks) {
      const task = await prisma.timerTask.create({
        data: taskData
      });
      console.log(`✅ 创建任务: ${task.name} (${task.elapsedTime}秒)`);
    }
    
    // 测试 AI 总结功能
    console.log('\n开始生成 AI 总结...');
    const summary = await AIService.generateSummary(testUser.id, today);
    
    console.log('\n=== AI 总结结果 ===');
    console.log(`日期: ${today}`);
    console.log(`总时间: ${Math.floor(summary.totalTime / 3600)}小时${Math.floor((summary.totalTime % 3600) / 60)}分钟`);
    console.log(`任务数: ${summary.taskCount}个`);
    console.log(`总结: ${summary.summary}`);
    
    if (summary.insights && summary.insights.length > 0) {
      console.log('\n洞察:');
      summary.insights.forEach((insight, index) => {
        console.log(`${index + 1}. ${insight}`);
      });
    }
    
    if (summary.categories && Object.keys(summary.categories).length > 0) {
      console.log('\n时间分配:');
      Object.entries(summary.categories).forEach(([category, time]) => {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const percentage = Math.round((time / summary.totalTime) * 100);
        console.log(`- ${category}: ${hours}小时${minutes}分钟 (${percentage}%)`);
      });
    }
    
    console.log('\n✅ AI 总结测试完成！');
    
    // 清理测试数据
    await prisma.timerTask.deleteMany({
      where: { userId: testUser.id, date: today }
    });
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ AI 总结测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testAISummary();
