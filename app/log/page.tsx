'use client'

import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import CreateLogModal from '@/app/components/CreateLogModal'
import NestedTimerZone from '@/app/components/NestedTimerZone'
import TimeStatsChart from '@/app/components/TimeStatsChart'
import DateFilter from '@/app/components/DateFilter'
import CollapsibleAISummary from '@/app/components/CollapsibleAISummary'
import DateBasedTodoList from '@/app/components/DateBasedTodoList'
import { CategoryCache } from '@/app/lib/category-cache'

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

  // 操作记录折叠状态
  const [isOperationHistoryExpanded, setIsOperationHistoryExpanded] = useState(false);
  
  // 创建事物模态框状态
  const [isCreateLogModalOpen, setIsCreateLogModalOpen] = useState(false);

  // 用于点击外部区域关闭折叠栏的ref
  const operationHistoryRef = useRef<HTMLDivElement>(null);

  // 预加载分类数据
  useEffect(() => {
    const preloadCategories = async () => {
      try {
        await CategoryCache.preload();
        console.log('分类数据预加载完成');
      } catch (error) {
        console.error('预加载分类失败:', error);
      }
    };

    preloadCategories();
  }, []);

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

  // 点击外部区域关闭操作记录折叠栏
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 检查是否点击了操作记录折叠栏外部
      if (operationHistoryRef.current && !operationHistoryRef.current.contains(event.target as Node)) {
        setIsOperationHistoryExpanded(false);
      }
    };

    // 只有在折叠栏打开时才添加事件监听器
    if (isOperationHistoryExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOperationHistoryExpanded]);

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
        // 将新任务添加到列表最前面
        setTimerTasks([createdTask, ...timerTasks]);
        recordOperation('添加任务', taskName, `初始时间: ${initialTime}秒`);
        // 关闭模态框
        setIsCreateLogModalOpen(false);
        console.log('新任务已添加到列表前面:', createdTask.name);
      }
    } catch (error) {
      console.error('Failed to add task:', error);
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

      {/* 创建事物按钮 - 左侧 */}
      <div className="fixed top-4 left-20 z-40">
        <button
          onClick={() => setIsCreateLogModalOpen(true)}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-300 min-w-[140px] flex items-center gap-2 transform hover:scale-105"
        >
          <span className="text-xl">📝</span>
          <span className="text-sm font-medium">创建事物</span>
        </button>
      </div>

      {/* 操作记录折叠栏 - 右侧 */}
      <div className="fixed top-4 right-4 z-40" ref={operationHistoryRef}>
        <div 
          className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl shadow-lg p-4 cursor-pointer hover:shadow-xl transition-all duration-300 min-w-[140px] transform hover:scale-105"
          onClick={() => setIsOperationHistoryExpanded(!isOperationHistoryExpanded)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <span className="text-sm font-medium">操作记录</span>
            </div>
            <span className={`text-sm transition-transform duration-300 ${isOperationHistoryExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
        </div>
        
        {/* 折叠的操作记录内容 */}
        {isOperationHistoryExpanded && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl p-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">📋 操作记录</h3>
              <button 
                onClick={() => setIsOperationHistoryExpanded(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            </div>
            {operationHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无操作记录</p>
            ) : (
              <div className="space-y-2">
                {operationHistory.slice(0, 10).map((operation) => (
                  <div key={operation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-gray-800">{operation.action}</span>
                        <span className="text-xs text-gray-600">-</span>
                        <span className="text-xs text-blue-600 font-medium truncate">{operation.taskName}</span>
                      </div>
                      {operation.details && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{operation.details}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 ml-2">
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
        )}
      </div>

      {/* 创建事物模态框 */}
      <CreateLogModal
        isOpen={isCreateLogModalOpen}
        onClose={() => setIsCreateLogModalOpen(false)}
        onLogSaved={handleLogSaved}
        onAddToTimer={handleAddToTimer}
      />

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

        {/* 任务清单与计时器的左右布局 - 页面顶部 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 任务清单区域 */}
          <div className="todo-list-section">
            <DateBasedTodoList 
              userId={userId}
              date={selectedDate}
              compact={true}
            />
          </div>

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
        </div>

        {/* 时间统计区域 */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">📊 时间统计</h2>
            <TimeStatsChart tasks={timerTasks} />
          </div>
        </div>

        {/* 可折叠的AI总结区域 */}
        <div className="mb-8">
          <CollapsibleAISummary 
            userId={userId}
            date={selectedDate}
          />
        </div>
      </div>
    </div>
  )
}