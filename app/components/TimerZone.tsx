'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  elapsedTime: number;
  initialTime: number; // 初始时间（秒）
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
}

interface TimerZoneProps {
  tasks: TimerTask[];
  onTasksChange: (tasks: TimerTask[]) => void;
  onTaskComplete: (taskId: string, duration: string) => void;
  onOperationRecord?: (action: string, taskName: string, details?: string) => void;
}

const TimerZone: React.FC<TimerZoneProps> = ({ 
  tasks, 
  onTasksChange, 
  onTaskComplete,
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
            const elapsed = Math.floor((Date.now() - task.startTime!) / 1000);
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

  const startTimer = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          isRunning: true,
          isPaused: false,
          startTime: Date.now(),
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
  };

  const pauseTimer = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId && task.isRunning) {
        return {
          ...task,
          isPaused: true,
          pausedTime: Date.now()
        };
      }
      return task;
    });
    onTasksChange(updatedTasks);
    
    // 记录操作
    if (task && onOperationRecord) {
      onOperationRecord('暂停计时', task.name);
    }
  };

  const resumeTimer = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId && task.isPaused) {
        const pauseDuration = Date.now() - task.pausedTime;
        return {
          ...task,
          isPaused: false,
          startTime: task.startTime! + pauseDuration,
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
  };

  const stopTimer = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // 停止计时器，但不保存到日志，只是停止计时
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          isRunning: false,
          isPaused: false,
          startTime: null
        };
      }
      return t;
    });
    onTasksChange(updatedTasks);
    
    // 记录操作
    if (task && onOperationRecord) {
      const totalTime = task.elapsedTime;
      onOperationRecord('停止计时', task.name, `总时间: ${formatTime(totalTime)}`);
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
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <h3 className="font-medium text-gray-800 truncate">
                    {task.name}
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
                  onClick={() => stopTimer(task.id)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  停止
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
