'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  parentId?: string | null;
  children?: TimerTask[];
  totalTime?: number; // 包含子任务的总时间
}

interface NestedTimerZoneProps {
  tasks: TimerTask[];
  onTasksChange: (tasks: TimerTask[]) => void;
  onOperationRecord?: (action: string, taskName: string, details?: string) => void;
  level?: number;
}

const NestedTimerZone: React.FC<NestedTimerZoneProps> = ({ 
  tasks, 
  onTasksChange, 
  onOperationRecord,
  level = 0
}) => {
  const [showAddChildDialog, setShowAddChildDialog] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState('');
  const [newChildCategory, setNewChildCategory] = useState('');
  const [newChildInitialTime, setNewChildInitialTime] = useState('');

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动8px后才开始拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 拖拽开始处理函数
  const handleDragStart = (event: any) => {
    console.log('拖拽开始:', event.active.id);
  };

  // 拖拽结束处理函数
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('拖拽结束:', { activeId: active.id, overId: over?.id });

    if (active.id !== over?.id && over) {
      const oldIndex = tasks.findIndex((task) => task.id === active.id);
      const newIndex = tasks.findIndex((task) => task.id === over.id);

      console.log('任务重排序:', { oldIndex, newIndex, taskName: tasks[oldIndex]?.name });

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
        onTasksChange(reorderedTasks);

        if (onOperationRecord) {
          onOperationRecord('移动任务', `${tasks[oldIndex]?.name} 移动到位置 ${newIndex + 1}`);
        }
      }
    }
  };

  // 计算任务的当前显示时间（不修改原始数据）
  const getCurrentDisplayTime = (task: TimerTask): number => {
    let displayTime;
    if (task.isRunning && !task.isPaused && task.startTime) {
      const elapsed = Math.floor((Date.now() / 1000 - task.startTime));
      displayTime = task.elapsedTime + elapsed;
      console.log(`${task.name} 运行中时间计算:`, {
        isRunning: task.isRunning,
        isPaused: task.isPaused,
        startTime: task.startTime,
        elapsedTime: task.elapsedTime,
        currentElapsed: elapsed,
        displayTime
      });
    } else {
      displayTime = task.elapsedTime;
      console.log(`${task.name} 非运行状态时间:`, {
        isRunning: task.isRunning,
        isPaused: task.isPaused,
        elapsedTime: task.elapsedTime,
        displayTime
      });
    }
    return displayTime;
  };

  // 强制重新渲染组件以更新时间显示
  const [, forceUpdate] = useState({});
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // 只用于触发重新渲染，不修改任务数据
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
      const interval = setInterval(triggerUpdate, 1000);
      return () => clearInterval(interval);
    }
  }, [tasks, triggerUpdate]);

  const startTimer = async (taskId: string) => {
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

    // 立即更新前端状态，避免延迟
    const currentTime = Math.floor(Date.now() / 1000);
    const updateTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
      return taskList.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            isRunning: true,
            isPaused: false,
            startTime: currentTime,
            pausedTime: 0
          };
        }
        if (task.children) {
          return { ...task, children: updateTaskRecursive(task.children) };
        }
        return task;
      });
    };

    const updatedTasks = updateTaskRecursive(tasks);
    onTasksChange(updatedTasks);
    
    if (onOperationRecord) {
      const timeText = task.initialTime > 0 ? ` (从 ${formatTime(task.initialTime)} 开始)` : '';
      onOperationRecord('开始计时', task.name, timeText);
    }

    // 异步更新数据库
    try {
      const response = await fetch('/api/timer-tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId,
          isRunning: true,
          isPaused: false,
          startTime: currentTime,
          pausedTime: 0
        }),
      });

      if (!response.ok) {
        console.error('Failed to update database for start timer');
        // 不显示错误提示，因为前端状态已经更新
      }
    } catch (error) {
      console.error('Failed to start timer in database:', error);
      // 不显示错误提示，因为前端状态已经更新
    }
  };

  const pauseTimer = async (taskId: string) => {
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
    if (!task || !task.startTime) {
      console.log('暂停失败：未找到任务或任务没有开始时间', { taskId, task });
      return;
    }

    // 计算当前运行时间
    const currentTime = Math.floor(Date.now() / 1000);
    const runningTime = currentTime - task.startTime;
    const newElapsedTime = task.elapsedTime + runningTime;

    console.log('暂停计时器计算:', {
      taskName: task.name,
      currentTime,
      startTime: task.startTime,
      runningTime,
      originalElapsedTime: task.elapsedTime,
      newElapsedTime
    });

    // 立即更新前端状态
    const updateTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
      return taskList.map(task => {
        if (task.id === taskId && task.isRunning) {
          console.log('更新任务状态:', { 
            taskName: task.name, 
            oldElapsedTime: task.elapsedTime, 
            newElapsedTime 
          });
          return {
            ...task,
            elapsedTime: newElapsedTime,
            isPaused: true,
            isRunning: false, // 暂停时应该设置为false
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

    const updatedTasks = updateTaskRecursive(tasks);
    onTasksChange(updatedTasks);
    
    if (onOperationRecord) {
      onOperationRecord('暂停计时', task.name);
    }

    // 异步更新数据库
    try {
      const response = await fetch('/api/timer-tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId,
          elapsedTime: newElapsedTime,
          isPaused: true,
          isRunning: false, // 数据库中也要设置isRunning为false
          startTime: null,
          pausedTime: 0
        }),
      });

      if (!response.ok) {
        console.error('Failed to update database for pause timer');
        const errorText = await response.text();
        console.error('Database error details:', errorText);
      } else {
        console.log('成功更新数据库 - 暂停任务:', { taskId, newElapsedTime });
      }
    } catch (error) {
      console.error('Failed to pause timer in database:', error);
    }
  };

  const resumeTimer = async (taskId: string) => {
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
    if (!task || !task.isPaused) {
      console.log('恢复失败：未找到任务或任务未暂停', { taskId, task });
      return;
    }

    // 立即更新前端状态
    const currentTime = Math.floor(Date.now() / 1000);

    console.log('恢复计时器:', {
      taskName: task.name,
      currentTime,
      elapsedTime: task.elapsedTime,
      wasPaused: task.isPaused
    });

    const updateTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
      return taskList.map(task => {
        if (task.id === taskId && task.isPaused) {
          console.log('恢复任务状态:', { 
            taskName: task.name, 
            elapsedTime: task.elapsedTime 
          });
          return {
            ...task,
            isRunning: true,
            isPaused: false,
            startTime: currentTime,
            pausedTime: 0
          };
        }
        if (task.children) {
          return { ...task, children: updateTaskRecursive(task.children) };
        }
        return task;
      });
    };

    const updatedTasks = updateTaskRecursive(tasks);
    onTasksChange(updatedTasks);
    
    if (onOperationRecord) {
      onOperationRecord('继续计时', task.name);
    }

    // 异步更新数据库
    try {
      const response = await fetch('/api/timer-tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId,
          isRunning: true,
          isPaused: false,
          startTime: currentTime,
          pausedTime: 0
        }),
      });

      if (!response.ok) {
        console.error('Failed to update database for resume timer');
        const errorText = await response.text();
        console.error('Database error details:', errorText);
      } else {
        console.log('成功更新数据库 - 恢复任务:', { taskId });
      }
    } catch (error) {
      console.error('Failed to resume timer in database:', error);
    }
  };

  const deleteTimer = async (taskId: string) => {
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

    try {
      const response = await fetch(`/api/timer-tasks?id=${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      const removeTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
        return taskList.filter(task => {
          if (task.id === taskId) return false;
          if (task.children) {
            task.children = removeTaskRecursive(task.children);
          }
          return true;
        });
      };

      const updatedTasks = removeTaskRecursive(tasks);
      onTasksChange(updatedTasks);
      
      if (onOperationRecord) {
        onOperationRecord('删除任务', task.name);
      }
    } catch (error) {
      console.error('Failed to delete timer:', error);
      alert('删除失败，请重试');
    }
  };

  const addChildTask = async (parentId: string) => {
    if (!newChildName.trim()) {
      alert('请输入任务名称');
      return;
    }

    const initialTimeInSeconds = newChildInitialTime ? parseInt(newChildInitialTime, 10) * 60 : 0;

    try {
      const response = await fetch('/api/timer-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newChildName.trim(),
          categoryPath: newChildCategory.trim() || '未分类',
          parentId: parentId,
          date: new Date().toISOString().split('T')[0],
          initialTime: initialTimeInSeconds,
          elapsedTime: initialTimeInSeconds
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add child task');
      }

      const newTask = await response.json();

      const addChildRecursive = (taskList: TimerTask[]): TimerTask[] => {
        return taskList.map(task => {
          if (task.id === parentId) {
            return {
              ...task,
              children: [...(task.children || []), newTask]
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
      
      setNewChildName('');
      setNewChildCategory('');
      setNewChildInitialTime('');
      setShowAddChildDialog(null);
      
      if (onOperationRecord) {
        onOperationRecord('创建子任务', newChildName.trim());
      }
    } catch (error) {
      console.error('Failed to add child task:', error);
      alert('创建失败，请重试');
    }
  };

  const calculateTotalTime = (task: TimerTask): number => {
    let total = getCurrentDisplayTime(task);
    let childrenTotal = 0;
    
    if (task.children && task.children.length > 0) {
      task.children.forEach(child => {
        const childTime = calculateTotalTime(child);
        childrenTotal += childTime;
      });
    }
    
    total += childrenTotal;
    
    console.log(`${task.name} 总时间计算:`, {
      ownTime: getCurrentDisplayTime(task),
      childrenCount: task.children?.length || 0,
      childrenTotal,
      total
    });
    
    return total;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatDisplayTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // 可拖拽的任务项组件
  const SortableTaskItem: React.FC<{ task: TimerTask }> = ({ task }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: task.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const totalTime = calculateTotalTime(task);
    const hasChildren = task.children && task.children.length > 0;
    const indentStyle = { marginLeft: `${level * 20}px` };

    return (
      <div ref={setNodeRef} style={{ ...style, ...indentStyle }} {...attributes}>
        <Card 
          {...listeners} // 整个卡片可拖拽
          className={`transition-all duration-200 mb-3 cursor-grab active:cursor-grabbing ${
            task.isRunning ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
          } ${
            hasChildren ? 'border-l-4 border-l-green-400' : ''
          } ${
            isDragging ? 'shadow-lg rotate-1 scale-105' : 'hover:shadow-md'
          }`}
          title="拖拽重新排序"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    hasChildren ? 'bg-green-400' : 'bg-gray-400'
                  }`}></div>
                  <h3 className="font-medium text-gray-800 truncate">
                    {task.name}
                    {hasChildren && (
                      <span className="text-xs text-green-600 ml-2">
                        ({task.children!.length}个子任务)
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 mt-1 truncate">
                  {task.categoryPath}
                </p>
                <div className="text-lg font-mono text-blue-600 mt-2">
                  {formatDisplayTime(getCurrentDisplayTime(task))}
                  {task.initialTime > 0 && task.elapsedTime === task.initialTime && (
                    <span className="text-xs text-gray-500 ml-2">(预设时间)</span>
                  )}
                </div>
                {hasChildren && (
                  <div className="text-sm text-green-600 mt-1">
                    总计: {formatTime(totalTime)}
                  </div>
                )}
              </div>
              
              <div 
                className="flex gap-2 ml-4 flex-shrink-0 flex-wrap" 
                style={{ zIndex: 10 }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {task.isRunning ? (
                  task.isPaused ? (
                    <Button 
                      onClick={() => resumeTimer(task.id)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      继续
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => pauseTimer(task.id)}
                      variant="outline"
                      size="sm"
                    >
                      暂停
                    </Button>
                  )
                ) : (
                  <Button 
                    onClick={() => startTimer(task.id)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    开始
                  </Button>
                )}
                
                <Button 
                  onClick={() => setShowAddChildDialog(task.id)}
                  variant="outline"
                  size="sm"
                  className="text-green-600 hover:text-green-700 border-2 border-green-400 hover:border-green-500 bg-green-50 hover:bg-green-100 font-medium"
                  title="添加子任务"
                  style={{ 
                    minWidth: '130px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    position: 'relative',
                    zIndex: 10
                  }}
                >
                  ➕ 添加子任务
                </Button>
                
                <Button 
                  onClick={() => deleteTimer(task.id)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  删除
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 递归渲染子任务 */}
        {hasChildren && (
          <NestedTimerZone
            tasks={task.children!}
            onTasksChange={(updatedChildren) => {
              const updateChildrenRecursive = (taskList: TimerTask[]): TimerTask[] => {
                return taskList.map(t => {
                  if (t.id === task.id) {
                    return { ...t, children: updatedChildren };
                  }
                  if (t.children) {
                    return { ...t, children: updateChildrenRecursive(t.children) };
                  }
                  return t;
                });
              };
              onTasksChange(updateChildrenRecursive(tasks));
            }}
            onOperationRecord={onOperationRecord}
            level={level + 1}
          />
        )}
      </div>
    );
  };


  if (tasks.length === 0) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">暂无计时任务</p>
          <p className="text-sm text-gray-400 mt-2">请先点击右上角的&ldquo;添加顶级任务&rdquo;按钮创建任务</p>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 font-medium">💡 嵌套功能提示：</p>
            <p className="text-xs text-blue-600 mt-1">
              创建任务后，每个任务卡片右侧都有&ldquo;➕ 添加子任务&rdquo;按钮，点击可以创建无限层级的子任务
            </p>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium">📋 使用步骤：</p>
            <ol className="text-xs text-yellow-700 mt-1 ml-4 list-decimal">
              <li>点击右上角&ldquo;添加顶级任务&rdquo;按钮</li>
              <li>输入任务名称创建任务</li>
                              <li>在任务卡片右侧找到绿色&ldquo;➕ 添加子任务&rdquo;按钮</li>
              <li>点击即可创建子任务，实现无限嵌套</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3 max-h-[600px] overflow-y-auto overflow-x-hidden pr-2 timer-scroll-area">
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskItem key={task.id} task={task} />
          ))}
        </SortableContext>

        {/* 添加子任务弹框 */}
        <Dialog open={!!showAddChildDialog} onOpenChange={(open) => !open && setShowAddChildDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加子任务</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  任务名称
                </label>
                <Input
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  placeholder="输入子任务名称..."
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类 (可选)
                </label>
                <Input
                  value={newChildCategory}
                  onChange={(e) => setNewChildCategory(e.target.value)}
                  placeholder="输入分类..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  初始时间 (分钟, 可选)
                </label>
                <Input
                  type="number"
                  value={newChildInitialTime}
                  onChange={(e) => setNewChildInitialTime(e.target.value)}
                  placeholder="例如: 30"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddChildDialog(null)}>
                取消
              </Button>
              <Button onClick={() => showAddChildDialog && addChildTask(showAddChildDialog)}>
                添加子任务
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
};

export default NestedTimerZone;
