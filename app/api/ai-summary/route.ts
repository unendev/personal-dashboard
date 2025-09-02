import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/app/lib/ai-service';

// GET /api/ai-summary - 获取指定日期的AI总结
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const summary = await AIService.generateSummary(userId, date);
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

    const summary = await AIService.generateSummary(userId, date || new Date().toISOString().split('T')[0]);
    return NextResponse.json(summary, { status: 201 });
  } catch (error) {
    console.error('Error creating AI summary:', error);
    return NextResponse.json({ error: 'Failed to create AI summary' }, { status: 500 });
  }
}
