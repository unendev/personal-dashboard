import { PrismaClient } from '@prisma/client';
import { AIService } from './ai-service.js';

const prisma = new PrismaClient();

async function testAISummaryIntegration() {
  try {
    console.log('开始测试 AI 总结整合功能...');
    
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
    const now = Math.floor(Date.now() / 1000);
    const testTasks = [
      {
        name: '学习 React',
        categoryPath: '价值投资/技能学习',
        elapsedTime: 7200, // 2小时
        initialTime: 7200,
        isRunning: false,
        startTime: now - 7200,
        isPaused: false,
        pausedTime: 0,
        completedAt: now,
        date: today,
        userId: testUser.id
      },
      {
        name: '阅读文档',
        categoryPath: '价值投资/技能学习',
        elapsedTime: 3600, // 1小时
        initialTime: 3600,
        isRunning: false,
        startTime: now - 3600,
        isPaused: false,
        pausedTime: 0,
        completedAt: now,
        date: today,
        userId: testUser.id
      },
      {
        name: '写代码',
        categoryPath: '价值投资/核心工作',
        elapsedTime: 10800, // 3小时
        initialTime: 10800,
        isRunning: false,
        startTime: now - 10800,
        isPaused: false,
        pausedTime: 0,
        completedAt: now,
        date: today,
        userId: testUser.id
      }
    ];
    
    // 清理旧数据
    await prisma.timerTask.deleteMany({
      where: { userId: testUser.id, date: today }
    });
    
    // 清理旧的AI总结
    await prisma.aISummary.deleteMany({
      where: { userId: testUser.id, date: today }
    });
    
    // 创建测试任务
    for (const taskData of testTasks) {
      const task = await prisma.timerTask.create({
        data: taskData
      });
      console.log(`✅ 创建任务: ${task.name} (${task.elapsedTime}秒)`);
    }
    
    // 测试 AI 总结生成
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
    
    // 测试保存到数据库
    console.log('\n测试保存到数据库...');
    const savedSummary = await prisma.aISummary.create({
      data: {
        userId: testUser.id,
        date: today,
        summary: summary.summary,
        totalTime: summary.totalTime,
        taskCount: summary.taskCount,
        insights: summary.insights,
        categories: summary.categories
      }
    });
    
    console.log(`✅ AI总结已保存到数据库，ID: ${savedSummary.id}`);
    
    // 测试从数据库读取
    console.log('\n测试从数据库读取...');
    const retrievedSummary = await prisma.aISummary.findUnique({
      where: {
        userId_date: {
          userId: testUser.id,
          date: today
        }
      }
    });
    
    if (retrievedSummary) {
      console.log('✅ 成功从数据库读取AI总结');
      console.log(`总结内容: ${retrievedSummary.summary.substring(0, 100)}...`);
    } else {
      console.log('❌ 无法从数据库读取AI总结');
    }
    
    // 测试重复保存（应该更新而不是创建）
    console.log('\n测试重复保存（更新功能）...');
    const updatedSummary = await prisma.aISummary.upsert({
      where: {
        userId_date: {
          userId: testUser.id,
          date: today
        }
      },
      update: {
        summary: '这是更新后的总结内容',
        totalTime: summary.totalTime,
        taskCount: summary.taskCount,
        insights: summary.insights,
        categories: summary.categories
      },
      create: {
        userId: testUser.id,
        date: today,
        summary: summary.summary,
        totalTime: summary.totalTime,
        taskCount: summary.taskCount,
        insights: summary.insights,
        categories: summary.categories
      }
    });
    
    console.log(`✅ 更新成功，ID: ${updatedSummary.id}`);
    console.log(`更新后的总结: ${updatedSummary.summary}`);
    
    console.log('\n✅ AI 总结整合功能测试完成！');
    
    // 清理测试数据
    await prisma.timerTask.deleteMany({
      where: { userId: testUser.id, date: today }
    });
    
    await prisma.aISummary.deleteMany({
      where: { userId: testUser.id, date: today }
    });
    
    console.log('🧹 测试数据已清理');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testAISummaryIntegration();
