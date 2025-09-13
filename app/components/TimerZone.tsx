'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import InstanceTagSwitcher from './InstanceTagSwitcher';

interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  instanceTag?: string | null;
  elapsedTime: number;
  initialTime: number; // 初始时间（秒）
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  createdAt?: string;
  updatedAt?: string;
}

interface TimerZoneProps {
  tasks: TimerTask[];
  onTasksChange: (tasks: TimerTask[]) => void;
  // onTaskComplete?: (taskId: string, duration: string) => void;
  onOperationRecord?: (action: string, taskName: string, details?: string) => void;
}

const TimerZone: React.FC<TimerZoneProps> = ({ 
  tasks, 
  onTasksChange, 
  // onTaskComplete,
  onOperationRecord
}) => {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const intervalRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const updateTaskTime = useCallback((taskId: string, elapsedTime: number) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, elapsedTime } : task
    );
    onTasksChange(updatedTasks);
  }, [tasks, onTasksChange]);

  // 更新所有运行中的计时器
  useEffect(() => {
    tasks.forEach(task => {
      if (task.isRunning && !task.isPaused && task.startTime) {
        if (!intervalRefs.current[task.id]) {
          intervalRefs.current[task.id] = setInterval(() => {
            const elapsed = Math.floor((Date.now() / 1000 - task.startTime!));
            // 总时间 = 初始时间 + 运行时间
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
    });

    return () => {
      Object.values(intervalRefs.current).forEach(interval => {
        clearInterval(interval);
      });
      intervalRefs.current = {};
    };
  }, [tasks, updateTaskTime]);

  const startTimer = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      // 更新数据库中的任务
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

      // 更新本地状态
      const updatedTasks = tasks.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            isRunning: true,
            isPaused: false,
            startTime: Math.floor(Date.now() / 1000),
            pausedTime: 0
          };
        }
        return task;
      });
      onTasksChange(updatedTasks);
      
      // 记录操作
      if (task && onOperationRecord) {
        const timeText = task.initialTime > 0 ? ` (从 ${formatTime(task.initialTime)} 开始)` : '';
        onOperationRecord('开始计时', task.name, timeText);
      }
    } catch (error) {
      console.error('Failed to start timer:', error);
      alert('启动失败，请重试');
    }
  };

  const pauseTimer = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      // 更新数据库中的任务
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

      // 更新本地状态
      const updatedTasks = tasks.map(task => {
        if (task.id === taskId && task.isRunning) {
                      return {
              ...task,
              isPaused: true,
              pausedTime: Math.floor(Date.now() / 1000)
            };
        }
        return task;
      });
      onTasksChange(updatedTasks);
      
      // 记录操作
      if (task && onOperationRecord) {
        onOperationRecord('暂停计时', task.name);
      }
    } catch (error) {
      console.error('Failed to pause timer:', error);
      alert('暂停失败，请重试');
    }
  };

  const resumeTimer = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const pauseDuration = Math.floor(Date.now() / 1000) - task.pausedTime;
              const newStartTime = Number(task.startTime!) + pauseDuration;

      // 更新数据库中的任务
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

      // 更新本地状态
      const updatedTasks = tasks.map(task => {
        if (task.id === taskId && task.isPaused) {
                      return {
              ...task,
              isPaused: false,
              startTime: newStartTime,
              pausedTime: 0
            };
        }
        return task;
      });
      onTasksChange(updatedTasks);
      
      // 记录操作
      if (task && onOperationRecord) {
        onOperationRecord('继续计时', task.name);
      }
    } catch (error) {
      console.error('Failed to resume timer:', error);
      alert('继续失败，请重试');
    }
  };

  const updateInstanceTag = async (taskId: string, newInstanceTag: string | null) => {
    try {
      const response = await fetch(`/api/timer-tasks/${taskId}/instance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instanceTag: newInstanceTag }),
      });

      if (!response.ok) {
        throw new Error('Failed to update instance tag');
      }

      // 更新本地状态
      const updatedTasks = tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, instanceTag: newInstanceTag };
        }
        return task;
      });
      onTasksChange(updatedTasks);

      // 记录操作
      const task = tasks.find(t => t.id === taskId);
      if (task && onOperationRecord) {
        onOperationRecord('更新实例标签', task.name, `新标签: ${newInstanceTag || '无'}`);
      }
    } catch (error) {
      console.error('Failed to update instance tag:', error);
      alert('更新实例标签失败，请重试');
    }
  };

  const deleteTimer = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // 确认删除
    const isConfirmed = confirm(`确定要删除任务"${task.name}"吗？\n\n这将永久删除该任务及其所有计时数据。`);
    if (!isConfirmed) return;

    try {
      // 删除数据库中的任务
      const response = await fetch(`/api/timer-tasks?id=${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // 更新本地状态
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      onTasksChange(updatedTasks);
      
      // 记录操作
      if (task && onOperationRecord) {
        onOperationRecord('删除任务', task.name);
      }
    } catch (error) {
      console.error('Failed to delete timer:', error);
      alert('删除失败，请重试');
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTask || draggedTask === targetTaskId) return;

    const draggedIndex = tasks.findIndex(t => t.id === draggedTask);
    const targetIndex = tasks.findIndex(t => t.id === targetTaskId);
    
    const newTasks = [...tasks];
    const [draggedTaskItem] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, draggedTaskItem);
    
    onTasksChange(newTasks);
    setDraggedTask(null);
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
             {tasks.map((task) => (
        <Card 
          key={task.id}
          className={`transition-all duration-200 ${
            draggedTask === task.id ? 'opacity-50 scale-95' : ''
          } ${task.isRunning ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
          draggable
          onDragStart={(e) => handleDragStart(e, task.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, task.id)}
        >
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                  <h3 className="font-medium text-gray-800 break-words">
                    {task.name}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 mt-1 break-words">
                  {task.categoryPath}
                </p>
                <div className="mt-2">
                  <InstanceTagSwitcher
                    currentInstanceTag={task.instanceTag}
                    onUpdate={(newInstanceTag) => updateInstanceTag(task.id, newInstanceTag)}
                    disabled={task.isRunning}
                  />
                </div>
                <div className="text-lg font-mono text-blue-600 mt-2">
                  {formatDisplayTime(task.elapsedTime)}
                  {task.initialTime > 0 && task.elapsedTime === task.initialTime && (
                    <span className="text-xs text-gray-500 ml-2">(预设时间)</span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 sm:ml-4 flex-shrink-0">
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
      ))}
    </div>
  );
};

export default TimerZone;
