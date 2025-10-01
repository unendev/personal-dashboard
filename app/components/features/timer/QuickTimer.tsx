'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';

interface QuickTask {
  id: string;
  name: string;
  category: string;
  startTime: number | null;
  totalTime: number;
  isRunning: boolean;
  isPaused: boolean;
  pausedTime: number;
}

const QuickTimer: React.FC = () => {
  const [tasks, setTasks] = useState<QuickTask[]>([]);
  const [currentTask, setCurrentTask] = useState<QuickTask | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 从localStorage加载任务
  useEffect(() => {
    const savedTasks = localStorage.getItem('quick-timer-tasks');
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks);
      setTasks(parsedTasks);
      
      // 恢复正在运行的任务
      const runningTask = parsedTasks.find((task: QuickTask) => task.isRunning);
      if (runningTask) {
        setCurrentTask(runningTask);
        if (runningTask.startTime && !runningTask.isPaused) {
          setElapsedTime(Math.floor((Date.now() / 1000 - runningTask.startTime)));
        }
      }
    }
  }, []);

  // 保存任务到localStorage
  useEffect(() => {
    localStorage.setItem('quick-timer-tasks', JSON.stringify(tasks));
  }, [tasks]);

  // 更新计时器显示
  useEffect(() => {
    if (currentTask && currentTask.isRunning && !currentTask.isPaused && currentTask.startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() / 1000 - currentTask.startTime!)));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentTask]);

  const addTask = () => {
    if (!newTaskName.trim()) {
      alert('请输入任务名称');
      return;
    }

    const newTask: QuickTask = {
      id: Date.now().toString(),
      name: newTaskName.trim(),
      category: newTaskCategory.trim(),
      startTime: null,
      totalTime: 0,
      isRunning: false,
      isPaused: false,
      pausedTime: 0
    };

    setTasks([...tasks, newTask]);
    setNewTaskName('');
    setNewTaskCategory('');
    setShowAddDialog(false);
  };

  const startTask = (task: QuickTask) => {
    // 停止当前任务
    if (currentTask && currentTask.isRunning) {
      stopCurrentTask();
    }

    // 开始新任务
    const updatedTask = {
      ...task,
              startTime: Math.floor(Date.now() / 1000),
      isRunning: true,
      isPaused: false,
      pausedTime: 0
    };

    setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
    setCurrentTask(updatedTask);
    setElapsedTime(0);
  };

  const pauseTask = () => {
    if (!currentTask || !currentTask.isRunning) return;

    const updatedTask = {
      ...currentTask,
      isPaused: true,
              pausedTime: Math.floor(Date.now() / 1000)
    };

    setTasks(tasks.map(t => t.id === currentTask.id ? updatedTask : t));
    setCurrentTask(updatedTask);
  };

  const resumeTask = () => {
    if (!currentTask || !currentTask.isPaused) return;

          const pauseDuration = Math.floor(Date.now() / 1000) - currentTask.pausedTime;
    const updatedTask = {
      ...currentTask,
              startTime: currentTask.startTime! + pauseDuration,
      isPaused: false,
      pausedTime: 0
    };

    setTasks(tasks.map(t => t.id === currentTask.id ? updatedTask : t));
    setCurrentTask(updatedTask);
  };

  const stopCurrentTask = () => {
    if (!currentTask || !currentTask.startTime) return;

          const elapsed = Math.floor((Date.now() / 1000 - currentTask.startTime));
    const updatedTask = {
      ...currentTask,
      startTime: null,
      totalTime: currentTask.totalTime + elapsed,
      isRunning: false,
      isPaused: false,
      pausedTime: 0
    };

    setTasks(tasks.map(t => t.id === currentTask.id ? updatedTask : t));
    setCurrentTask(null);
    setElapsedTime(0);
  };

  const switchToTask = (task: QuickTask) => {
    if (currentTask && currentTask.isRunning) {
      pauseTask();
    }
    startTask(task);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // const deleteTask = (taskId: string) => {
  //   if (currentTask?.id === taskId) {
  //     setCurrentTask(null);
  //     setElapsedTime(0);
  //   }
  //   setTasks(tasks.filter(t => t.id !== taskId));
  // };

  return (
    <div className="space-y-4">
      {/* 当前任务显示 */}
      {currentTask && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-800 flex items-center justify-between">
              <span>⏱️ {currentTask.name}</span>
              {currentTask.category && (
                <span className="text-sm bg-blue-200 px-2 py-1 rounded-full">
                  {currentTask.category}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono text-blue-600 mb-3 text-center">
              {formatTime(elapsedTime)}
            </div>
            <div className="flex gap-2">
              {currentTask.isPaused ? (
                <Button 
                  onClick={resumeTask}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  继续
                </Button>
              ) : (
                <Button 
                  onClick={pauseTask}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  暂停
                </Button>
              )}
              <Button 
                variant="destructive" 
                onClick={stopCurrentTask}
                className="flex-1"
                size="sm"
              >
                完成
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 快速任务切换 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">快速切换</h3>
          <Button 
            onClick={() => setShowAddDialog(true)}
            size="sm"
            variant="outline"
          >
            添加任务
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {tasks.slice(0, 4).map(task => (
            <div key={task.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{task.name}</div>
                <div className="text-xs text-gray-400">
                  {formatTime(task.totalTime)}
                </div>
              </div>
              <div className="flex gap-1">
                {task.isRunning ? (
                  <Button variant="outline" size="sm" disabled className="text-xs px-2">
                    计时中
                  </Button>
                ) : task.isPaused ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => resumeTask()}
                    className="text-xs px-2 bg-yellow-100 text-yellow-800"
                  >
                    继续
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => switchToTask(task)}
                    className="text-xs px-2"
                  >
                    开始
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
                 {tasks.length === 0 && (
           <div className="text-center text-gray-500 py-4 text-sm">
             暂无任务，点击&ldquo;添加任务&rdquo;开始计时
           </div>
         )}
      </div>

      {/* 添加任务弹框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新任务</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                任务名称
              </label>
              <Input
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="输入任务名称..."
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类 (可选)
              </label>
              <Input
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value)}
                placeholder="输入分类..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={addTask}>
              添加任务
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuickTimer;



