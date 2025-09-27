import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserId } from '../../../../lib/auth-utils';

const prisma = new PrismaClient();

// GET /api/treasures/tags - 获取用户的所有标签
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);

    // 获取用户所有宝藏的标签
    const treasures = await prisma.treasure.findMany({
      where: { userId },
      select: { tags: true }
    });

    // 统计标签使用次数
    const tagCounts: Record<string, number> = {};
    treasures.forEach(treasure => {
      treasure.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // 转换为数组并按使用次数排序
    const tags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
