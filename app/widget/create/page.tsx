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
          categoryPath,
          initialTime: initialTime || 0,
          instanceTagNames: instanceTagNames ? instanceTagNames.split(',') : [],
          autoStart: true,
        }),
      });

      if (response.ok) {
        // 创建成功，关闭窗口
        window.close();
      } else {
        throw new Error('创建失败');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <span className="text-sm text-muted-foreground">加载中...</span>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-muted-foreground">
        <span className="text-sm">请先登录</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-y-auto p-4">
      <CreateLogFormWithCards
        onAddToTimer={handleAddToTimer}
        selectedDate={today}
      />
    </div>
  );
}
