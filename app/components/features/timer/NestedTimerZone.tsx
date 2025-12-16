/**
 * @file NestedTimerZone.tsx
 * @description 计时器任务区域组件（重构版）
 * @refactored 2025-11-02
 * 
 * 从 983 行重构为 ~250 行
 * 主要改进：
 * - 使用组件化架构（TimerTaskList, TimerTask等）
 * - 分离拖拽逻辑（useTimerDragDrop）
 * - 保持向后兼容
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { fetchWithRetry } from '@/lib/fetch-utils';
import { useTimerControl } from '@/app/hooks/useTimerControl';
import { TimerTaskList } from '@/app/features/timer/components/TimerTaskList/TimerTaskList';

// ============ 类型定义 ============

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

interface NestedTimerZoneProps {
  tasks: TimerTask[];
  onTasksChange: (tasks: TimerTask[]) => void;
  onOperationRecord?: (action: string, taskName: string, details?: string) => void;
  onTaskClone?: (task: TimerTask) => void;
  onBeforeOperation?: () => void;
  groupFilter?: string[];
  level?: number;
  parentId?: string;
  collapsedTasks?: Set<string>;
  onToggleCollapse?: (taskId: string) => void;
  // 弹框状态管理
  showAddChildDialog?: string | null;
  onShowAddChildDialog?: (taskId: string | null) => void;
  newChildName?: string;
  onNewChildNameChange?: (name: string) => void;
  newChildInitialTime?: string;
  onNewChildInitialTimeChange?: (time: string) => void;
  // 共享的 timer 控制器
  timerControl?: ReturnType<typeof useTimerControl>;
  onRequestAutoStart?: (taskId: string) => void;
}

// ============ 主组件 ============

const NestedTimerZone: React.FC<NestedTimerZoneProps> = ({ 
  tasks, 
  onTasksChange, 
  onOperationRecord,
  onTaskClone,
  onBeforeOperation,
  groupFilter,
  level = 0,
  collapsedTasks: externalCollapsedTasks,
  onToggleCollapse: externalOnToggleCollapse,
  // 弹框状态
  showAddChildDialog: externalShowAddChildDialog,
  onShowAddChildDialog: externalOnShowAddChildDialog,
  newChildName: externalNewChildName,
  onNewChildNameChange: externalOnNewChildNameChange,
  newChildInitialTime: externalNewChildInitialTime,
  onNewChildInitialTimeChange: externalOnNewChildInitialTimeChange,
  // 接收外部的 timerControl
  timerControl: externalTimerControl,
  onRequestAutoStart
}) => {
  // ========== 本地状态 ==========
  const [localShowAddChildDialog, setLocalShowAddChildDialog] = useState<string | null>(null);
  const [localNewChildName, setLocalNewChildName] = useState('');
  const [localNewChildInitialTime, setLocalNewChildInitialTime] = useState('');
  const [localCollapsedTasks, setLocalCollapsedTasks] = useState<Set<string>>(new Set());
  
  // 使用外部状态或本地状态
  const showAddChildDialog = externalShowAddChildDialog !== undefined ? externalShowAddChildDialog : localShowAddChildDialog;
  const setShowAddChildDialog = externalOnShowAddChildDialog || setLocalShowAddChildDialog;
  const newChildName = externalNewChildName !== undefined ? externalNewChildName : localNewChildName;
  const setNewChildName = externalOnNewChildNameChange || setLocalNewChildName;
  const newChildInitialTime = externalNewChildInitialTime !== undefined ? externalNewChildInitialTime : localNewChildInitialTime;
  const setNewChildInitialTime = externalOnNewChildInitialTimeChange || setLocalNewChildInitialTime;
  
  const collapsedTasks = externalCollapsedTasks || localCollapsedTasks;
  const onToggleCollapse = externalOnToggleCollapse || ((taskId: string) => {
    setLocalCollapsedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  });

  // ========== Timer 控制器 ==========
  const localTimerControl = useTimerControl({
    tasks,
    onTasksChange,
  });
  const timerControl = externalTimerControl || localTimerControl;
  const { startTimer: hookStartTimer, pauseTimer: hookPauseTimer, isProcessing } = timerControl;

  // ========== 排序逻辑 ==========
  const sortedTasks = React.useMemo(() => {
    let filteredTasks = tasks;
    if (groupFilter && groupFilter.length > 0) {
      filteredTasks = tasks.filter(t => groupFilter.includes(t.id));
    }
    
    return [...filteredTasks].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined && a.order >= 0 && b.order >= 0) {
        if (a.order === b.order) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.order - b.order;
      }
      if (a.order !== undefined && a.order >= 0 && (b.order === undefined || b.order < 0)) {
        return -1;
      }
      if (b.order !== undefined && b.order >= 0 && (a.order === undefined || a.order < 0)) {
        return 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, groupFilter]);

  // ========== 时间计算 ==========
  const getCurrentDisplayTime = useCallback((task: TimerTask): number => {
    if (task.isRunning && !task.isPaused && task.startTime) {
      const elapsed = Math.floor((Date.now() / 1000 - task.startTime));
      return task.elapsedTime + elapsed;
    }
    return task.elapsedTime;
  }, []);

  // ========== 定时更新（仅用于时间显示） ==========
  const [, forceUpdate] = useState({});
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  useEffect(() => {
    const hasRunningTask = (taskList: TimerTask[]): boolean => {
      for (const task of taskList) {
        if (task.isRunning && !task.isPaused && task.startTime) {
          return true;
        }
        if (task.children && hasRunningTask(task.children)) {
          return true;
        }
      }
      return false;
    };

    if (hasRunningTask(tasks)) {
      const interval = setInterval(() => {
        if (hasRunningTask(tasks)) {
          triggerUpdate();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [tasks, triggerUpdate]);

  // ========== 删除任务 ==========
  const deleteTimer = async (taskId: string) => {
    onBeforeOperation?.();
    
    const findTask = (taskList: TimerTask[]): TimerTask | null => {
      for (const task of taskList) {
        if (task.id === taskId) return task;
        if (task.children) {
          const found = findTask(task.children);
          if (found) return found;
        }
      }
      return null;
    };

    const task = findTask(tasks);
    if (!task) return;

    const isConfirmed = confirm(`确定要删除任务"${task.name}"吗？\n\n这将永久删除该任务及其所有子任务和计时数据。`);
    if (!isConfirmed) return;

    const removeTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
      return taskList.filter(t => {
        if (t.id === taskId) return false;
        if (t.children) {
          t.children = removeTaskRecursive(t.children);
        }
        return true;
      });
    };

    const updatedTasks = removeTaskRecursive(tasks);
    const previousTasks = tasks;
    
    onTasksChange(updatedTasks);
    
    if (onOperationRecord) {
      onOperationRecord('删除任务', task.name);
    }

    try {
      const response = await fetchWithRetry(`/api/timer-tasks?id=${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete timer:', error);
      onTasksChange(previousTasks);
      alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}\n已恢复任务。`);
    }
  };

  // ========== 添加子任务 ==========
  const addChildTask = async (parentId: string) => {
    if (!newChildName.trim()) {
      alert('请输入任务名称');
      return;
    }

    // 修正时长计算：输入是分钟，需要转换为秒
    const initialTimeInSeconds = newChildInitialTime ? parseInt(newChildInitialTime, 10) * 60 : 0;

    // 找到父任务
    const findParentTask = (taskList: TimerTask[]): TimerTask | null => {
      for (const task of taskList) {
        if (task.id === parentId) return task;
        if (task.children) {
          const found = findParentTask(task.children);
          if (found) return found;
        }
      }
      return null;
    };

    const parentTask = findParentTask(tasks);
    if (!parentTask) {
      alert('未找到父任务');
      return;
    }

    // 创建临时子任务（子任务默认继承父任务的分类路径）
    const tempChildId = `temp-child-${Date.now()}`;
    const tempTask: TimerTask = {
      id: tempChildId,
      name: newChildName,
      categoryPath: parentTask.categoryPath, // 子任务继承父任务的分类路径
      initialTime: initialTimeInSeconds,
      elapsedTime: 0,
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      parentId: parentId,
      order: (parentTask.children || []).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 添加到UI
    const addChildRecursive = (taskList: TimerTask[]): TimerTask[] => {
      return taskList.map(task => {
        if (task.id === parentId) {
          return {
            ...task,
            children: [...(task.children || []), tempTask]
          };
        }
        if (task.children) {
          return { ...task, children: addChildRecursive(task.children) };
        }
        return task;
      });
    };

    const updatedTasks = addChildRecursive(tasks);
    onTasksChange(updatedTasks);
    setShowAddChildDialog(null);
    setNewChildName('');
    setNewChildInitialTime('');

    // 异步创建任务
    try {
      const response = await fetchWithRetry('/api/timer-tasks', {
          method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          name: newChildName,
          categoryPath: parentTask.categoryPath, // 子任务继承父任务的分类路径
          initialTime: initialTimeInSeconds,
          elapsedTime: initialTimeInSeconds,
            parentId: parentId,
          order: (parentTask.children || []).length,
          date: new Date().toISOString().split('T')[0], // 添加 date 字段
          userId: 'user-1', // 添加 userId 字段
          }),
      }, 3);

      if (!response.ok) {
        throw new Error('创建失败');
      }

      const newTask = await response.json();

      // 替换临时任务
      const replaceTempTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
        return taskList.map(task => {
          if (task.id === parentId) {
            return {
              ...task,
              children: task.children?.map(child => 
                child.id === tempTask.id ? newTask : child
              ) || []
            };
          }
          if (task.children) {
            return { ...task, children: replaceTempTaskRecursive(task.children) };
          }
          return task;
        });
      };

      const finalTasks = replaceTempTaskRecursive(updatedTasks);
      onTasksChange(finalTasks);
      
      // 自动开始子任务计时
      if (onRequestAutoStart && newTask.id) {
        console.log('📝 [子任务] 请求自动启动:', newTask.id);
        onRequestAutoStart(newTask.id);
      }
    } catch (error) {
      console.error('创建子任务失败:', error);
      // 移除临时任务
      const removeTempTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
        return taskList.map(task => {
          if (task.id === parentId) {
            return {
              ...task,
              children: task.children?.filter(child => child.id !== tempTask.id) || []
            };
          }
          if (task.children) {
            return { ...task, children: removeTempTaskRecursive(task.children) };
          }
          return task;
        });
      };

      const rolledBackTasks = removeTempTaskRecursive(updatedTasks);
      onTasksChange(rolledBackTasks);
      alert('创建子任务失败');
    }
  };

  // ========== 渲染 ==========
    return (
    <>
      <TimerTaskList
        tasks={sortedTasks}
        onTasksChange={onTasksChange}
        onStart={hookStartTimer}
        onPause={hookPauseTimer}
        onDelete={deleteTimer}
        onAddSubtask={(taskId) => setShowAddChildDialog(taskId)}
        isProcessing={isProcessing}
            onOperationRecord={onOperationRecord}
            collapsedTasks={collapsedTasks}
            onToggleCollapse={onToggleCollapse}
        getCurrentDisplayTime={getCurrentDisplayTime}
        groupFilter={groupFilter}
      />

      {/* 添加子任务弹框 */}
      <Dialog 
        open={showAddChildDialog !== null} 
        onOpenChange={(open) => !open && setShowAddChildDialog(null)}
      >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加子任务</DialogTitle>
              </DialogHeader>
          <div className="space-y-4">
                  <Input
              placeholder="子任务名称"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && showAddChildDialog) {
                  addChildTask(showAddChildDialog);
                }
              }}
                  />
                  <Input
                    type="number"
              placeholder="初始时间（分钟，可选）"
                    value={newChildInitialTime}
                    onChange={(e) => setNewChildInitialTime(e.target.value)}
                  />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddChildDialog(null)}>
                  取消
                </Button>
            <Button 
              onClick={() => showAddChildDialog && addChildTask(showAddChildDialog)}
              disabled={!newChildName.trim()}
            >
              添加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    </>
  );
};

export default NestedTimerZone;
