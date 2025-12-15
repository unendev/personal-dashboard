import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateSignedUrl } from '@/lib/oss-utils';

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
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        readingProgress: {
          where: { userId: session.user.id },
          take: 1,
        }
      }
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (book.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 如果 fileUrl 是 OSS 路径（不包含 http），生成签名 URL
    // 但通常我们在存库时存的是完整 URL。如果使用了私有读写 Bucket，需要签名。
    // 假设是公共读或我们前端用签名 URL 直传后存的是公开 URL。
    // 如果是私有 bucket，这里可以用 generateSignedUrl 转换。
    // 为了保险，如果 URL 不包含 http，我们尝试签名。
    let fileUrl = book.fileUrl;
    if (!fileUrl.startsWith('http')) {
        fileUrl = generateSignedUrl(fileUrl);
    }

    return NextResponse.json({
      ...book,
      fileUrl
    });
  } catch (error) {
    console.error('Fetch book error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    try {
      const book = await prisma.book.findUnique({ where: { id } });
      
      if (!book || book.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
  
      await prisma.book.delete({ where: { id } });
      // 注意：这里没有同步删除 OSS 文件，通常需要一个定期清理任务或消息队列
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Delete book error:', error);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
  }
