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
  const pendingStartTaskIdRef = useRef<string | null>(null);
  
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
  
  // 使用 ref 存储函数引用，避免 useEffect 依赖项变化导致重新执行
  const timerControlRef = useRef(timerControl);
  const recordOperationRef = useRef(recordOperation);
  const fetchTimerTasksRef = useRef(fetchTimerTasks);
  
  // 更新 ref 中的函数引用（每次渲染时更新，确保使用最新版本）
  timerControlRef.current = timerControl;
  recordOperationRef.current = recordOperation;
  fetchTimerTasksRef.current = fetchTimerTasks;
  
  // ============ 快速创建任务 ============
  
  const handleQuickCreate = useCallback(async (data: QuickCreateData) => {
    // 📝 [handleQuickCreate] 日志：接收到的数据
    console.log('📝 [handleQuickCreate] 接收到的数据:', {
      ...data,
      initialTime: data.initialTime,
      initialTimeType: typeof data.initialTime,
      initialTimeInMinutes: data.initialTime ? data.initialTime / 60 : 0,
      initialTimeIsUndefined: data.initialTime === undefined,
      initialTimeIsNull: data.initialTime === null
    });
    
    if (isCreatingTask) {
      console.log('⏸️ [handleQuickCreate] 任务正在创建中，请稍候...');
      return;
    }

    setIsCreatingTask(true);
    
    const newOrder = 0;
    // 如果指定了 initialTime，则 elapsedTime 应该等于 initialTime（表示已完成预设时间）
    const elapsedTime = data.initialTime > 0 ? data.initialTime : 0;
    
    // 📝 [handleQuickCreate] 日志：计算 elapsedTime
    console.log('📝 [handleQuickCreate] 计算 elapsedTime:', {
      dataInitialTime: data.initialTime,
      dataInitialTimeInMinutes: data.initialTime ? data.initialTime / 60 : 0,
      calculatedElapsedTime: elapsedTime,
      calculatedElapsedTimeInMinutes: elapsedTime / 60,
      condition: data.initialTime > 0 ? 'true (使用 initialTime)' : 'false (使用 0)'
    });
    
    const tempTask: TimerTask = {
      id: `temp-${Date.now()}`,
      name: data.name,
      categoryPath: data.categoryPath,
      instanceTag: data.instanceTagNames.join(',') || null,
      elapsedTime: elapsedTime, // 如果指定了 initialTime，则已运行时间等于初始时间
      initialTime: data.initialTime, // 初始时长正确应用
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      order: newOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 📝 [handleQuickCreate] 日志：临时任务数据
    console.log('📝 [handleQuickCreate] 创建的临时任务:', {
      ...tempTask,
      initialTimeInMinutes: tempTask.initialTime / 60,
      elapsedTimeInMinutes: tempTask.elapsedTime / 60
    });

    // 乐观更新 UI（立即更新，不等待 API）
    setTimerTasks([tempTask, ...timerTasks]);
    recordOperation('快速创建任务', data.name, `分类: ${data.categoryPath}`);
    
    // 立即重置创建状态，允许创建框关闭
    setIsCreatingTask(false);

    try {
      // 如果指定了 initialTime，则 elapsedTime 应该等于 initialTime（表示已完成预设时间）
      const elapsedTimeForAPI = data.initialTime > 0 ? data.initialTime : 0;
      
      // 📝 [handleQuickCreate] 日志：计算 API 的 elapsedTime
      console.log('📝 [handleQuickCreate] 计算 API elapsedTime:', {
        dataInitialTime: data.initialTime,
        dataInitialTimeInMinutes: data.initialTime ? data.initialTime / 60 : 0,
        calculatedElapsedTimeForAPI: elapsedTimeForAPI,
        calculatedElapsedTimeForAPIInMinutes: elapsedTimeForAPI / 60,
        condition: data.initialTime > 0 ? 'true (使用 initialTime)' : 'false (使用 0)'
      });
      
      const newTask = {
        name: data.name,
        categoryPath: data.categoryPath,
        instanceTag: data.instanceTagNames.join(',') || null,
        instanceTagNames: data.instanceTagNames,
        elapsedTime: elapsedTimeForAPI, // 如果指定了 initialTime，则已运行时间等于初始时间
        initialTime: data.initialTime, // 初始时长正确应用
        isRunning: false,
        startTime: null,
        isPaused: false,
        pausedTime: 0,
        order: newOrder,
        date: new Date().toISOString().split('T')[0],
        userId: userId
      };

      // 📝 [handleQuickCreate] 日志：发送到 API 的数据
      console.log('📝 [handleQuickCreate] 发送到 API 的数据:', {
        ...newTask,
        initialTime: newTask.initialTime,
        initialTimeInMinutes: newTask.initialTime / 60,
        elapsedTime: newTask.elapsedTime,
        elapsedTimeInMinutes: newTask.elapsedTime / 60,
        requestBody: JSON.stringify(newTask, null, 2)
      });

      const response = await fetch('/api/timer-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });

      if (response.ok) {
        const createdTask = await response.json();
        
        // 📝 [handleQuickCreate] 日志：API 响应数据
        console.log('📝 [handleQuickCreate] API 响应数据:', {
          ...createdTask,
          initialTime: createdTask.initialTime,
          initialTimeInMinutes: createdTask.initialTime ? createdTask.initialTime / 60 : 0,
          elapsedTime: createdTask.elapsedTime,
          elapsedTimeInMinutes: createdTask.elapsedTime ? createdTask.elapsedTime / 60 : 0
        });
        
        // 用真实任务替换临时任务
        setTimerTasks(prevTasks => {
          return prevTasks.map(task => {
            if (task.id !== tempTask.id) return task;
            const updatedTask = {
              ...createdTask,
              isRunning: createdTask.isRunning,
              isPaused: createdTask.isPaused,
              startTime: createdTask.startTime,
              elapsedTime: createdTask.elapsedTime,
              initialTime: createdTask.initialTime, // 确保 initialTime 被正确传递
              order: createdTask.order ?? task.order,
              instanceTag: createdTask.instanceTag ?? task.instanceTag
            };
            
            // 📝 [handleQuickCreate] 日志：更新后的任务数据
            console.log('📝 [handleQuickCreate] 更新后的任务数据:', {
              ...updatedTask,
              initialTime: updatedTask.initialTime,
              initialTimeInMinutes: updatedTask.initialTime ? updatedTask.initialTime / 60 : 0
            });
            
            return updatedTask;
          });
        });
        
        console.log('✅ [handleQuickCreate] 任务创建成功:', createdTask.name);
        
        // 触发自动启动
        setPendingStartTaskId(createdTask.id);
      } else {
        const errorText = await response.text();
        console.error('❌ [handleQuickCreate] API 响应错误:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Failed to create task: ${response.status} ${response.statusText}`);
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
    }
    // 注意：isCreatingTask 已在乐观更新后立即重置，不需要在 finally 中再次设置
  }, [isCreatingTask, timerTasks, setTimerTasks, userId, recordOperation]);
  
  // ============ 自动启动逻辑 ============
  
  const handleRequestAutoStart = useCallback((taskId: string) => {
    console.log('📝 [父组件] 收到自动启动请求:', taskId);
    pendingStartTaskIdRef.current = taskId;
    setPendingStartTaskId(taskId);
  }, []);
  
  useEffect(() => {
    const taskId = pendingStartTaskId;
    if (taskId) {
      console.log('🎬 [useEffect触发] pendingStartTaskId:', taskId);
      
      // 使用 ref 存储当前任务ID，避免依赖项变化导致清理
      pendingStartTaskIdRef.current = taskId;
      
      const timer = setTimeout(async () => {
        // 使用 ref 中的值，确保即使 useEffect 被清理，也能使用正确的任务ID
        const currentTaskId = pendingStartTaskIdRef.current;
        if (!currentTaskId) {
          console.log('⚠️ [自动启动] 任务ID已被清除，取消启动');
          return;
        }
        
        let retryCount = 0;
        const maxRetries = 5;
        
        while (retryCount < maxRetries) {
          try {
            console.log(`🚀 [自动启动] 开始执行，任务ID: ${currentTaskId} (尝试 ${retryCount + 1}/${maxRetries})`);
            const result = await timerControlRef.current.startTimer(currentTaskId);
            
            if (result.success) {
              console.log('✅ [自动启动] 完成:', currentTaskId);
              recordOperationRef.current('开始计时', '新任务', '自动开始');
              pendingStartTaskIdRef.current = null;
              setPendingStartTaskId(null);
              break;
            } else if (result.reason === 'version_conflict') {
              console.error('❌ [自动启动] 版本冲突:', result.conflictTaskName);
              alert(`⚠️ 数据冲突\n\n任务"${result.conflictTaskName}"的数据已在其他地方被修改。\n\n页面将自动刷新以获取最新数据。`);
              await fetchTimerTasksRef.current();
              pendingStartTaskIdRef.current = null;
              setPendingStartTaskId(null);
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
              pendingStartTaskIdRef.current = null;
              setPendingStartTaskId(null);
              break;
            }
          } catch (error) {
            console.error('❌ [自动启动] 异常:', error);
            pendingStartTaskIdRef.current = null;
            setPendingStartTaskId(null);
            break;
          }
        }
        
        if (retryCount >= maxRetries) {
          console.error('❌ [自动启动] 重试次数已用尽，任务ID:', currentTaskId);
          pendingStartTaskIdRef.current = null;
          setPendingStartTaskId(null);
        }
      }, 200); // 增加延迟到200ms，确保状态更新完成
      
      return () => {
        clearTimeout(timer);
        console.log('🧹 [useEffect清理] 取消定时器:', taskId);
        // 只有在任务ID改变时才清除 ref
        if (pendingStartTaskIdRef.current === taskId) {
          pendingStartTaskIdRef.current = null;
        }
      };
    }
  }, [pendingStartTaskId]); // 只依赖 pendingStartTaskId，其他使用 ref 或稳定的函数
  
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

