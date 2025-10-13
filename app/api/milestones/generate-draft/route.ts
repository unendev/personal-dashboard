import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIService } from '@/lib/ai-service';

/**
 * POST /api/milestones/generate-draft
 * 生成每周回顾初稿
 */
export async function POST(request: Request) {
  try {
    // 1. 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 2. 解析请求参数
    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '缺少必要参数：startDate 和 endDate' },
        { status: 400 }
      );
    }

    // 3. 调用 AI 服务生成周报
    const weeklyReview = await AIService.generateWeeklyReview(
      session.user.id,
      startDate,
      endDate
    );

    // 4. 返回生成的周报初稿
    return NextResponse.json(weeklyReview);
  } catch (error) {
    console.error('Error generating weekly review draft:', error);
    return NextResponse.json(
      { 
        error: '生成周报失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}






