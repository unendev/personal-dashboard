'use client';

import React from 'react';
import useSWR from 'swr';
import CreateLogFormWithCards from '@/app/components/features/log/CreateLogFormWithCards';

export const dynamic = 'force-dynamic';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface SessionUser {
  id: string;
  email?: string;
}

export default function WidgetCreatePage() {
  const { data: sessionData, isLoading } = useSWR<{ user?: SessionUser }>(
    '/api/auth/session',
    fetcher,
    { revalidateOnFocus: false }
  );
  
  const userId = sessionData?.user?.id;
  const today = new Date().toISOString().split('T')[0];

  // 添加到计时器的回调 - 乐观关闭，后台执行
  const handleAddToTimer = async (
    taskName: string,
    categoryPath: string,
    date: string,
    initialTime?: number,
    instanceTagNames?: string
  ) => {
    if (!userId) return;

    const now = Math.floor(Date.now() / 1000);
    const finalInitialTime = initialTime || 0;
    const taskDate = date || today;
    
    // 立即关闭窗口，后台执行 API 调用
    window.close();
    
    // 后台执行（窗口关闭后继续运行）
    (async () => {
      try {
        // 1. 暂停正在运行的任务
        const tasksResponse = await fetch(`/api/timer-tasks?userId=${userId}&date=${taskDate}`, {
          credentials: 'include',
        });
        
        if (tasksResponse.ok) {
          const tasks = await tasksResponse.json();
          const runningTasks = tasks.filter((t: { isRunning: boolean }) => t.isRunning);
          
          // 并行暂停所有运行中的任务
          await Promise.all(runningTasks.map((task: { id: string; elapsedTime: number; startTime: number | null }) =>
            fetch('/api/timer-tasks', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                id: task.id,
                isRunning: false,
                startTime: null,
                elapsedTime: task.elapsedTime + (task.startTime ? now - task.startTime : 0),
              }),
            })
          ));
        }
        
        // 2. 创建新任务并自动开始计时
        await fetch('/api/timer-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: taskName,
            userId,
            categoryPath: categoryPath || '未分类',
            date: taskDate,
            initialTime: finalInitialTime,
            elapsedTime: finalInitialTime,
            instanceTagNames: instanceTagNames ? instanceTagNames.split(',').map(t => t.trim()).filter(t => t) : [],
            isRunning: true,
            startTime: now,
          }),
        });
      } catch (error) {
        console.error('Failed to create task:', error);
      }
    })();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
        <span className="text-sm text-emerald-300">加载中...</span>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 text-emerald-300">
        <span className="text-sm">请先登录</span>
      </div>
    );
  }

  return (
    <div className="h-screen text-white overflow-y-auto bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative">
      {/* 关闭按钮 */}
      <button
        onClick={() => window.close()}
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-red-500/80 flex items-center justify-center text-zinc-400 hover:text-white transition-colors z-50"
        title="关闭"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      
      <div className="p-4">
        <style>{`
          .dark { color-scheme: dark; }
          input, select, button { color: white; }
          input::placeholder { color: #6ee7b7; }
          label { color: #a7f3d0; }
          h2, p { color: #d1fae5; }
          .text-gray-900 { color: #ecfdf5 !important; }
          .text-gray-700, .text-gray-600 { color: #a7f3d0 !important; }
          .text-gray-500, .text-gray-400 { color: #6ee7b7 !important; }
          .bg-gray-50, .bg-gray-100 { background-color: rgba(16, 185, 129, 0.1) !important; }
          .bg-white { background-color: rgba(30, 41, 59, 0.8) !important; }
          .border-gray-200, .border-gray-300 { border-color: rgba(16, 185, 129, 0.3) !important; }
          input, select, textarea { 
            background-color: rgba(30, 41, 59, 0.6) !important; 
            border-color: rgba(16, 185, 129, 0.3) !important;
          }
          input:focus, select:focus, textarea:focus {
            border-color: #34d399 !important;
            box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.2) !important;
          }
        `}</style>
        <div className="dark">
          <CreateLogFormWithCards
            onAddToTimer={handleAddToTimer}
            selectedDate={today}
          />
        </div>
      </div>
    </div>
  );
}
