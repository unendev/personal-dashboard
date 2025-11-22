/**
 * @file timerAPI.ts
 * @description 计时器统一 API 调用层
 * @created 2025-11-02
 * 
 * 职责：
 * - 统一所有计时器相关的 API 调用
 * - 处理请求重试逻辑
 * - 处理版本冲突
 * - 类型安全的请求/响应
 */

import { fetchWithRetry } from '@/lib/fetch-utils';
import type {
  TimerTask,
  CreateTaskRequest,
  UpdateTaskRequest,
  DeleteTaskRequest,
  BatchUpdateOrderRequest,
  TaskResponse,
  TaskListResponse,
  VersionConflictError,
} from '../types';

/**
 * API 基础配置
 */
const API_CONFIG = {
  baseURL: '/api/timer-tasks',
  retryCount: 3,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * 版本冲突错误类
 */
export class VersionConflictException extends Error {
  constructor(
    public taskId: string,
    public taskName: string,
    public currentVersion: number,
    public requestVersion: number
  ) {
    super(`Version conflict for task ${taskName}`);
    this.name = 'VersionConflictException';
  }
}

/**
 * 计时器 API 统一调用层
 */
export const timerAPI = {
  /**
   * 获取任务列表
   * 
   * @param userId - 用户ID
   * @param date - 日期 (YYYY-MM-DD)
   * @returns 任务列表
   * 
   * @example
   * ```ts
   * const tasks = await timerAPI.getTasks('user-1', '2025-11-02');
   * ```
   */
  async getTasks(userId: string, date: string): Promise<TimerTask[]> {
    try {
      const response = await fetch(
        `${API_CONFIG.baseURL}?userId=${userId}&date=${date}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ [timerAPI.getTasks] 失败:', error);
      throw error;
    }
  },

  /**
   * 创建任务
   * 
   * @param data - 创建任务请求数据
   * @returns 创建的任务
   * 
   * @example
   * ```ts
   * const task = await timerAPI.createTask({
   *   name: '开发功能',
   *   categoryPath: '工作/开发',
   *   initialTime: 3600,
   *   userId: 'user-1',
   *   date: '2025-11-02',
   *   autoStart: true
   * });
   * ```
   */
  async createTask(data: CreateTaskRequest): Promise<TimerTask> {
    try {
      const response = await fetchWithRetry(
        API_CONFIG.baseURL,
        {
          method: 'POST',
          headers: API_CONFIG.headers,
          body: JSON.stringify(data),
        },
        API_CONFIG.retryCount,
        (attempt, error) => {
          console.warn(`🔄 [timerAPI.createTask] 重试 ${attempt}/${API_CONFIG.retryCount}:`, error.message);
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create task: ${errorText}`);
      }

      const task = await response.json();
      console.log('✅ [timerAPI.createTask] 成功:', task.name);
      return task;
    } catch (error) {
      console.error('❌ [timerAPI.createTask] 失败:', error);
      throw error;
    }
  },

  /**
   * 更新任务
   * 
   * @param data - 更新任务请求数据
   * @returns 更新后的任务
   * @throws {VersionConflictException} 版本冲突时抛出
   * 
   * @example
   * ```ts
   * try {
   *   const task = await timerAPI.updateTask({
   *     id: 'task-1',
   *     version: 5,
   *     elapsedTime: 3600,
   *   });
   * } catch (error) {
   *   if (error instanceof VersionConflictException) {
   *     // 处理版本冲突
   *   }
   * }
   * ```
   */
  async updateTask(data: UpdateTaskRequest): Promise<TimerTask> {
    try {
      const response = await fetch(API_CONFIG.baseURL, {
        method: 'PUT',
        headers: API_CONFIG.headers,
        body: JSON.stringify(data),
      });

      // 版本冲突检测
      if (response.status === 409) {
        const errorData = await response.json();
        console.error('⚠️ [timerAPI.updateTask] 版本冲突 409:', errorData);
        throw new VersionConflictException(
          data.id,
          errorData.taskName || 'Unknown',
          errorData.currentVersion || 0,
          data.version || 0
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update task: ${errorText}`);
      }

      const task = await response.json();
      console.log('✅ [timerAPI.updateTask] 成功:', task.name, 'version:', task.version);
      return task;
    } catch (error) {
      if (error instanceof VersionConflictException) {
        throw error;
      }
      console.error('❌ [timerAPI.updateTask] 失败:', error);
      throw error;
    }
  },

  /**
   * 启动任务
   * 
   * @param taskId - 任务ID
   * @param version - 版本号（乐观锁）
   * @returns 更新后的任务
   * @throws {VersionConflictException} 版本冲突时抛出
   */
  async startTask(taskId: string, version?: number): Promise<TimerTask> {
    const currentTime = Math.floor(Date.now() / 1000);
    return this.updateTask({
      id: taskId,
      version,
      isRunning: true,
      isPaused: false,
      startTime: currentTime,
      pausedTime: 0,
    });
  },

  /**
   * 暂停任务
   * 
   * @param taskId - 任务ID
   * @param elapsedTime - 已耗时（秒）
   * @param version - 版本号（乐观锁）
   * @returns 更新后的任务
   * @throws {VersionConflictException} 版本冲突时抛出
   */
  async pauseTask(
    taskId: string,
    elapsedTime: number,
    version?: number
  ): Promise<TimerTask> {
    return this.updateTask({
      id: taskId,
      version,
      elapsedTime,
      isPaused: true,
      isRunning: false,
      startTime: null,
      pausedTime: 0,
    });
  },

  /**
   * 停止任务
   * 
   * @param taskId - 任务ID
   * @param elapsedTime - 已耗时（秒）
   * @param version - 版本号（乐观锁）
   * @returns 更新后的任务
   * @throws {VersionConflictException} 版本冲突时抛出
   */
  async stopTask(
    taskId: string,
    elapsedTime: number,
    version?: number
  ): Promise<TimerTask> {
    return this.updateTask({
      id: taskId,
      version,
      elapsedTime,
      isRunning: false,
      isPaused: false,
      startTime: null,
      pausedTime: 0,
    });
  },

  /**
   * 删除任务
   * 
   * @param taskId - 任务ID
   * @returns void
   * 
   * @example
   * ```ts
   * await timerAPI.deleteTask('task-1');
   * ```
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      const response = await fetchWithRetry(
        API_CONFIG.baseURL,
        {
          method: 'DELETE',
          headers: API_CONFIG.headers,
          body: JSON.stringify({ id: taskId }),
        },
        API_CONFIG.retryCount,
        (attempt, error) => {
          console.warn(`🔄 [timerAPI.deleteTask] 重试 ${attempt}/${API_CONFIG.retryCount}:`, error.message);
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete task: ${errorText}`);
      }

      console.log('✅ [timerAPI.deleteTask] 成功:', taskId);
    } catch (error) {
      console.error('❌ [timerAPI.deleteTask] 失败:', error);
      throw error;
    }
  },

  /**
   * 批量更新任务顺序
   * 
   * @param updates - 顺序更新数组
   * @returns void
   * 
   * @example
   * ```ts
   * await timerAPI.updateTasksOrder([
   *   { id: 'task-1', order: 0 },
   *   { id: 'task-2', order: 1 },
   * ]);
   * ```
   */
  async updateTasksOrder(updates: BatchUpdateOrderRequest['updates']): Promise<void> {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/batch-order`, {
        method: 'PUT',
        headers: API_CONFIG.headers,
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update tasks order: ${errorText}`);
      }

      console.log('✅ [timerAPI.updateTasksOrder] 成功，更新数量:', updates.length);
    } catch (error) {
      console.error('❌ [timerAPI.updateTasksOrder] 失败:', error);
      throw error;
    }
  },

  /**
   * 更新任务名称
   * 
   * @param taskId - 任务ID
   * @param name - 新名称
   * @param version - 版本号（乐观锁）
   * @returns 更新后的任务
   */
  async updateTaskName(
    taskId: string,
    name: string,
    version?: number
  ): Promise<TimerTask> {
    return this.updateTask({
      id: taskId,
      version,
      name,
    });
  },

  /**
   * 更新任务分类
   * 
   * @param taskId - 任务ID
   * @param categoryPath - 新分类路径
   * @param version - 版本号（乐观锁）
   * @returns 更新后的任务
   */
  async updateTaskCategory(
    taskId: string,
    categoryPath: string,
    version?: number
  ): Promise<TimerTask> {
    return this.updateTask({
      id: taskId,
      version,
      categoryPath,
    });
  },

  /**
   * 更新任务初始时间
   * 
   * @param taskId - 任务ID
   * @param initialTime - 初始时间（秒）
   * @param version - 版本号（乐观锁）
   * @returns 更新后的任务
   */
  async updateTaskInitialTime(
    taskId: string,
    initialTime: number,
    version?: number
  ): Promise<TimerTask> {
    return this.updateTask({
      id: taskId,
      version,
      initialTime,
    });
  },
};

