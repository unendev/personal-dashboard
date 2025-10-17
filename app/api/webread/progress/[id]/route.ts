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

    const { id: bookId } = await params;

    const progress = await prisma.readingProgress.findUnique({
      where: {
        bookId_userId: {
          bookId,
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Get progress error:', error);
    return NextResponse.json({ error: 'Failed to get progress' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookId } = await params;
    const { chapter, progress, cfi } = await request.json();

    if (!chapter || progress === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const readingProgress = await prisma.readingProgress.upsert({
      where: {
        bookId_userId: {
          bookId,
          userId: session.user.id,
        },
      },
      update: {
        currentChapter: chapter,
        progress: Math.max(0, Math.min(1, progress)), // 确保进度在 0-1 之间
        cfi: cfi,
        lastReadAt: new Date(),
      },
      create: {
        bookId,
        userId: session.user.id,
        currentChapter: chapter,
        progress: Math.max(0, Math.min(1, progress)),
        cfi: cfi,
      },
    });

    return NextResponse.json(readingProgress);
  } catch (error) {
    console.error('Save progress error:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
