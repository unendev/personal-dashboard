/**
 * 通用计时器控制 Hook
 * 统一处理父子任务互斥、版本冲突、并发防护
 */

import { useState, useCallback, useRef } from 'react';

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

interface UseTimerControlOptions {
  tasks: TimerTask[];
  onTasksChange: (tasks: TimerTask[]) => void;
  onVersionConflict?: () => void; // 版本冲突回调
  onTasksPaused?: (pausedTasks: Array<{ id: string; name: string }>) => void; // 互斥暂停回调
}

export function useTimerControl(options: UseTimerControlOptions) {
  const { tasks, onTasksChange, onVersionConflict, onTasksPaused } = options;

  // 操作进行中的任务集合（防抖）
  const [operationInProgress, setOperationInProgress] = useState<Set<string>>(new Set());
  
  // 使用 Ref 增强异步锁，避免状态更新延迟导致的并发问题
  const operationInProgressRef = useRef<Set<string>>(new Set());
  
  // 超时定时器 Map，用于清理卡住的锁
  const timeoutMapRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * 设置异步锁（带超时保护）
   */
  const setLock = useCallback((taskId: string) => {
    operationInProgressRef.current.add(taskId);
    setOperationInProgress(prev => new Set(prev).add(taskId));
    
    // 设置 30 秒超时自动清理锁
    const timeout = setTimeout(() => {
      console.warn(`⚠️ 任务 ${taskId} 操作超时，自动清理锁`);
      clearLock(taskId);
    }, 30000);
    
    timeoutMapRef.current.set(taskId, timeout);
  }, []);

  /**
   * 清除异步锁（同时清理超时定时器）
   */
  const clearLock = useCallback((taskId: string) => {
    operationInProgressRef.current.delete(taskId);
    setOperationInProgress(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    
    // 清理超时定时器
    const timeout = timeoutMapRef.current.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      timeoutMapRef.current.delete(taskId);
    }
  }, []);

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
    // 【增强异步锁】使用 Ref 进行实时检查，避免状态更新延迟
    if (operationInProgressRef.current.has(taskId)) {
      console.log('⏸️ 任务操作进行中，忽略重复请求:', taskId);
      return;
    }

    // 查找目标任务
    const targetTask = findTaskById(taskId, tasks);
    if (!targetTask) {
      console.error('❌ 未找到目标任务:', taskId);
      return;
    }

    // 标记操作开始（同时更新 state 和 ref，带超时保护）
    setLock(taskId);

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

      // 暂停其他运行中的任务（使用 PUT 端点）
      tasksToPause.forEach(task => {
        apiPromises.push(
          fetch(`/api/timer-tasks`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              id: task.id,
              version: task.version,
              elapsedTime: task.elapsedTime,
              isPaused: true,
              isRunning: false,
              startTime: null,
              pausedTime: 0
            })
          }).catch(error => {
            console.error(`暂停任务失败 ${task.name}:`, error);
            return null;
          })
        );
      });

      // 启动目标任务（使用 PUT 端点）
      apiPromises.push(
        fetch(`/api/timer-tasks`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: taskId,
            version: targetTask.version,
            isRunning: true,
            isPaused: false,
            startTime: currentTime,
            pausedTime: 0
          })
        }).catch(error => {
          console.error(`启动任务失败 ${targetTask.name}:`, error);
          return null;
        })
      );

      // 等待所有 API 完成
      const results = await Promise.all(apiPromises);
      
      // 【版本冲突处理】检查是否有版本冲突
      const hasVersionConflict = results.some(res => 
        res && res.status === 409
      );

      if (hasVersionConflict) {
        console.warn('⚠️ 检测到版本冲突，需要刷新数据获取最新状态');
        // 触发版本冲突回调，让上层组件处理刷新逻辑
        if (onVersionConflict) {
          onVersionConflict();
        }
      }

      // 【互斥提示】如果暂停了其他任务，通知上层
      if (tasksToPause.length > 0 && onTasksPaused) {
        onTasksPaused(tasksToPause.map(t => ({ id: t.id, name: t.name })));
      }

      console.log('✨ 所有 API 操作完成');

    } catch (error) {
      console.error('❌ 启动计时器失败:', error);
      // 发生错误时，可以考虑回滚状态
    } finally {
      // 清除操作标记（同时清理超时定时器）
      clearLock(taskId);
    }
  }, [tasks, onTasksChange, operationInProgress, findTaskById, findAllRunningTasks, onVersionConflict, onTasksPaused, setLock, clearLock]);

  /**
   * 暂停计时器
   */
  const pauseTimer = useCallback(async (taskId: string) => {
    // 【增强异步锁】使用 Ref 进行实时检查
    if (operationInProgressRef.current.has(taskId)) {
      console.log('⏸️ 任务操作进行中，忽略重复请求:', taskId);
      return;
    }

    const targetTask = findTaskById(taskId, tasks);
    if (!targetTask || !targetTask.isRunning) {
      return;
    }

    // 标记操作开始（同时更新 state 和 ref，带超时保护）
    setLock(taskId);

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

      // 调用 API（使用 PUT 端点更新任务状态）
      const response = await fetch(`/api/timer-tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: taskId,
          version: targetTask.version,
          elapsedTime: newElapsedTime,
          isPaused: true,
          isRunning: false,
          startTime: null,
          pausedTime: 0
        })
      });

      if (!response.ok) {
        const error = await response.json();
        
        // 【版本冲突处理】
        if (response.status === 409) {
          console.warn('⚠️ 暂停时检测到版本冲突');
          if (onVersionConflict) {
            onVersionConflict();
          }
        }
        
        throw new Error(error.message || '暂停失败');
      }

    } catch (error) {
      console.error('暂停计时器失败:', error);
    } finally {
      // 清除操作标记（同时清理超时定时器）
      clearLock(taskId);
    }
  }, [tasks, onTasksChange, operationInProgress, findTaskById, onVersionConflict, setLock, clearLock]);

  /**
   * 停止计时器
   */
  const stopTimer = useCallback(async (taskId: string) => {
    // 【增强异步锁】使用 Ref 进行实时检查
    if (operationInProgressRef.current.has(taskId)) {
      console.log('⏸️ 任务操作进行中，忽略重复请求:', taskId);
      return;
    }

    const targetTask = findTaskById(taskId, tasks);
    if (!targetTask || !targetTask.isRunning) {
      return;
    }

    // 标记操作开始（同时更新 state 和 ref，带超时保护）
    setLock(taskId);

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

      // 调用 API（使用 PUT 端点）
      const response = await fetch(`/api/timer-tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: taskId,
          version: targetTask.version,
          elapsedTime: newElapsedTime,
          isRunning: false,
          isPaused: false,
          startTime: null,
          pausedTime: 0,
          completedAt: currentTime
        })
      });

      // 【版本冲突处理】
      if (response.status === 409) {
        console.warn('⚠️ 停止时检测到版本冲突');
        if (onVersionConflict) {
          onVersionConflict();
        }
      }

    } catch (error) {
      console.error('停止计时器失败:', error);
    } finally {
      // 清除操作标记（同时清理超时定时器）
      clearLock(taskId);
    }
  }, [tasks, onTasksChange, operationInProgress, findTaskById, onVersionConflict, setLock, clearLock]);

  return {
    startTimer,
    pauseTimer,
    stopTimer,
    findAllRunningTasks,
    operationInProgress
  };
}










