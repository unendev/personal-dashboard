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

  // 添加到计时器 - 通过 localStorage 传递数据给 timer 窗口执行
  const handleAddToTimer = async (
    taskName: string,
    categoryPath: string,
    date: string,
    initialTime?: number,
    instanceTagNames?: string
  ) => {
    if (!userId) return;
    
    // 将任务数据存入 localStorage，让 timer 窗口执行创建
    const taskData = {
      name: taskName,
      userId,
      categoryPath: categoryPath || '未分类',
      date: date || today,
      initialTime: initialTime || 0,
      instanceTagNames: instanceTagNames || '',
      timestamp: Date.now(),
    };
    
    localStorage.setItem('widget-pending-task', JSON.stringify(taskData));
    
    // 立即关闭窗口
    window.close();
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
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-red-500/80 flex items-center justify-center text-zinc-400 hover:text-white transition-colors z-40"
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
