import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserId } from '../../../../lib/auth-utils';

const prisma = new PrismaClient();

// GET /api/treasures/[id] - 获取特定宝藏
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { id } = await params;

    const treasure = await prisma.treasure.findFirst({
      where: { id, userId },
      include: {
        images: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!treasure) {
      return NextResponse.json({ error: 'Treasure not found' }, { status: 404 });
    }

    return NextResponse.json(treasure);
  } catch (error) {
    console.error('Error fetching treasure:', error);
    return NextResponse.json({ error: 'Failed to fetch treasure' }, { status: 500 });
  }
}

// PUT /api/treasures/[id] - 更新特定宝藏
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { 
      title, 
      content, 
      tags, 
      musicTitle, 
      musicArtist, 
      musicAlbum, 
      musicUrl 
    } = body;

    const userId = await getUserId(request);
    const { id } = await params;

    // 验证宝藏属于当前用户
    const existingTreasure = await prisma.treasure.findFirst({
      where: { id, userId }
    });

    if (!existingTreasure) {
      return NextResponse.json({ error: 'Treasure not found' }, { status: 404 });
    }

    const treasure = await prisma.treasure.update({
      where: { id },
      data: {
        title,
        content,
        tags,
        musicTitle,
        musicArtist,
        musicAlbum,
        musicUrl
      },
      include: {
        images: true
      }
    });

    return NextResponse.json(treasure);
  } catch (error) {
    console.error('Error updating treasure:', error);
    return NextResponse.json({ error: 'Failed to update treasure' }, { status: 500 });
  }
}

// DELETE /api/treasures/[id] - 删除特定宝藏
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { id } = await params;

    // 验证宝藏属于当前用户
    const existingTreasure = await prisma.treasure.findFirst({
      where: { id, userId }
    });

    if (!existingTreasure) {
      return NextResponse.json({ error: 'Treasure not found' }, { status: 404 });
    }

    await prisma.treasure.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Treasure deleted successfully' });
  } catch (error) {
    console.error('Error deleting treasure:', error);
    return NextResponse.json({ error: 'Failed to delete treasure' }, { status: 500 });
  }
}
