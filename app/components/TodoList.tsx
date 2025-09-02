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
  createdAt: number;
  priority: 'low' | 'medium' | 'high';
  category?: string;
}

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'priority'>('created');

  // 从localStorage加载数据
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }
  }, []);

  // 保存到localStorage
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (!newTodo.trim()) return;

    const todo: TodoItem = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      createdAt: Date.now(),
      priority: 'medium',
      category: newCategory.trim() || undefined
    };

    setTodos([...todos, todo]);
    setNewTodo('');
    setNewCategory('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const updatePriority = (id: string, priority: 'low' | 'medium' | 'high') => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, priority } : todo
    ));
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
            </div>
          </div>

          <div className="space-y-3">
            {sortedTodos.map(todo => (
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
            {sortedTodos.length === 0 && (
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

export default TodoList;
