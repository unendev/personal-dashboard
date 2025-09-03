import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// MVP版本：硬编码用户ID
const MOCK_USER_ID = 'user-1';

export async function GET() {
  try {
    const records = await prisma.operationRecord.findMany({
      where: { userId: MOCK_USER_ID },
      orderBy: { timestamp: 'desc' },
      take: 50, // 只获取最近50条记录
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('获取操作记录失败:', error);
    return NextResponse.json(
      { error: '获取操作记录失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, taskName, details } = body;

    if (!action || !taskName) {
      return NextResponse.json(
        { error: 'action和taskName是必需的' },
        { status: 400 }
      );
    }

    const record = await prisma.operationRecord.create({
      data: {
        action,
        taskName,
        details: details || null,
        userId: MOCK_USER_ID,
        timestamp: new Date(),
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('创建操作记录失败:', error);
    return NextResponse.json(
      { error: '创建操作记录失败' },
      { status: 500 }
    );
  }
}
