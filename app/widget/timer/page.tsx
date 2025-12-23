'use client';

import React, { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Play, Pause } from 'lucide-react';
import { useTimerControl } from '@/app/hooks/useTimerControl';

// 禁用所有缓存
export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// 简单的 fetcher
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

// 任务类型定义
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
  // 直接用 SWR 获取 session，绕过 useSession 的问题
  const { data: sessionData, isLoading: sessionLoading } = useSWR<{ user?: SessionUser }>(
    '/api/auth/session',
    fetcher,
    { revalidateOnFocus: false }
  );
  
  const userId = sessionData?.user?.id;
  const today = new Date().toISOString().split('T')[0];
  const apiUrl = userId ? `/api/timer-tasks?userId=${userId}&date=${today}` : null;

  // 调试日志
  useEffect(() => {
    console.log('🔐 Widget 认证状态:', { 
      sessionLoading, 
      userId, 
      email: sessionData?.user?.email,
      sessionData 
    });
  }, [sessionLoading, userId, sessionData]);

  // 获取任务数据
  const { data: tasks = [], mutate: mutateTasks } = useSWR<TimerTask[]>(
    apiUrl,
    fetcher,
    { refreshInterval: 2000 }
  );

  useEffect(() => {
    console.log('📋 Widget 任务数据:', tasks.length, '个任务');
  }, [tasks]);

  // Timer Control Hook
  const { startTimer, pauseTimer, stopTimer } = useTimerControl({
    tasks,
    onTasksChange: (newTasks) => {
      if (apiUrl) mutate(apiUrl, newTasks, false);
    },
    onVersionConflict: () => mutateTasks(),
  });

  // 找出当前运行的任务（包括暂停状态）
  const activeTask = useMemo(() => {
    const findActive = (list: TimerTask[]): TimerTask | null => {
      for (const task of list) {
        if (task.isRunning) return task; // 包括暂停状态
        if (task.children) {
          const found = findActive(task.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findActive(tasks);
  }, [tasks]);

  // 所有任务列表（排除当前活跃的）
  const recentTasks = useMemo(() => {
    const allTasks: TimerTask[] = [];
    const traverse = (list: TimerTask[]) => {
      list.forEach((t) => {
        allTasks.push(t);
        if (t.children) traverse(t.children);
      });
    };
    traverse(tasks);
    return allTasks
      .filter((t) => t.id !== activeTask?.id) // 只排除当前活跃的，不排除其他运行中的
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [tasks, activeTask]);

  // 实时计时
  const [displayTime, setDisplayTime] = useState(0);
  useEffect(() => {
    if (!activeTask) {
      setDisplayTime(0);
      return;
    }
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

  const formatSeconds = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // === 条件渲染放在 hooks 之后 ===
  if (sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-950 text-zinc-400 gap-2">
        <span className="text-xs">加载中...</span>
      </div>
    );
  }

  // 未登录，显示登录提示
  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-950 text-zinc-400 gap-2 p-4">
        <span className="text-xs">请先登录</span>
        <a
          href="/auth/signin"
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          点击登录
        </a>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden bg-zinc-950/95 text-white select-none border border-zinc-800/50 rounded-lg drag-region">
      {/* 顶部拖拽条 */}
      <div className="h-5 flex items-center justify-center bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors shrink-0">
        <div className="w-8 h-1 bg-zinc-700/50 rounded-full" />
      </div>

      {/* 任务列表容器 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 custom-scrollbar">
        {/* 当前运行的任务（包括暂停状态） */}
        {activeTask && (
          <div className={`flex items-center p-2 bg-zinc-900/80 rounded border shadow-sm mb-2 gap-2 ${activeTask.isPaused ? 'border-yellow-500/20' : 'border-green-500/20'}`}>
            <button
              onClick={() => activeTask.isPaused ? startTimer(activeTask.id) : pauseTimer(activeTask.id)}
              className={`p-1 hover:bg-zinc-700 rounded no-drag shrink-0 ${activeTask.isPaused ? 'text-green-500/80 hover:text-green-400' : 'text-yellow-500/80 hover:text-yellow-400'}`}
              title={activeTask.isPaused ? 'Resume' : 'Pause'}
            >
              {activeTask.isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
            </button>
            <div className="flex flex-col min-w-0 flex-1">
              <span className={`truncate text-xs font-bold ${activeTask.isPaused ? 'text-yellow-100' : 'text-green-100'}`}>{activeTask.name}</span>
              <span className="text-[10px] text-zinc-500 truncate">{activeTask.categoryPath || 'No Category'}</span>
            </div>
            <span className={`font-mono text-sm font-medium tabular-nums shrink-0 ${activeTask.isPaused ? 'text-yellow-400' : 'text-green-400'}`}>{formatSeconds(displayTime)}</span>
          </div>
        )}

        {/* 任务列表 */}
        {recentTasks.length > 0 ? (
          <div className="space-y-0.5">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center p-1.5 rounded hover:bg-zinc-800/60 transition-colors group h-8 gap-2">
                <button
                  onClick={() => startTimer(task.id)}
                  className="p-1 text-zinc-600 hover:text-green-400 transition-opacity no-drag shrink-0"
                  title="Start"
                >
                  <Play size={12} fill="currentColor" />
                </button>
                <span className="truncate text-xs text-zinc-400 group-hover:text-zinc-200 flex-1">{task.name}</span>
              </div>
            ))}
          </div>
        ) : (
          !activeTask && (
            <div className="flex flex-col items-center justify-center h-20 text-zinc-600">
              <span className="text-xs">No recent tasks</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
