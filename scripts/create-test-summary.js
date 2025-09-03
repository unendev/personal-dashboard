import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestSummary() {
  try {
    console.log('创建测试AI总结...');
    
    const userId = 'user-1';
    const date = new Date().toISOString().split('T')[0]; // 今天的日期
    
    // 清理旧数据
    await prisma.aISummary.deleteMany({
      where: { userId, date }
    });
    
    // 创建测试AI总结
    const testSummary = await prisma.aISummary.create({
      data: {
        userId,
        date,
        summary: '今天是一个高效的工作日！总共工作了4小时30分钟，完成了5个重要任务。在"价值投资"类别上投入了最多时间，占总时间的60%。完成了3个任务，效率不错！建议明天继续保持这种专注度。',
        totalTime: 16200, // 4小时30分钟
        taskCount: 5,
        insights: [
          '在"价值投资"类别上投入了最多时间，占总时间的60%',
          '完成了5个任务，效率不错',
          '建议明天继续保持这种专注度'
        ],
        categories: {
          '价值投资/技能学习': 7200,
          '价值投资/核心工作': 5400,
          '精力补充/休息': 3600
        }
      }
    });
    
    console.log('✅ 测试AI总结创建成功');
    console.log(`ID: ${testSummary.id}`);
    console.log(`日期: ${testSummary.date}`);
    console.log(`总结: ${testSummary.summary.substring(0, 100)}...`);
    console.log(`总时间: ${Math.floor(testSummary.totalTime / 3600)}小时${Math.floor((testSummary.totalTime % 3600) / 60)}分钟`);
    console.log(`任务数: ${testSummary.taskCount}个`);
    
  } catch (error) {
    console.error('❌ 创建测试AI总结失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSummary();
