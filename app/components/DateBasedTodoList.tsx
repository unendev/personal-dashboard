'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  order?: number; // 排序字段
}

interface DateBasedTodoListProps {
  userId: string;
  compact?: boolean;
}

const DateBasedTodoList: React.FC<DateBasedTodoListProps> = ({ 
  userId, 
  compact = false 
}) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  
  // 子任务相关状态
  const [showAddSubtaskDialog, setShowAddSubtaskDialog] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newSubtaskCategory, setNewSubtaskCategory] = useState('');
  
  // 滚动位置管理
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      // 找到被拖拽的任务
      const draggedTodo = findTodoRecursive(todos, active.id as string);
      const targetTodo = findTodoRecursive(todos, over.id as string);
      
      if (!draggedTodo || !targetTodo) return;

      // 如果拖拽的是子任务，需要特殊处理
      if (draggedTodo.parentId && targetTodo.parentId === draggedTodo.parentId) {
        // 同级子任务之间的拖拽
        const parentTodo = findTodoRecursive(todos, draggedTodo.parentId);
        if (parentTodo && parentTodo.children) {
          const oldIndex = parentTodo.children.findIndex(child => child.id === active.id);
          const newIndex = parentTodo.children.findIndex(child => child.id === over.id);
          
          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedChildren = arrayMove(parentTodo.children, oldIndex, newIndex);
            const updatedChildren = reorderedChildren.map((child, index) => ({
              ...child,
              order: index
            }));
            
            // 更新父任务的子任务列表
            const updateParentRecursive = (todoList: TodoItem[]): TodoItem[] => {
              return todoList.map(todo => {
                if (todo.id === draggedTodo.parentId) {
                  return { ...todo, children: updatedChildren };
                }
                if (todo.children) {
                  return { ...todo, children: updateParentRecursive(todo.children) };
                }
                return todo;
              });
            };
            
            setTodos(prevTodos => updateParentRecursive(prevTodos));
            
            // 保存到数据库
            saveOrderToDatabase(updatedChildren);
          }
        }
      } else if (!draggedTodo.parentId && !targetTodo.parentId) {
        // 根级任务之间的拖拽
        const oldIndex = todos.findIndex((todo) => todo.id === active.id);
        const newIndex = todos.findIndex((todo) => todo.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedTodos = arrayMove(todos, oldIndex, newIndex);
          const updatedTodos = reorderedTodos.map((todo, index) => ({
            ...todo,
            order: index
          }));
          
          setTodos(updatedTodos);
          
          // 保存到数据库
          saveOrderToDatabase(updatedTodos);
        }
      }
    }
  };

  // 保存排序到数据库
  const saveOrderToDatabase = async (todosToSave: TodoItem[]) => {
    try {
      const response = await fetch('/api/todos', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          todos: todosToSave.map(todo => ({
            id: todo.id,
            order: todo.order || 0
          }))
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('保存排序失败:', response.status, errorText);
        // 重新获取数据以恢复正确状态
        fetchTodos();
      } else {
        console.log('排序保存成功');
        // 排序成功时不需要重新获取数据，避免滚动位置重置
      }
    } catch (error) {
      console.error('保存排序失败:', error);
      // 重新获取数据以恢复正确状态
      fetchTodos();
    }
  };

  // 从数据库加载数据
  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/todos?userId=${userId}`);
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
  }, [userId]);

  // 保存滚动位置
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      // 清除之前的定时器
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // 设置新的定时器，在滚动停止后更新位置
      scrollTimeoutRef.current = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollPositionRef.current = scrollContainerRef.current.scrollTop;
        }
      }, 100); // 100ms 延迟
    }
  }, []);

  // 恢复滚动位置
  const restoreScrollPosition = useCallback(() => {
    if (scrollContainerRef.current && scrollPositionRef.current > 0) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, []);

  // 在组件更新后恢复滚动位置 - 只在任务数量变化时恢复
  useEffect(() => {
    const timer = setTimeout(() => {
      restoreScrollPosition();
    }, 0);
    return () => clearTimeout(timer);
  }, [todos.length, restoreScrollPosition]);

  // 构建嵌套结构的工具函数
  const buildNestedStructure = (flatTodos: TodoItem[]): TodoItem[] => {
    const todoMap = new Map<string, TodoItem>();
    const rootTodos: TodoItem[] = [];

    // 第一遍：创建所有todo的映射，确保每个todo都有children数组
    flatTodos.forEach(todo => {
      todoMap.set(todo.id, { 
        ...todo, 
        children: [],
        // 确保parentId字段正确
        parentId: todo.parentId || null
      });
    });

    // 第二遍：建立父子关系
    flatTodos.forEach(todo => {
      const todoItem = todoMap.get(todo.id)!;
      if (todo.parentId && todo.parentId !== null) {
        const parent = todoMap.get(todo.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(todoItem);
        } else {
          // 如果找不到父任务，将其作为根任务
          console.warn(`找不到父任务 ${todo.parentId}，将任务 ${todo.id} 作为根任务`);
          rootTodos.push(todoItem);
        }
      } else {
        // 确保没有parentId的任务被添加到根任务
        rootTodos.push(todoItem);
      }
    });

    // 第三遍：对每个层级的任务进行排序
    const sortTodos = (todoList: TodoItem[]): TodoItem[] => {
      return todoList
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(todo => ({
          ...todo,
          children: todo.children ? sortTodos(todo.children) : []
        }));
    };

    return sortTodos(rootTodos);
  };

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = async () => {
    if (!newTodo.trim()) return;

    // 乐观更新：立即添加到UI
    const optimisticTodo = {
      id: `temp-${Date.now()}`,
      text: newTodo.trim(),
      completed: false,
      createdAtUnix: Date.now(),
      priority: 'medium' as const,
      category: newCategory.trim() || undefined,
      date: new Date().toISOString().split('T')[0], // 使用当前日期作为创建日期
      userId,
      parentId: null,
      children: [],
      order: 0
    };

    const todoWithChildren = { ...optimisticTodo, children: [] };
    setTodos([todoWithChildren, ...todos]);
    setNewTodo('');
    setNewCategory('');

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          text: optimisticTodo.text,
          category: optimisticTodo.category,
          parentId: null
        }),
      });

      if (response.ok) {
        const realTodo = await response.json();
        // 用真实数据替换临时数据
        setTodos(prevTodos => 
          prevTodos.map(todo => 
            todo.id === optimisticTodo.id ? { ...realTodo, children: [] } : todo
          )
        );
        console.log('新任务已添加到列表前面:', realTodo.text);
      } else {
        // 如果失败，回滚乐观更新
        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== optimisticTodo.id));
        setNewTodo(optimisticTodo.text);
        setNewCategory(optimisticTodo.category || '');
        alert('添加任务失败，请重试');
      }
    } catch (error) {
      console.error('Failed to add todo:', error);
      // 回滚乐观更新
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== optimisticTodo.id));
      setNewTodo(optimisticTodo.text);
      setNewCategory(optimisticTodo.category || '');
      alert('添加任务失败，请重试');
    }
  };

  // 添加子任务
  const addSubtask = async (parentId: string) => {
    if (!newSubtaskText.trim()) {
      alert('请输入子任务内容');
      return;
    }

    // 乐观更新：立即添加到UI
    const optimisticSubtask = {
      id: `temp-subtask-${Date.now()}`,
      text: newSubtaskText.trim(),
      completed: false,
      createdAtUnix: Date.now(),
      priority: 'medium' as const,
      category: newSubtaskCategory.trim() || undefined,
      date: new Date().toISOString().split('T')[0], // 使用当前日期作为创建日期
      userId,
      parentId: parentId,
      children: [],
      order: 0
    };

    const subtaskWithChildren = { ...optimisticSubtask, children: [] };

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

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          text: optimisticSubtask.text,
          category: optimisticSubtask.category,
          parentId: parentId
        }),
      });

      if (response.ok) {
        const realSubtask = await response.json();
        const realSubtaskWithChildren = { ...realSubtask, children: [] };

        const updateSubtaskRecursive = (todoList: TodoItem[]): TodoItem[] => {
          return todoList.map(todo => {
            if (todo.id === parentId) {
              return {
                ...todo,
                children: todo.children?.map(child => 
                  child.id === optimisticSubtask.id ? realSubtaskWithChildren : child
                ) || []
              };
            }
            if (todo.children) {
              return { ...todo, children: updateSubtaskRecursive(todo.children) };
            }
            return todo;
          });
        };

        setTodos(prevTodos => updateSubtaskRecursive(prevTodos));
        console.log('子任务已添加:', realSubtask.text);
      } else {
        // 如果失败，回滚乐观更新
        const removeSubtaskRecursive = (todoList: TodoItem[]): TodoItem[] => {
          return todoList.map(todo => {
            if (todo.id === parentId) {
              return {
                ...todo,
                children: todo.children?.filter(child => child.id !== optimisticSubtask.id) || []
              };
            }
            if (todo.children) {
              return { ...todo, children: removeSubtaskRecursive(todo.children) };
            }
            return todo;
          });
        };
        setTodos(prevTodos => removeSubtaskRecursive(prevTodos));
        setNewSubtaskText(optimisticSubtask.text);
        setNewSubtaskCategory(optimisticSubtask.category || '');
        setShowAddSubtaskDialog(parentId);
        alert('添加子任务失败，请重试');
      }
    } catch (error) {
      console.error('Failed to add subtask:', error);
      // 回滚乐观更新
      const removeSubtaskRecursive = (todoList: TodoItem[]): TodoItem[] => {
        return todoList.map(todo => {
          if (todo.id === parentId) {
            return {
              ...todo,
              children: todo.children?.filter(child => child.id !== optimisticSubtask.id) || []
            };
          }
          if (todo.children) {
            return { ...todo, children: removeSubtaskRecursive(todo.children) };
          }
          return todo;
        });
      };
      setTodos(prevTodos => removeSubtaskRecursive(prevTodos));
      setNewSubtaskText(optimisticSubtask.text);
      setNewSubtaskCategory(optimisticSubtask.category || '');
      setShowAddSubtaskDialog(parentId);
      alert('添加子任务失败，请重试');
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

    // 乐观更新：立即更新UI
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
    setTodos(prevTodos => updateRecursive(prevTodos));

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

      if (!response.ok) {
        // 如果失败，回滚乐观更新
        setTodos(prevTodos => updateRecursive(prevTodos)); // 再次调用会恢复原状态
        alert('更新任务状态失败，请重试');
      }
    } catch (error) {
      console.error('Failed to toggle todo:', error);
      // 回滚乐观更新
      setTodos(prevTodos => updateRecursive(prevTodos)); // 再次调用会恢复原状态
      alert('更新任务状态失败，请重试');
    }
  };

  const deleteTodo = async (id: string) => {
    // 乐观更新：立即从UI中删除
    const deleteRecursive = (todoList: TodoItem[]): TodoItem[] => {
      return todoList.filter(todo => {
        if (todo.id === id) return false;
        if (todo.children) {
          todo.children = deleteRecursive(todo.children);
        }
        return true;
      });
    };
    
    // 保存原始状态用于回滚
    const originalTodos = todos;
    setTodos(prevTodos => deleteRecursive(prevTodos));

    try {
      const response = await fetch(`/api/todos?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // 如果失败，回滚乐观更新
        setTodos(originalTodos);
        alert('删除任务失败，请重试');
      }
    } catch (error) {
      console.error('Failed to delete todo:', error);
      // 回滚乐观更新
      setTodos(originalTodos);
      alert('删除任务失败，请重试');
    }
  };

  const updatePriority = async (id: string, priority: 'low' | 'medium' | 'high') => {
    const todo = findTodoRecursive(todos, id);
    if (!todo) return;

    // 乐观更新：立即更新UI
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
    setTodos(prevTodos => updateRecursive(prevTodos));

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

      if (!response.ok) {
        // 如果失败，回滚乐观更新
        setTodos(prevTodos => updateRecursive(prevTodos)); // 再次调用会恢复原状态
        alert('更新优先级失败，请重试');
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
      // 回滚乐观更新
      setTodos(prevTodos => updateRecursive(prevTodos)); // 再次调用会恢复原状态
      alert('更新优先级失败，请重试');
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
                size="xs"
                onClick={() => setShowAddSubtaskDialog(todo.id)}
                className="text-xs p-1 h-6 w-12"
              >
                ➕
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => deleteTodo(todo.id)}
                className="p-1 h-6 w-6"
              >
                ×
              </Button>
            </div>
          </div>
          
          {/* 递归渲染子任务 - 为子任务创建独立的拖拽上下文 */}
          {todo.children && todo.children.length > 0 && (
            <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={todo.children.map(child => child.id)} strategy={verticalListSortingStrategy}>
                  {todo.children.map(child => (
                    <SortableTodoItem key={child.id} todo={child} isCompact={isCompact} />
                  ))}
                </SortableContext>
              </DndContext>
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
            >
              ➕ 子任务
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteTodo(todo.id)}
            >
              删除
            </Button>
          </div>
        </div>
        
        {/* 递归渲染子任务 - 为子任务创建独立的拖拽上下文 */}
        {todo.children && todo.children.length > 0 && (
          <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={todo.children.map(child => child.id)} strategy={verticalListSortingStrategy}>
                {todo.children.map(child => (
                  <SortableTodoItem key={child.id} todo={child} isCompact={isCompact} />
                ))}
              </SortableContext>
            </DndContext>
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
            <Button onClick={addTodo} size="sm" variant="outline">
              ➕ 添加
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
            <div 
              ref={scrollContainerRef}
              className="space-y-2 max-h-[600px] overflow-y-auto overflow-x-hidden pr-2 timer-scroll-area"
              onScroll={saveScrollPosition}
            >
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
              <Button variant="outline" size="sm" onClick={() => showAddSubtaskDialog && addSubtask(showAddSubtaskDialog)}>
                ➕ 添加子任务
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
            <div 
              ref={scrollContainerRef}
              className="space-y-3 max-h-[500px] overflow-y-auto timer-scroll-area"
              onScroll={saveScrollPosition}
            >
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
              <Button variant="outline" onClick={() => showAddSubtaskDialog && addSubtask(showAddSubtaskDialog)}>
                ➕ 添加子任务
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DateBasedTodoList;
