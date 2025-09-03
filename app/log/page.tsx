'use client'

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import CreateLogFormWithCards from '@/app/components/CreateLogFormWithCards'
import NestedTimerZone from '@/app/components/NestedTimerZone'
import TimeStatsChart from '@/app/components/TimeStatsChart'
import DateFilter from '@/app/components/DateFilter'



export default function LogPage() {
  const [isPageReady, setIsPageReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timerTasks, setTimerTasks] = useState<{
    id: string;
    name: string;
    categoryPath: string;
    elapsedTime: number;
    initialTime: number; // 初始时间（秒）
    isRunning: boolean;
    startTime: number | null;
    isPaused: boolean;
    pausedTime: number;
  }[]>([]);
  const [userId] = useState('user-1'); // 临时用户ID
  
  // 操作历史记录
  const [operationHistory, setOperationHistory] = useState<{
    id: string;
    action: string;
    taskName: string;
    timestamp: Date;
    details?: string;
  }[]>([]);



  // 从数据库加载任务
  const fetchTimerTasks = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/timer-tasks?userId=${userId}&date=${selectedDate}`);
      if (response.ok) {
        const tasks = await response.json();
        setTimerTasks(tasks);
      }
    } catch (error) {
      console.error('Failed to fetch timer tasks:', error);
    }
  }, [userId, selectedDate]);

  // 确保页面完全加载后再显示内容
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageReady(true);
      fetchTimerTasks(); // 加载任务数据
      fetchOperationRecords(); // 加载操作记录
    }, 100); // 短暂延迟确保样式加载完成

    return () => clearTimeout(timer);
  }, [fetchTimerTasks]);

  const handleLogSaved = () => {
    // 重新获取日志数据
    // fetchLogs();
  };

  // 获取操作记录
  const fetchOperationRecords = async () => {
    try {
      const response = await fetch('/api/operation-records');
      if (response.ok) {
        const records = await response.json();
        setOperationHistory(records);
      }
    } catch (error) {
      console.error('获取操作记录失败:', error);
    }
  };

  // 记录操作历史
  const recordOperation = async (action: string, taskName: string, details?: string) => {
    try {
      // 保存到数据库
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
        // 重新获取操作记录
        fetchOperationRecords();
      }
    } catch (error) {
      console.error('保存操作记录失败:', error);
    }
  };

  const handleAddToTimer = async (taskName: string, categoryPath: string, initialTime: number = 0) => {
    try {
      const newTask = {
        name: taskName,
        categoryPath: categoryPath,
        elapsedTime: initialTime,
        initialTime: initialTime,
        isRunning: false,
        startTime: null,
        isPaused: false,
        pausedTime: 0,
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
        setTimerTasks([...timerTasks, createdTask]);
        recordOperation('添加任务', taskName, `初始时间: ${initialTime}秒`);
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  // 格式化时间显示
  // const formatTime = (seconds: number) => {
  //   const hours = Math.floor(seconds / 3600);
  //   const minutes = Math.floor((seconds % 3600) / 60);
    
  //   if (hours > 0) {
  //     return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`;
  //   } else {
  //     return `${minutes}m`;
  //   }
  // };

  // const handleTimerTaskComplete = (taskId: string, duration: string) => {
  //   // 计时器区域不再保存日志，只是记录事物
  //   const task = timerTasks.find(t => t.id === taskId);
  //   if (task) {
  //     console.log('记录事物:', task.name, duration);
  //   }
  // };

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
    <div className="log-page-layout">
      {/* 返回主页按钮 */}
      <div className="fixed top-4 left-4 z-40">
        <Link
          href="/"
          className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <span className="text-white font-bold text-xl">←</span>
        </Link>
      </div>

      {/* 页面导航 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex space-x-6">
          <a href="/dashboard" className="text-gray-600 hover:text-gray-800 font-medium pb-2">🏆 技能树</a>
          <a href="/tools" className="text-gray-600 hover:text-gray-800 font-medium pb-2">📋 任务清单</a>
          <a href="/log" className="text-yellow-600 font-medium border-b-2 border-yellow-600 pb-2">📝 每日日志</a>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">每日日志</h1>
          <p className="text-gray-600">记录你的日常事物和时间管理</p>
        </div>

        {/* 日期过滤器 */}
        <DateFilter 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        <div className="log-content-grid">
          {/* 计时器区域 */}
          <div className="timer-section">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">⏱️ 计时器区域</h2>
                            <NestedTimerZone
                tasks={timerTasks}
                onTasksChange={setTimerTasks}
                onOperationRecord={recordOperation}
              />
            </div>
          </div>

          {/* 图表统计区域 */}
          <div className="stats-chart-section">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">📊 时间统计</h2>
              <TimeStatsChart tasks={timerTasks} />
            </div>
          </div>

          {/* 日志输入区域 */}
          <div className="log-input-section">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">记录事物</h2>
              <CreateLogFormWithCards 
                onLogSaved={handleLogSaved}
                onAddToTimer={handleAddToTimer}
              />
            </div>
          </div>

          {/* 操作历史区域 */}
          <div className="operation-history-section">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">📋 操作记录</h2>
              {operationHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无操作记录</p>
              ) : (
                <div className="space-y-3">
                  {operationHistory.map((operation) => (
                    <div key={operation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{operation.action}</span>
                          <span className="text-sm text-gray-600">-</span>
                          <span className="text-sm text-blue-600 font-medium">{operation.taskName}</span>
                        </div>
                        {operation.details && (
                          <p className="text-xs text-gray-500 mt-1">{operation.details}</p>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(operation.timestamp).toLocaleString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


        </div>
      </div>
    </div>
  )
}