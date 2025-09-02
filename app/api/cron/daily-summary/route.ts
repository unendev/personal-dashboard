import { NextRequest, NextResponse } from 'next/server';
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
    
    const results = [];
    
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
          results.push({
            userId: user.id,
            email: user.email,
            summary: "昨天没有记录任何任务活动。",
            totalTime: 0,
            taskCount: 0
          });
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
        
        console.log(`用户 ${user.email} 的总结: ${summary}`);
        
        results.push({
          userId: user.id,
          email: user.email,
          summary,
          totalTime,
          taskCount,
          insights,
          categories
        });
        
      } catch (error) {
        console.error(`处理用户 ${user.email} 时出错:`, error);
        results.push({
          userId: user.id,
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log('每日总结生成完成！');
    return results;
    
  } catch (error) {
    console.error('生成每日总结时出错:', error);
    throw error;
  }
}

// Vercel Cron Jobs 端点
export async function GET(request: NextRequest) {
  try {
    // 验证请求来源（可选的安全检查）
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const results = await generateDailySummary();
    
    return NextResponse.json({
      success: true,
      message: '每日总结生成完成',
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Cron job 执行失败:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// 手动触发端点（用于测试）
export async function POST(request: NextRequest) {
  try {
    const results = await generateDailySummary();
    
    return NextResponse.json({
      success: true,
      message: '手动触发每日总结生成完成',
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('手动触发失败:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
