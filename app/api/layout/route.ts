import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MOCK_USER_ID = 'user-1'; // 替换为实际的用户认证

export async function GET() {
  try {
    const userLayout = await prisma.userLayout.findUnique({
      where: { userId: MOCK_USER_ID },
    });
    return NextResponse.json(userLayout ? userLayout.layoutConfig : null);
  } catch (error) {
    console.error('Error fetching layout:', error);
    return NextResponse.json({ message: 'Failed to fetch layout' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const layoutConfig = await request.json();

    const userLayout = await prisma.userLayout.upsert({
      where: { userId: MOCK_USER_ID },
      update: { layoutConfig: layoutConfig },
      create: {
        userId: MOCK_USER_ID,
        layoutConfig: layoutConfig,
      },
    });

    return NextResponse.json(userLayout);
  } catch (error) {
    console.error('Error saving layout:', error);
    return NextResponse.json({ message: 'Failed to save layout' }, { status: 500 });
  }
}
