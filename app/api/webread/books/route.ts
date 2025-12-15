import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const where = {
      userId: session.user.id,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { author: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy: { uploadDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          author: true,
          coverUrl: true,
          fileSize: true,
          uploadDate: true,
          readingProgress: {
            where: { userId: session.user.id },
            select: { progress: true, currentChapter: true },
            take: 1,
          }
        },
      }),
      prisma.book.count({ where }),
    ]);

    return NextResponse.json({
      books,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch books error:', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      const body = await request.json();
      const { title, author, fileUrl, fileSize, coverUrl } = body;
  
      if (!title || !fileUrl) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
  
      const book = await prisma.book.create({
        data: {
          title,
          author,
          fileUrl,
          fileSize,
          coverUrl,
          userId: session.user.id,
        },
      });
  
      return NextResponse.json(book);
    } catch (error) {
      console.error('Create book error:', error);
      return NextResponse.json({ error: 'Failed to create book record' }, { status: 500 });
    }
  }
