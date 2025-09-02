'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';
import CreateLogFormWithCards from '@/app/components/CreateLogFormWithCards'
import LogCard from '@/app/components/LogCard'
import TimerZone from '@/app/components/TimerZone'

// 定义与API返回数据匹配的Log类型
interface LogActivityInstance {
  id: string;
  name: string;
  duration: string;
}

interface LogSubCategoryInstance {
  id: string;
  name: string;
  activities: LogActivityInstance[];
}

interface LogCategoryInstance {
  id: string;
  name: string;
  subCategories: LogSubCategoryInstance[];
}

interface Log {
  id: string;
  content: string | null;
  createdAt: Date;
  timestamp: Date;
  quest?: {
    id: string;
    title: string;
  } | null;
  categories: LogCategoryInstance[];
}

export default function LogPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageReady, setIsPageReady] = useState(false);
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
  
  // 操作历史记录
  const [operationHistory, setOperationHistory] = useState<{
    id: string;
    action: string;
    taskName: string;
    timestamp: Date;
    details?: string;
  }[]>([]);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // 处理API返回的数据结构
      let logsData = data;
      if (data && typeof data === 'object' && 'value' in data) {
        // 如果返回的是 {value: [...], Count: n} 格式
        logsData = data.value;
      }
      
      // 确保logsData是数组
      if (Array.isArray(logsData)) {
        setLogs(logsData);
      } else {
        console.error('API返回的数据不是数组:', logsData);
        setLogs([]);
      }
    } catch (error) {
      console.error('获取日志失败:', error);
      setLogs([]); // 出错时设置为空数组
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // 确保页面完全加载后再显示内容
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageReady(true);
    }, 100); // 短暂延迟确保样式加载完成

    return () => clearTimeout(timer);
  }, []);

  const handleLogSaved = () => {
    // 重新获取日志数据
    fetchLogs();
  };

  // 记录操作历史
  const recordOperation = (action: string, taskName: string, details?: string) => {
    const newOperation = {
      id: Date.now().toString(),
      action,
      taskName,
      timestamp: new Date(),
      details
    };
    setOperationHistory(prev => [newOperation, ...prev.slice(0, 9)]); // 只保留最近10条记录
  };

  const handleAddToTimer = (taskName: string, categoryPath: string, initialTime: number = 0) => {
    const newTask = {
      id: Date.now().toString(),
      name: taskName,
      categoryPath: categoryPath,
      elapsedTime: initialTime, // 使用初始时间
      initialTime: initialTime, // 保存初始时间
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0
    };
    setTimerTasks([...timerTasks, newTask]);
    
    // 记录操作历史
    const timeText = initialTime > 0 ? ` (初始时间: ${formatTime(initialTime)})` : '';
    recordOperation('添加事物', taskName, `${categoryPath}${timeText}`);
  };

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`;
    } else {
      return `${minutes}m`;
    }
  };

  const handleTimerTaskComplete = (taskId: string, duration: string) => {
    // 计时器区域不再保存日志，只是记录事物
    const task = timerTasks.find(t => t.id === taskId);
    if (task) {
      console.log('记录事物:', task.name, duration);
    }
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
          <a href="/quests" className="text-gray-600 hover:text-gray-800 font-medium pb-2">📋 任务清单</a>
          <a href="/log" className="text-yellow-600 font-medium border-b-2 border-yellow-600 pb-2">📝 每日日志</a>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">每日日志</h1>
          <p className="text-gray-600">记录你的日常事物和时间管理</p>
        </div>

        <div className="log-content-grid">
          {/* 计时器区域 */}
          <div className="timer-section">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">⏱️ 计时器区域</h2>
              <TimerZone 
                tasks={timerTasks}
                onTasksChange={setTimerTasks}
                onTaskComplete={handleTimerTaskComplete}
                onOperationRecord={recordOperation}
              />
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
              <h2 className="text-lg font-semibold mb-4">操作记录</h2>
              {operationHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无操作记录</p>
              ) : (
                <div className="space-y-3">
                  {operationHistory.map((operation) => (
                    <div key={operation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{operation.action}</span>
                          <span className="text-sm text-gray-600">-</span>
                          <span className="text-sm text-blue-600">{operation.taskName}</span>
                        </div>
                        {operation.details && (
                          <p className="text-xs text-gray-500 mt-1">{operation.details}</p>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {operation.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 日志列表区域 */}
          <div className="log-list-section">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">日志历史</h2>
              {isLoading ? (
                <p className="text-gray-500 text-sm">加载中...</p>
              ) : logs.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无日志记录</p>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <LogCard key={log.id} log={log} />
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