'use client'

import Link from 'next/link';
import React from 'react';
import { useDevSession } from '../hooks/useDevSession';
import NestedTimerZone from '@/app/components/features/timer/NestedTimerZone';

// 新的 Hooks
import { useLogPageState } from './hooks/useLogPageState';
import { useTimerOperations } from './hooks/useTimerOperations';
import { useModalControls } from './hooks/useModalControls';

// 新的组件
import { LogPageHeader } from './sections/LogPageHeader';
import { MobileTabNav } from './sections/MobileTabNav';
import { TimerSection } from './sections/TimerSection';
import { NotesSection } from './sections/NotesSection';
import { StatsSection } from './sections/StatsSection';
import { ModalsManager } from './sections/ModalsManager';

export default function LogPage() {
  // ============ 认证 ============
  const { data: session, status } = useDevSession();
  const userId = session?.user?.id || 'user-1';
  
  // ============ 自定义 Hooks ============
  const pageState = useLogPageState(userId);
  const timerOps = useTimerOperations(
    pageState.timerTasks,
    pageState.setTimerTasks,
    userId,
    pageState.fetchTimerTasks,
    pageState.fetchOperationRecords
  );
  const modals = useModalControls();
  
  // ============ 访客模式 ============
  if (status === "unauthenticated" && process.env.NODE_ENV !== 'development') {
    const mockTimerTasks = [
      {
        id: "mock-1",
        name: "学习 React Hooks",
        categoryPath: "学习/前端开发",
        instanceTag: "学习",
        elapsedTime: 3600,
        initialTime: 0,
        isRunning: true,
        startTime: Date.now(),
        isPaused: false,
        pausedTime: 0,
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "mock-2",
        name: "阅读技术文档",
        categoryPath: "学习/后端开发",
        instanceTag: "学习",
        elapsedTime: 1800,
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
        elapsedTime: 2700,
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

    return (
      <div className="log-page-layout">
        {/* 访客提示栏 */}
        <div className="fixed top-4 left-4 right-4 z-40">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <Link
              href="/"
              className="w-10 h-10 bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <span className="text-gray-200 font-medium text-lg">←</span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-yellow-900/40 backdrop-blur-sm border border-yellow-700/50 rounded-full px-3 py-2 shadow-sm">
                <span className="text-sm font-medium text-yellow-300">
                  👀 访客模式
                </span>
              </div>
              
              <Link
                href="/auth/signin"
                className="bg-blue-700/70 hover:bg-blue-600/80 text-white rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 flex items-center gap-2"
              >
                <span className="text-sm font-medium">登录</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/40 backdrop-blur-sm border-b border-gray-700/50 px-4 py-3">
          <div className="flex space-x-6">
            <Link href="/dashboard" className="text-gray-300 hover:text-gray-100 font-medium pb-2">🏆 技能树</Link>
            <Link href="/log" className="text-yellow-400 font-medium border-b-2 border-yellow-400 pb-2">📝 每日日志</Link>
          </div>
        </div>

        <div className="w-full px-6 md:px-8 py-6">
          <div className="mb-6 p-6 bg-blue-900/20 rounded-xl border-2 border-blue-600">
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
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    立即登录
                  </Link>
                  <Link
                    href="/"
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    返回首页
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="bg-gray-800 rounded-lg border-2 border-gray-600 p-6 min-h-[650px] flex flex-col order-1 lg:order-2">
              <h3 className="text-xl font-bold text-white mb-4 pb-3 border-b-2 border-gray-600 flex items-center gap-3">
                <span className="text-2xl">⏱️</span>
                计时器 (演示数据)
              </h3>
              <NestedTimerZone
                tasks={mockTimerTasks}
                onTasksChange={() => {}}
                onOperationRecord={() => {}}
                onRequestAutoStart={() => {}}
              />
            </section>

            <section className="bg-gray-800 rounded-lg border-2 border-gray-600 p-6 min-h-[650px] flex flex-col order-2 lg:order-1">
              <h3 className="text-xl font-bold text-white mb-4 pb-3 border-b-2 border-gray-600 flex items-center gap-3">
                <span className="text-2xl">📝</span>
                笔记 (演示)
              </h3>
              <div className="bg-gray-700/50 rounded-lg p-8 flex items-center justify-center flex-1">
                <div className="text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-gray-300 text-lg">登录后可使用完整笔记功能</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ============ 操作记录处理 ============
  const handleToggleOperationHistory = () => {
    if (!pageState.isOperationHistoryExpanded && !pageState.hasFetchedHistory) {
      pageState.fetchOperationRecords();
    }
    pageState.setIsOperationHistoryExpanded(!pageState.isOperationHistoryExpanded);
  };

  // ============ 任务创建处理 ============
  const handleAddToTimer = async (taskName: string, category: string) => {
    // 创建任务并添加到计时器
    await timerOps.handleQuickCreate({
      name: taskName,
      categoryPath: category,
      instanceTagNames: [],
      initialTime: 0,
    });
  };

  // ============ 页面加载状态 ============
  if (!pageState.isPageReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  // ============ 主内容渲染 ============
  return (
    <div className="log-page-layout">
      {/* 页面头部 */}
      <LogPageHeader
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        onWeeklyReview={modals.handleOpenWeeklyReview}
        onCreateLog={modals.openCreateLogModal}
        operationHistory={pageState.operationHistory}
        isOperationHistoryExpanded={pageState.isOperationHistoryExpanded}
        onToggleOperationHistory={handleToggleOperationHistory}
        operationHistoryRef={pageState.operationHistoryRef}
      />

      {/* 模态框管理器 */}
      <ModalsManager
        isCreateLogModalOpen={modals.isCreateLogModalOpen}
        onCloseCreateLogModal={modals.closeCreateLogModal}
        onLogSaved={modals.handleLogSaved}
        onAddToTimer={handleAddToTimer}
        isTreasureModalOpen={modals.isTreasureModalOpen}
        treasureModalType={modals.treasureModalType}
        onCloseTreasureModal={modals.closeTreasureModal}
        onCreateTreasure={modals.handleCreateTreasure}
        showSuccessNotification={modals.showSuccessNotification}
        isDailyProgressOpen={modals.isDailyProgressOpen}
        progressTargetDate={modals.progressTargetDate}
        onCloseDailyProgress={modals.closeDailyProgress}
        onProgressConfirmed={modals.handleProgressConfirmed}
      />

      <div className="w-full px-6 md:px-8 py-6 pt-20 overflow-x-hidden">
        {/* 移动端标签导航 */}
        {pageState.isMobile && (
          <MobileTabNav
            activeSection={pageState.activeSection}
            onChange={pageState.setActiveSection}
          />
        )}

        {/* 移动端：根据标签显示内容 */}
        {pageState.isMobile ? (
          <>
            {pageState.activeSection === 'timer' && (
              <TimerSection
                tasks={pageState.timerTasks}
                userId={userId}
                selectedDate={pageState.selectedDate}
                isMobile={true}
                onTasksChange={pageState.setTimerTasks}
                onDateChange={pageState.setSelectedDate}
                onQuickCreate={timerOps.handleQuickCreate}
                onVersionConflict={timerOps.handleVersionConflict}
                onTasksPaused={timerOps.handleTasksPaused}
                onOperationRecord={timerOps.recordOperation}
                onRequestAutoStart={timerOps.handleRequestAutoStart}
                timerControl={timerOps.timerControl}
                scrollContainerRef={timerOps.scrollContainerRef}
                onSaveScrollPosition={timerOps.saveScrollPosition}
                onSaveScrollPositionNow={timerOps.saveScrollPositionNow}
              />
            )}

            {pageState.activeSection === 'notes' && (
              <NotesSection />
            )}

            {pageState.activeSection === 'stats' && (
              <StatsSection
                userId={userId}
                tasks={pageState.rangeTimerTasks}
                dateRange={pageState.dateRange}
                mode="mobile-stats"
                onDateRangeChange={pageState.setDateRange}
                onOpenDailyProgress={modals.openDailyProgress}
                onOpenTreasure={modals.openTreasureModal}
              />
            )}

            {pageState.activeSection === 'ai' && (
              <StatsSection
                userId={userId}
                tasks={pageState.rangeTimerTasks}
                dateRange={pageState.dateRange}
                mode="mobile-ai"
                onDateRangeChange={pageState.setDateRange}
                onOpenDailyProgress={modals.openDailyProgress}
                onOpenTreasure={modals.openTreasureModal}
              />
            )}
          </>
        ) : (
          /* 桌面端：双栏布局 + 统计区域 */
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* 计时器 */}
              <TimerSection
                tasks={pageState.timerTasks}
                userId={userId}
                selectedDate={pageState.selectedDate}
                isMobile={false}
                className="order-1 lg:order-2"
                onTasksChange={pageState.setTimerTasks}
                onDateChange={pageState.setSelectedDate}
                onQuickCreate={timerOps.handleQuickCreate}
                onVersionConflict={timerOps.handleVersionConflict}
                onTasksPaused={timerOps.handleTasksPaused}
                onOperationRecord={timerOps.recordOperation}
                onRequestAutoStart={timerOps.handleRequestAutoStart}
                timerControl={timerOps.timerControl}
                scrollContainerRef={timerOps.scrollContainerRef}
                onSaveScrollPosition={timerOps.saveScrollPosition}
                onSaveScrollPositionNow={timerOps.saveScrollPositionNow}
              />

              {/* 笔记 */}
              <NotesSection className="order-2 lg:order-1" />
            </div>

            {/* 统计区域 */}
            <StatsSection
              userId={userId}
              tasks={pageState.rangeTimerTasks}
              dateRange={pageState.dateRange}
              mode="desktop"
              onDateRangeChange={pageState.setDateRange}
              onOpenDailyProgress={modals.openDailyProgress}
              onOpenTreasure={modals.openTreasureModal}
            />
          </>
        )}
      </div>
    </div>
  );
}
