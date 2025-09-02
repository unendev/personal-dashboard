import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/todos - 获取指定日期的任务列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    if (!userId || !date) {
      return NextResponse.json({ error: 'userId and date are required' }, { status: 400 });
    }

    const todos = await prisma.todo.findMany({
      where: { 
        userId,
        date 
      },
      orderBy: { createdAtUnix: 'desc' }
    });

    return NextResponse.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

// POST /api/todos - 创建新任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, completed, createdAt, priority, category, userId, date } = body;

    if (!text || !userId || !date) {
      return NextResponse.json({ error: 'text, userId, and date are required' }, { status: 400 });
    }

    const newTodo = await prisma.todo.create({
      data: {
        text,
        completed: completed || false,
        createdAtUnix: createdAt || Date.now(),
        priority: priority || 'medium',
        category: category || null,
        userId,
        date
      }
    });

    return NextResponse.json(newTodo, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}

// PUT /api/todos - 更新任务
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Todo ID is required' }, { status: 400 });
    }

    const updatedTodo = await prisma.todo.update({
      where: { id },
      data: updates
    });

    return NextResponse.json(updatedTodo);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

// DELETE /api/todos - 删除任务
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Todo ID is required' }, { status: 400 });
    }

    await prisma.todo.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
