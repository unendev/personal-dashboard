'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Checkbox } from '@/app/components/ui/checkbox';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  userId: string;
  date: string;
}

interface EnhancedTodoListProps {
  userId: string;
  onTodoCompleted?: (todo: TodoItem) => void;
  onTodoAdded?: (todo: TodoItem) => void;
  className?: string;
}

const EnhancedTodoList: React.FC<EnhancedTodoListProps> = ({ 
  userId, 
  onTodoCompleted, 
  onTodoAdded,
  className = ''
}) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'priority'>('created');
  const [isLoading, setIsLoading] = useState(false);

  const loadTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/todos?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setTodos(data);
      } else {
        console.error('Failed to load todos');
        setTodos([]);
      }
    } catch (error) {
      console.error('Error loading todos:', error);
      setTodos([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 从数据库加载数据
  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const addTodo = async () => {
    if (!newTodo.trim()) return;

    const todo: Omit<TodoItem, 'id'> = {
      text: newTodo.trim(),
      completed: false,
      createdAt: Date.now(),
      priority: 'medium',
      category: newCategory.trim() || undefined,
      userId,
      date: new Date().toISOString().split('T')[0] // 使用当前日期作为创建日期
    };

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todo),
      });

      if (response.ok) {
        const createdTodo = await response.json();
        setTodos([...todos, createdTodo]);
        setNewTodo('');
        setNewCategory('');
        
        if (onTodoAdded) {
          onTodoAdded(createdTodo);
        }
      } else {
        console.error('Failed to add todo');
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const updatedTodo = { ...todo, completed: !todo.completed };

    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTodo),
      });

      if (response.ok) {
        setTodos(todos.map(t => t.id === id ? updatedTodo : t));
        
        if (onTodoCompleted && updatedTodo.completed) {
          onTodoCompleted(updatedTodo);
        }
      } else {
        console.error('Failed to update todo');
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTodos(todos.filter(todo => todo.id !== id));
      } else {
        console.error('Failed to delete todo');
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const updatePriority = async (id: string, priority: 'low' | 'medium' | 'high') => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const updatedTodo = { ...todo, priority };

    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTodo),
      });

      if (response.ok) {
        setTodos(todos.map(t => t.id === id ? updatedTodo : t));
      } else {
        console.error('Failed to update todo priority');
      }
    } catch (error) {
      console.error('Error updating todo priority:', error);
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.createdAt - a.createdAt;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    active: todos.filter(t => !t.completed).length
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <div className="text-center">
          <div className="text-xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-xs text-gray-500">总任务</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-green-600">{stats.active}</div>
          <div className="text-xs text-gray-500">待完成</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-purple-600">{stats.completed}</div>
          <div className="text-xs text-gray-500">已完成</div>
        </div>
      </div>

      {/* 添加新任务 */}
      <div className="space-y-3">
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
            placeholder="分类"
            className="w-24"
          />
          <Button onClick={addTodo} size="sm">添加</Button>
        </div>
      </div>

      {/* 筛选和排序 */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1">
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
        <div className="flex gap-1">
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
        </div>
      </div>

      {/* 任务列表 */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="text-center text-gray-500 py-4">加载中...</div>
        ) : sortedTodos.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            {filter === 'all' ? '暂无任务' : `暂无${filter === 'active' ? '待完成' : '已完成'}的任务`}
          </div>
        ) : (
          sortedTodos.map(todo => (
            <div
              key={todo.id}
              className={`flex items-center gap-3 p-3 border rounded-lg transition-all duration-200 ${
                todo.completed 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-white border-gray-300 hover:border-blue-300'
              }`}
            >
              <Checkbox
                checked={todo.completed}
                onCheckedChange={() => toggleTodo(todo.id)}
                className="mt-0"
              />
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                  {todo.text}
                </div>
                {todo.category && (
                  <div className="text-xs text-gray-500 mt-1">{todo.category}</div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={todo.priority}
                  onChange={(e) => updatePriority(todo.id, e.target.value as 'low' | 'medium' | 'high')}
                  className={`text-xs px-2 py-1 rounded border-0 ${getPriorityColor(todo.priority)}`}
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTodo(todo.id)}
                  className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EnhancedTodoList;



