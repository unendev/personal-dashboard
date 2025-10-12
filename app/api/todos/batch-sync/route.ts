import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/todos/batch-sync
 * 批量同步Markdown内容到数据库
 * 
 * 接收完整的Markdown内容，保存到数据库的mdContent字段
 * 后续可以扩展为解析Markdown并同步结构化任务数据
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const { mdContent } = body;

    if (typeof mdContent !== 'string') {
      return NextResponse.json(
        { error: 'mdContent is required and must be a string' },
        { status: 400 }
      );
    }

    // 查找用户的第一个Todo记录（作为主文档存储）
    let mainTodo = await prisma.todo.findFirst({
      where: {
        userId,
        parentId: null,
      },
      orderBy: {
        createdAtUnix: 'asc',
      },
    });

    if (!mainTodo) {
      // 如果没有任何Todo记录，创建一个主文档
      mainTodo = await prisma.todo.create({
        data: {
          userId,
          text: '任务列表',
          completed: false,
          date: new Date().toISOString().split('T')[0],
          createdAtUnix: Math.floor(Date.now() / 1000),
          mdContent,
          priority: 'medium',
          order: 0,
        },
      });
    } else {
      // 更新现有主文档的mdContent
      mainTodo = await prisma.todo.update({
        where: { id: mainTodo.id },
        data: { mdContent },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Markdown content saved successfully',
      todo: mainTodo,
    });
  } catch (error) {
    console.error('Error syncing markdown:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync markdown content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

