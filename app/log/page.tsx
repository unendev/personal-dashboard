'use client'

import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useDevSession } from '../hooks/useDevSession';
import CreateLogModal from '@/app/components/CreateLogModal'
import NestedTimerZone from '@/app/components/NestedTimerZone'
import TimeStatsChart from '@/app/components/TimeStatsChart'
import DateFilter from '@/app/components/DateFilter'
import CollapsibleAISummary from '@/app/components/CollapsibleAISummary'
import DateBasedTodoList from '@/app/components/DateBasedTodoList'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { CategoryCache } from '@/app/lib/category-cache'
import { InstanceTagCache } from '@/app/lib/instance-tag-cache'
import { QuickCreateModal, CreateTreasureData } from '@/app/components/QuickCreateModal'
import { FloatingActionButton } from '@/app/components/FloatingActionButton'

export default function LogPage() {
  const { data: session, status } = useDevSession();
  const [isPageReady, setIsPageReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timerTasks, setTimerTasks] = useState<{
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
    order?: number; // 排序字段（数值越小越靠前）
    createdAt: string;
    updatedAt: string;
  }[]>([]);
  const userId = session?.user?.id || 'user-1'; // 使用真实用户ID或回退到临时ID
  
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
  
  // 操作记录引用
  const operationHistoryRef = useRef<HTMLDivElement>(null);
  
  // 创建事物模态框状态
  const [isCreateLogModalOpen, setIsCreateLogModalOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  
  // 藏宝阁创建状态
  const [isTreasureModalOpen, setIsTreasureModalOpen] = useState(false);
  const [treasureModalType, setTreasureModalType] = useState<'TEXT' | 'IMAGE' | 'MUSIC'>('TEXT');
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // 创建宝藏处理函数
  const handleCreateTreasure = async (data: CreateTreasureData) => {
    try {
      const response = await fetch('/api/treasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('创建宝藏失败');
      }

      // 显示成功通知
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);
    } catch (error) {
      console.error('Error creating treasure:', error);
      throw error;
    }
  };

  const handleTreasureTypeSelect = (type: 'TEXT' | 'IMAGE' | 'MUSIC') => {
    setTreasureModalType(type);
    setIsTreasureModalOpen(true);
  };

  // 预加载分类和事务项数据
  useEffect(() => {
    const preloadData = async () => {
      try {
        // 并行预加载分类和事务项数据
        await Promise.all([
          CategoryCache.preload(),
          InstanceTagCache.preload('user-1')
        ]);
        console.log('分类和事务项数据预加载完成');
      } catch (error) {
        console.error('预加载数据失败:', error);
      }
    };

    preloadData();
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

  const handleAddToTimer = async (taskName: string, categoryPath: string, initialTime: number = 0, instanceTagNames?: string) => {
    // 防止重复创建
    if (isCreatingTask) {
      console.log('任务正在创建中，请稍候...');
      return;
    }

    setIsCreatingTask(true);
    
    // 始终使用非负的 order，确保被排序逻辑视为"有效"，并与现有最前元素并列
    // 同序时按 createdAt 降序，新建项天然在最前，达到"立即置顶"的效果
    const newOrder = 0;

    // 创建临时任务对象用于乐观更新
    const tempTask = {
      id: `temp-${Date.now()}`, // 临时ID
      name: taskName,
      categoryPath: categoryPath,
      instanceTag: instanceTagNames || null,
      elapsedTime: initialTime,
      initialTime: initialTime,
      isRunning: true, // 临时任务也显示为运行状态，与数据库状态一致
      startTime: Math.floor(Date.now() / 1000), // 立即设置开始时间
      isPaused: false,
      pausedTime: 0,
      order: newOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 立即更新UI（乐观更新）
    setTimerTasks([tempTask, ...timerTasks]);
    recordOperation('添加任务', taskName, `初始时间: ${initialTime}秒`);
    // 关闭模态框
    setIsCreateLogModalOpen(false);
    console.log('新任务已添加到列表前面:', tempTask.name);

    // 异步处理数据库操作
    try {
      const newTask = {
        name: taskName,
        categoryPath: categoryPath,
        instanceTag: instanceTagNames || null,
        instanceTagNames: instanceTagNames ? instanceTagNames.split(',') : [],
        elapsedTime: initialTime,
        initialTime: initialTime,
        isRunning: true, // 直接设置为运行状态，避免时序问题
        startTime: Math.floor(Date.now() / 1000), // 立即设置开始时间
        isPaused: false,
        pausedTime: 0,
        order: newOrder,
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
        
        // 用真实的任务数据替换临时任务，确保状态一致
        setTimerTasks(prevTasks => {
          return prevTasks.map(task => {
            if (task.id !== tempTask.id) return task;
            return {
              ...createdTask,
              // 确保状态与数据库一致
              isRunning: createdTask.isRunning,
              isPaused: createdTask.isPaused,
              startTime: createdTask.startTime,
              elapsedTime: createdTask.elapsedTime,
              order: createdTask.order ?? task.order,
              instanceTag: createdTask.instanceTag ?? task.instanceTag
            };
          });
        });
        
        console.log('任务创建成功并自动开始:', createdTask.name);
        recordOperation('开始计时', createdTask.name, '自动开始');
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      console.error('Failed to add task:', error);
      
      // 如果数据库操作失败，回滚UI状态
      setTimerTasks(prevTasks => 
        prevTasks.filter(task => task.id !== tempTask.id)
      );
      
      // 记录失败的操作
      recordOperation('创建失败', taskName, `错误: ${error instanceof Error ? error.message : '未知错误'}`);
      
      // 显示更详细的错误信息
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`任务创建失败: ${errorMessage}\n\n请检查网络连接后重试`);
    } finally {
      // 无论成功还是失败，都要重置加载状态
      setIsCreatingTask(false);
    }
  };

  // 如果正在加载身份验证状态，显示加载状态
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-400">验证身份中...</div>
        </div>
      </div>
    );
  }

  // Mock 数据用于访客演示
  const mockTimerTasks = [
    {
      id: "mock-1",
      name: "学习 React Hooks",
      categoryPath: "学习/前端开发",
      instanceTag: "编程",
      elapsedTime: 3600, // 1小时
      initialTime: 0,
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "mock-2",
      name: "阅读技术文档",
      categoryPath: "学习/技术研究",
      instanceTag: "学习",
      elapsedTime: 1800, // 30分钟
      initialTime: 0,
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      order: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "mock-3",
      name: "项目代码审查",
      categoryPath: "工作/代码质量",
      instanceTag: "工作",
      elapsedTime: 2700, // 45分钟
      initialTime: 0,
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      order: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // const mockOperationHistory = [
  //   {
  //     id: "op-1",
  //     action: "开始计时",
  //     taskName: "学习 React Hooks",
  //     timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
  //     details: "开始学习 React Hooks 相关概念"
  //   },
  //   {
  //     id: "op-2",
  //     action: "暂停计时",
  //     taskName: "阅读技术文档",
  //     timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1小时前
  //     details: "休息一下，喝杯咖啡"
  //   },
  //   {
  //     id: "op-3",
  //     action: "添加任务",
  //     taskName: "项目代码审查",
  //     timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30分钟前
  //     details: "新增代码审查任务"
  //   }
  // ];

  // 如果未登录，显示访客演示页面（开发环境下跳过此检查）
  if (status === "unauthenticated" && process.env.NODE_ENV !== 'development') {
    return (
      <div className="log-page-layout">
        {/* 访客提示栏 */}
        <div className="fixed top-4 left-4 right-4 z-40">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            {/* 左侧：返回按钮 */}
            <Link
              href="/"
              className="w-10 h-10 bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <span className="text-gray-200 font-medium text-lg">←</span>
            </Link>

            {/* 右侧：访客提示和登录按钮 */}
            <div className="flex items-center gap-3">
              {/* 访客提示 */}
              <div className="flex items-center gap-2 bg-yellow-900/40 backdrop-blur-sm border border-yellow-700/50 rounded-full px-3 py-2 shadow-sm">
                <span className="text-sm font-medium text-yellow-300">
                  👀 访客模式
                </span>
              </div>
              
              {/* 登录按钮 */}
              <Link
                href="/auth/signin"
                className="bg-blue-700/70 hover:bg-blue-600/80 text-white rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 flex items-center gap-2"
              >
                <span className="text-sm font-medium">登录</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 页面导航 */}
        <div className="bg-gray-900/40 backdrop-blur-sm border-b border-gray-700/50 px-4 py-3">
          <div className="flex space-x-6">
            <a href="/dashboard" className="text-gray-300 hover:text-gray-100 font-medium pb-2">🏆 技能树</a>
            <a href="/tools" className="text-gray-300 hover:text-gray-100 font-medium pb-2">📋 任务清单</a>
            <a href="/log" className="text-yellow-400 font-medium border-b-2 border-yellow-400 pb-2">📝 每日日志</a>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* 访客欢迎信息 */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-xl border border-blue-700/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎯</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-100 mb-2">欢迎体验个人门户系统</h1>
                <p className="text-gray-300 mb-4">
                  这是一个演示页面，展示了时间管理、任务跟踪和数据分析功能。
                  登录后可以创建和管理您自己的数据。
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/auth/signin"
                    className="bg-blue-700/70 hover:bg-blue-600/80 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    立即登录
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 日期过滤器 */}
          <div className="mb-8">
            <DateFilter 
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* 计时器 - 在手机端显示在前面 */}
            <Card className="hover:shadow-lg transition-shadow duration-200 order-1 lg:order-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">⏱️</span>
                  计时器 (演示数据)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NestedTimerZone
                  tasks={mockTimerTasks}
                  onTasksChange={() => {}} // 访客模式下不允许修改
                  onOperationRecord={() => {}} // 访客模式下不允许记录操作
                />
              </CardContent>
            </Card>

            {/* 任务清单 - 在手机端显示在后面 */}
            <div className="order-2 lg:order-1">
              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">📋</span>
                    任务清单 (演示数据)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockTimerTasks.map((task) => (
                      <div key={task.id} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-200">{task.name}</h4>
                          <p className="text-sm text-gray-400">{task.categoryPath}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-blue-400">
                            {Math.floor(task.elapsedTime / 3600)}h {Math.floor((task.elapsedTime % 3600) / 60)}m
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 时间统计 */}
          <div className="mb-8">
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  时间统计 (演示数据)
                </CardTitle>
              </CardHeader>
              <CardContent>
              <TimeStatsChart tasks={mockTimerTasks} userId={userId} />
              </CardContent>
            </Card>
          </div>

          {/* AI总结 */}
          <div className="mb-8">
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  AI总结 (演示数据)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-lg border border-purple-700/50 backdrop-blur-sm">
                  <h3 className="font-semibold text-gray-200 mb-2">今日学习总结</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    今天主要专注于前端开发学习，包括 React Hooks 的深入理解和实践。
                    总共投入了 2.25 小时的学习时间，其中 React Hooks 学习占用了 1 小时，
                    技术文档阅读 30 分钟，代码审查 45 分钟。学习效率较高，
                    建议继续保持这种学习节奏。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
            className="w-10 h-10 bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
          >
            <span className="text-gray-200 font-medium text-lg">←</span>
          </Link>

          {/* 右侧：操作按钮组 */}
          <div className="flex items-center gap-3">
            {/* 用户信息 */}
            <div className="flex items-center gap-2 bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-full px-3 py-2 shadow-sm">
              <span className="text-sm font-medium text-gray-200">
                {session?.user?.name || session?.user?.email || '用户'}
              </span>
              <button
                onClick={() => signOut()}
                className="text-gray-400 hover:text-gray-200 text-sm"
                title="登出"
              >
                登出
              </button>
            </div>

            {/* 创建事物按钮 */}
            <button
              onClick={() => setIsCreateLogModalOpen(true)}
              className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 flex items-center gap-2"
            >
              <span className="text-lg">✏️</span>
              <span className="text-sm font-medium text-gray-200">记录</span>
            </button>

            {/* 藏宝阁按钮 */}
            <button
              onClick={() => handleTreasureTypeSelect('TEXT')}
              className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 flex items-center gap-2"
            >
              <span className="text-lg">💎</span>
              <span className="text-sm font-medium text-gray-200">藏宝阁</span>
            </button>

            {/* 操作记录按钮 */}
            <div className="relative" ref={operationHistoryRef}>
              <button
                onClick={() => setIsOperationHistoryExpanded(!isOperationHistoryExpanded)}
                className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 flex items-center gap-2"
              >
                <span className="text-lg">📊</span>
                <span className="text-sm font-medium text-gray-200">记录</span>
                <span className={`text-xs transition-transform duration-200 ${isOperationHistoryExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {/* 操作记录下拉面板 */}
              {isOperationHistoryExpanded && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg p-4 max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-200">操作记录</h3>
                    <button 
                      onClick={() => setIsOperationHistoryExpanded(false)}
                      className="text-gray-400 hover:text-gray-200 text-lg hover:bg-gray-800 rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                  {operationHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-3xl mb-2 block">📝</span>
                      <p className="text-gray-400 text-sm">暂无操作记录</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {operationHistory.slice(0, 8).map((operation) => (
                        <div key={operation.id} className="p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors border border-gray-700/50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-blue-300 bg-blue-900/40 px-2 py-1 rounded-full">
                                  {operation.action}
                                </span>
                                <span className="text-xs text-gray-300 truncate">{operation.taskName}</span>
                              </div>
                              {operation.details && (
                                <p className="text-xs text-gray-400 truncate">{operation.details}</p>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 ml-2 flex-shrink-0">
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

      {/* 悬浮按钮 - 快速访问藏宝阁 */}
      <Link
        href="/treasure-pavilion"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
        title="藏宝阁"
      >
        <span className="text-2xl">💎</span>
      </Link>

      {/* 页面导航 */}
      <div className="bg-gray-900/40 backdrop-blur-sm border-b border-gray-700/50 px-4 py-3">
        <div className="flex space-x-6">
          <a href="/dashboard" className="text-gray-300 hover:text-gray-100 font-medium pb-2">🏆 技能树</a>
          <a href="/tools" className="text-gray-300 hover:text-gray-100 font-medium pb-2">📋 任务清单</a>
          <a href="/log" className="text-yellow-400 font-medium border-b-2 border-yellow-400 pb-2">📝 每日日志</a>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-8">每日日志</h1>
        
        {/* 日期过滤器 */}
        <div className="mb-8">
          <DateFilter 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 计时器 - 在手机端显示在前面 */}
          <Card className="hover:shadow-lg transition-shadow duration-200 order-1 lg:order-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">⏱️</span>
                计时器
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NestedTimerZone
                tasks={timerTasks}
                onTasksChange={setTimerTasks}
                onOperationRecord={recordOperation}
              />
            </CardContent>
          </Card>

          {/* 任务清单 - 在手机端显示在后面 */}
          <div className="order-2 lg:order-1">
            <DateBasedTodoList 
              userId={userId}
            />
          </div>
        </div>

        {/* 时间统计 */}
        <div className="mb-8">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                时间统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimeStatsChart tasks={timerTasks} userId={userId} />
            </CardContent>
          </Card>
        </div>

        {/* AI总结 */}
        <div className="mb-8">
          <CollapsibleAISummary 
            userId={userId}
            date={selectedDate}
          />
        </div>
      </div>

      {/* 藏宝阁创建模态框 */}
      <QuickCreateModal
        isOpen={isTreasureModalOpen}
        onClose={() => setIsTreasureModalOpen(false)}
        type={treasureModalType}
        onSubmit={handleCreateTreasure}
      />

      {/* 成功通知 */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right duration-300">
          <span className="text-lg">✅</span>
          <div>
            <div className="font-medium">创建成功！</div>
            <div className="text-sm opacity-90">宝藏已保存到藏宝阁</div>
          </div>
          <Link
            href="/treasure-pavilion"
            className="ml-2 px-3 py-1 bg-white/20 rounded text-sm hover:bg-white/30 transition-colors"
          >
            查看
          </Link>
          <button
            onClick={() => setShowSuccessNotification(false)}
            className="ml-2 text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}