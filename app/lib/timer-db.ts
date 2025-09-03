import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  completedAt: number | null;
  date: string; // ISO date string
  userId: string;
  parentId?: string | null;
  children?: TimerTask[];
  createdAt: Date;
  updatedAt: Date;
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
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // 只返回顶级任务（没有父任务的任务）
      return tasks.filter(task => !task.parentId);
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
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // 只返回顶级任务（没有父任务的任务）
      return tasks.filter(task => !task.parentId);
    } catch (error) {
      console.error('Failed to load timer tasks by date:', error);
      return [];
    }
  },

  // 添加新任务
  addTask: async (task: Omit<TimerTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimerTask> => {
    try {
      const newTask = await prisma.timerTask.create({
        data: task,
        include: {
          children: true
        }
      });
      return newTask;
    } catch (error) {
      console.error('Failed to add timer task:', error);
      throw error;
    }
  },

  // 更新任务
  updateTask: async (taskId: string, updates: Partial<TimerTask>): Promise<TimerTask> => {
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
        
        await prisma.timerTask.delete({
          where: { id: parentId }
        });
      };

      await deleteChildrenRecursively(taskId);
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
      return tasks.filter(task => !task.parentId);
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
      const runningTask = await prisma.timerTask.findFirst({
        where: {
          userId,
          isRunning: true
        },
        include: {
          children: {
            include: {
              children: true
            }
          }
        }
      });
      return runningTask;
    } catch (error) {
      console.error('Failed to get running task:', error);
      return null;
    }
  },

  // 获取层级任务（包含子任务）
  getHierarchicalTasks: async (userId: string, date?: string): Promise<TimerTask[]> => {
    try {
      const whereClause: any = { userId };
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
      const ancestors: TimerTask[] = [];
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

  // 获取任务的统计信息
  getTaskStats: async (userId: string, date?: string): Promise<{
    totalTasks: number;
    topLevelTasks: number;
    tasksWithChildren: number;
    maxDepth: number;
    totalTime: number;
  }> => {
    try {
      const whereClause: any = { userId };
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

      const topLevelTasks = allTasks.filter(task => !task.parentId);
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
