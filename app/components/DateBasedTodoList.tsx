'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAtUnix: number;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  date: string;
  userId: string;
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

  // 从数据库加载数据
  const fetchTodos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/todos?userId=${userId}&date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setTodos(data);
      }
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [userId, date, fetchTodos]);

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
          date
        }),
      });

      if (response.ok) {
        const todo = await response.json();
        setTodos([...todos, todo]);
        setNewTodo('');
        setNewCategory('');
      }
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
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
        setTodos(todos.map(t => 
          t.id === id ? { ...t, completed: !t.completed } : t
        ));
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
        setTodos(todos.filter(todo => todo.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const updatePriority = async (id: string, priority: 'low' | 'medium' | 'high') => {
    const todo = todos.find(t => t.id === id);
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
        setTodos(todos.map(t => 
          t.id === id ? { ...t, priority } : t
        ));
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
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
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mx-auto"></div>
              </div>
            ) : filteredTodos.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-sm">
                {filter === 'all' ? '暂无任务' : `暂无${filter === 'active' ? '待完成' : '已完成'}的任务`}
              </div>
            ) : (
              filteredTodos.map(todo => (
                <div
                  key={todo.id}
                  className={`flex items-center gap-2 p-2 border rounded-lg text-sm ${
                    todo.completed ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                      {todo.text}
                    </div>
                    {todo.category && (
                      <div className="text-xs text-gray-500">{todo.category}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
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
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTodo(todo.id)}
                      className="text-red-600 hover:text-red-700 p-1 h-6 w-6"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
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

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : filteredTodos.map(todo => (
              <div
                key={todo.id}
                className={`flex items-center gap-3 p-3 border rounded-lg ${
                  todo.completed ? 'bg-gray-50' : 'bg-white'
                }`}
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo.id)}
                />
                <div className="flex-1">
                  <div className={`font-medium ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                    {todo.text}
                  </div>
                  {todo.category && (
                    <div className="text-sm text-gray-500">{todo.category}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
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
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTodo(todo.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))}
            {!loading && filteredTodos.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                {filter === 'all' ? '暂无任务' : `暂无${filter === 'active' ? '待完成' : '已完成'}的任务`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DateBasedTodoList;
