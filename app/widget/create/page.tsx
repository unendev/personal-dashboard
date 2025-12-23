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

  // 添加到计时器的回调
  const handleAddToTimer = async (
    taskName: string,
    categoryPath: string,
    date: string,
    initialTime?: number,
    instanceTagNames?: string
  ) => {
    if (!userId) return;

    try {
      const response = await fetch('/api/timer-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: taskName,
          userId,
          categoryPath: categoryPath || '未分类',
          date: date || today,
          initialTime: initialTime || 0,
          elapsedTime: initialTime || 0,
          instanceTagNames: instanceTagNames ? instanceTagNames.split(',') : [],
          autoStart: true,
        }),
      });

      if (response.ok) {
        window.close();
      } else {
        const error = await response.json();
        throw new Error(error.message || '创建失败');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <span className="text-sm text-zinc-400">加载中...</span>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-400">
        <span className="text-sm">请先登录</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 text-white overflow-y-auto p-4">
      <style>{`
        .dark { color-scheme: dark; }
        input, select, button { color: white; }
        input::placeholder { color: #71717a; }
        label { color: #a1a1aa; }
        h2, p { color: #e4e4e7; }
        .text-gray-900 { color: #e4e4e7 !important; }
        .text-gray-700, .text-gray-600 { color: #a1a1aa !important; }
        .text-gray-500, .text-gray-400 { color: #71717a !important; }
        .bg-gray-50, .bg-gray-100 { background-color: #27272a !important; }
        .bg-white { background-color: #18181b !important; }
        .border-gray-200, .border-gray-300 { border-color: #3f3f46 !important; }
      `}</style>
      <div className="dark">
        <CreateLogFormWithCards
          onAddToTimer={handleAddToTimer}
          selectedDate={today}
        />
      </div>
    </div>
  );
}
