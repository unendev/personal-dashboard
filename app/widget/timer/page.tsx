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
      return true;
    } else {
      lastTap.current = now;
    }
    return false;
  }, [callback, delay]);
  
  return {
    onDoubleClick: callback,
    onTouchEnd: (e: React.TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button,a,input,textarea,select')) {
        return;
      }
      if (handleTap()) {
        e.preventDefault();
      }
    },
  };
}

// 长按 Hook
function useLongPress(callback: () => void, ms = 500) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  
  const start = useCallback(() => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      callback();
    }, ms);
  }, [callback, ms]);
  
  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isLongPress.current = false;
  }, []);
  
  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    isLongPress,
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
  const [isBlurred, setIsBlurred] = useState(false);
  const [isDragEnabled, setIsDragEnabled] = useState(false);
  
  // 长按启用拖拽
  const longPressHandlers = useLongPress(() => {
    setIsDragEnabled(true);
    // 3秒后自动关闭拖拽模式
    setTimeout(() => setIsDragEnabled(false), 3000);
  }, 500);

  const handleToolClick = (action: () => void) => (e: React.MouseEvent | React.TouchEvent) => {
    if (isDragEnabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    action();
  };
  
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
        try {
          const taskData = JSON.parse(e.newValue);
          const now = Math.floor(Date.now() / 1000);
          
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
          
          localStorage.removeItem('widget-pending-task');
          
          if (createResponse.ok) {
            setTimeout(() => mutateTasks(), 100);
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
      {/* 左侧工具栏 */}
      <div
        className={`fixed left-0 top-0 w-10 h-full bg-[#141414] border-r border-zinc-800 flex flex-col z-10 relative ${isDragEnabled ? 'ring-2 ring-emerald-500/50' : ''}`}
        data-drag="false"
        {...longPressHandlers}
        title="长按工具栏拖拽"
      >
        {isDragEnabled && (
          <div
            className="absolute inset-0 z-10 cursor-move"
            data-drag="true"
            aria-hidden="true"
          />
        )}
        <button
          onClick={handleToolClick(openMemoWindow)}
          className="h-1/3 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors border-b border-zinc-800"
          title="备忘录"
          data-drag="false"
        >
          <FileText size={18} />
        </button>
        <button
          onClick={handleToolClick(openTodoWindow)}
          className="h-1/3 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors border-b border-zinc-800"
          title="待办事项"
          data-drag="false"
        >
          <CheckSquare size={18} />
        </button>
        <button
          onClick={handleToolClick(openAiWindow)}
          className="h-1/3 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="AI 助手"
          data-drag="false"
        >
          <Bot size={18} />
        </button>
      </div>

      {/* 主面板 */}
      <div className="ml-10 h-full flex flex-col overflow-hidden">
        {/* 主计时器区域 - 长按启用拖拽 */}
        <div 
          className="shrink-0 p-3 pb-2 cursor-pointer"
          onClick={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('button,a,input,textarea,select')) {
              return;
            }
            if (!isDragEnabled) {
              setIsBlurred(!isBlurred);
            }
          }}
          {...doubleTapCreate}
          title="单击模糊 / 双击新建"
        >
          {activeTask ? (
            <div className={`flex items-center gap-3 ${activeTask.isPaused ? 'text-yellow-400' : 'text-emerald-400'}`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  activeTask.isPaused ? startTimer(activeTask.id) : pauseTimer(activeTask.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                  activeTask.isPaused 
                    ? 'bg-yellow-500/20 hover:bg-yellow-500/30' 
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30'
                }`}
              >
                {activeTask.isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
              </button>
              <div className={`flex-1 min-w-0 transition-all ${isBlurred ? 'blur-md' : ''}`}>
                <div className="font-mono text-2xl font-bold">{formatTime(displayTime)}</div>
                <div className={`text-xs truncate ${activeTask.isPaused ? 'text-yellow-300/70' : 'text-emerald-300/70'}`}>
                  {activeTask.name}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                <Play size={18} />
              </div>
              <div className={`transition-all ${isBlurred ? 'blur-md' : ''}`}>
                <div className="font-mono text-2xl font-bold text-zinc-600">00:00:00</div>
                <div className="text-xs text-zinc-600">双击新建任务</div>
              </div>
            </div>
          )}
        </div>
        
        {/* 任务网格 */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {recentTasks.map((task) => (
              <button
                key={task.id}
                onClick={(e) => {
                  e.stopPropagation();
                  startTimer(task.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className="flex items-center gap-2 p-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg transition-colors text-left"
              >
                <Play size={12} className="text-zinc-500 shrink-0" fill="currentColor" />
                <span className={`text-xs text-zinc-300 truncate transition-all ${isBlurred ? 'blur-sm' : ''}`}>
                  {task.name}
                </span>
              </button>
            ))}
          </div>
          
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
