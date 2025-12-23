'use client';

import React, { useState } from 'react';
import useSWR from 'swr';

export const dynamic = 'force-dynamic';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface SessionUser {
  id: string;
  email?: string;
}

export default function WidgetCreatePage() {
  const { data: sessionData } = useSWR<{ user?: SessionUser }>(
    '/api/auth/session',
    fetcher,
    { revalidateOnFocus: false }
  );
  
  const userId = sessionData?.user?.id;
  const [taskName, setTaskName] = useState('');
  const [categoryPath, setCategoryPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!taskName.trim() || !userId) return;
    
    setIsCreating(true);
    try {
      const response = await fetch('/api/timer-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: taskName,
          userId,
          categoryPath: categoryPath || 'Quick Task',
          autoStart: true,
        }),
      });
      
      if (response.ok) {
        window.close();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      window.close();
    }
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a] text-zinc-400">
        <span className="text-sm">请先登录</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white p-4">
      <h2 className="text-sm font-medium text-emerald-400 mb-4">⚡ 快速创建</h2>
      
      <div className="space-y-4 flex-1">
        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">任务名称</label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入任务名称..."
            className="w-full bg-zinc-900 border border-zinc-800 text-sm px-3 py-2.5 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-600/50"
            autoFocus
          />
        </div>
        
        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">分类路径 (可选)</label>
          <input
            type="text"
            value={categoryPath}
            onChange={(e) => setCategoryPath(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="如: 工作/开发"
            className="w-full bg-zinc-900 border border-zinc-800 text-sm px-3 py-2.5 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-600/50"
          />
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => window.close()}
          className="flex-1 px-3 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-sm rounded-xl text-zinc-400 transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleCreate}
          disabled={isCreating || !taskName.trim()}
          className="flex-1 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-sm rounded-xl text-white transition-colors"
        >
          {isCreating ? '创建中...' : '创建并开始'}
        </button>
      </div>
      
      <p className="text-xs text-zinc-600 text-center mt-3">
        Enter 创建 · Esc 取消
      </p>
    </div>
  );
}
