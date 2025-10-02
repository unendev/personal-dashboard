import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../../../../lib/auth-utils';
import { prisma } from '@/lib/prisma';

// POST /api/treasures/[id]/like - 点赞宝藏
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { id } = await params;

    // 检查是否已经点赞
    const existingLike = await prisma.treasureLike.findUnique({
      where: {
        treasureId_userId: {
          treasureId: id,
          userId
        }
      }
    });

    if (existingLike) {
      return NextResponse.json({ error: '已经点赞过了' }, { status: 400 });
    }

    // 创建点赞并增加计数
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

// DELETE /api/treasures/[id]/like - 取消点赞
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { id } = await params;

    // 检查点赞是否存在
    const existingLike = await prisma.treasureLike.findUnique({
      where: {
        treasureId_userId: {
          treasureId: id,
          userId
        }
      }
    });

    if (!existingLike) {
      return NextResponse.json({ error: '未点赞' }, { status: 400 });
    }

    // 删除点赞并减少计数
    await prisma.$transaction([
      prisma.treasureLike.delete({
        where: {
          treasureId_userId: {
            treasureId: id,
            userId
          }
        }
      }),
      prisma.treasure.update({
        where: { id },
        data: {
          likesCount: {
            decrement: 1
          }
        }
      })
    ]);

    return NextResponse.json({ message: '取消点赞成功' });
  } catch (error) {
    console.error('Error unliking treasure:', error);
    return NextResponse.json({ error: 'Failed to unlike treasure' }, { status: 500 });
  }
}

