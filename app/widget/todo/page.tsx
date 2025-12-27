'use client';

import React, { useState, useEffect } from 'react';
import { X, Square, CheckSquare, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  group: string;
  createdAt: number;
}

export default function TodoWidgetPage() {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['default']));
  const [isInitialized, setIsInitialized] = useState(false);

  // 加载数据和状态
  useEffect(() => {
    // 加载待办项
    const savedItems = localStorage.getItem('widget-todo-items');
    if (savedItems) {
      try {
        setItems(JSON.parse(savedItems));
      } catch (e) {
        console.error('[Widget Todo] Failed to parse items:', e);
      }
    }

    // 加载展开状态
    const savedExpanded = localStorage.getItem('widget-todo-expanded-groups');
    if (savedExpanded) {
      try {
        setExpandedGroups(new Set(JSON.parse(savedExpanded)));
      } catch (e) {
        console.error('[Widget Todo] Failed to parse expanded groups:', e);
      }
    }

    // 加载显示已完成状态
    const savedShowCompleted = localStorage.getItem('widget-todo-show-completed');
    if (savedShowCompleted !== null) {
      setShowCompleted(savedShowCompleted === 'true');
    }

    setIsInitialized(true);

    // 监听其他窗口变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'widget-todo-items' && e.newValue) {
        try {
          setItems(JSON.parse(e.newValue));
        } catch (err) {
          console.error('[Widget Todo] Failed to parse storage change:', err);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 持久化待办项
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('widget-todo-items', JSON.stringify(items));
    }
  }, [items, isInitialized]);

  // 持久化展开状态
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('widget-todo-expanded-groups', JSON.stringify(Array.from(expandedGroups)));
    }
  }, [expandedGroups, isInitialized]);

  // 持久化显示已完成状态
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('widget-todo-show-completed', String(showCompleted));
    }
  }, [showCompleted, isInitialized]);

  const handleSubmit = () => {
    const text = inputValue.trim();
    if (!text) return;
    
    const item: TodoItem = {
      id: `todo-${Date.now()}`,
      text,
      completed: false,
      group: newGroup.trim() || 'default',
      createdAt: Date.now(),
    };
    setItems(prev => [...prev, item]);
    setInputValue('');
    if (item.group !== 'default') {
      setExpandedGroups(prev => new Set([...prev, item.group]));
    }
  };

  const toggleTodo = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const groups = [...new Set(items.map(t => t.group))];
  const activeTodos = items.filter(t => !t.completed);
  const completedTodos = items.filter(t => t.completed);

  const todosByGroup = groups.reduce((acc, group) => {
    acc[group] = activeTodos.filter(t => t.group === group);
    return acc;
  }, {} as Record<string, TodoItem[]>);

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-900 text-zinc-100 select-none overflow-hidden">
      {/* 标题栏 */}
      <div 
        className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 bg-zinc-800 shrink-0"
        data-drag="true"
      >
        <h2 className="text-xs font-medium text-zinc-300">待办事项</h2>
        <button
          onClick={() => window.close()}
          className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-600 transition-colors"
          data-drag="false"
        >
          <X size={12} />
        </button>
      </div>
      
      {/* 内容区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
        {/* 按分组显示 */}
        {groups.map(group => {
          const groupTodos = todosByGroup[group] || [];
          if (groupTodos.length === 0 && group !== 'default') return null;
          
          const isExpanded = expandedGroups.has(group);
          
          return (
            <div key={group}>
              {/* 分组头 */}
              {group !== 'default' && (
                <button
                  onClick={() => toggleGroup(group)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-300 mb-1.5 w-full"
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <span className="font-medium">{group}</span>
                  <span className="text-zinc-600">({groupTodos.length})</span>
                </button>
              )}
              
              {(group === 'default' || isExpanded) && (
                <div className="space-y-1.5">
                  {groupTodos.map(item => (
                    <div 
                      key={item.id} 
                      className="group flex items-start gap-2 p-2 bg-zinc-800/50 border border-zinc-700/50 rounded hover:border-zinc-600 transition-colors"
                    >
                      <button 
                        onClick={() => toggleTodo(item.id)}
                        className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition-colors"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                      <span className="flex-1 text-sm leading-relaxed text-zinc-200">{item.text}</span>
                      <button 
                        onClick={() => deleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {activeTodos.length === 0 && (
          <div className="text-zinc-500 text-sm py-4 text-center">
            暂无待办
          </div>
        )}

        {/* 已完成 */}
        {completedTodos.length > 0 && (
          <div className="pt-3 border-t border-zinc-700/50">
            <button 
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 mb-2"
            >
              {showCompleted ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              已完成 ({completedTodos.length})
            </button>
            
            {showCompleted && (
              <div className="space-y-1 pl-2 border-l border-zinc-700/50 ml-1">
                {completedTodos.map(item => (
                  <div key={item.id} className="flex items-center gap-2 py-1 text-zinc-500 group">
                    <button onClick={() => toggleTodo(item.id)} className="text-emerald-500/70">
                      <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                    <span className="flex-1 text-xs line-through">{item.text}</span>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 输入框 */}
      <div className="p-2 border-t border-zinc-700 bg-zinc-800 shrink-0">
        <div className="flex gap-1.5">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="+ 添加待办"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
          />
          <input
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            placeholder="分组"
            className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
          />
        </div>
      </div>
    </div>
  );
}
