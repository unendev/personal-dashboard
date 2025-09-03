import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/app/lib/ai-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/ai-summary - 获取指定日期的AI总结
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // 首先尝试从数据库获取已保存的总结
    const savedSummary = await prisma.aISummary.findUnique({
      where: {
        userId_date: {
          userId,
          date
        }
      }
    });

    if (savedSummary) {
      return NextResponse.json({
        summary: savedSummary.summary,
        totalTime: savedSummary.totalTime,
        taskCount: savedSummary.taskCount,
        insights: savedSummary.insights as string[],
        categories: savedSummary.categories as Record<string, number>,
        isFromCache: true
      });
    }

    // 如果没有保存的总结，实时生成（仅用于测试或手动触发）
    const summary = await AIService.generateSummary(userId, date);
    return NextResponse.json({
      ...summary,
      isFromCache: false
    });
  } catch (error) {
    console.error('Error fetching AI summary:', error);
    return NextResponse.json({ error: 'Failed to generate AI summary' }, { status: 500 });
  }
}

// POST /api/ai-summary - 手动触发AI总结生成并保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, date } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const summary = await AIService.generateSummary(userId, targetDate);

    // 保存到数据库
    const savedSummary = await prisma.aISummary.upsert({
      where: {
        userId_date: {
          userId,
          date: targetDate
        }
      },
      update: {
        summary: summary.summary,
        totalTime: summary.totalTime,
        taskCount: summary.taskCount,
        insights: summary.insights,
        categories: summary.categories
      },
      create: {
        userId,
        date: targetDate,
        summary: summary.summary,
        totalTime: summary.totalTime,
        taskCount: summary.taskCount,
        insights: summary.insights,
        categories: summary.categories
      }
    });

    return NextResponse.json({
      ...summary,
      id: savedSummary.id,
      isFromCache: false
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating AI summary:', error);
    return NextResponse.json({ error: 'Failed to create AI summary' }, { status: 500 });
  }
}
