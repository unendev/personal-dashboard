import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../../../../lib/auth-utils';
import { prisma } from '@/lib/prisma';

// GET /api/treasures/[id]/answers - 获取宝藏的所有回答
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const answers = await prisma.treasureAnswer.findMany({
      where: { treasureId: id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(answers);
  } catch (error) {
    console.error('Error fetching answers:', error);
    return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 });
  }
}

// POST /api/treasures/[id]/answers - 创建回答
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { id } = await params;
    const { content } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '回答内容不能为空' }, { status: 400 });
    }

    const answer = await prisma.treasureAnswer.create({
      data: {
        treasureId: id,
        userId,
        content: content.trim()
      }
    });

    return NextResponse.json(answer, { status: 201 });
  } catch (error) {
    console.error('Error creating answer:', error);
    return NextResponse.json({ error: 'Failed to create answer' }, { status: 500 });
  }
}

