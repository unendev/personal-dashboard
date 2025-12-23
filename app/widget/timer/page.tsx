'use client';

import React, { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Play, Pause } from 'lucide-react';
import { useTimerControl } from '@/app/hooks/useTimerControl';

export const dynamic = 'force-dynamic';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

// 打开创建窗口的函数 - 使用 window.open，Electron 会拦截并用无边框窗口打开
const openCreateWindow = () => {
  window.open('/widget/create', '_blank', 'width=500,height=700');
};

interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  instanceTag?: string | null;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  parentId?: string | null;
  children?: TimerTask[];
  totalTime?: number;
  order?: number;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

interface SessionUser {
  id: string;
  email?: string;
  name?: string;
}

export default function TimerWidgetPage() {
  const { data: sessionData, isLoading: sessionLoading } = useSWR<{ user?: SessionUser }>(
    '/api/auth/session',
    fetcher,
    { revalidateOnFocus: false }
  );
  
  const userId = sessionData?.user?.id;
  const today = new Date().toISOString().split('T')[0];
  const apiUrl = userId ? `/api/timer-tasks?userId=${userId}&date=${today}` : null;

  const { data: tasks = [], mutate: mutateTasks } = useSWR<TimerTask[]>(
    apiUrl,
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: false, dedupingInterval: 2000 }
  );

  const { startTimer, pauseTimer } = useTimerControl({
    tasks,
    onTasksChange: (newTasks) => { if (apiUrl) mutate(apiUrl, newTasks, false); },
    onVersionConflict: () => mutateTasks(),
  });

  const activeTask = useMemo(() => {
    const findActive = (list: TimerTask[]): TimerTask | null => {
      for (const task of list) {
        if (task.isRunning) return task;
        if (task.children) {
          const found = findActive(task.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findActive(tasks);
  }, [tasks]);

  const recentTasks = useMemo(() => {
    const topLevelTasks = tasks.filter((t) => !t.parentId);
    return topLevelTasks
      .filter((t) => t.id !== activeTask?.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [tasks, activeTask]);

  const [displayTime, setDisplayTime] = useState(0);
  useEffect(() => {
    if (!activeTask) { setDisplayTime(0); return; }
    const calculateTime = () => {
      if (activeTask.startTime) {
        const now = Math.floor(Date.now() / 1000);
        return activeTask.elapsedTime + (now - activeTask.startTime);
      }
      return activeTask.elapsedTime;
    };
    setDisplayTime(calculateTime());
    const interval = setInterval(() => setDisplayTime(calculateTime()), 1000);
    return () => clearInterval(interval);
  }, [activeTask]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#1a1a1a]">
        <span className="text-sm text-zinc-500">加载中...</span>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#1a1a1a] text-zinc-400 gap-3 p-4">
        <span className="text-sm">请先登录</span>
        <a href="/widget/login" className="text-sm text-emerald-400 hover:text-emerald-300 underline">
          点击登录
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-[#1a1a1a] text-white select-none p-3 gap-3">
      {/* 当前运行的任务 - 大卡片，双击打开创建框 */}
      {activeTask ? (
        <div 
          className={`relative rounded-xl p-4 border cursor-pointer ${activeTask.isPaused ? 'bg-yellow-950/30 border-yellow-600/30' : 'bg-emerald-950/40 border-emerald-600/30'}`}
          onDoubleClick={openCreateWindow}
          title="双击新建任务"
        >
          {/* 暂停/播放按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              activeTask.isPaused ? startTimer(activeTask.id) : pauseTimer(activeTask.id);
            }}
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              activeTask.isPaused 
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {activeTask.isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
          </button>
          
          {/* 时间和任务信息 */}
          <div className="text-center pl-12">
            <div className={`font-mono text-3xl font-bold tracking-wider ${activeTask.isPaused ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {formatTime(displayTime)}
            </div>
            <div className={`text-sm font-medium mt-1 ${activeTask.isPaused ? 'text-yellow-300' : 'text-emerald-300'}`}>
              #{activeTask.name}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {activeTask.categoryPath || '未分类'}
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="rounded-xl p-4 bg-zinc-900/50 border border-zinc-800/50 text-center cursor-pointer hover:bg-zinc-800/50 transition-colors"
          onDoubleClick={openCreateWindow}
          title="双击新建任务"
        >
          <div className="font-mono text-2xl text-zinc-600">00:00:00</div>
          <div className="text-xs text-zinc-600 mt-1">双击新建任务</div>
        </div>
      )}

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {recentTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 px-3 py-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/50 hover:bg-zinc-800/60 transition-colors group"
          >
            <button
              onClick={() => startTimer(task.id)}
              className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:bg-zinc-700 transition-colors shrink-0"
            >
              <Play size={14} fill="currentColor" />
            </button>
            <span className="text-sm text-zinc-300 truncate flex-1">{task.name}</span>
          </div>
        ))}
        
        {recentTasks.length === 0 && !activeTask && (
          <div className="text-center text-zinc-600 text-sm py-4">
            暂无任务
          </div>
        )}
      </div>

    </div>
  );
}
