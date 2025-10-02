import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export interface TagStat {
  name: string;
  count: number;
  lastUsed: string;
  relatedTags: string[];
}

/**
 * GET /api/treasures/tags
 * 获取用户的标签统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // 获取所有宝藏的标签
    const treasures = await prisma.treasure.findMany({
      where: { userId },
      select: {
        tags: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // 统计标签信息
    const tagMap = new Map<string, {
      count: number;
      lastUsed: Date;
      coOccurrence: Map<string, number>;
    }>();

    treasures.forEach(treasure => {
      const tags = treasure.tags;
      
      tags.forEach(tag => {
        const existing = tagMap.get(tag);
        if (existing) {
          existing.count++;
          if (treasure.createdAt > existing.lastUsed) {
            existing.lastUsed = treasure.createdAt;
          }
        } else {
          tagMap.set(tag, {
            count: 1,
            lastUsed: treasure.createdAt,
            coOccurrence: new Map()
          });
        }

        // 记录标签共现
        const tagData = tagMap.get(tag)!;
        tags.forEach(otherTag => {
          if (otherTag !== tag) {
            tagData.coOccurrence.set(
              otherTag, 
              (tagData.coOccurrence.get(otherTag) || 0) + 1
            );
          }
        });
      });
    });

    // 构建标签统计数组
    const tagStats: TagStat[] = Array.from(tagMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        lastUsed: data.lastUsed.toISOString(),
        relatedTags: Array.from(data.coOccurrence.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([tag]) => tag)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return NextResponse.json({
      tags: tagStats,
      total: tagMap.size
    });
  } catch (error) {
    console.error('Error fetching tag stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tag statistics' }, 
      { status: 500 }
    );
  }
}
