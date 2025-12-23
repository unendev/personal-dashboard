'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';

export const dynamic = 'force-dynamic';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface SessionUser {
  id: string;
  email?: string;
}

// 解析时间字符串为秒数
function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const str = timeStr.toLowerCase().trim();
  let totalSeconds = 0;
  
  const hourMatch = str.match(/(\d+)\s*h/);
  const minMatch = str.match(/(\d+)\s*m/);
  const secMatch = str.match(/(\d+)\s*s/);
  
  if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
  if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
  if (secMatch) totalSeconds += parseInt(secMatch[1]);
  
  // 如果没有匹配到任何单位，尝试解析为纯数字（分钟）
  if (!hourMatch && !minMatch && !secMatch) {
    const num = parseInt(str);
    if (!isNaN(num)) totalSeconds = num * 60;
  }
  
  return totalSeconds;
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
  const [initialTime, setInitialTime] = useState('');
  const [autoStart, setAutoStart] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // 加载自动开始偏好
  useEffect(() => {
    const saved = localStorage.getItem('timer-auto-start');
    if (saved !== null) setAutoStart(saved === 'true');
  }, []);

  const handleCreate = async () => {
    if (!taskName.trim() || !userId) return;
    
    // 保存偏好
    localStorage.setItem('timer-auto-start', String(autoStart));
    
    setIsCreating(true);
    try {
      const response = await fetch('/api/timer-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: taskName.trim(),
          userId,
          categoryPath: categoryPath.trim() || 'Quick Task',
          initialTime: parseTimeToSeconds(initialTime),
          autoStart,
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
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
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
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white p-5">
      <h2 className="text-base font-medium text-emerald-400 mb-5 flex items-center gap-2">
        <span>⚡</span> 快速创建
      </h2>
      
      <div className="space-y-4 flex-1">
        {/* 任务名称 */}
        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">
            任务名称 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入任务名称..."
            className="w-full bg-zinc-900 text-sm px-3 py-2.5 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/50"
            autoFocus
          />
        </div>
        
        {/* 分类路径 */}
        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">
            分类路径 <span className="text-zinc-600">(可选)</span>
          </label>
          <input
            type="text"
            value={categoryPath}
            onChange={(e) => setCategoryPath(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="如: 工作/开发"
            className="w-full bg-zinc-900 text-sm px-3 py-2.5 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/50"
          />
        </div>

        {/* 初始时间 */}
        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">
            初始时间 <span className="text-zinc-600">(可选)</span>
          </label>
          <input
            type="text"
            value={initialTime}
            onChange={(e) => setInitialTime(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="如: 30m, 1h20m, 2h"
            className="w-full bg-zinc-900 text-sm px-3 py-2.5 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/50"
          />
          <p className="text-xs text-zinc-600 mt-1">支持格式：1h30m、45m、2h</p>
        </div>

        {/* 自动开始选项 */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="auto-start"
            checked={autoStart}
            onChange={(e) => setAutoStart(e.target.checked)}
            className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-emerald-500/50"
          />
          <label htmlFor="auto-start" className="text-sm text-zinc-300 cursor-pointer select-none">
            创建后自动开始计时
          </label>
        </div>
      </div>
      
      <div className="flex gap-3 mt-5">
        <button
          onClick={() => window.close()}
          className="flex-1 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg text-zinc-400 transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleCreate}
          disabled={isCreating || !taskName.trim()}
          className="flex-1 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-sm rounded-lg text-white transition-colors"
        >
          {isCreating ? '创建中...' : autoStart ? '⏱️ 创建并开始' : '✅ 创建'}
        </button>
      </div>
      
      <p className="text-xs text-zinc-600 text-center mt-4">
        Ctrl/Cmd + Enter 快速创建 · Esc 取消
      </p>
    </div>
  );
}
