import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 生成每日总结的函数
async function generateDailySummary() {
  try {
    console.log('开始生成每日总结...');
    
    // 获取昨天的日期
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split('T')[0];
    
    // 获取所有用户
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    });
    
    console.log(`找到 ${users.length} 个用户`);
    
    for (const user of users) {
      try {
        // 获取用户昨天的任务
        const tasks = await prisma.timerTask.findMany({
          where: {
            userId: user.id,
            date: dateString
          }
        });
        
        if (tasks.length === 0) {
          console.log(`用户 ${user.email} 昨天没有任务记录`);
          continue;
        }
        
        // 计算统计数据
        const totalTime = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
        const taskCount = tasks.length;
        const categories = {};
        
        tasks.forEach(task => {
          const category = task.categoryPath.split('/')[0] || '未分类';
          categories[category] = (categories[category] || 0) + task.elapsedTime;
        });
        
        // 生成AI洞察
        const insights = [];
        
        if (totalTime > 8 * 3600) {
          insights.push("昨天工作时间超过8小时，请注意休息。");
        }
        
        if (taskCount > 5) {
          insights.push("任务数量较多，建议集中精力在重要任务上。");
        }
        
        const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
        if (topCategory) {
          insights.push(`在"${topCategory[0]}"类别上投入了最多时间，占总时间的${Math.round(topCategory[1] / totalTime * 100)}%。`);
        }
        
        const completedTasks = tasks.filter(task => task.completedAt);
        if (completedTasks.length > 0) {
          insights.push(`完成了${completedTasks.length}个任务，效率不错！`);
        }
        
        const summary = `昨天总共工作了${Math.floor(totalTime / 3600)}小时${Math.floor((totalTime % 3600) / 60)}分钟，完成了${taskCount}个任务。${insights.join(' ')}`;
        
        // 保存总结到数据库（这里可以创建一个新的表来存储总结）
        console.log(`用户 ${user.email} 的总结: ${summary}`);
        
        // 这里可以发送邮件通知用户
        // await sendEmail(user.email, '每日总结', summary);
        
      } catch (error) {
        console.error(`处理用户 ${user.email} 时出错:`, error);
      }
    }
    
    console.log('每日总结生成完成！');
    
  } catch (error) {
    console.error('生成每日总结时出错:', error);
  }
}

// 设置定时任务 - 每天早上 8:00 执行
const schedule = '0 8 * * *'; // cron 表达式：每天上午 8:00

console.log('启动每日总结定时任务...');
console.log(`定时任务将在每天上午 8:00 执行`);

cron.schedule(schedule, async () => {
  console.log('定时任务触发，开始生成每日总结...');
  await generateDailySummary();
}, {
  scheduled: true,
  timezone: "Asia/Shanghai"
});

// 手动触发一次（用于测试）
if (process.argv.includes('--test')) {
  console.log('手动触发每日总结生成...');
  generateDailySummary().then(() => {
    console.log('测试完成');
    process.exit(0);
  }).catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
}

// 保持进程运行
process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭...');
  prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭...');
  prisma.$disconnect();
  process.exit(0);
});
