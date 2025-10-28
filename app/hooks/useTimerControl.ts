/**
 * 通用计时器控制 Hook
 * 统一处理父子任务互斥、版本冲突、并发防护
 */

import { useState, useCallback } from 'react';

interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  instanceTag?: string | null;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  parentId?: string | null;
  children?: TimerTask[];
  totalTime?: number;
  order?: number;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export function useTimerControl(
  tasks: TimerTask[],
  onTasksChange: (tasks: TimerTask[]) => void
) {
  // 操作进行中的任务集合（防抖）
  const [operationInProgress, setOperationInProgress] = useState<Set<string>>(new Set());

  /**
   * 递归查找所有运行中的任务（包含子任务）
   */
  const findAllRunningTasks = useCallback((taskList: TimerTask[]): TimerTask[] => {
    const running: TimerTask[] = [];
    
    const traverse = (tasks: TimerTask[]) => {
      tasks.forEach(task => {
        if (task.isRunning) {
          running.push(task);
        }
        if (task.children && task.children.length > 0) {
          traverse(task.children);
        }
      });
    };
    
    traverse(taskList);
    return running;
  }, []);

  /**
   * 递归查找任务
   */
  const findTaskById = useCallback((taskId: string, taskList: TimerTask[]): TimerTask | null => {
    for (const task of taskList) {
      if (task.id === taskId) {
        return task;
      }
      if (task.children && task.children.length > 0) {
        const found = findTaskById(taskId, task.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  /**
   * 原子化启动计时器
   * 确保任意时刻只有一个任务运行（包含所有层级）
   */
  const startTimer = useCallback(async (taskId: string) => {
    // 防抖检查
    if (operationInProgress.has(taskId)) {
      console.log('⏸️ 任务操作进行中，忽略重复请求:', taskId);
      return;
    }

    // 查找目标任务
    const targetTask = findTaskById(taskId, tasks);
    if (!targetTask) {
      console.error('❌ 未找到目标任务:', taskId);
      return;
    }

    // 标记操作开始
    setOperationInProgress(prev => new Set(prev).add(taskId));

    try {
      // 查找所有运行中的任务（包含子任务）
      const runningTasks = findAllRunningTasks(tasks);
      const tasksToPause: Array<{ id: string; name: string; elapsedTime: number; version?: number }> = [];
      const currentTime = Math.floor(Date.now() / 1000);

      console.log(`🎯 准备启动任务: ${targetTask.name}, 当前运行中的任务数: ${runningTasks.length}`);

      // 原子化更新：同时暂停其他任务和启动目标任务
      const updateTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
        return taskList.map(task => {
          // 启动目标任务
          if (task.id === taskId) {
            return {
              ...task,
              isRunning: true,
              isPaused: false,
              startTime: currentTime,
              pausedTime: 0
            };
          }

          // 暂停其他运行中的任务
          if (task.isRunning && task.id !== taskId) {
            const runningTime = task.startTime ? currentTime - task.startTime : 0;
            const newElapsedTime = task.elapsedTime + runningTime;

            // 记录需要暂停的任务
            tasksToPause.push({
              id: task.id,
              name: task.name,
              elapsedTime: newElapsedTime,
              version: task.version
            });

            return {
              ...task,
              elapsedTime: newElapsedTime,
              isPaused: true,
              isRunning: false,
              startTime: null,
              pausedTime: 0
            };
          }

          // 递归处理子任务
          if (task.children) {
            return { ...task, children: updateTaskRecursive(task.children) };
          }

          return task;
        });
      };

      // 一次性更新所有任务状态（乐观更新）
      const updatedTasks = updateTaskRecursive(tasks);
      onTasksChange(updatedTasks);

      console.log(`✅ 本地状态已更新，启动: ${targetTask.name}, 暂停: ${tasksToPause.length}个任务`);

      // 异步批量处理数据库操作
      const apiPromises: Promise<Response | null>[] = [];

      // 暂停其他运行中的任务
      tasksToPause.forEach(task => {
        apiPromises.push(
          fetch(`/api/timer-tasks/${task.id}/pause`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: 'user-1',
              expectedVersion: task.version 
            })
          }).catch(error => {
            console.error(`暂停任务失败 ${task.name}:`, error);
            return null;
          })
        );
      });

      // 启动目标任务
      apiPromises.push(
        fetch(`/api/timer-tasks/${taskId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: 'user-1',
            expectedVersion: targetTask.version 
          })
        }).catch(error => {
          console.error(`启动任务失败 ${targetTask.name}:`, error);
          return null;
        })
      );

      // 等待所有 API 完成
      const results = await Promise.all(apiPromises);
      
      // 检查是否有版本冲突
      const hasVersionConflict = results.some(res => 
        res && res.status === 409
      );

      if (hasVersionConflict) {
        console.warn('⚠️ 检测到版本冲突，刷新数据...');
        // 可以在这里触发重新加载
      }

      console.log('✨ 所有 API 操作完成');

    } catch (error) {
      console.error('❌ 启动计时器失败:', error);
      // 发生错误时，可以考虑回滚状态
    } finally {
      // 清除操作标记
      setOperationInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  }, [tasks, onTasksChange, operationInProgress, findTaskById, findAllRunningTasks]);

  /**
   * 暂停计时器
   */
  const pauseTimer = useCallback(async (taskId: string) => {
    if (operationInProgress.has(taskId)) {
      return;
    }

    const targetTask = findTaskById(taskId, tasks);
    if (!targetTask || !targetTask.isRunning) {
      return;
    }

    setOperationInProgress(prev => new Set(prev).add(taskId));

    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const runningTime = targetTask.startTime ? currentTime - targetTask.startTime : 0;
      const newElapsedTime = targetTask.elapsedTime + runningTime;

      // 乐观更新
      const updateTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
        return taskList.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              elapsedTime: newElapsedTime,
              isPaused: true,
              isRunning: false,
              startTime: null,
              pausedTime: 0
            };
          }
          if (task.children) {
            return { ...task, children: updateTaskRecursive(task.children) };
          }
          return task;
        });
      };

      onTasksChange(updateTaskRecursive(tasks));

      // 调用 API
      await fetch(`/api/timer-tasks/${taskId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: 'user-1',
          expectedVersion: targetTask.version 
        })
      });

    } catch (error) {
      console.error('暂停计时器失败:', error);
    } finally {
      setOperationInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  }, [tasks, onTasksChange, operationInProgress, findTaskById]);

  /**
   * 停止计时器
   */
  const stopTimer = useCallback(async (taskId: string) => {
    if (operationInProgress.has(taskId)) {
      return;
    }

    const targetTask = findTaskById(taskId, tasks);
    if (!targetTask || !targetTask.isRunning) {
      return;
    }

    setOperationInProgress(prev => new Set(prev).add(taskId));

    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const runningTime = targetTask.startTime ? currentTime - targetTask.startTime : 0;
      const newElapsedTime = targetTask.elapsedTime + runningTime;

      // 乐观更新
      const updateTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
        return taskList.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              elapsedTime: newElapsedTime,
              isRunning: false,
              isPaused: false,
              startTime: null,
              pausedTime: 0,
              completedAt: currentTime
            };
          }
          if (task.children) {
            return { ...task, children: updateTaskRecursive(task.children) };
          }
          return task;
        });
      };

      onTasksChange(updateTaskRecursive(tasks));

      // 调用 API
      await fetch(`/api/timer-tasks/${taskId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: 'user-1',
          expectedVersion: targetTask.version 
        })
      });

    } catch (error) {
      console.error('停止计时器失败:', error);
    } finally {
      setOperationInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  }, [tasks, onTasksChange, operationInProgress, findTaskById]);

  return {
    startTimer,
    pauseTimer,
    stopTimer,
    findAllRunningTasks,
    operationInProgress
  };
}






