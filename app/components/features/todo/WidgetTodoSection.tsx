'use client'

import React, { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { ChevronDown, ChevronRight, Square, CheckSquare, Trash2, Plus, Loader2 } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils'; // Assuming this exists, typical in shadcn/ui projects

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  group: string;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function WidgetTodoSection({ className = '' }: { className?: string }) {
  const { data: items = [], isLoading } = useSWR<TodoItem[]>('/api/widget/todo', fetcher);

  const [inputValue, setInputValue] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["default"]));
  const [showCompleted, setShowCompleted] = useState(false);

  // Grouping Logic
  const groups = useMemo(() => {
    if (!items) return [];
    return [...new Set(items.map(t => t.group))];
  }, [items]);

  const activeTodos = useMemo(() => items.filter(t => !t.completed), [items]);
  const completedTodos = useMemo(() => items.filter(t => t.completed), [items]);

  const todosByGroup = useMemo(() => {
    return groups.reduce((acc, group) => {
      acc[group] = activeTodos.filter(t => t.group === group);
      return acc;
    }, {} as Record<string, TodoItem[]>);
  }, [groups, activeTodos]);

  // Actions
  const handleSubmit = async () => {
    const text = inputValue.trim();
    if (!text) return;
    
    const groupName = newGroup.trim() || "default";
    
    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const newItem: TodoItem = {
      id: tempId,
      text,
      completed: false,
      group: groupName,
      createdAt: new Date().toISOString(),
    };
    
    mutate('/api/widget/todo', [...items, newItem], false);
    setInputValue("");
    
    // Expand group
    if (groupName !== "default") {
        setExpandedGroups(prev => new Set(prev).add(groupName));
    }

    try {
      await fetch('/api/widget/todo', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, group: groupName }),
      });
      mutate('/api/widget/todo');
    } catch (err) {
      console.error("Failed to create todo:", err);
      mutate('/api/widget/todo'); // Revert
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    // Optimistic
    const newItems = items.map(item => 
      item.id === id ? { ...item, completed: !completed } : item
    );
    mutate('/api/widget/todo', newItems, false);

    try {
      await fetch('/api/widget/todo', {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !completed }),
      });
      mutate('/api/widget/todo');
    } catch (err) {
      mutate('/api/widget/todo');
    }
  };

  const deleteItem = async (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    mutate('/api/widget/todo', newItems, false);

    try {
      await fetch(`/api/widget/todo?id=${id}`, {
        method: "DELETE",
      });
      mutate('/api/widget/todo');
    } catch (err) {
      mutate('/api/widget/todo');
    }
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  return (
    <div className={cn("flex flex-col h-full bg-gray-900/40 backdrop-blur-sm border-l border-white/5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
         <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <span className="text-lg">✅</span>
            待办事项
            {isLoading && <Loader2 size={12} className="animate-spin opacity-50" />}
         </h3>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
         {groups.map(group => {
             const groupTodos = todosByGroup[group] || [];
             if (groupTodos.length === 0 && group !== "default") return null;
             const isExpanded = expandedGroups.has(group);

             return (
                 <div key={group}>
                     {group !== "default" && (
                         <button
                            onClick={() => toggleGroup(group)}
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 mb-1.5 w-full transition-colors"
                         >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span className="font-medium">{group}</span>
                            <span className="opacity-50">({groupTodos.length})</span>
                         </button>
                     )}

                     {(group === "default" || isExpanded) && (
                         <div className="space-y-1.5 pl-1">
                             {groupTodos.map(item => (
                                 <div 
                                    key={item.id} 
                                    className="group flex items-start gap-2 p-2 bg-gray-800/40 border border-gray-700/30 rounded hover:bg-gray-800/60 transition-colors"
                                 >
                                    <button 
                                        onClick={() => toggleTodo(item.id, item.completed)}
                                        className="mt-0.5 text-gray-500 hover:text-emerald-400 transition-colors"
                                    >
                                        <Square size={16} />
                                    </button>
                                    <span className="flex-1 text-sm text-gray-200 leading-relaxed break-all">{item.text}</span>
                                    <button 
                                        onClick={() => deleteItem(item.id)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-0.5"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
             )
         })}
         
         {activeTodos.length === 0 && !isLoading && (
             <div className="text-gray-500 text-sm py-8 text-center opacity-60">
                 暂无待办，享受清闲时光
             </div>
         )}

         {/* Completed Section */}
         {completedTodos.length > 0 && (
             <div className="pt-4 mt-2 border-t border-gray-700/30">
                 <button 
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 mb-2 transition-colors"
                 >
                    {showCompleted ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    已完成 ({completedTodos.length})
                 </button>
                 
                 {showCompleted && (
                     <div className="space-y-1 pl-3 border-l border-gray-700/30">
                         {completedTodos.map(item => (
                             <div key={item.id} className="flex items-center gap-2 py-1 text-gray-500 group">
                                 <button onClick={() => toggleTodo(item.id, item.completed)} className="text-emerald-500/50 hover:text-emerald-500">
                                     <CheckSquare size={14} />
                                 </button>
                                 <span className="flex-1 text-xs line-through opacity-70 truncate">{item.text}</span>
                                 <button 
                                    onClick={() => deleteItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 p-0.5"
                                 >
                                     <Trash2 size={12} />
                                 </button>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
         )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-700/50 bg-gray-900/60">
        <div className="flex gap-2">
            <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="+ 添加待办..."
                className="flex-1 bg-gray-800/50 border-gray-700/50 h-9 text-sm focus:ring-1 focus:ring-emerald-500/50"
            />
            <Input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="分组"
                className="w-20 bg-gray-800/50 border-gray-700/50 h-9 text-xs focus:ring-1 focus:ring-emerald-500/50"
            />
        </div>
      </div>
    </div>
  );
}
