import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// MVP版本：硬编码用户ID
const MOCK_USER_ID = 'user-1';

export async function GET() {
  try {
    const logs = await prisma.log.findMany({
      where: { userId: MOCK_USER_ID },
      include: {
        quest: { select: { id: true, title: true } },
        categories: {
          include: {
            subCategories: {
              include: {
                activities: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('获取日志失败:', error);
    return NextResponse.json(
      { error: '获取日志失败' },
      { status: 500 }
    );
  }
}
