'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAtUnix: number;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  date: string;
  userId: string;
  parentId?: string | null; // 父任务ID
  children?: TodoItem[]; // 子任务数组
  order?: number; // 用于拖拽排序
}

interface DateBasedTodoListProps {
  userId: string;
  date: string;
  compact?: boolean;
}

const DateBasedTodoList: React.FC<DateBasedTodoListProps> = ({ 
  userId, 
  date, 
  compact = false 
}) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'custom'>('created');
  
  // 子任务相关状态
  const [showAddSubtaskDialog, setShowAddSubtaskDialog] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newSubtaskCategory, setNewSubtaskCategory] = useState('');

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 拖拽结束处理函数
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('拖拽结束:', { activeId: active.id, overId: over?.id });

    if (active.id !== over?.id && over) {
      const oldIndex = todos.findIndex((todo) => todo.id === active.id);
      const newIndex = todos.findIndex((todo) => todo.id === over.id);

      console.log('拖拽索引:', { oldIndex, newIndex });

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedTodos = arrayMove(todos, oldIndex, newIndex);
        const updatedTodos = reorderedTodos.map((todo, index) => ({
          ...todo,
          order: index
        }));
        
        console.log('拖拽成功，新顺序:', updatedTodos.map(t => t.text));
        
        setTodos(updatedTodos);
        setSortBy('custom');
      }
    }
  };

  // 从数据库加载数据
  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/todos?userId=${userId}&date=${date}`);
      if (response.ok) {
        const data = await response.json();
        // 构建嵌套结构
        const nestedTodos = buildNestedStructure(data);
        setTodos(nestedTodos);
      }
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  // 构建嵌套结构的工具函数
  const buildNestedStructure = (flatTodos: TodoItem[]): TodoItem[] => {
    const todoMap = new Map<string, TodoItem>();
    const rootTodos: TodoItem[] = [];

    // 第一遍：创建所有todo的映射
    flatTodos.forEach(todo => {
      todoMap.set(todo.id, { ...todo, children: [] });
    });

    // 第二遍：建立父子关系
    flatTodos.forEach(todo => {
      const todoItem = todoMap.get(todo.id)!;
      if (todo.parentId) {
        const parent = todoMap.get(todo.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(todoItem);
        }
      } else {
        rootTodos.push(todoItem);
      }
    });

    return rootTodos;
  };

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = async () => {
    if (!newTodo.trim()) return;

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          text: newTodo.trim(),
          category: newCategory.trim() || undefined,
          date,
          parentId: null // 顶级任务
        }),
      });

      if (response.ok) {
        const todo = await response.json();
        // 新任务添加到列表最前面
        const todoWithChildren = { ...todo, children: [] };
        setTodos([todoWithChildren, ...todos]);
        setNewTodo('');
        setNewCategory('');
        console.log('新任务已添加到列表前面:', todo.text);
      }
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  };

  // 添加子任务
  const addSubtask = async (parentId: string) => {
    if (!newSubtaskText.trim()) {
      alert('请输入子任务内容');
      return;
    }

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          text: newSubtaskText.trim(),
          category: newSubtaskCategory.trim() || undefined,
          date,
          parentId: parentId
        }),
      });

      if (response.ok) {
        const subtask = await response.json();
        const subtaskWithChildren = { ...subtask, children: [] };

        const addSubtaskRecursive = (todoList: TodoItem[]): TodoItem[] => {
          return todoList.map(todo => {
            if (todo.id === parentId) {
              return {
                ...todo,
                children: [subtaskWithChildren, ...(todo.children || [])]
              };
            }
            if (todo.children) {
              return { ...todo, children: addSubtaskRecursive(todo.children) };
            }
            return todo;
          });
        };

        setTodos(addSubtaskRecursive(todos));
        setNewSubtaskText('');
        setNewSubtaskCategory('');
        setShowAddSubtaskDialog(null);
        console.log('子任务已添加:', subtask.text);
      }
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  };

  // 递归查找todo
  const findTodoRecursive = (todoList: TodoItem[], id: string): TodoItem | null => {
    for (const todo of todoList) {
      if (todo.id === id) return todo;
      if (todo.children) {
        const found = findTodoRecursive(todo.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const toggleTodo = async (id: string) => {
    const todo = findTodoRecursive(todos, id);
    if (!todo) return;

    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          text: todo.text,
          completed: !todo.completed,
          priority: todo.priority,
          category: todo.category
        }),
      });

      if (response.ok) {
        const updateRecursive = (todoList: TodoItem[]): TodoItem[] => {
          return todoList.map(todo => {
            if (todo.id === id) {
              return { ...todo, completed: !todo.completed };
            }
            if (todo.children) {
              return { ...todo, children: updateRecursive(todo.children) };
            }
            return todo;
          });
        };
        setTodos(updateRecursive(todos));
      }
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const deleteRecursive = (todoList: TodoItem[]): TodoItem[] => {
          return todoList.filter(todo => {
            if (todo.id === id) return false;
            if (todo.children) {
              todo.children = deleteRecursive(todo.children);
            }
            return true;
          });
        };
        setTodos(deleteRecursive(todos));
      }
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const updatePriority = async (id: string, priority: 'low' | 'medium' | 'high') => {
    const todo = findTodoRecursive(todos, id);
    if (!todo) return;

    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          text: todo.text,
          completed: todo.completed,
          priority,
          category: todo.category
        }),
      });

      if (response.ok) {
        const updateRecursive = (todoList: TodoItem[]): TodoItem[] => {
          return todoList.map(todo => {
            if (todo.id === id) {
              return { ...todo, priority };
            }
            if (todo.children) {
              return { ...todo, children: updateRecursive(todo.children) };
            }
            return todo;
          });
        };
        setTodos(updateRecursive(todos));
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  // 递归过滤函数
  const filterRecursive = (todoList: TodoItem[]): TodoItem[] => {
    return todoList.map(todo => {
      const filteredChildren = todo.children ? filterRecursive(todo.children) : [];
      const todoMatches = filter === 'all' || 
                         (filter === 'active' && !todo.completed) || 
                         (filter === 'completed' && todo.completed);
      
      if (todoMatches || filteredChildren.length > 0) {
        return { ...todo, children: filteredChildren };
      }
      return null;
    }).filter(Boolean) as TodoItem[];
  };

  const filteredTodos = filterRecursive(todos);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // 递归计算统计信息
  const calculateStats = (todoList: TodoItem[]): { total: number; completed: number; active: number } => {
    let total = 0;
    let completed = 0;
    let active = 0;

    const countRecursive = (todos: TodoItem[]) => {
      todos.forEach(todo => {
        total++;
        if (todo.completed) {
          completed++;
        } else {
          active++;
        }
        if (todo.children) {
          countRecursive(todo.children);
        }
      });
    };

    countRecursive(todoList);
    return { total, completed, active };
  };

  const stats = calculateStats(todos);

  // 可拖拽的Todo项组件
  const SortableTodoItem: React.FC<{ todo: TodoItem; isCompact?: boolean }> = ({ todo, isCompact = false }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: todo.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    if (isCompact) {
      return (
        <div>
          <div
            ref={setNodeRef}
            style={{ 
              ...style,
              touchAction: 'none' 
            }}
            {...attributes}
            {...listeners}
            className={`flex items-center gap-2 p-2 border rounded-lg text-sm cursor-grab active:cursor-grabbing transition-all duration-200 ${
              todo.completed ? 'bg-gray-50' : 'bg-white'
            } ${isDragging ? 'shadow-lg rotate-1 scale-105' : 'hover:shadow-sm'}`}
            title="拖拽重新排序"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={todo.completed}
                onCheckedChange={() => toggleTodo(todo.id)}
                className="w-4 h-4"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-medium truncate ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                {todo.text}
                {todo.children && todo.children.length > 0 && (
                  <span className="text-xs text-blue-600 ml-2">
                    ({todo.children.length}个子任务)
                  </span>
                )}
              </div>
              {todo.category && (
                <div className="text-xs text-gray-500">{todo.category}</div>
              )}
            </div>
            <div 
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <select
                value={todo.priority}
                onChange={(e) => updatePriority(todo.id, e.target.value as 'low' | 'medium' | 'high')}
                className={`text-xs px-1 py-0.5 rounded border-0 ${getPriorityColor(todo.priority)}`}
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddSubtaskDialog(todo.id)}
                className="text-green-600 hover:text-green-700 text-xs p-1 h-6 w-12"
              >
                ➕
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteTodo(todo.id)}
                className="text-red-600 hover:text-red-700 p-1 h-6 w-6"
              >
                ×
              </Button>
            </div>
          </div>
          
          {/* 递归渲染子任务 */}
          {todo.children && todo.children.length > 0 && (
            <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
              {todo.children.map(child => (
                <SortableTodoItem key={child.id} todo={child} isCompact={isCompact} />
              ))}
            </div>
          )}
        </div>
      );
    }

    // 完整模式
    return (
      <div>
        <div
          ref={setNodeRef}
          style={{ 
            ...style,
            touchAction: 'none' 
          }}
          {...attributes}
          {...listeners}
          className={`flex items-center gap-3 p-3 border rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 ${
            todo.completed ? 'bg-gray-50' : 'bg-white'
          } ${isDragging ? 'shadow-lg rotate-1 scale-105' : 'hover:shadow-md'}`}
          title="拖拽重新排序"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={todo.completed}
              onCheckedChange={() => toggleTodo(todo.id)}
            />
          </div>
          <div className="flex-1">
            <div className={`font-medium ${todo.completed ? 'line-through text-gray-500' : ''}`}>
              {todo.text}
              {todo.children && todo.children.length > 0 && (
                <span className="text-xs text-blue-600 ml-2">
                  ({todo.children.length}个子任务)
                </span>
              )}
            </div>
            {todo.category && (
              <div className="text-sm text-gray-500">{todo.category}</div>
            )}
          </div>
          <div 
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <select
              value={todo.priority}
              onChange={(e) => updatePriority(todo.id, e.target.value as 'low' | 'medium' | 'high')}
              className={`text-xs px-2 py-1 rounded ${getPriorityColor(todo.priority)}`}
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSubtaskDialog(todo.id)}
              className="text-green-600 hover:text-green-700 border-green-400"
            >
              ➕ 子任务
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteTodo(todo.id)}
              className="text-red-600 hover:text-red-700"
            >
              删除
            </Button>
          </div>
        </div>
        
        {/* 递归渲染子任务 */}
        {todo.children && todo.children.length > 0 && (
          <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
            {todo.children.map(child => (
              <SortableTodoItem key={child.id} todo={child} isCompact={isCompact} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (compact) {
    // 紧凑模式 - 用于日志页面
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            📋 任务清单
            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
              {stats.total}个任务
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 添加新任务 */}
          <div className="flex gap-2">
            <Input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="添加任务..."
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              className="flex-1 text-sm"
            />
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="分类"
              className="w-20 text-sm"
            />
            <Button onClick={addTodo} size="sm" className="bg-purple-500 hover:bg-purple-600">
              添加
            </Button>
          </div>

          {/* 筛选按钮 */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="text-xs"
            >
              全部 ({stats.total})
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('active')}
              className="text-xs"
            >
              待完成 ({stats.active})
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
              className="text-xs"
            >
              已完成 ({stats.completed})
            </Button>
          </div>

          {/* 任务列表 */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-2 max-h-60 overflow-y-auto timer-scroll-area">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mx-auto"></div>
              </div>
            ) : filteredTodos.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-sm">
                {filter === 'all' ? '暂无任务' : `暂无${filter === 'active' ? '待完成' : '已完成'}的任务`}
              </div>
            ) : (
                <SortableContext items={filteredTodos.map(todo => todo.id)} strategy={verticalListSortingStrategy}>
                  {filteredTodos.map(todo => (
                    <SortableTodoItem key={todo.id} todo={todo} isCompact={true} />
                  ))}
                </SortableContext>
                    )}
                  </div>
          </DndContext>
        </CardContent>
        
        {/* 添加子任务弹框 */}
        <Dialog open={!!showAddSubtaskDialog} onOpenChange={(open) => !open && setShowAddSubtaskDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加子任务</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  子任务内容
                </label>
                <Input
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  placeholder="输入子任务内容..."
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类 (可选)
                </label>
                <Input
                  value={newSubtaskCategory}
                  onChange={(e) => setNewSubtaskCategory(e.target.value)}
                  placeholder="输入分类..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddSubtaskDialog(null)}>
                取消
              </Button>
              <Button onClick={() => showAddSubtaskDialog && addSubtask(showAddSubtaskDialog)}>
                添加子任务
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // 完整模式
  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <Card>
        <CardHeader>
          <CardTitle>任务统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-500">总任务</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-500">待完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.completed}</div>
              <div className="text-sm text-gray-500">已完成</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 添加新任务 */}
      <Card>
        <CardHeader>
          <CardTitle>添加新任务</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="输入任务内容..."
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                className="flex-1"
              />
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="分类 (可选)"
                className="w-32"
              />
              <Button onClick={addTodo}>添加</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                全部
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('active')}
              >
                待完成
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('completed')}
              >
                已完成
              </Button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-3 max-h-[500px] overflow-y-auto timer-scroll-area">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : filteredTodos.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {filter === 'all' ? '暂无任务' : `暂无${filter === 'active' ? '待完成' : '已完成'}的任务`}
                </div>
              ) : (
                <SortableContext items={filteredTodos.map(todo => todo.id)} strategy={verticalListSortingStrategy}>
                  {filteredTodos.map(todo => (
                    <SortableTodoItem key={todo.id} todo={todo} isCompact={false} />
                  ))}
                </SortableContext>
              )}
            </div>
          </DndContext>
        </CardContent>
      </Card>

      {/* 添加子任务弹框 */}
      <Dialog open={!!showAddSubtaskDialog} onOpenChange={(open) => !open && setShowAddSubtaskDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加子任务</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                子任务内容
              </label>
              <Input
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                placeholder="输入子任务内容..."
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类 (可选)
              </label>
              <Input
                value={newSubtaskCategory}
                onChange={(e) => setNewSubtaskCategory(e.target.value)}
                placeholder="输入分类..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSubtaskDialog(null)}>
              取消
            </Button>
            <Button onClick={() => showAddSubtaskDialog && addSubtask(showAddSubtaskDialog)}>
              添加子任务
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DateBasedTodoList;
