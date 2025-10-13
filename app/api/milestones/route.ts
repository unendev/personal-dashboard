import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/milestones
 * 创建并保存一个里程碑
 */
export async function POST(request: Request) {
  try {
    // 1. 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 2. 解析请求体
    const body = await request.json();
    const {
      startDate,
      endDate,
      aiTitle,
      aiFocus,
      aiInsights,
      aiKeyAchievements,
      confirmedAchievements,
      userNotes,
    } = body;

    // 3. 数据验证
    if (!startDate || !endDate || !aiTitle || !aiFocus) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 4. 创建里程碑记录
    const milestone = await prisma.milestone.create({
      data: {
        userId: session.user.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        aiTitle,
        aiFocus,
        aiInsights: aiInsights || [],
        aiKeyAchievements: aiKeyAchievements || [],
        confirmedAchievements: confirmedAchievements || [],
        userNotes: userNotes || null,
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error('Error creating milestone:', error);
    
    // 处理唯一约束冲突（已存在相同时间范围的里程碑）
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: '该时间范围的里程碑已存在' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        error: '创建里程碑失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/milestones
 * 获取用户的里程碑列表
 */
export async function GET(request: Request) {
  try {
    // 1. 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 2. 获取查询参数
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 3. 查询里程碑列表
    const milestones = await prisma.milestone.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        startDate: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // 4. 获取总数（用于分页）
    const total = await prisma.milestone.count({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      milestones,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json(
      { 
        error: '获取里程碑列表失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}






