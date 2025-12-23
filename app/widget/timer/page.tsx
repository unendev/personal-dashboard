'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { Play, Pause, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { useTimerControl } from '@/app/hooks/useTimerControl';

export const dynamic = 'force-dynamic';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

// 打开创建窗口
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

interface MemoItem {
  id: string;
  type: 'note' | 'todo' | 'ai';
  content: string;
  done?: boolean;
  createdAt: number;
}

export default function TimerWidgetPage() {
  const [expanded, setExpanded] = useState(false);
  const [memoItems, setMemoItems] = useState<MemoItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // 通知 Electron 调整窗口大小
  useEffect(() => {
    window.postMessage({ type: 'widget-resize', expanded }, '*');
  }, [expanded]);

  // 从 localStorage 加载备忘录
  useEffect(() => {
    const saved = localStorage.getItem('widget-memo');
    if (saved) {
      try {
        setMemoItems(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // 保存备忘录到 localStorage
  useEffect(() => {
    localStorage.setItem('widget-memo', JSON.stringify(memoItems));
  }, [memoItems]);

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

  // 处理输入提交
  const handleSubmit = async () => {
    const text = inputValue.trim();
    if (!text) return;

    if (text.startsWith('/ai ')) {
      // AI 对话
      const query = text.slice(4);
      setIsAiLoading(true);
      setInputValue('');
      
      // 添加用户消息
      const userItem: MemoItem = {
        id: `user-${Date.now()}`,
        type: 'ai',
        content: `> ${query}`,
        createdAt: Date.now(),
      };
      setMemoItems(prev => [...prev, userItem]);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            messages: [{ role: 'user', content: query }],
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          const aiItem: MemoItem = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: data.content || data.message || '...',
            createdAt: Date.now(),
          };
          setMemoItems(prev => [...prev, aiItem]);
        }
      } catch (err) {
        console.error('AI error:', err);
      } finally {
        setIsAiLoading(false);
      }
    } else if (text.startsWith('/todo ')) {
      // 添加待办
      const todo = text.slice(6);
      const item: MemoItem = {
        id: `todo-${Date.now()}`,
        type: 'todo',
        content: todo,
        done: false,
        createdAt: Date.now(),
      };
      setMemoItems(prev => [...prev, item]);
      setInputValue('');
    } else if (text.startsWith('/timer ')) {
      // 创建计时任务
      const taskName = text.slice(7);
      openCreateWindow();
      setInputValue('');
    } else {
      // 普通笔记
      const item: MemoItem = {
        id: `note-${Date.now()}`,
        type: 'note',
        content: text,
        createdAt: Date.now(),
      };
      setMemoItems(prev => [...prev, item]);
      setInputValue('');
    }
  };

  // 切换待办完成状态
  const toggleTodo = (id: string) => {
    setMemoItems(prev => prev.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ));
  };

  // 删除备忘项
  const deleteItem = (id: string) => {
    setMemoItems(prev => prev.filter(item => item.id !== id));
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
    <div className="flex w-full h-full bg-[#1a1a1a] text-white select-none relative">
      {/* 侧边展开按钮 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-12 bg-zinc-800 hover:bg-zinc-700 rounded-l-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors z-10 border border-r-0 border-zinc-700"
        title={expanded ? '收起' : '展开备忘录'}
      >
        {expanded ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* 备忘录面板 */}
      {expanded && (
        <div className="w-[280px] h-full border-r border-zinc-800 flex flex-col bg-[#141414]">
          <div className="p-2 border-b border-zinc-800">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">备忘录</h3>
          </div>
          
          {/* 备忘内容 */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {memoItems.map(item => (
              <div 
                key={item.id} 
                className={`p-2 rounded-lg text-sm group relative ${
                  item.type === 'todo' 
                    ? 'bg-emerald-950/30 border border-emerald-800/30' 
                    : item.type === 'ai'
                    ? 'bg-cyan-950/30 border border-cyan-800/30'
                    : 'bg-zinc-800/50 border border-zinc-700/30'
                }`}
              >
                {item.type === 'todo' ? (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleTodo(item.id)}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <span className={item.done ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                      {item.content}
                    </span>
                  </label>
                ) : (
                  <p className="text-zinc-300 whitespace-pre-wrap text-xs">{item.content}</p>
                )}
                <button
                  onClick={() => deleteItem(item.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 text-xs transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
            {memoItems.length === 0 && (
              <div className="text-center text-zinc-600 text-xs py-4">
                <p>/ai 问问题</p>
                <p>/todo 添加待办</p>
                <p>直接输入添加笔记</p>
              </div>
            )}
          </div>

          {/* 输入框 */}
          <div className="p-2 border-t border-zinc-800">
            <div className="flex gap-1">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="/ai, /todo, 或笔记..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                disabled={isAiLoading}
              />
              <button
                onClick={handleSubmit}
                disabled={isAiLoading}
                className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <Send size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 计时器主面板 */}
      <div className="flex-1 flex flex-col p-3 gap-3">
        {/* 当前运行的任务 */}
        {activeTask ? (
          <div 
            className={`relative rounded-xl p-4 border cursor-pointer ${activeTask.isPaused ? 'bg-yellow-950/30 border-yellow-600/30' : 'bg-emerald-950/40 border-emerald-600/30'}`}
            onDoubleClick={openCreateWindow}
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
    </div>
  );
}
