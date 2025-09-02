import { PrismaClient } from '@prisma/client';
import { AIService } from '../app/lib/ai-service.js';

const prisma = new PrismaClient();

/**
 * 生成昨日 AI 总结的定时任务
 * 建议在每天凌晨 1:00 运行
 */
async function generateDailyAISummary() {
  try {
    console.log('开始生成昨日 AI 总结...');
    
    // 获取昨天的日期
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    console.log(`目标日期: ${yesterdayStr}`);
    
    // 获取所有用户
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true }
    });
    
    console.log(`找到 ${users.length} 个用户`);
    
    const results = [];
    
    for (const user of users) {
      try {
        console.log(`正在为用户 ${user.email || user.name} 生成总结...`);
        
        // 生成 AI 总结
        const summary = await AIService.generateSummary(user.id, yesterdayStr);
        
        // 保存总结到数据库（可选）
        // 这里可以创建一个新的表来存储历史总结
        // await prisma.aiSummary.create({
        //   data: {
        //     userId: user.id,
        //     date: yesterdayStr,
        //     summary: summary.summary,
        //     totalTime: summary.totalTime,
        //     taskCount: summary.taskCount,
        //     insights: summary.insights,
        //     categories: summary.categories
        //   }
        // });
        
        results.push({
          userId: user.id,
          email: user.email,
          name: user.name,
          date: yesterdayStr,
          success: true,
          summary: summary.summary,
          totalTime: summary.totalTime,
          taskCount: summary.taskCount
        });
        
        console.log(`✅ 用户 ${user.email || user.name} 总结生成成功`);
        console.log(`   总时间: ${Math.floor(summary.totalTime / 3600)}小时${Math.floor((summary.totalTime % 3600) / 60)}分钟`);
        console.log(`   任务数: ${summary.taskCount}个`);
        console.log(`   总结: ${summary.summary.substring(0, 100)}...`);
        
      } catch (error) {
        console.error(`❌ 用户 ${user.email || user.name} 总结生成失败:`, error.message);
        
        results.push({
          userId: user.id,
          email: user.email,
          name: user.name,
          date: yesterdayStr,
          success: false,
          error: error.message
        });
      }
    }
    
    // 输出总结报告
    console.log('\n=== AI 总结生成报告 ===');
    console.log(`日期: ${yesterdayStr}`);
    console.log(`总用户数: ${users.length}`);
    console.log(`成功: ${results.filter(r => r.success).length}`);
    console.log(`失败: ${results.filter(r => !r.success).length}`);
    
    if (results.filter(r => r.success).length > 0) {
      console.log('\n成功生成的总结:');
      results.filter(r => r.success).forEach(result => {
        console.log(`- ${result.email || result.name}: ${result.summary.substring(0, 80)}...`);
      });
    }
    
    if (results.filter(r => !r.success).length > 0) {
      console.log('\n失败的总结:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`- ${result.email || result.name}: ${result.error}`);
      });
    }
    
    console.log('\nAI 总结生成完成！');
    
  } catch (error) {
    console.error('生成 AI 总结时发生错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDailyAISummary();
}

export { generateDailyAISummary };
