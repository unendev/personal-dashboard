import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { progress, cfi, currentChapter } = await request.json();

    if (progress === undefined || !cfi) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const readingProgress = await prisma.readingProgress.upsert({
      where: {
        bookId_userId: {
          bookId: id,
          userId: session.user.id,
        },
      },
      update: {
        progress,
        cfi,
        currentChapter: currentChapter || '',
        lastReadAt: new Date(),
      },
      create: {
        bookId: id,
        userId: session.user.id,
        progress,
        cfi,
        currentChapter: currentChapter || '',
      },
    });

    return NextResponse.json(readingProgress);
  } catch (error) {
    console.error('Update progress error:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    try {
      const readingProgress = await prisma.readingProgress.findUnique({
        where: {
            bookId_userId: {
                bookId: id,
                userId: session.user.id,
            },
        },
      });
  
      return NextResponse.json(readingProgress || {});
    } catch (error) {
      console.error('Fetch progress error:', error);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }
  }
