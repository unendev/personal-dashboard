import { NextRequest, NextResponse } from 'next/server';
import { TimerDB } from '@/lib/timer-db';
import { createTimerTaskSchema } from '@/lib/validations/timer-task';
import { ZodError } from 'zod';

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
    
    // 打印请求体用于调试
    console.log('创建任务请求数据:', JSON.stringify(body, null, 2));
    
    // 验证基本字段
    const validated = createTimerTaskSchema.parse(body);
    
    const { 
      userId = 'user-1', // 默认用户ID（应该从认证获取）
      instanceTag, // 保留：向后兼容的实例标签字段
      instanceTagNames, // 新增：事务项名称数组
      isRunning, 
      startTime, 
      completedAt, 
      order = 0 // 新增：排序字段，默认0确保新任务显示在最下面
    } = body;
    
    const {
      name,
      categoryPath,
      date,
      elapsedTime,
      initialTime,
      parentId
    } = validated;

    console.log('✅ 验证通过，开始创建任务...');
    
    // 清理 instanceTagNames 数组：去除空格和空字符串
    const cleanedInstanceTagNames = instanceTagNames 
      ? instanceTagNames.map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      : [];
    
    const newTask = await TimerDB.addTask({
      userId,
      name,
      categoryPath,
      instanceTag: instanceTag || null, // 保留：向后兼容的实例标签字段
      instanceTagNames: cleanedInstanceTagNames, // 新增：事务项名称数组
      elapsedTime: elapsedTime,
      initialTime: initialTime,
      isRunning: isRunning || false,
      startTime: startTime || null,
      isPaused: false,
      pausedTime: 0,
      completedAt: completedAt || null,
      date: date!,
      parentId: parentId || null, // 支持父任务ID
      order: order !== undefined ? order : 0, // 支持排序，默认0确保新任务显示在最下面
      version: 1 // 【乐观锁】初始版本号
    });

    console.log('✅ 任务创建成功，ID:', newTask.id);

    // 序列化处理：确保所有 Date 对象转换为 ISO 字符串
    const serializedTask = JSON.parse(JSON.stringify(newTask, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }));

    console.log('✅ 序列化完成，准备返回响应');
    
    return NextResponse.json(serializedTask, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('数据验证失败:', JSON.stringify(error.issues, null, 2));
      return NextResponse.json({ 
        error: '数据验证失败', 
        details: error.issues,
        message: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')
      }, { status: 400 });
    }
    console.error('Error creating timer task:', error);
    return NextResponse.json({ error: 'Failed to create timer task' }, { status: 500 });
  }
}

// PUT /api/timer-tasks - 更新任务（带乐观锁）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, version, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // 【乐观锁】如果提供了version，进行版本检查
    if (version !== undefined) {
      try {
        const updatedTask = await TimerDB.updateTaskWithVersion(id, version, updates);
        return NextResponse.json(updatedTask);
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
          return NextResponse.json(
            { 
              error: 'CONFLICT', 
              message: '数据已在其他设备修改，请刷新页面获取最新数据' 
            }, 
            { status: 409 }
          );
        }
        throw error;
      }
    }

    // 向后兼容：无version的请求仍然正常处理
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

