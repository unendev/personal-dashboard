'use client'

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import NestedTimerZone from '@/app/components/features/timer/NestedTimerZone';
import TimeStatsChart from '@/app/components/shared/TimeStatsChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { ThreeLayerCategorySelector } from '@/app/components/shared/ThreeLayerCategorySelector';
import { EnhancedInstanceTagInput } from '@/app/components/shared/EnhancedInstanceTagInput';

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
  createdAt: string;
  updatedAt: string;
}

export default function TimerPage() {
  const [isPageReady, setIsPageReady] = useState(false);
  const [tasks, setTasks] = useState<TimerTask[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [newTaskTags, setNewTaskTags] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [operationLog, setOperationLog] = useState<string[]>([]);

  // 确保页面完全加载后再显示内容
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch(`/api/timer-tasks?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        
        // 调试：显示任务的创建时间顺序
        console.log('加载的任务数据:', data.map((task: TimerTask) => ({
          name: task.name,
          createdAt: task.createdAt,
          id: task.id
        })));
        
        // 数据库已经按 createdAt 降序返回，无需再次排序
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, [selectedDate]);

  // 加载任务数据
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = async () => {
    if (!newTaskName.trim()) {
      alert('请输入任务名称');
      return;
    }

    // 创建临时任务对象用于乐观更新
    const tempTask: TimerTask = {
      id: `temp-${Date.now()}`, // 临时ID
      name: newTaskName.trim(),
      categoryPath: newTaskCategory.trim() || '未分类',
      elapsedTime: 0,
      initialTime: 0,
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      parentId: null,
      children: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 立即更新UI（乐观更新）
    setTasks(prevTasks => [tempTask, ...prevTasks]);
    
    // 重置表单
    setNewTaskName('');
    setNewTaskCategory('');
    setNewTaskTags([]);
    setShowAddDialog(false);
    recordOperation('创建任务', newTaskName.trim());
    
    console.log('新任务已添加到列表前面:', tempTask.name);

    // 异步处理数据库操作
    try {
      const response = await fetch('/api/timer-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTaskName.trim(),
          categoryPath: newTaskCategory.trim() || '未分类',
          instanceTagNames: newTaskTags,
          date: selectedDate
        }),
      });

      if (response.ok) {
        const newTask = await response.json();
        
        // 用真实的任务数据替换临时任务
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === tempTask.id ? newTask : task
          )
        );
        
        console.log('任务创建成功:', newTask.name);
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      console.error('Failed to add task:', error);
      
      // 如果数据库操作失败，回滚UI状态
      setTasks(prevTasks => 
        prevTasks.filter(task => task.id !== tempTask.id)
      );
      
      alert('创建失败，请重试');
    }
  };

  const recordOperation = (action: string, taskName: string, details?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${action}: ${taskName}${details ? ` ${details}` : ''}`;
    setOperationLog(prev => [logEntry, ...prev.slice(0, 9)]); // 保留最近10条记录
  };

  // 如果页面还没准备好，显示加载状态
  if (!isPageReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-400">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="timer-page-layout">
      {/* 返回主页按钮 */}
      <div className="fixed top-4 left-4 z-40">
        <Link
          href="/"
          className="w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center border border-gray-700 transition-all duration-200"
        >
          <span className="text-white font-bold text-xl">←</span>
        </Link>
      </div>

      {/* 页面导航 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex space-x-6">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-800 font-medium pb-2">🏆 技能树</Link>
          <Link href="/log" className="text-gray-600 hover:text-gray-800 font-medium pb-2">📝 每日日志</Link>
          <Link href="/timer" className="text-yellow-600 font-medium border-b-2 border-yellow-600 pb-2">⏱️ 计时器</Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">嵌套计时器</h1>
          <p className="text-gray-600">管理你的时间，支持无限嵌套的任务结构</p>
        </div>

        {/* 日期选择器 */}
        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">选择日期:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                  ⏱️ 快速任务
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：任务列表 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>任务列表</span>
                  <span className="text-sm text-gray-500">
                    {tasks.length} 个顶级任务
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NestedTimerZone
                  tasks={tasks}
                  onTasksChange={setTasks}
                  onOperationRecord={recordOperation}
                />
              </CardContent>
            </Card>
          </div>

          {/* 右侧：统计和日志 */}
          <div className="space-y-6">
            {/* 统计图表 */}
            <Card>
              <CardHeader>
                <CardTitle>时间统计</CardTitle>
              </CardHeader>
              <CardContent>
                <TimeStatsChart tasks={tasks} />
              </CardContent>
            </Card>

            {/* 操作日志 */}
            <Card>
              <CardHeader>
                <CardTitle>操作日志</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {operationLog.length === 0 ? (
                    <p className="text-gray-500 text-sm">暂无操作记录</p>
                  ) : (
                    operationLog.map((log, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 添加任务弹框（记录） */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-4xl bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle>📝 记录任务</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-5">
            {/* 三层分类选择器 */}
            <ThreeLayerCategorySelector
              value={newTaskCategory}
              onChange={setNewTaskCategory}
            />
            
            {/* 任务名称 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                任务名称
              </label>
              <Input
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="输入任务名称..."
                className="text-base"
                autoFocus
              />
            </div>

            {/* 事务项选择器 */}
            <EnhancedInstanceTagInput
              tags={newTaskTags}
              onChange={setNewTaskTags}
              userId="user-1"
              placeholder="输入事务项（回车创建）..."
              maxTags={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={addTask} disabled={!newTaskName.trim()}>
              添加任务
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
