import { NextRequest, NextResponse } from 'next/server';
import { TimerDB } from '@/app/lib/timer-db';

// 模拟AI总结功能
async function generateAISummary(userId: string, date: string) {
  try {
    // 获取当日的任务数据
    const tasks = await TimerDB.getTasksByDate(userId, date);
    
    if (tasks.length === 0) {
      return {
        summary: "今天没有记录任何任务活动。",
        totalTime: 0,
        taskCount: 0,
        categories: {},
        insights: []
      };
    }

    // 计算统计数据
    const totalTime = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const taskCount = tasks.length;
    const categories: Record<string, number> = {};
    
    tasks.forEach(task => {
      const category = task.categoryPath.split('/')[0] || '未分类';
      categories[category] = (categories[category] || 0) + task.elapsedTime;
    });

    // 生成AI总结
    const insights = [];
    
    if (totalTime > 8 * 3600) {
      insights.push("今天工作时间超过8小时，请注意休息。");
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

    const summary = `今天总共工作了${Math.floor(totalTime / 3600)}小时${Math.floor((totalTime % 3600) / 60)}分钟，完成了${taskCount}个任务。${insights.join(' ')}`;

    return {
      summary,
      totalTime,
      taskCount,
      categories,
      insights,
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        categoryPath: task.categoryPath,
        elapsedTime: task.elapsedTime,
        completedAt: task.completedAt
      }))
    };
  } catch (error) {
    console.error('Error generating AI summary:', error);
    throw error;
  }
}

// GET /api/ai-summary - 获取指定日期的AI总结
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const summary = await generateAISummary(userId, date);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching AI summary:', error);
    return NextResponse.json({ error: 'Failed to generate AI summary' }, { status: 500 });
  }
}

// POST /api/ai-summary - 手动触发AI总结生成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, date } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const summary = await generateAISummary(userId, date || new Date().toISOString().split('T')[0]);
    return NextResponse.json(summary, { status: 201 });
  } catch (error) {
    console.error('Error creating AI summary:', error);
    return NextResponse.json({ error: 'Failed to create AI summary' }, { status: 500 });
  }
}
