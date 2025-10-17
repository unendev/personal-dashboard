import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const author = formData.get('author') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 验证文件类型
    if (!file.name.toLowerCase().endsWith('.epub')) {
      return NextResponse.json({ error: 'Only EPUB files are allowed' }, { status: 400 });
    }

    // 验证文件大小 (50MB 限制)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 50MB' }, { status: 400 });
    }

    // 上传到 Vercel Blob
    const blob = await put(`${Date.now()}-${file.name}`, file, {
      access: 'public',
    });

    // 存储元数据到数据库
    const book = await prisma.book.create({
      data: {
        title: title || file.name.replace('.epub', ''),
        author: author || null,
        fileUrl: blob.url,
        fileSize: file.size,
        userId: session.user.id,
      },
    });

    return NextResponse.json(book);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

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
        include: {
          readingProgress: {
            where: { userId: session.user.id },
            take: 1,
          },
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
