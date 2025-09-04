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
    createdAt: string;
    updatedAt: string;
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
      {/* 顶部操作栏 */}
      <div className="fixed top-4 left-4 right-4 z-40">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* 左侧：返回按钮 */}
          <Link
            href="/"
            className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
          >
            <span className="text-gray-600 font-medium text-lg">←</span>
          </Link>

          {/* 右侧：操作按钮组 */}
          <div className="flex items-center gap-3">
            {/* 创建事物按钮 */}
            <button
              onClick={() => setIsCreateLogModalOpen(true)}
              className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 flex items-center gap-2"
            >
              <span className="text-lg">✏️</span>
              <span className="text-sm font-medium text-gray-700">记录</span>
            </button>

            {/* 操作记录按钮 */}
            <div className="relative" ref={operationHistoryRef}>
              <button
                onClick={() => setIsOperationHistoryExpanded(!isOperationHistoryExpanded)}
                className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 flex items-center gap-2"
              >
                <span className="text-lg">📊</span>
                <span className="text-sm font-medium text-gray-700">记录</span>
                <span className={`text-xs transition-transform duration-200 ${isOperationHistoryExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {/* 操作记录下拉面板 */}
              {isOperationHistoryExpanded && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-4 max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">操作记录</h3>
                    <button 
                      onClick={() => setIsOperationHistoryExpanded(false)}
                      className="text-gray-400 hover:text-gray-600 text-lg hover:bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                  {operationHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-3xl mb-2 block">📝</span>
                      <p className="text-gray-500 text-sm">暂无操作记录</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {operationHistory.slice(0, 8).map((operation) => (
                        <div key={operation.id} className="p-3 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors border border-gray-100">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-700 bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  {operation.action}
                                </span>
                                <span className="text-xs text-gray-600 truncate">{operation.taskName}</span>
                              </div>
                              {operation.details && (
                                <p className="text-xs text-gray-500 truncate">{operation.details}</p>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 ml-2 flex-shrink-0">
                              {new Date(operation.timestamp).toLocaleString('zh-CN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
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