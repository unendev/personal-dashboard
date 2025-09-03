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

    // 确保返回的是数组格式
    return NextResponse.json(logs);
  } catch (error) {
    console.error('获取日志失败:', error);
    return NextResponse.json(
      { error: '获取日志失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, questId, categories } = body;

    // 创建日志
    const log = await prisma.log.create({
      data: {
        content,
        questId: questId || null,
        userId: MOCK_USER_ID,
        timestamp: new Date(),
        categories: {
          create: categories?.map((category: { name: string; subCategories?: Array<{ name: string; activities?: Array<{ name: string; duration: string }> }> }) => ({
            name: category.name,
            subCategories: {
              create: category.subCategories?.map((subCategory: { name: string; activities?: Array<{ name: string; duration: string }> }) => ({
                name: subCategory.name,
                activities: {
                  create: subCategory.activities?.map((activity: { name: string; duration: string }) => ({
                    name: activity.name,
                    duration: activity.duration
                  })) || []
                }
              })) || []
            }
          })) || []
        }
      },
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
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('创建日志失败:', error);
    return NextResponse.json(
      { error: '创建日志失败' },
      { status: 500 }
    );
  }
}
