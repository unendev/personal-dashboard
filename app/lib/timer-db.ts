/* eslint-disable @typescript-eslint/no-explicit-any */
import { TimerTask as PrismaTimerTask } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface TimerTask extends PrismaTimerTask {
  children?: TimerTask[];
}

export const TimerDB = {
  // 获取用户的所有任务（包含层级结构）
  getAllTasks: async (userId: string): Promise<TimerTask[]> => {
    try {
      const tasks = await prisma.timerTask.findMany({
        where: { userId },
        include: {
          children: {
            include: {
              children: true // 递归包含子任务
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // 只返回顶级任务（没有父任务的任务）
      return tasks.filter(task => !(task as any).parentId);
    } catch (error) {
      console.error('Failed to load timer tasks:', error);
      return [];
    }
  },

  // 获取指定日期的任务（包含层级结构）
  getTasksByDate: async (userId: string, date: string): Promise<TimerTask[]> => {
    try {
      const tasks = await prisma.timerTask.findMany({
        where: { 
          userId,
          date 
        },
        include: {
          children: {
            include: {
              children: true // 递归包含子任务
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // 只返回顶级任务（没有父任务的任务）
      return tasks.filter(task => !(task as any).parentId);
    } catch (error) {
      console.error('Failed to load timer tasks by date:', error);
      return [];
    }
  },

  // 添加新任务
  addTask: async (task: Omit<TimerTask, 'id' | 'createdAt' | 'updatedAt' | 'children'> & { instanceTagNames?: string[] }): Promise<TimerTask> => {
    try {
      const { instanceTagNames, ...taskData } = task;
      
      // 创建任务
      const newTask = await prisma.timerTask.create({
        data: taskData,
        include: {
          children: true,
          instanceTags: {
            include: {
              instanceTag: true
            }
          }
        }
      });

      // 如果有事务项，创建关联
      if (instanceTagNames && instanceTagNames.length > 0) {
        for (const tagName of instanceTagNames) {
          // 查找或创建事务项
          let instanceTag = await prisma.instanceTag.findFirst({
            where: {
              name: tagName,
              userId: taskData.userId
            }
          });

          if (!instanceTag) {
            instanceTag = await prisma.instanceTag.create({
              data: {
                name: tagName,
                userId: taskData.userId
              }
            });
          }

          // 创建关联
          await prisma.timerTaskInstanceTag.create({
            data: {
              timerTaskId: newTask.id,
              instanceTagId: instanceTag.id
            }
          });
        }

        // 重新获取任务以包含新的事务项关联
        const updatedTask = await prisma.timerTask.findUnique({
          where: { id: newTask.id },
          include: {
            children: true,
            instanceTags: {
              include: {
                instanceTag: true
              }
            }
          }
        });

        return updatedTask || newTask;
      }

      return newTask;
    } catch (error) {
      console.error('Failed to add timer task:', error);
      throw error;
    }
  },

  // 更新任务的实例标签
  updateInstanceTag: async (taskId: string, instanceTag: string | null): Promise<TimerTask> => {
    try {
      const updatedTask = await prisma.timerTask.update({
        where: { id: taskId },
        data: { instanceTag },
        include: {
          children: {
            include: {
              children: true
            }
          }
        }
      });
      return updatedTask;
    } catch (error) {
      console.error('Failed to update instance tag:', error);
      throw error;
    }
  },

  // 获取实例标签统计
  getInstanceStats: async (userId: string, startDate?: string, endDate?: string): Promise<{
    instanceTag: string;
    totalTime: number;
    taskCount: number;
  }[]> => {
    try {
      const whereClause: { userId: string; instanceTag?: { not: null } } = { 
        userId,
        instanceTag: { not: null }
      };

      if (startDate && endDate) {
        (whereClause as any).date = {
          gte: startDate,
          lte: endDate
        };
      }

      const tasks = await prisma.timerTask.findMany({
        where: whereClause,
        select: {
          instanceTag: true,
          elapsedTime: true
        }
      });

      // 按实例标签聚合数据
      const statsMap = new Map<string, { totalTime: number; taskCount: number }>();
      
      tasks.forEach(task => {
        if (task.instanceTag) {
          const current = statsMap.get(task.instanceTag) || { totalTime: 0, taskCount: 0 };
          statsMap.set(task.instanceTag, {
            totalTime: current.totalTime + task.elapsedTime,
            taskCount: current.taskCount + 1
          });
        }
      });

      // 转换为数组并按总时间排序
      return Array.from(statsMap.entries())
        .map(([instanceTag, stats]) => ({
          instanceTag,
          totalTime: stats.totalTime,
          taskCount: stats.taskCount
        }))
        .sort((a, b) => b.totalTime - a.totalTime);
    } catch (error) {
      console.error('Failed to get instance stats:', error);
      return [];
    }
  },

  // 获取所有使用过的实例标签（用于自动完成）
  getInstanceTags: async (userId: string): Promise<string[]> => {
    try {
      const tasks = await prisma.timerTask.findMany({
        where: {
          userId,
          instanceTag: { not: null }
        },
        select: {
          instanceTag: true
        },
        distinct: ['instanceTag']
      });

      return tasks
        .map(task => task.instanceTag)
        .filter((tag): tag is string => tag !== null)
        .sort();
    } catch (error) {
      console.error('Failed to get instance tags:', error);
      return [];
    }
  },

  // 更新任务
  updateTask: async (taskId: string, updates: Partial<Omit<TimerTask, 'id' | 'createdAt' | 'updatedAt' | 'children'>>): Promise<TimerTask> => {
    try {
      const updatedTask = await prisma.timerTask.update({
        where: { id: taskId },
        data: updates,
        include: {
          children: {
            include: {
              children: true
            }
          }
        }
      });
      return updatedTask;
    } catch (error) {
      console.error('Failed to update timer task:', error);
      throw error;
    }
  },

  // 删除任务（包括所有子任务）
  deleteTask: async (taskId: string): Promise<void> => {
    try {
      // 首先递归删除所有子任务
      const deleteChildrenRecursively = async (parentId: string) => {
        const children = await prisma.timerTask.findMany({
          where: { parentId }
        });
        
        for (const child of children) {
          await deleteChildrenRecursively(child.id);
        }
      };

      // 删除所有子任务
      await deleteChildrenRecursively(taskId);
      
      // 最后删除父任务
      await prisma.timerTask.delete({
        where: { id: taskId }
      });
    } catch (error) {
      console.error('Failed to delete timer task:', error);
      throw error;
    }
  },

  // 获取日期范围的任务（包含层级结构）
  getTasksByDateRange: async (userId: string, startDate: string, endDate: string): Promise<TimerTask[]> => {
    try {
      const tasks = await prisma.timerTask.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          children: {
            include: {
              children: true
            }
          }
        },
        orderBy: { date: 'desc' }
      });

      // 只返回顶级任务
      return tasks.filter(task => !(task as any).parentId);
    } catch (error) {
      console.error('Failed to load timer tasks by date range:', error);
      return [];
    }
  },

  // 获取所有日期
  getAllDates: async (userId: string): Promise<string[]> => {
    try {
      const tasks = await prisma.timerTask.findMany({
        where: { userId },
        select: { date: true }
      });
      const dates = new Set(tasks.map(task => task.date));
      return Array.from(dates).sort().reverse(); // 最新的日期在前
    } catch (error) {
      console.error('Failed to get all dates:', error);
      return [];
    }
  },

  // 获取运行中的任务（包括子任务）
  getRunningTask: async (userId: string): Promise<TimerTask | null> => {
    try {
      // 递归查找运行中的任务，优先查找正在运行的任务，再查找暂停的任务
      const findRunningTaskRecursively = (tasks: TimerTask[]): TimerTask | null => {
        let pausedTask: TimerTask | null = null;
        
        for (const task of tasks) {
          console.log('检查任务:', {
            name: task.name,
            isRunning: task.isRunning,
            isPaused: task.isPaused,
            elapsedTime: task.elapsedTime,
            hasChildren: !!(task.children && task.children.length > 0)
          });
          
          // 先递归检查子任务
          if (task.children && task.children.length > 0) {
            const runningChild = findRunningTaskRecursively(task.children);
            if (runningChild) {
              console.log('找到运行中的子任务:', runningChild.name);
              return runningChild;
            }
          }
          
          // 检查当前任务是否在运行（优先返回正在运行的）
          if (task.isRunning && !task.isPaused) {
            console.log('找到正在运行的任务:', task.name);
            return task;
          }
          
          // 记录暂停的任务，但继续查找正在运行的
          if (task.isPaused && !pausedTask) {
            console.log('记录暂停的任务:', task.name);
            pausedTask = task;
          }
        }
        
        // 如果没有正在运行的任务，返回暂停的任务
        if (pausedTask) {
          console.log('返回暂停的任务:', pausedTask.name);
        } else {
          console.log('没有找到运行中或暂停的任务');
        }
        return pausedTask;
      };

      // 获取所有任务
      const allTasks = await prisma.timerTask.findMany({
        where: { userId },
        include: {
          children: {
            include: {
              children: true
            }
          }
        }
      });

      console.log('获取到的所有任务数量:', allTasks.length);

      // 只处理顶级任务
      const topLevelTasks = allTasks.filter(task => !task.parentId);
      console.log('顶级任务数量:', topLevelTasks.length);
      
      // 递归查找运行中的任务
      const runningTask = findRunningTaskRecursively(topLevelTasks);
      console.log('最终找到的运行中任务:', runningTask?.name || '无');
      
      return runningTask;
    } catch (error) {
      console.error('Failed to get running task:', error);
      return null;
    }
  },

  // 获取层级任务（包含子任务）
  getHierarchicalTasks: async (userId: string, date?: string): Promise<TimerTask[]> => {
    try {
      const whereClause: { userId: string; date?: string } = { userId };
      if (date) {
        whereClause.date = date;
      }

      const tasks = await prisma.timerTask.findMany({
        where: whereClause,
        include: {
          children: {
            include: {
              children: true // 递归包含子任务
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // 只返回顶级任务（没有父任务的任务）
      return tasks.filter(task => !task.parentId);
    } catch (error) {
      console.error('Failed to load hierarchical tasks:', error);
      return [];
    }
  },

  // 计算任务的总时间（包括子任务）
  calculateTotalTime: (task: TimerTask): number => {
    let totalTime = task.elapsedTime;
    
    if (task.children) {
      task.children.forEach(child => {
        totalTime += TimerDB.calculateTotalTime(child);
      });
    }
    
    return totalTime;
  },

  // 获取任务的所有子任务（递归）
  getTaskWithChildren: async (taskId: string): Promise<TimerTask | null> => {
    try {
      const task = await prisma.timerTask.findUnique({
        where: { id: taskId },
        include: {
          children: {
            include: {
              children: true
            }
          }
        }
      });
      return task;
    } catch (error) {
      console.error('Failed to get task with children:', error);
      return null;
    }
  },

  // 获取任务的父任务链
  getTaskAncestors: async (taskId: string): Promise<TimerTask[]> => {
    try {
      const ancestors: any[] = [];
      let currentTask = await prisma.timerTask.findUnique({
        where: { id: taskId },
        select: { parentId: true }
      });

      while (currentTask && currentTask.parentId) {
        const parent = await prisma.timerTask.findUnique({
          where: { id: currentTask.parentId },
          select: { id: true, name: true, parentId: true }
        });
        
        if (parent) {
          ancestors.unshift(parent);
          currentTask = parent;
        } else {
          break;
        }
      }

      return ancestors;
    } catch (error) {
      console.error('Failed to get task ancestors:', error);
      return [];
    }
  },

  // 停止所有运行中的任务
  stopAllRunningTasks: async (userId: string): Promise<void> => {
    try {
      await prisma.timerTask.updateMany({
        where: {
          userId,
          isRunning: true
        },
        data: {
          isRunning: false,
          isPaused: false
        }
      });
    } catch (error) {
      console.error('Failed to stop all running tasks:', error);
      throw error;
    }
  },

  // 更新任务排序
  updateTaskOrder: async (taskOrders: { id: string; order: number }[]): Promise<void> => {
    try {
      // 批量更新任务排序
      const updatePromises = taskOrders.map(({ id, order }) =>
        prisma.timerTask.update({
          where: { id },
          data: { order }
        })
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Failed to update task order:', error);
      throw error;
    }
  },

  // 获取任务的统计信息
  getTaskStats: async (userId: string, date?: string): Promise<{
    totalTasks: number;
    topLevelTasks: number;
    tasksWithChildren: number;
    maxDepth: number;
    totalTime: number;
  }> => {
    try {
      const whereClause: { userId: string; date?: string } = { userId };
      if (date) {
        whereClause.date = date;
      }

      const allTasks = await prisma.timerTask.findMany({
        where: whereClause,
        include: {
          children: {
            include: {
              children: true
            }
          }
        }
      });

      const topLevelTasks = allTasks.filter(task => !(task as any).parentId);
      const tasksWithChildren = topLevelTasks.filter(task => task.children && task.children.length > 0);

      // 计算最大深度
      const calculateDepth = (task: TimerTask, currentDepth: number): number => {
        if (!task.children || task.children.length === 0) {
          return currentDepth;
        }
        
        let maxDepth = currentDepth;
        task.children.forEach(child => {
          const childDepth = calculateDepth(child, currentDepth + 1);
          maxDepth = Math.max(maxDepth, childDepth);
        });
        
        return maxDepth;
      };

      const maxDepth = topLevelTasks.length > 0 
        ? Math.max(...topLevelTasks.map(task => calculateDepth(task, 1)))
        : 0;

      // 计算总时间
      const totalTime = topLevelTasks.reduce((sum, task) => {
        return sum + TimerDB.calculateTotalTime(task);
      }, 0);

      return {
        totalTasks: allTasks.length,
        topLevelTasks: topLevelTasks.length,
        tasksWithChildren: tasksWithChildren.length,
        maxDepth,
        totalTime
      };
    } catch (error) {
      console.error('Failed to get task stats:', error);
      return {
        totalTasks: 0,
        topLevelTasks: 0,
        tasksWithChildren: 0,
        maxDepth: 0,
        totalTime: 0
      };
    }
  }
};
