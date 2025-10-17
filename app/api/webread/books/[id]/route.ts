import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const book = await prisma.book.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        author: true,
        fileUrl: true,
        fileSize: true,
        uploadDate: true,
        coverUrl: true,
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error('Get book error:', error);
    return NextResponse.json({ error: 'Failed to get book' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const book = await prisma.book.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // 删除书籍（级联删除相关数据）
    await prisma.book.delete({
      where: { id },
    });

    // TODO: 删除 Vercel Blob 中的文件
    // 这里需要实现删除 blob 文件的逻辑

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete book error:', error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
