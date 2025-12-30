"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useStorage, useMutation, useSelf, useOthers } from "@liveblocks/react/suspense";
import { LiveList, LiveMap } from "@liveblocks/client";
import { Trash2, CheckSquare, Square, ChevronRight, ChevronDown, ChevronLeft, Plus, User, Users, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownView } from "@/app/components/shared/MarkdownView";
import { MarkdownOutline } from "@/app/components/shared/MarkdownOutline";

// Todo 类型定义
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  group?: string;      // 分组名称
  parentId?: string;   // 父 Todo ID（用于子任务）
  ownerId?: string;    // 所有者 ID（null = 共享）
  ownerName?: string;  // 所有者名称
}

export default function TacticalBoard() {
  const todos = useStorage((root) => root.todos) as Todo[] | null;
  const notes = useStorage((root) => root.notes);
  const playerNotes = useStorage((root) => root.playerNotes);
  const me = useSelf();
  const others = useOthers();

  const [showCompleted, setShowCompleted] = useState(false);
  // 【修复】默认进入最左侧的笔记（'shared'），支持拖拽排序
  const [activeTab, setActiveTab] = useState<'shared' | 'my' | string>('shared');
  const [todoFilter, setTodoFilter] = useState<'all' | 'shared' | 'my'>('shared');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['default']));
  const [newTodoGroup, setNewTodoGroup] = useState<string>('');
  // State to manage which note is currently being edited (null, 'shared', 'my', or userId)
  const [editingNoteId, setEditingNoteId] = useState<null | 'shared' | 'my' | string>(null);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // Safety Loading Check
  if (!todos || !notes || !playerNotes) {
    return <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-sm">Loading Tactical Data...</div>;
  }

  // --- Todo Mutations ---
  const addTodo = useMutation(({ storage, self }, text: string, options?: { group?: string; parentId?: string; isPersonal?: boolean }) => {
    if (!text.trim()) return;
    const todos = storage.get("todos");
    const newTodo = { 
      id: crypto.randomUUID(), 
      text, 
      completed: false,
      group: options?.group || 'default',
      parentId: options?.parentId || null,
      ownerId: options?.isPersonal ? self?.id : null,
      ownerName: options?.isPersonal ? (self?.info?.name || 'Unknown') : null,
    };
    if (todos) {
      (todos as any).push(newTodo);
    } else {
      storage.set("todos", new LiveList([newTodo]) as any);
    }
  }, []);

  const toggleTodo = useMutation(({ storage }, id: string) => {
    const todos = storage.get("todos") as any;
    const index = todos.findIndex((todo: any) => todo.id === id);
    if (index !== -1) {
      const todo = todos.get(index);
      if (todo) {
        todos.set(index, { ...todo, completed: !todo.completed });
      }
    }
  }, []);

  const deleteTodo = useMutation(({ storage }, id: string) => {
    const todos = storage.get("todos") as any;
    // 删除 todo 及其所有子任务
    const toDelete: number[] = [];
    todos.forEach((todo: any, index: number) => {
      if (todo.id === id || todo.parentId === id) {
        toDelete.push(index);
      }
    });
    // 从后往前删除，避免索引问题
    toDelete.reverse().forEach((index: number) => todos.delete(index));
  }, []);

  // --- Notes Mutations ---
  const updateSharedNotes = useMutation(({ storage }, newNotes: string) => {
    storage.set("notes", newNotes);
  }, []);

  const updateMyNotes = useMutation(({ storage, self }, newNotes: string) => {
    const pNotes = storage.get("playerNotes");
    if (pNotes && self?.id) {
       pNotes.set(self.id, { 
         content: newNotes, 
         name: self.info?.name || "Unknown" 
       });
    }
  }, []);

  // Helper to extract content and name from mixed storage type
  const getNoteData = (userId: string) => {
    const raw = playerNotes?.get(userId);
    if (!raw) return { content: "", name: null };
    if (typeof raw === 'string') return { content: raw, name: null };
    return raw;
  };

  // Get content for current tab
  const getTabContent = useCallback(() => {
    if (activeTab === 'shared') return notes;
    if (activeTab === 'my') {
      if (!me?.id) return "";
      return getNoteData(me.id).content;
    }
    return getNoteData(activeTab).content;
  }, [activeTab, notes, playerNotes, me]);

  const isEditableTab = activeTab === 'shared' || activeTab === 'my';
  const isCurrentlyEditing = editingNoteId === activeTab;

  const handleNoteChange = (val: string) => {
    if (activeTab === 'shared') updateSharedNotes(val);
    else if (activeTab === 'my') updateMyNotes(val);
  };

  const handleEditClick = (tabId: string) => {
    if (isEditableTab) {
        setEditingNoteId(tabId);
    }
  };

  const handleBlur = () => {
    setEditingNoteId(null);
  };

  // --- Derived State ---
  // 过滤 todos
  const filteredTodos = todos.filter((t: Todo) => {
    if (todoFilter === 'shared') return !t.ownerId;
    if (todoFilter === 'my') return t.ownerId === me?.id;
    return true;
  });
  
  // 获取所有分组
  const groups = [...new Set(filteredTodos.map((t: Todo) => t.group || 'default'))];
  
  // 按分组组织 todos
  const todosByGroup = groups.reduce((acc, group) => {
    acc[group] = {
      active: filteredTodos.filter((t: Todo) => !t.completed && (t.group || 'default') === group && !t.parentId),
      completed: filteredTodos.filter((t: Todo) => t.completed && (t.group || 'default') === group && !t.parentId),
    };
    return acc;
  }, {} as Record<string, { active: Todo[]; completed: Todo[] }>);
  
  // 获取子任务
  const getSubTodos = (parentId: string) => filteredTodos.filter((t: Todo) => t.parentId === parentId);
  
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };
  
  const activeTodos = filteredTodos.filter((t: Todo) => !t.completed && !t.parentId);
  const completedTodos = filteredTodos.filter((t: Todo) => t.completed && !t.parentId);

  useEffect(() => {
    if (isCurrentlyEditing && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [isCurrentlyEditing]);

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-r border-zinc-800 text-zinc-100 font-mono">
      {/* Header */}
      <div className="p-4 border-b border-zinc-900">
         <h2 className="text-xl font-bold text-[#D583F0] tracking-wider">TACTICAL BOARD</h2>
      </div>
      
      {/* --- To-Do Section --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Todo Tabs - 类似笔记区的 Tab 切换 */}
        <div className="flex items-center gap-1 p-2 bg-zinc-900 border-b border-zinc-800">
          <button
            onClick={() => setTodoFilter('shared')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-colors whitespace-nowrap",
              todoFilter === 'shared' ? "bg-[#D583F0] text-black" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            )}
          >
            Team
          </button>
          <button
            onClick={() => setTodoFilter('my')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-colors whitespace-nowrap",
              todoFilter === 'my' ? "bg-cyan-600 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            )}
          >
            My Tasks
          </button>
        </div>
        
        <div className="p-4">
        
        {/* Todos by Group */}
        {groups.map(group => {
          const groupTodos = todosByGroup[group];
          const isExpanded = expandedGroups.has(group);
          const hasActiveItems = groupTodos.active.length > 0;
          
          // 只显示有未完成任务的分组，或者 default 分组
          if (!hasActiveItems && group !== 'default') return null;
          
          return (
            <div key={group} className="mb-4">
              {/* Group Header */}
              {group !== 'default' && (
                <button
                  onClick={() => toggleGroup(group)}
                  className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 hover:text-zinc-200 mb-2 w-full"
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <span className="font-semibold">{group}</span>
                  <span className="text-zinc-600">({groupTodos.active.length})</span>
                </button>
              )}
              
              {(group === 'default' || isExpanded) && (
                <div className="space-y-2">
                  {/* Active Todos */}
                  {groupTodos.active.map((todo) => {
                    const subTodos = getSubTodos(todo.id);
                    return (
                      <div key={todo.id}>
                        <div className={cn(
                          "group flex items-start gap-3 p-3 bg-zinc-900/50 border rounded hover:border-[#D583F0]/50 transition-colors",
                          todo.ownerId ? "border-cyan-800/30" : "border-zinc-800"
                        )}>
                          <button 
                            onClick={() => toggleTodo(todo.id)}
                            className="mt-0.5 text-zinc-500 hover:text-[#D583F0] transition-colors"
                          >
                            <Square className="w-4 h-4" />
                          </button>
                          <div className="flex-1">
                            <span className="text-sm leading-relaxed">{todo.text}</span>
                            {todo.ownerName && (
                              <span className="ml-2 text-[10px] text-cyan-500">@{todo.ownerName}</span>
                            )}
                          </div>
                          <button 
                            onClick={() => deleteTodo(todo.id)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Sub Todos */}
                        {subTodos.length > 0 && (
                          <div className="ml-6 mt-1 space-y-1 border-l-2 border-zinc-800 pl-3">
                            {subTodos.map((sub: Todo) => (
                              <div key={sub.id} className="group flex items-center gap-2 py-1 text-sm">
                                <button onClick={() => toggleTodo(sub.id)} className={sub.completed ? "text-[#D583F0]" : "text-zinc-500"}>
                                  {sub.completed ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                                </button>
                                <span className={sub.completed ? "line-through text-zinc-600" : "text-zinc-300"}>{sub.text}</span>
                                <button onClick={() => deleteTodo(sub.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {groupTodos.active.length === 0 && group === 'default' && (
                    <div className="text-zinc-600 text-sm italic py-2 text-center">No active objectives.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* New Todo Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder={todoFilter === 'my' ? "+ Add personal task" : "+ Add objective"}
            className="flex-1 bg-zinc-900 border border-dashed border-zinc-800 rounded p-2 text-sm text-zinc-300 focus:outline-none focus:border-[#D583F0] focus:ring-1 focus:ring-[#D583F0] transition-all placeholder:text-zinc-600"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addTodo(e.currentTarget.value, { 
                  group: newTodoGroup || 'default',
                  isPersonal: todoFilter === 'my'
                });
                e.currentTarget.value = "";
              }
            }}
          />
          <input
            type="text"
            placeholder="Group"
            value={newTodoGroup}
            onChange={(e) => setNewTodoGroup(e.target.value)}
            className="w-20 bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-400 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
          />
        </div>

        {/* Completed Todos */}
        {completedTodos.length > 0 && (
          <div className="mt-6">
            <button 
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-600 hover:text-zinc-400 mb-2"
            >
              {showCompleted ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Completed ({completedTodos.length})
            </button>
            
            {showCompleted && (
              <div className="space-y-1 pl-2 border-l-2 border-zinc-800 ml-1.5">
                {completedTodos.map((todo) => (
                  <div key={todo.id} className="flex items-center gap-3 p-2 text-zinc-600 group">
                     <button 
                        onClick={() => toggleTodo(todo.id)}
                        className="text-[#D583F0]"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                    <span className="flex-1 text-sm line-through decoration-zinc-700">{todo.text}</span>
                    {todo.ownerName && (
                      <span className="text-[10px] text-cyan-600">@{todo.ownerName}</span>
                    )}
                    <button 
                        onClick={() => deleteTodo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-900"
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
      </div>

      {/* --- Notes Section --- */}
      <div className="h-1/2 flex flex-col border-t border-zinc-800 bg-zinc-950/50">
        {/* Tabs & Controls */}
        <div className="flex items-center justify-between p-2 bg-zinc-900">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('shared')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-colors whitespace-nowrap",
                activeTab === 'shared' ? "bg-[#D583F0] text-black" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              )}
            >
              Shared
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-colors whitespace-nowrap",
                activeTab === 'my' ? "bg-cyan-600 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              )}
            >
              My Notes
            </button>
            
            {playerNotes && Array.from(playerNotes.keys()).map((userId) => {
               if (userId === me?.id) return null; // Skip self
               
               const noteData = getNoteData(userId);
               
               // 优先使用持久化的名字
               let label = noteData.name;
               
               // 如果持久化名字不存在，尝试从在线用户中实时获取
               if (!label) {
                 const onlineUser = others.find(u => u.id === userId);
                 if (onlineUser?.info?.name) label = onlineUser.info.name;
               }
               
               // 如果都找不到，回退到 ID
               if (!label) label = `User ${userId.slice(-4)}`;
               
               return (
                 <button
                  key={userId}
                  onClick={() => setActiveTab(userId)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-colors whitespace-nowrap",
                    activeTab === userId ? "bg-zinc-700 text-white" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
                  )}
                >
                  {label}
                </button>
               );
            })}
          </div>
        </div>

        {/* Notes Editor / Preview with Outline */}
        <div className="flex-1 flex overflow-hidden">
          {/* MD 编辑/预览区 */}
          <div 
            className="flex-1 relative group overflow-hidden"
            onClick={() => handleEditClick(activeTab)}
          >
            {/* 大纲切换按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOutlineOpen(!outlineOpen);
              }}
              className="absolute top-2 right-2 z-20 p-1.5 bg-zinc-800/50 hover:bg-zinc-700 rounded transition-colors"
              title="切换大纲"
            >
              {outlineOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {isCurrentlyEditing ? (
              <textarea
                ref={textAreaRef}
                className="w-full h-full bg-zinc-950 p-4 text-sm text-zinc-300 resize-none focus:outline-none focus:bg-zinc-900/50 transition-colors custom-scrollbar leading-relaxed"
                value={getTabContent()}
                onChange={(e) => handleNoteChange(e.target.value)}
                onBlur={handleBlur} // Auto-save on blur
                readOnly={!isEditableTab}
                placeholder={isEditableTab ? "Type details here... (Markdown supported)" : "Empty"}
              />
            ) : (
              <div className="w-full h-full bg-zinc-950 p-4 overflow-y-auto custom-scrollbar">
                <MarkdownView content={getTabContent()} variant="goc" />
                {!isEditableTab && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-zinc-800/80 text-zinc-400 text-[10px] rounded pointer-events-none z-10">
                    READ ONLY
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 大纲面板 (现在位于右侧) */}
          {outlineOpen && (
            <div className="w-48 border-l border-zinc-800 bg-zinc-900/30 overflow-y-auto custom-scrollbar">
              <MarkdownOutline 
                content={getTabContent()} 
                className="text-xs"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
