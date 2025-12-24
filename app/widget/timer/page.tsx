'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { Play, Pause, FileText, CheckSquare, Bot } from 'lucide-react';
import { useTimerControl } from '@/app/hooks/useTimerControl';

export const dynamic = 'force-dynamic';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

const openCreateWindow = () => window.open('/widget/create', '_blank');
const openMemoWindow = () => window.open('/widget/memo', '_blank');
const openTodoWindow = () => window.open('/widget/todo', '_blank');
const openAiWindow = () => window.open('/widget/ai', '_blank');

// 双击/双触 Hook
function useDoubleTap(callback: () => void, delay = 300) {
  const lastTap = useRef(0);
  
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < delay) {
      callback();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }, [callback, delay]);
  
  return {
    onDoubleClick: callback,
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      handleTap();
    },
  };
}

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
  const doubleTapCreate = useDoubleTap(openCreateWindow);
  
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
  
  // 监听 create 窗口的待创建任务
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'widget-pending-task' && e.newValue) {
        console.log('[Timer] === START TASK CREATION ===');
        
        try {
          const taskData = JSON.parse(e.newValue);
          const now = Math.floor(Date.now() / 1000);
          
          // 1. 暂停运行中的任务（不等待，让它后台执行）
          const runningTasks = tasks.filter(t => t.isRunning);
          if (runningTasks.length > 0) {
            Promise.all(runningTasks.map(task =>
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
          
          // 2. 创建新任务
          const createBody = {
            name: taskData.name,
            userId: taskData.userId,
            categoryPath: taskData.categoryPath,
            date: taskData.date,
            initialTime: taskData.initialTime,
            elapsedTime: taskData.initialTime,
            instanceTagNames: taskData.instanceTagNames ? taskData.instanceTagNames.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [],
            isRunning: true,
            startTime: now,
          };
          
          const createResponse = await fetch('/api/timer-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(createBody),
          });
          
          // 清除待处理任务
          localStorage.removeItem('widget-pending-task');
          
          if (createResponse.ok) {
            // 延迟刷新，避免立即触发页面更新
            setTimeout(() => mutateTasks(), 100);
          } else {
            console.error('[Timer] Create failed:', createResponse.status);
          }
        } catch (err) {
          console.error('[Timer] Error:', err);
          localStorage.removeItem('widget-pending-task');
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [tasks, mutateTasks]);

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
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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
    <div className="w-full h-full bg-[#1a1a1a] text-white select-none overflow-hidden">
      {/* 左侧工具栏 - 固定定位，不随内容滚动 */}
      <div 
        className="fixed left-0 top-0 w-10 h-full bg-[#141414] border-r border-zinc-800 flex flex-col z-10"
        data-drag="true"
      >
        <button
          onClick={openMemoWindow}
          className="h-1/3 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors border-b border-zinc-800"
          data-drag="false"
          title="备忘录"
        >
          <FileText size={18} />
        </button>
        <button
          onClick={openTodoWindow}
          className="h-1/3 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors border-b border-zinc-800"
          data-drag="false"
          title="待办事项"
        >
          <CheckSquare size={18} />
        </button>
        <button
          onClick={openAiWindow}
          className="h-1/3 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          data-drag="false"
          title="AI 助手"
        >
          <Bot size={18} />
        </button>
      </div>

      {/* 计时器主面板 - 左边留出工具栏空间 */}
      <div className="ml-10 h-full flex flex-col overflow-hidden">
        {/* 拖拽区域 */}
        <div className="h-3 shrink-0 cursor-move" data-drag="true" />
        
        {/* 任务列表 - 全部可滚动 */}
        <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-2">
          {/* 当前运行的任务 */}
          {activeTask ? (
            <div 
              className={`relative rounded-xl p-4 border cursor-pointer ${activeTask.isPaused ? 'bg-yellow-950/30 border-yellow-600/30' : 'bg-emerald-950/40 border-emerald-600/30'}`}
              {...doubleTapCreate}
              title="双击新建任务"
            >
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
              
              <div className="text-center pl-12">
                <div className={`font-mono text-3xl font-bold tracking-wider ${activeTask.isPaused ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {formatTime(displayTime)}
                </div>
                <div className={`text-sm font-medium mt-1 ${activeTask.isPaused ? 'text-yellow-300' : 'text-emerald-300'}`}>
                  {activeTask.name.startsWith('#') ? activeTask.name : `#${activeTask.name}`}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {activeTask.categoryPath || '未分类'}
                </div>
              </div>
            </div>
          ) : (
            <div 
              className="rounded-xl p-4 bg-zinc-900/50 border border-zinc-800/50 text-center cursor-pointer hover:bg-zinc-800/50 transition-colors"
              {...doubleTapCreate}
              title="双击新建任务"
            >
              <div className="font-mono text-2xl text-zinc-600">00:00:00</div>
              <div className="text-xs text-zinc-600 mt-1">双击新建任务</div>
            </div>
          )}

          {/* 其他任务 */}
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
    </div>
  );
}
