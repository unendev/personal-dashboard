import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../../../../lib/auth-utils';
import { prisma } from '@/lib/prisma';

// POST /api/treasures/[id]/like - 点赞宝藏（允许多次点赞）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { id } = await params;

    // 创建点赞记录并增加计数（不检查是否已存在，允许多次点赞）
    await prisma.$transaction([
      prisma.treasureLike.create({
        data: {
          treasureId: id,
          userId
        }
      }),
      prisma.treasure.update({
        where: { id },
        data: {
          likesCount: {
            increment: 1
          }
        }
      })
    ]);

    return NextResponse.json({ message: '点赞成功' });
  } catch (error) {
    console.error('Error liking treasure:', error);
    return NextResponse.json({ error: 'Failed to like treasure' }, { status: 500 });
  }
}

