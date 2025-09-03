'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';

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
  const intervalRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const updateTaskTime = useCallback((taskId: string, elapsedTime: number) => {
    const updateTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
      return taskList.map(task => {
        if (task.id === taskId) {
          return { ...task, elapsedTime };
        }
        if (task.children) {
          return { ...task, children: updateTaskRecursive(task.children) };
        }
        return task;
      });
    };
    
    const updatedTasks = updateTaskRecursive(tasks);
    onTasksChange(updatedTasks);
  }, [tasks, onTasksChange]);

  // 更新所有运行中的计时器
  useEffect(() => {
    const updateTimers = (taskList: TimerTask[]) => {
      taskList.forEach(task => {
        if (task.isRunning && !task.isPaused && task.startTime) {
          if (!intervalRefs.current[task.id]) {
            intervalRefs.current[task.id] = setInterval(() => {
              const elapsed = Math.floor((Date.now() / 1000 - task.startTime!));
              const totalTime = task.initialTime + elapsed;
              updateTaskTime(task.id, totalTime);
            }, 1000);
          }
        } else {
          if (intervalRefs.current[task.id]) {
            clearInterval(intervalRefs.current[task.id]);
            delete intervalRefs.current[task.id];
          }
        }
        
        if (task.children) {
          updateTimers(task.children);
        }
      });
    };

    updateTimers(tasks);

    return () => {
      Object.values(intervalRefs.current).forEach(interval => {
        clearInterval(interval);
      });
      intervalRefs.current = {};
    };
  }, [tasks, updateTaskTime]);

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
          startTime: Math.floor(Date.now() / 1000),
          pausedTime: 0
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start timer');
      }

      const updateTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
        return taskList.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              isRunning: true,
              isPaused: false,
              startTime: Math.floor(Date.now() / 1000),
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
    } catch (error) {
      console.error('Failed to start timer:', error);
      alert('启动失败，请重试');
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
    if (!task) return;

    try {
      const response = await fetch('/api/timer-tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId,
          isPaused: true,
          pausedTime: Math.floor(Date.now() / 1000)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to pause timer');
      }

      const updateTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
        return taskList.map(task => {
          if (task.id === taskId && task.isRunning) {
            return {
              ...task,
              isPaused: true,
              pausedTime: Math.floor(Date.now() / 1000)
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
    } catch (error) {
      console.error('Failed to pause timer:', error);
      alert('暂停失败，请重试');
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
    if (!task) return;

    try {
      const pauseDuration = Math.floor(Date.now() / 1000) - task.pausedTime;
      const newStartTime = Number(task.startTime!) + pauseDuration;

      const response = await fetch('/api/timer-tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId,
          isPaused: false,
          startTime: newStartTime,
          pausedTime: 0
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resume timer');
      }

      const updateTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
        return taskList.map(task => {
          if (task.id === taskId && task.isPaused) {
            return {
              ...task,
              isPaused: false,
              startTime: newStartTime,
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
    } catch (error) {
      console.error('Failed to resume timer:', error);
      alert('继续失败，请重试');
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
          date: new Date().toISOString().split('T')[0]
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
    let total = task.elapsedTime;
    if (task.children) {
      task.children.forEach(child => {
        total += calculateTotalTime(child);
      });
    }
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

  const renderTask = (task: TimerTask) => {
    const totalTime = calculateTotalTime(task);
    const hasChildren = task.children && task.children.length > 0;
    const indentStyle = { marginLeft: `${level * 20}px` };

    return (
      <div key={task.id} style={indentStyle}>
        <Card 
          className={`transition-all duration-200 mb-3 ${
            task.isRunning ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
          } ${
            hasChildren ? 'border-l-4 border-l-green-400' : ''
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
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
                  {formatDisplayTime(task.elapsedTime)}
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
              
              <div className="flex gap-2 ml-4">
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
                  className="text-green-600 hover:text-green-700"
                >
                  添加子任务
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
          <p className="text-sm text-gray-400 mt-2">创建事物后会自动出现在这里</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map(renderTask)}

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
  );
};

export default NestedTimerZone;
