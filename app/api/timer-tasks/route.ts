import { NextRequest, NextResponse } from 'next/server';
import { TimerDB } from '@/app/lib/timer-db';

// GET /api/timer-tasks - 获取用户的所有任务
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'user-1'; // 默认用户ID
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let tasks;
    if (date) {
      tasks = await TimerDB.getTasksByDate(userId, date);
    } else if (startDate && endDate) {
      tasks = await TimerDB.getTasksByDateRange(userId, startDate, endDate);
    } else {
      tasks = await TimerDB.getAllTasks(userId);
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching timer tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch timer tasks' }, { status: 500 });
  }
}

// POST /api/timer-tasks - 创建新任务或更新排序
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 检查是否是更新排序请求
    if (body.action === 'updateOrder' && body.taskOrders) {
      try {
        await TimerDB.updateTaskOrder(body.taskOrders);
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('排序更新失败:', error);
        return NextResponse.json({ error: 'Failed to update task order' }, { status: 500 });
      }
    }
    
    const { 
      userId = 'user-1', // 默认用户ID
      name, 
      categoryPath, 
      elapsedTime, 
      initialTime, 
      isRunning, 
      startTime, 
      isPaused, 
      pausedTime, 
      completedAt, 
      date,
      parentId, // 新增：父任务ID
      order = 0 // 新增：排序字段
    } = body;

    if (!name || !categoryPath || !date) {
      return NextResponse.json({ error: 'Missing required fields: name, categoryPath, date' }, { status: 400 });
    }

    const newTask = await TimerDB.addTask({
      userId,
      name,
      categoryPath,
      elapsedTime: elapsedTime || 0,
      initialTime: initialTime || 0,
      isRunning: isRunning || false,
      startTime: startTime || null,
      isPaused: isPaused || false,
      pausedTime: pausedTime || 0,
      completedAt: completedAt || null,
      date,
      parentId: parentId || null, // 支持父任务ID
      order: order || 0 // 支持排序
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Error creating timer task:', error);
    return NextResponse.json({ error: 'Failed to create timer task' }, { status: 500 });
  }
}

// PUT /api/timer-tasks - 更新任务
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updatedTask = await TimerDB.updateTask(id, updates);
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating timer task:', error);
    return NextResponse.json({ error: 'Failed to update timer task' }, { status: 500 });
  }
}

// DELETE /api/timer-tasks - 删除任务
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    await TimerDB.deleteTask(id);
    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting timer task:', error);
    return NextResponse.json({ error: 'Failed to delete timer task' }, { status: 500 });
  }
}

