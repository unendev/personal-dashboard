import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

// GET /api/todos - 获取用户的所有任务列表（不按日期过滤）
export async function GET(request: NextRequest) {
  try {
    // 使用新的认证系统获取用户ID
    const userId = await getUserId(request);

    const todos = await prisma.todo.findMany({
      where: {
        userId
      },
      orderBy: [
        { order: 'asc' },
        { priority: 'desc' },
        { createdAtUnix: 'desc' }
      ]
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
    const { text, priority = 'medium', category, parentId } = body;

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    // 使用新的认证系统获取用户ID
    const userId = await getUserId(request);

    // 获取当前最小order值，让新任务排在最前面
    const minOrder = await prisma.todo.findFirst({
      where: {
        userId,
        parentId: parentId || null
      },
      orderBy: { order: 'asc' },
      select: { order: true }
    });

    const todo = await prisma.todo.create({
      data: {
        userId,
        text,
        priority,
        category,
        date: new Date().toISOString().split('T')[0], // 保留date字段用于记录创建日期，但不用于过滤
        parentId: parentId || null,
        order: Math.max(0, (minOrder?.order || 0) - 1), // 新任务获得更小的order值，排在最前面
        createdAtUnix: Math.floor(Date.now() / 1000)
      }
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}

// PUT /api/todos - 更新任务
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, text, completed, priority, category, parentId } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (text !== undefined) updateData.text = text;
    if (completed !== undefined) updateData.completed = completed;
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category;
    if (parentId !== undefined) updateData.parentId = parentId; // 支持更新 parentId

    const todo = await prisma.todo.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(todo);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

// DELETE /api/todos - 删除任务（级联删除子任务）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // 递归查找并删除所有子任务
    async function deleteWithChildren(todoId: string) {
      // 查找所有子任务
      const children = await prisma.todo.findMany({
        where: { parentId: todoId }
      });

      // 递归删除子任务
      for (const child of children) {
        await deleteWithChildren(child.id);
      }

      // 删除当前任务
      await prisma.todo.delete({
        where: { id: todoId }
      });
    }

    await deleteWithChildren(id);

    return NextResponse.json({ message: 'Todo and its children deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}

// PATCH /api/todos - 更新任务排序
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { todos } = body;

    if (!Array.isArray(todos)) {
      return NextResponse.json({ error: 'todos array is required' }, { status: 400 });
    }

    // 验证数据格式
    for (const todo of todos) {
      if (!todo.id || typeof todo.order !== 'number') {
        return NextResponse.json({ 
          error: 'Invalid todo format. Each todo must have id and order fields' 
        }, { status: 400 });
      }
    }

    // 批量更新排序
    const updatePromises = todos.map((todo: { id: string; order: number }) =>
      prisma.todo.update({
        where: { id: todo.id },
        data: { order: todo.order }
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ message: 'Todos reordered successfully' });
  } catch (error) {
    console.error('Error reordering todos:', error);
    return NextResponse.json({ 
      error: 'Failed to reorder todos', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
