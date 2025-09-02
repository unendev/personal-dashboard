import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: bigint | null;
  isPaused: boolean;
  pausedTime: number;
  completedAt: bigint | null;
  date: string; // ISO date string
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export const TimerDB = {
  // 获取用户的所有任务
  getAllTasks: async (userId: string): Promise<TimerTask[]> => {
    try {
      const tasks = await prisma.timerTask.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      return tasks;
    } catch (error) {
      console.error('Failed to load timer tasks:', error);
      return [];
    }
  },

  // 获取指定日期的任务
  getTasksByDate: async (userId: string, date: string): Promise<TimerTask[]> => {
    try {
      const tasks = await prisma.timerTask.findMany({
        where: { 
          userId,
          date 
        },
        orderBy: { createdAt: 'desc' }
      });
      return tasks;
    } catch (error) {
      console.error('Failed to load timer tasks by date:', error);
      return [];
    }
  },

  // 添加新任务
  addTask: async (task: Omit<TimerTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimerTask> => {
    try {
      const newTask = await prisma.timerTask.create({
        data: task
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
        data: updates
      });
      return updatedTask;
    } catch (error) {
      console.error('Failed to update timer task:', error);
      throw error;
    }
  },

  // 删除任务
  deleteTask: async (taskId: string): Promise<void> => {
    try {
      await prisma.timerTask.delete({
        where: { id: taskId }
      });
    } catch (error) {
      console.error('Failed to delete timer task:', error);
      throw error;
    }
  },

  // 获取日期范围的任务
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
        orderBy: { date: 'desc' }
      });
      return tasks;
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

  // 获取运行中的任务
  getRunningTask: async (userId: string): Promise<TimerTask | null> => {
    try {
      const runningTask = await prisma.timerTask.findFirst({
        where: {
          userId,
          isRunning: true
        }
      });
      return runningTask;
    } catch (error) {
      console.error('Failed to get running task:', error);
      return null;
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
  }
};
