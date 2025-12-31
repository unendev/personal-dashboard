import { NextRequest, NextResponse } from 'next/server';
import { TimerDB } from '@/lib/timer-db';
import { createTimerTaskSchema } from '@/lib/validations/timer-task';
import { ZodError } from 'zod';
import { getEffectiveDateString } from '@/lib/timer-utils';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma'; // Added import

// Helper: Ensure category path exists in LogCategory table
async function ensureCategoryPath(categoryPath: string) {
  if (!categoryPath || categoryPath === '未分类') return;
  
  const parts = categoryPath.split('/').map(p => p.trim()).filter(p => p);
  let parentId: string | null = null;

  for (const part of parts) {
    // Try to find existing category at this level
    // Note: This simple logic assumes global categories or checks specifically if your schema supports per-user categories.
    // Looking at schema: LogCategory does NOT have userId. It is global?
    // Checking schema from memory: LogCategory { id, name, parentId ... } -> No userId.
    // So it is shared. This is fine for single user or shared system.
    
    const existing = await prisma.logCategory.findFirst({
      where: {
        name: part,
        parentId: parentId
      },
      select: { id: true }
    });

    if (existing) {
      parentId = existing.id;
    } else {
      // Create new
      try {
        const newCat = await prisma.logCategory.create({
          data: {
            name: part,
            parentId: parentId
          },
          select: { id: true }
        });
        parentId = newCat.id;
      } catch (e) {
        // Handle race condition if created in parallel
        const retry = await prisma.logCategory.findFirst({
            where: { name: part, parentId: parentId },
            select: { id: true }
        });
        if (retry) parentId = retry.id;
      }
    }
  }
}

// GET /api/timer-tasks - 获取用户的所有任务
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // 优先从 Token 获取用户 ID，实现真正的认证
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.sub || searchParams.get('userId') || 'user-1'; // 默认用户ID
    
    if (token) {
        console.log(`[API] Authenticated user: ${token.email} (${token.sub})`);
    }

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
    
    // 📝 [API] 日志：接收到的请求体
    console.log('📝 [API /timer-tasks] 接收到的请求体:', {
      ...body,
      initialTime: body.initialTime,
      initialTimeType: typeof body.initialTime,
      initialTimeInMinutes: body.initialTime ? body.initialTime / 60 : 0,
      requestBodyString: JSON.stringify(body, null, 2)
    });
    
    // 验证基本字段
    const validated = createTimerTaskSchema.parse(body);
    
    // 📝 [API] 日志：验证后的数据
    console.log('📝 [API /timer-tasks] 验证后的数据:', {
      ...validated,
      initialTime: validated.initialTime,
      initialTimeType: typeof validated.initialTime,
      initialTimeInMinutes: validated.initialTime ? validated.initialTime / 60 : 0
    });
    
    // 优先从 Token 获取用户 ID
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const authUserId = token?.sub || 'user-1';

    const { 
      userId = authUserId, // 使用认证的用户ID作为默认值
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

    console.log('✅ [API /timer-tasks] 验证通过，开始创建任务...');
    
    // 清理 instanceTagNames 数组：去除空格和空字符串
    const cleanedInstanceTagNames = instanceTagNames 
      ? instanceTagNames.map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      : [];
    
    // 如果 date 未提供，则验证会失败，这里直接使用
    const taskDate = date;
    
    // 📝 [API] 日志：准备创建的任务数据
    const taskDataToCreate = {
      userId,
      name,
      categoryPath,
      instanceTag: instanceTag || null,
      instanceTagNames: cleanedInstanceTagNames,
      elapsedTime: elapsedTime,
      initialTime: initialTime,
      isRunning: isRunning || false,
      startTime: startTime || null,
      isPaused: false,
      pausedTime: 0,
      completedAt: completedAt || null,
      date: taskDate,
      parentId: parentId || null,
      order: order !== undefined ? order : 0,
      version: 1,
      taskDefinitionId: null
    };
    
    console.log('📝 [API /timer-tasks] 准备创建的任务数据:', {
      ...taskDataToCreate,
      initialTime: taskDataToCreate.initialTime,
      initialTimeInMinutes: taskDataToCreate.initialTime / 60,
      elapsedTime: taskDataToCreate.elapsedTime,
      elapsedTimeInMinutes: taskDataToCreate.elapsedTime / 60
    });

    // 【服务端互斥】如果新任务是运行状态，暂停其他所有任务
    if (taskDataToCreate.isRunning) {
      console.log(`[API /timer-tasks] 检测到创建运行中任务，正在暂停用户 ${userId} 的其他任务...`);
      await TimerDB.pauseAllRunningTasks(userId);
    }
    
    const newTask = await TimerDB.addTask(taskDataToCreate);

    // 【分类池同步】异步确保分类路径存在于 LogCategory 表中
    if (newTask.categoryPath) {
        ensureCategoryPath(newTask.categoryPath).catch(err => 
            console.error('❌ [API /timer-tasks] 分类同步失败:', err)
        );
    }

    console.log('✅ [API /timer-tasks] 任务创建成功，ID:', newTask.id);
    
    // 📝 [API] 日志：创建成功后的任务数据
    console.log('📝 [API /timer-tasks] 创建成功后的任务数据:', {
      id: newTask.id,
      name: newTask.name,
      initialTime: newTask.initialTime,
      initialTimeInMinutes: newTask.initialTime / 60,
      elapsedTime: newTask.elapsedTime,
      elapsedTimeInMinutes: newTask.elapsedTime / 60,
      categoryPath: newTask.categoryPath
    });

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

// 【设备感知冲突检测】内存缓存：记录每个任务最后修改的设备
const taskDeviceMap = new Map<string, { deviceId: string; version: number; timestamp: number }>();

// PUT /api/timer-tasks - 更新任务（带乐观锁 + 设备感知）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, version, deviceId, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // 【服务端互斥】如果请求将任务设为运行状态，暂停该用户其他所有任务
    if (updates.isRunning === true) {
      try {
        const currentTask = await TimerDB.getTaskById(id);
        if (currentTask) {
          console.log(`[API /timer-tasks PUT] 检测到启动任务 ${id}，正在暂停用户 ${currentTask.userId} 的其他任务...`);
          await TimerDB.pauseAllRunningTasks(currentTask.userId);
        }
      } catch (e) {
        console.error('Failed to pause other tasks during update:', e);
        // 继续执行，不阻断主流程
      }
    }

    // 【乐观锁】如果提供了version，进行版本检查
    if (version !== undefined) {
      try {
        // 获取该任务的设备修改记录
        const deviceRecord = taskDeviceMap.get(id);
        const lastModifiedDeviceId = deviceRecord?.deviceId;
        const isFromSameDevice = deviceId && lastModifiedDeviceId === deviceId;
        
        // 【设备感知冲突检测】
        if (isFromSameDevice) {
          // 同一设备：跳过版本检查，直接更新（避免同设备多标签页冲突弹窗）
          console.log(`✅ [同一设备] 任务 ${id}，跳过版本检查直接更新`);
          const updatedTask = await TimerDB.updateTask(id, updates);
          
          // 更新设备记录
          taskDeviceMap.set(id, {
            deviceId: deviceId || 'unknown',
            version: updatedTask.version,
            timestamp: Date.now()
          });
          
          return NextResponse.json(updatedTask);
        } else {
          // 不同设备：严格检查版本号
          const currentTask = await TimerDB.getTaskById(id);
          if (!currentTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
          }
          
          if (currentTask.version !== version) {
            console.warn(`⚠️ [不同设备冲突] 任务 ${id}，当前版本 ${currentTask.version}，请求版本 ${version}`);
            return NextResponse.json(
              { 
                error: 'CONFLICT', 
                message: '数据已在其他设备修改，请刷新页面获取最新数据',
                isFromSameDevice: false,
                currentVersion: currentTask.version,
                requestVersion: version
              }, 
              { status: 409 }
            );
          }
          
          // 版本匹配，允许更新
          const updatedTask = await TimerDB.updateTaskWithVersion(id, version, updates);
          
          // 更新设备记录
          taskDeviceMap.set(id, {
            deviceId: deviceId || 'unknown',
            version: updatedTask.version,
            timestamp: Date.now()
          });
          
          return NextResponse.json(updatedTask);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
          // 获取当前任务信息用于返回
          const currentTask = await TimerDB.getTaskById(id);
          return NextResponse.json(
            { 
              error: 'CONFLICT', 
              message: '数据已在其他设备修改，请刷新页面获取最新数据',
              isFromSameDevice: false,  // 走到这里说明是不同设备的冲突
              currentVersion: currentTask?.version,
              requestVersion: version
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
    console.error('❌ [API /timer-tasks PUT] 更新失败:', error);
    if (error instanceof Error) {
        console.error('Stack:', error.stack);
    }
    return NextResponse.json({ 
        error: 'Failed to update timer task',
        details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
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
