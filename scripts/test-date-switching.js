import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDateSwitching() {
  try {
    console.log('测试AI总结日期切换功能...');
    
    const userId = 'user-1';
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dayBeforeYesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`今天: ${today}`);
    console.log(`昨天: ${yesterday}`);
    console.log(`前天: ${dayBeforeYesterday}`);
    
    // 清理旧数据
    await prisma.aISummary.deleteMany({
      where: { 
        userId,
        date: { in: [today, yesterday, dayBeforeYesterday] }
      }
    });
    
    // 创建不同日期的测试数据
    const testSummaries = [
      {
        date: today,
        summary: '今天是高效的一天！总共工作了5小时，完成了6个重要任务。',
        totalTime: 18000,
        taskCount: 6,
        insights: ['工作效率很高', '任务完成度优秀'],
        categories: { '工作': 18000 }
      },
      {
        date: yesterday,
        summary: '昨天是休息日，总共工作了2小时，完成了3个轻松任务。',
        totalTime: 7200,
        taskCount: 3,
        insights: ['工作节奏适中', '休息充分'],
        categories: { '休息': 7200 }
      },
      {
        date: dayBeforeYesterday,
        summary: '前天是忙碌的一天，总共工作了8小时，完成了10个任务。',
        totalTime: 28800,
        taskCount: 10,
        insights: ['工作强度较大', '任务量充足'],
        categories: { '工作': 28800 }
      }
    ];
    
    // 创建测试数据
    for (const testData of testSummaries) {
      const summary = await prisma.aISummary.create({
        data: {
          userId,
          date: testData.date,
          summary: testData.summary,
          totalTime: testData.totalTime,
          taskCount: testData.taskCount,
          insights: testData.insights,
          categories: testData.categories
        }
      });
      console.log(`✅ 创建 ${testData.date} 的总结: ${summary.summary.substring(0, 30)}...`);
    }
    
    // 测试API调用
    console.log('\n测试API调用...');
    const baseUrl = 'http://localhost:3000';
    
    for (const testData of testSummaries) {
      try {
        const response = await fetch(`${baseUrl}/api/ai-summary?userId=${userId}&date=${testData.date}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${testData.date}: ${data.summary.substring(0, 30)}... (缓存: ${data.isFromCache})`);
        } else {
          console.log(`❌ ${testData.date}: API调用失败`);
        }
      } catch (error) {
        console.log(`❌ ${testData.date}: ${error.message}`);
      }
    }
    
    console.log('\n✅ 日期切换测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDateSwitching();
