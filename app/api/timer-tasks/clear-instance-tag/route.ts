import { NextRequest, NextResponse } from 'next/server';
import { TimerDB } from '@/lib/timer-db';
import { prisma } from '@/lib/prisma';

// POST /api/timer-tasks/clear-instance-tag - 清除所有任务中指定的事务项引用
export async function POST(request: NextRequest) {
  try {
    const { tagName, userId } = await request.json();

    if (!tagName || !userId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取用户的所有任务
    const tasks = await TimerDB.getAllTasks(userId);

    // 清除每个任务中的指定事务项
    const updatePromises = tasks.map(async (task) => {
      let needsUpdate = false;

      // 检查 instanceTag 字段（旧格式）
      if (task.instanceTag === tagName) {
        await TimerDB.updateTask(task.id, {
          ...task,
          instanceTag: null
        });
        needsUpdate = true;
      }

      // 检查 instanceTags 关联（新格式）
      if (task.instanceTags && task.instanceTags.length > 0) {
        const hasTag = task.instanceTags.some(relation => 
          relation.instanceTag.name === tagName
        );
        
        if (hasTag) {
          // 直接删除关联关系
          await prisma.timerTaskInstanceTag.deleteMany({
            where: {
              timerTaskId: task.id,
              instanceTag: {
                name: tagName,
                userId: userId
              }
            }
          });
          needsUpdate = true;
        }
      }

      return needsUpdate;
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `已清除 ${updatePromises.length} 个任务中的事务项引用`
    });
  } catch (error) {
    console.error('清除事务项引用失败:', error);
    return NextResponse.json(
      { error: '清除事务项引用失败' },
      { status: 500 }
    );
  }
}

