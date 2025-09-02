'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';

interface TimerTask {
  id: string;
  name: string;
  category: string;
  startTime: number | null;
  totalTime: number; // 累计时间（秒）
  isRunning: boolean;
  isPaused: boolean;
  pausedTime: number; // 暂停时的时间点
}

interface DailyStats {
  totalTime: number;
  taskCount: number;
  categories: { [key: string]: number };
}

const EnhancedTimer: React.FC = () => {
  const [tasks, setTasks] = useState<TimerTask[]>([]);
  const [currentTask, setCurrentTask] = useState<TimerTask | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    totalTime: 0,
    taskCount: 0,
    categories: {}
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 从localStorage加载任务
  useEffect(() => {
    const savedTasks = localStorage.getItem('enhanced-timer-tasks');
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks);
      setTasks(parsedTasks);
      
      // 恢复正在运行的任务
      const runningTask = parsedTasks.find((task: TimerTask) => task.isRunning);
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
    localStorage.setItem('enhanced-timer-tasks', JSON.stringify(tasks));
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

  // 计算每日统计
  useEffect(() => {
    const today = new Date().toDateString();
    const todayTasks = tasks.filter(task => {
              const taskDate = new Date(Number(task.startTime) || 0).toDateString();
      return taskDate === today;
    });

    const stats: DailyStats = {
      totalTime: todayTasks.reduce((sum, task) => sum + task.totalTime, 0),
      taskCount: todayTasks.length,
      categories: {}
    };

    todayTasks.forEach(task => {
      if (task.category) {
        stats.categories[task.category] = (stats.categories[task.category] || 0) + task.totalTime;
      }
    });

    setDailyStats(stats);
  }, [tasks]);

  const addTask = () => {
    if (!newTaskName.trim()) {
      alert('请输入任务名称');
      return;
    }

    const newTask: TimerTask = {
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

  const startTask = (task: TimerTask) => {
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
      pausedTime: Date.now()
    };

    setTasks(tasks.map(t => t.id === currentTask.id ? updatedTask : t));
    setCurrentTask(updatedTask);
  };

  const resumeTask = () => {
    if (!currentTask || !currentTask.isPaused) return;

    const pauseDuration = Date.now() - currentTask.pausedTime;
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

      const elapsed = Math.floor((Date.now() - Number(currentTask.startTime)) / 1000);
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

  const switchToTask = (task: TimerTask) => {
    if (currentTask && currentTask.isRunning) {
      // 暂停当前任务
      pauseTask();
    }
    
    // 切换到新任务
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

  const deleteTask = (taskId: string) => {
    if (currentTask?.id === taskId) {
      setCurrentTask(null);
      setElapsedTime(0);
    }
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  return (
    <div className="space-y-6">
      {/* 当前任务显示 */}
      {currentTask && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-800 flex items-center justify-between">
              <span>正在计时: {currentTask.name}</span>
              {currentTask.category && (
                <span className="text-sm bg-blue-200 px-2 py-1 rounded-full">
                  {currentTask.category}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-mono text-blue-600 mb-4 text-center">
              {formatTime(elapsedTime)}
            </div>
            <div className="flex gap-2">
              {currentTask.isPaused ? (
                <Button 
                  onClick={resumeTask}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  继续
                </Button>
              ) : (
                <Button 
                  onClick={pauseTask}
                  variant="outline"
                  className="flex-1"
                >
                  暂停
                </Button>
              )}
              <Button 
                variant="destructive" 
                onClick={stopCurrentTask}
                className="flex-1"
              >
                完成
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 任务列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>任务列表</CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            添加任务
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="font-medium">{task.name}</div>
                  {task.category && (
                    <div className="text-sm text-gray-500">{task.category}</div>
                  )}
                  <div className="text-sm text-gray-400">
                    累计: {formatTime(task.totalTime)}
                  </div>
                </div>
                <div className="flex gap-2">
                  {task.isRunning ? (
                    <Button variant="outline" size="sm" disabled>
                      计时中
                    </Button>
                  ) : task.isPaused ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => resumeTask()}
                      className="bg-yellow-100 text-yellow-800"
                    >
                      继续
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => switchToTask(task)}
                    >
                      开始
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteTask(task.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))}
                         {tasks.length === 0 && (
               <div className="text-center text-gray-500 py-8">
                 暂无任务，点击&ldquo;添加任务&rdquo;开始计时
               </div>
             )}
          </div>
        </CardContent>
      </Card>

      {/* 今日统计 */}
      <Card>
        <CardHeader>
          <CardTitle>今日统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(dailyStats.totalTime)}
              </div>
              <div className="text-sm text-gray-500">总时间</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dailyStats.taskCount}
              </div>
              <div className="text-sm text-gray-500">任务数</div>
            </div>
          </div>
          
          {Object.keys(dailyStats.categories).length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">分类统计</h4>
              <div className="space-y-2">
                {Object.entries(dailyStats.categories).map(([category, time]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span>{category}</span>
                    <span className="font-medium">{formatTime(time)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

export default EnhancedTimer;
