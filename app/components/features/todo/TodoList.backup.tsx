'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
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
  createdAt: number;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  order?: number; // 用于拖拽排序
  parentId?: string | null; // 父任务ID
  children?: TodoItem[]; // 子任务数组
}

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newCategory, setNewCategory] = useState('');
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

  // 从localStorage加载数据
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      const parsedTodos = JSON.parse(savedTodos);
      // 构建嵌套结构
      const nestedTodos = buildNestedStructure(parsedTodos);
      setTodos(nestedTodos);
    }
  }, []);

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

  // 扁平化嵌套结构的工具函数
  const flattenTodos = (nestedTodos: TodoItem[]): TodoItem[] => {
    const result: TodoItem[] = [];
    
    const flatten = (todos: TodoItem[]) => {
      todos.forEach(todo => {
        const { children, ...todoWithoutChildren } = todo;
        result.push(todoWithoutChildren);
        if (children && children.length > 0) {
          flatten(children);
        }
      });
    };
    
    flatten(nestedTodos);
    return result;
  };

  // 保存到localStorage
  useEffect(() => {
    // 保存时扁平化结构
    const flatTodos = flattenTodos(todos);
    localStorage.setItem('todos', JSON.stringify(flatTodos));
  }, [todos]);

  // 拖拽结束处理函数
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('拖拽结束:', { activeId: active.id, overId: over?.id });

    if (active.id !== over?.id && over) {
      // 使用当前显示的filteredTodos进行拖拽操作
      const oldIndex = filteredTodos.findIndex((todo) => todo.id === active.id);
      const newIndex = filteredTodos.findIndex((todo) => todo.id === over.id);

      console.log('拖拽索引:', { oldIndex, newIndex, filteredTodosLength: filteredTodos.length });

      if (oldIndex !== -1 && newIndex !== -1) {
        // 重新排序当前显示的todos
        const reorderedFiltered = arrayMove(filteredTodos, oldIndex, newIndex);
        
        // 重新构建完整的todos数组，保持其他未显示项目的位置
        const newTodos = [...todos];
        
        // 更新拖拽涉及的项目的order
        reorderedFiltered.forEach((todo, index) => {
          const todoIndex = newTodos.findIndex(t => t.id === todo.id);
          if (todoIndex !== -1) {
            newTodos[todoIndex] = { ...todo, order: index };
          }
        });
        
        console.log('拖拽成功，新顺序:', reorderedFiltered.map(t => t.text));
        
        setTodos(newTodos);
        // 自动切换到自定义排序模式
        setSortBy('custom');
      }
    }
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;

    const todo: TodoItem = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      createdAt: Date.now(),
      priority: 'medium',
      category: newCategory.trim() || undefined,
      order: todos.length, // 新任务放在最后
      parentId: null,
      children: []
    };

    setTodos([todo, ...todos]); // 新任务放在最前面
    setNewTodo('');
    setNewCategory('');
  };

  // 添加子任务
  const addSubtask = (parentId: string) => {
    if (!newSubtaskText.trim()) {
      alert('请输入子任务内容');
      return;
    }

    const subtask: TodoItem = {
      id: Date.now().toString(),
      text: newSubtaskText.trim(),
      completed: false,
      createdAt: Date.now(),
      priority: 'medium',
      category: newSubtaskCategory.trim() || undefined,
      order: 0,
      parentId: parentId,
      children: []
    };

    const addSubtaskRecursive = (todoList: TodoItem[]): TodoItem[] => {
      return todoList.map(todo => {
        if (todo.id === parentId) {
          return {
            ...todo,
            children: [subtask, ...(todo.children || [])]
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
  };

  const toggleTodo = (id: string) => {
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
  };

  const deleteTodo = (id: string) => {
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
  };

  const updatePriority = (id: string, priority: 'low' | 'medium' | 'high') => {
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
  const SortableTodoItem: React.FC<{ todo: TodoItem }> = ({ todo }) => {
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

    return (
      <div>
        <div
          ref={setNodeRef}
          style={{ 
            ...style,
            touchAction: 'none' // 防止移动端触摸滚动
          }}
          {...attributes}
          {...listeners} // 整个卡片都可拖拽
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
              <SortableTodoItem key={child.id} todo={child} />
            ))}
          </div>
        )}
      </div>
    );
  };

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

      {/* 筛选和排序 */}
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
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'created' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('created')}
              >
                按时间
              </Button>
              <Button
                variant={sortBy === 'priority' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('priority')}
              >
                按优先级
              </Button>
              <Button
                variant={sortBy === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('custom')}
              >
                自定义排序
              </Button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-3 max-h-[500px] overflow-y-auto timer-scroll-area">
              <SortableContext items={filteredTodos.map(todo => todo.id)} strategy={verticalListSortingStrategy}>
                {filteredTodos.map(todo => (
                  <SortableTodoItem key={todo.id} todo={todo} />
                ))}
              </SortableContext>
              {filteredTodos.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  {filter === 'all' ? '暂无任务' : `暂无${filter === 'active' ? '待完成' : '已完成'}的任务`}
                </div>
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

export default TodoList;



