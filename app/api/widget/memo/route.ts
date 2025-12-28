import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const WIDGET_MEMO_TITLE = 'Widget Memo';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let memo = await prisma.note.findFirst({
    where: { userId: session.user.id, title: WIDGET_MEMO_TITLE },
  });

  if (!memo) {
    memo = await prisma.note.create({
      data: {
        userId: session.user.id,
        title: WIDGET_MEMO_TITLE,
        content: '',
      },
    });
  }

  return NextResponse.json(memo);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { content } = await req.json();
  
  const memo = await prisma.note.upsert({
    where: { 
      // Note table doesn't have a unique constraint on title+userId, so we find first or create
      id: (await prisma.note.findFirst({
        where: { userId: session.user.id, title: WIDGET_MEMO_TITLE }
      }))?.id || 'new-memo-id'
    },
    update: { content },
    create: {
      userId: session.user.id,
      title: WIDGET_MEMO_TITLE,
      content,
    },
  });

  return NextResponse.json(memo);
}
