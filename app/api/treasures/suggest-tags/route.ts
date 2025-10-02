import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { AIService } from '@/lib/ai-service';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/treasures/suggest-tags
 * 根据内容生成智能标签建议
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    
    const { title, content, type } = body;

    if (!title || !type) {
      return NextResponse.json(
        { error: 'title and type are required' }, 
        { status: 400 }
      );
    }

    // 获取用户历史高频标签（作为参考）
    const recentTreasures = await prisma.treasure.findMany({
      where: { userId },
      select: { tags: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const tagFrequency = new Map<string, number>();
    recentTreasures.forEach(treasure => {
      treasure.tags.forEach(tag => {
        tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
      });
    });

    // 取出前10个高频标签
    const popularTags = Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    // 调用 AI 生成标签
    const suggestion = await AIService.generateTags({
      title,
      content,
      type,
      existingTags: popularTags
    });

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error('Error suggesting tags:', error);
    return NextResponse.json(
      { error: 'Failed to suggest tags' }, 
      { status: 500 }
    );
  }
}

