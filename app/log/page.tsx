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
import { LeftSidebar } from './sections/LeftSidebar';
import { StatsSection } from './sections/StatsSection';
import { ModalsManager } from './sections/ModalsManager';
import { PrivacyLayer } from './sections/PrivacyLayer';

import { AIStatusLog, AIStatus } from './components/ui/AIStatusLog';

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
    pageState.selectedDate,
    pageState.fetchTimerTasks,
    pageState.fetchOperationRecords
  );
  const modals = useModalControls();

  // ============ AI 状态管理 ============
  const [aiStatus, setAiStatus] = React.useState<{ status: AIStatus; message: string; details?: string }>({
    status: 'idle',
    message: ''
  });
  
  // ============ 访客模式 ============
  if (status === "unauthenticated" && process.env.NODE_ENV !== 'development') {
    return (
      <div className="log-page-gradient-layout">
        <div className="w-full max-w-5xl mx-auto px-6 md:px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="text-gray-200 hover:text-white">
              ← 返回
            </Link>
            <Link
              href="/auth/signin"
              className="bg-blue-700/80 hover:bg-blue-600/80 text-white rounded-full px-4 py-2"
            >
              登录
            </Link>
          </div>

          <div className="bg-gray-900/40 border border-gray-700/60 rounded-xl p-6">
            <h1 className="text-2xl font-bold text-white mb-2">访客模式</h1>
            <p className="text-gray-300">
              登录后可使用完整笔记、计时器与数据统计功能。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            <section className="bg-gray-800 rounded-lg border-2 border-gray-600 p-6 min-h-[280px] flex flex-col">
              <h3 className="text-xl font-bold text-white mb-4 pb-3 border-b-2 border-gray-600 flex items-center gap-3">
                <span className="text-2xl">T</span>
                计时器 (演示)
              </h3>
              <div className="bg-gray-700/50 rounded-lg p-6 flex items-center justify-center flex-1">
                <p className="text-gray-300 text-lg">登录后可创建并管理计时任务</p>
              </div>
            </section>

            <section className="bg-gray-800 rounded-lg border-2 border-gray-600 p-6 min-h-[280px] flex flex-col">
              <h3 className="text-xl font-bold text-white mb-4 pb-3 border-b-2 border-gray-600 flex items-center gap-3">
                <span className="text-2xl">N</span>
                笔记 (演示)
              </h3>
              <div className="bg-gray-700/50 rounded-lg p-6 flex items-center justify-center flex-1">
                <p className="text-gray-300 text-lg">登录后可使用完整笔记功能</p>
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
  const handleAddToTimer = async (
    taskName: string, 
    category: string,
    date: string,
    initialTime?: number, 
    instanceTagNames?: string,
    parentId?: string
  ) => {
    try {
      const instanceTagNamesArray = instanceTagNames
        ? instanceTagNames.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0)
        : [];
      const finalInitialTime = typeof initialTime === 'number' && Number.isFinite(initialTime)
        ? initialTime
        : 0;

      await timerOps.handleQuickCreate({
        name: taskName,
        categoryPath: category,
        date: date,
        instanceTagNames: instanceTagNamesArray,
        initialTime: finalInitialTime,
        autoStart: false,
        parentId
      });

      modals.closeCreateLogModal();
    } catch (error) {
      console.error('? [handleAddToTimer] 处理失败:', error);
      alert(`处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // ============ 智能创建处理 ============
  const handleSmartCreate = async (input: string) => {
    // 立即关闭弹窗（已由子组件处理或在此处确保）
    modals.closeCreateLogModal();
    
    // 显示 AI 状态
    setAiStatus({ status: 'analyzing', message: `正在分析: "${input}"` });
    
    try {
      // 1. 调用 AI 解析
      const res = await fetch('/api/log/smart-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: input, 
          date: pageState.selectedDate 
        }),
      });

      if (!res.ok) throw new Error('AI Parse failed');
      
      const data = await res.json();
      
      // 更新状态：解析完成，准备创建
      setAiStatus({ 
          status: 'analyzing', 
          message: '解析成功，正在创建...', 
          details: `任务: ${data.name} | 分类: ${data.categoryPath}` 
      });
      
      const tagsString = data.instanceTags?.join(',') || '';
      
      // 2. 调用创建逻辑
      await timerOps.handleQuickCreate({
        name: data.name || input,
        categoryPath: data.categoryPath || '未分类',
        date: pageState.selectedDate || new Date().toISOString().split('T')[0],
        instanceTagNames: data.instanceTags || [],
        initialTime: data.initialTime || 0,
        autoStart: false,
        parentId: data.parentId
      });

      // 成功提示
      setAiStatus({ 
          status: 'success', 
          message: '创建成功', 
          details: data.name 
      });

    } catch (error) {
      console.error('Smart Create failed:', error);
      setAiStatus({ 
          status: 'error', 
          message: '创建失败', 
          details: error instanceof Error ? error.message : '未知错误' 
      });
    }
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
    <div className="log-page-gradient-layout">
      {/* 隐私幕布层 */}
      <PrivacyLayer />
      
      {/* AI 状态日志 */}
      <AIStatusLog 
        status={aiStatus.status} 
        message={aiStatus.message} 
        details={aiStatus.details} 
      />

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
        selectedDate={pageState.selectedDate}
        onDateChange={pageState.setSelectedDate}
        showDatePicker={!pageState.isMobile}
      />

      {/* 模态框管理器 */}
      <ModalsManager
        isCreateLogModalOpen={modals.isCreateLogModalOpen}
        onCloseCreateLogModal={modals.closeCreateLogModal}
        onLogSaved={modals.handleLogSaved}
        onAddToTimer={handleAddToTimer}
        onSmartCreate={handleSmartCreate}
        isTreasureModalOpen={modals.isTreasureModalOpen}
        treasureModalType={modals.treasureModalType}
        onCloseTreasureModal={modals.closeTreasureModal}
        onCreateTreasure={modals.handleCreateTreasure}
        showSuccessNotification={modals.showSuccessNotification}
        isDailyProgressOpen={modals.isDailyProgressOpen}
        progressTargetDate={modals.progressTargetDate}
        onCloseDailyProgress={modals.closeDailyProgress}
        onProgressConfirmed={modals.handleProgressConfirmed}
        selectedDate={pageState.selectedDate}
      />

      <div className="w-full overflow-x-hidden">
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
              <NotesSection isMobile={true} />
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 mb-0 min-h-screen relative">
              {/* 渐变过渡效果 */}
              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-gray-600/60 to-transparent -translate-x-1/2 pointer-events-none blur-[1px] z-0"></div>
              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-700/80 to-transparent -translate-x-1/2 pointer-events-none z-0"></div>
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

              {/* 左侧栏：笔记 + 待办 */}
              <LeftSidebar className="order-2 lg:order-1" />
            </div>

            {/* 统计区域 - 显示在双栏下方 */}
            <div className="w-full bg-gray-900/40 backdrop-blur-sm">
              <StatsSection
                userId={userId}
                tasks={pageState.rangeTimerTasks}
                dateRange={pageState.dateRange}
                mode="desktop"
                onDateRangeChange={pageState.setDateRange}
                onOpenDailyProgress={modals.openDailyProgress}
                onOpenTreasure={modals.openTreasureModal}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
