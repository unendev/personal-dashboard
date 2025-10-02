import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../../../../../lib/auth-utils';
import { prisma } from '@/lib/prisma';

// DELETE /api/treasures/[id]/answers/[answerId] - 删除回答
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; answerId: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { answerId } = await params;

    // 检查回答是否存在且属于当前用户
    const existingAnswer = await prisma.treasureAnswer.findFirst({
      where: { 
        id: answerId,
        userId 
      }
    });

    if (!existingAnswer) {
      return NextResponse.json({ error: '回答不存在或无权删除' }, { status: 404 });
    }

    // 删除回答
    await prisma.treasureAnswer.delete({
      where: { id: answerId }
    });

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('Error deleting answer:', error);
    return NextResponse.json({ error: 'Failed to delete answer' }, { status: 500 });
  }
}

