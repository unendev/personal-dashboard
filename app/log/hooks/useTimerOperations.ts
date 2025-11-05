'use client'

import { useState, useCallback, useRef, useEffect } from 'react';
import { TimerTask } from '@/app/features/timer/types';
import { QuickCreateData } from '@/app/components/features/timer/QuickCreateDialog';
import { useTimerControl } from '@/app/hooks/useTimerControl';
import { OperationRecord } from './useLogPageState';

/**
 * Timer 操作管理 Hook
 * 
 * 职责：
 * - 封装 Timer 控制器逻辑
 * - 处理任务创建、启动、暂停等操作
 * - 管理操作记录
 * - 处理版本冲突和自动启动
 * - 管理滚动位置
 */
export function useTimerOperations(
  timerTasks: TimerTask[],
  setTimerTasks: React.Dispatch<React.SetStateAction<TimerTask[]>>,
  userId: string,
  fetchTimerTasks: () => Promise<void>,
  fetchOperationRecords: () => Promise<void>
) {
  // ============ 状态 ============
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [pendingStartTaskId, setPendingStartTaskId] = useState<string | null>(null);
  
  // ============ 滚动位置管理 ============
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollPositionRef.current = scrollContainerRef.current.scrollTop;
        }
      }, 100);
    }
  }, []);

  const saveScrollPositionNow = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  }, []);

  const restoreScrollPosition = useCallback(() => {
    if (scrollContainerRef.current && scrollPositionRef.current > 0) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, []);

  // 恢复滚动位置
  useEffect(() => {
    const timer = setTimeout(() => {
      restoreScrollPosition();
    }, 0);
    return () => clearTimeout(timer);
  }, [timerTasks, restoreScrollPosition]);
  
  // ============ 操作记录 ============
  
  /**
   * 记录操作历史
   */
  const recordOperation = useCallback(async (action: string, taskName: string, details?: string) => {
    try {
      const response = await fetch('/api/operation-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          taskName,
          details
        }),
      });

      if (response.ok) {
        fetchOperationRecords();
      }
    } catch (error) {
      console.error('保存操作记录失败:', error);
    }
  }, [fetchOperationRecords]);
  
  // ============ 版本冲突处理 ============
  
  const handleVersionConflict = useCallback(() => {
    console.warn('🔄 检测到版本冲突，正在刷新任务数据...');
    fetchTimerTasks();
  }, [fetchTimerTasks]);

  const handleTasksPaused = useCallback((pausedTasks: Array<{ id: string; name: string }>) => {
    if (pausedTasks.length > 0) {
      const taskNames = pausedTasks.map(t => t.name).join('、');
      console.log(`ℹ️ 已自动暂停：${taskNames}`);
    }
  }, []);
  
  // ============ Timer 控制器 ============
  
  const timerControl = useTimerControl({
    tasks: timerTasks,
    onTasksChange: setTimerTasks,
    onVersionConflict: handleVersionConflict,
    onTasksPaused: handleTasksPaused,
  });
  
  // ============ 快速创建任务 ============
  
  const handleQuickCreate = useCallback(async (data: QuickCreateData) => {
    if (isCreatingTask) {
      console.log('任务正在创建中，请稍候...');
      return;
    }

    setIsCreatingTask(true);
    
    const newOrder = 0;
    const tempTask: TimerTask = {
      id: `temp-${Date.now()}`,
      name: data.name,
      categoryPath: data.categoryPath,
      instanceTag: data.instanceTagNames.join(',') || null,
      elapsedTime: data.initialTime,
      initialTime: data.initialTime,
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      order: newOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 乐观更新 UI
    setTimerTasks([tempTask, ...timerTasks]);
    recordOperation('快速创建任务', data.name, `分类: ${data.categoryPath}`);

    try {
      const newTask = {
        name: data.name,
        categoryPath: data.categoryPath,
        instanceTag: data.instanceTagNames.join(',') || null,
        instanceTagNames: data.instanceTagNames,
        elapsedTime: data.initialTime,
        initialTime: data.initialTime,
        isRunning: false,
        startTime: null,
        isPaused: false,
        pausedTime: 0,
        order: newOrder,
        date: new Date().toISOString().split('T')[0],
        userId: userId
      };

      const response = await fetch('/api/timer-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });

      if (response.ok) {
        const createdTask = await response.json();
        
        // 用真实任务替换临时任务
        setTimerTasks(prevTasks => {
          return prevTasks.map(task => {
            if (task.id !== tempTask.id) return task;
            return {
              ...createdTask,
              isRunning: createdTask.isRunning,
              isPaused: createdTask.isPaused,
              startTime: createdTask.startTime,
              elapsedTime: createdTask.elapsedTime,
              order: createdTask.order ?? task.order,
              instanceTag: createdTask.instanceTag ?? task.instanceTag
            };
          });
        });
        
        console.log('✅ [后台同步] 任务创建成功:', createdTask.name);
        
        // 触发自动启动
        setPendingStartTaskId(createdTask.id);
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      console.error('Failed to add task:', error);
      
      // 回滚 UI 状态
      setTimerTasks(prevTasks => 
        prevTasks.filter(task => task.id !== tempTask.id)
      );
      
      recordOperation('创建失败', data.name, `错误: ${error instanceof Error ? error.message : '未知错误'}`);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`任务创建失败: ${errorMessage}\n\n请检查网络连接后重试`);
    } finally {
      setIsCreatingTask(false);
    }
  }, [isCreatingTask, timerTasks, setTimerTasks, userId, recordOperation]);
  
  // ============ 自动启动逻辑 ============
  
  const handleRequestAutoStart = useCallback((taskId: string) => {
    console.log('📝 [父组件] 收到自动启动请求:', taskId);
    setPendingStartTaskId(taskId);
  }, []);
  
  useEffect(() => {
    if (pendingStartTaskId) {
      console.log('🎬 [useEffect触发] pendingStartTaskId:', pendingStartTaskId);
      
      const timer = setTimeout(async () => {
        let retryCount = 0;
        const maxRetries = 5;
        
        while (retryCount < maxRetries) {
          try {
            console.log(`🚀 [自动启动] 开始执行，任务ID: ${pendingStartTaskId} (尝试 ${retryCount + 1}/${maxRetries})`);
            const result = await timerControl.startTimer(pendingStartTaskId);
            
            if (result.success) {
              console.log('✅ [自动启动] 完成:', pendingStartTaskId);
              recordOperation('开始计时', '新任务', '自动开始');
              break;
            } else if (result.reason === 'version_conflict') {
              console.error('❌ [自动启动] 版本冲突:', result.conflictTaskName);
              alert(`⚠️ 数据冲突\n\n任务"${result.conflictTaskName}"的数据已在其他地方被修改。\n\n页面将自动刷新以获取最新数据。`);
              await fetchTimerTasks();
              break;
            } else if (result.reason === 'processing') {
              console.warn(`⏸️ [自动启动] 正在处理中，等待300ms后重试... (${retryCount + 1}/${maxRetries})`);
              retryCount++;
              if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            } else if (result.reason === 'not_found') {
              console.warn(`🔍 [自动启动] 未找到任务，等待300ms后重试... (${retryCount + 1}/${maxRetries})`);
              retryCount++;
              if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            } else {
              console.warn(`⚠️ [自动启动] 失败:`, result.reason);
              break;
            }
          } catch (error) {
            console.error('❌ [自动启动] 异常:', error);
            break;
          }
        }
        
        if (retryCount >= maxRetries) {
          console.error('❌ [自动启动] 重试次数已用尽，任务ID:', pendingStartTaskId);
        }
        
        setPendingStartTaskId(null);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        console.log('🧹 [useEffect清理] 取消定时器:', pendingStartTaskId);
      };
    }
  }, [pendingStartTaskId, timerControl, recordOperation, fetchTimerTasks]);
  
  // ============ 返回值 ============
  return {
    // Timer 控制
    timerControl,
    isCreatingTask,
    
    // 操作函数
    recordOperation,
    handleQuickCreate,
    handleRequestAutoStart,
    handleVersionConflict,
    handleTasksPaused,
    
    // 滚动管理
    scrollContainerRef,
    saveScrollPosition,
    saveScrollPositionNow,
  };
}

