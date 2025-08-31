import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// TODO: 替换为实际的用户认证，从会话或上下文中获取用户ID
function getUserId() {
  // 假设从某个会话或上下文中获取用户ID
  // 目前仍然使用硬编码的ID进行开发和测试
  return 'user-1';
}

export async function GET() {
  try {
    const userId = getUserId(); // 获取用户ID
    const userLayout = await prisma.userLayout.findUnique({
      where: { userId: userId },
    });
    return NextResponse.json(userLayout ? userLayout.layoutConfig : {}); // 返回一个空对象而不是 null
  } catch (error) {
    console.error('Error fetching layout:', error);
    return NextResponse.json({ message: 'Failed to fetch layout' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const layoutConfig = await request.json();
    const userId = getUserId(); // 获取用户ID

    const userLayout = await prisma.userLayout.upsert({
      where: { userId: userId },
      update: { layoutConfig: layoutConfig },
      create: {
        userId: userId,
        layoutConfig: layoutConfig,
      },
    });

    return NextResponse.json(userLayout);
  } catch (error) {
    console.error('Error saving layout:', error);
    return NextResponse.json({ message: 'Failed to save layout' }, { status: 500 });
  }
}
