'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react'

interface Todo {
  id: string
  text: string
  completed: boolean
  priority: string
  category?: string
  groupId?: string | null
  isGroup: boolean
  collapsed: boolean
  order: number
}

interface TodoItemProps {
  todo: Todo
  allTodos: Todo[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Todo>) => void
  onCreateTask: (groupId: string) => void
  level: number
}

function TodoItem({
  todo,
  allTodos,
  onToggle,
  onDelete,
  onUpdate,
  onCreateTask,
  level,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(todo.text)

  const childTodos = allTodos.filter(t => t.groupId === todo.id)
  const hasChildren = childTodos.length > 0

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(todo.id, { text: editText.trim() })
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditText(todo.text)
    setIsEditing(false)
  }

  const priorityColors = {
    high: 'text-red-400',
    medium: 'text-yellow-400',
    low: 'text-green-400',
  }

  return (
    <div className="mb-1">
      <div
        className={`
          flex items-center gap-2 p-2 rounded
          ${todo.isGroup ? 'bg-gray-700/50' : 'bg-gray-800/30'}
          hover:bg-gray-700/70 transition-colors
        `}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* 折叠按钮（仅分组） */}
        {todo.isGroup && (
          <button
            onClick={() => onUpdate(todo.id, { collapsed: !todo.collapsed })}
            className="text-gray-400 hover:text-gray-200"
          >
            {todo.collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}

        {/* 占位符（非分组） */}
        {!todo.isGroup && !hasChildren && <div className="w-4" />}

        {/* 复选框（仅任务） */}
        {!todo.isGroup && (
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => onToggle(todo.id)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
          />
        )}

        {/* 分组图标 */}
        {todo.isGroup && <span className="text-xl">📁</span>}

        {/* 文本内容 */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
              className="flex-1 h-8"
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={handleSave}>
              <Check className="h-4 w-4 text-green-400" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        ) : (
          <span
            className={`
              flex-1 ${todo.completed ? 'line-through text-gray-500' : 'text-gray-200'}
              ${todo.isGroup ? 'font-semibold' : ''}
            `}
          >
            {todo.text}
          </span>
        )}

        {/* 优先级标签（仅任务） */}
        {!todo.isGroup && !isEditing && (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              priorityColors[todo.priority as keyof typeof priorityColors] || 'text-gray-400'
            }`}
          >
            {todo.priority === 'high' && '⚡高'}
            {todo.priority === 'medium' && '📌中'}
            {todo.priority === 'low' && '📝低'}
          </span>
        )}

        {/* 操作按钮 */}
        {!isEditing && (
          <div className="flex items-center gap-1">
            {todo.isGroup && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCreateTask(todo.id)}
                title="添加任务"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              title="编辑"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(todo.id)}
              title="删除"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        )}
      </div>

      {/* 子项（如果未折叠） */}
      {todo.isGroup && !todo.collapsed && hasChildren && (
        <div className="mt-1">
          {childTodos
            .sort((a, b) => a.order - b.order)
            .map((child) => (
              <TodoItem
                key={child.id}
                todo={child}
                allTodos={allTodos}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onCreateTask={onCreateTask}
                level={level + 1}
              />
            ))}
        </div>
      )}
    </div>
  )
}

export default function NestedTodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [newItemText, setNewItemText] = useState('')
  const [newItemType, setNewItemType] = useState<'group' | 'task'>('task')

  useEffect(() => {
    loadTodos()
  }, [])

  const loadTodos = async () => {
    try {
      const response = await fetch('/api/todos')
      if (response.ok) {
        const data = await response.json()
        setTodos(data)
      }
    } catch (error) {
      console.error('加载待办清单失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newItemText.trim()) return

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newItemText.trim(),
          isGroup: newItemType === 'group',
          priority: 'medium',
        }),
      })

      if (response.ok) {
        const newTodo = await response.json()
        setTodos([...todos, newTodo])
        setNewItemText('')
      }
    } catch (error) {
      console.error('创建失败:', error)
    }
  }

  const handleCreateTask = async (groupId: string) => {
    const taskName = prompt('请输入任务名称:')
    if (!taskName?.trim()) return

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: taskName.trim(),
          groupId,
          isGroup: false,
          priority: 'medium',
        }),
      })

      if (response.ok) {
        const newTodo = await response.json()
        setTodos([...todos, newTodo])
      }
    } catch (error) {
      console.error('创建任务失败:', error)
    }
  }

  const handleToggle = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return

    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          completed: !todo.completed,
        }),
      })

      if (response.ok) {
        setTodos(todos.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)))
      }
    } catch (error) {
      console.error('更新失败:', error)
    }
  }

  const handleUpdate = async (id: string, updates: Partial<Todo>) => {
    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })

      if (response.ok) {
        setTodos(todos.map(t => (t.id === id ? { ...t, ...updates } : t)))
      }
    } catch (error) {
      console.error('更新失败:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return

    try {
      const response = await fetch(`/api/todos?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTodos(todos.filter(t => t.id !== id && t.groupId !== id))
        await loadTodos() // 重新加载以确保级联删除生效
      }
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  // 过滤出根级项目（没有 groupId 的）
  const rootTodos = todos.filter(t => !t.groupId).sort((a, b) => a.order - b.order)

  // 统计
  const totalTasks = todos.filter(t => !t.isGroup).length
  const completedTasks = todos.filter(t => !t.isGroup && t.completed).length

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        加载中...
      </div>
    )
  }

  return (
    <div>
      {/* 统计和创建区域 */}
      <div className="border-b border-gray-700 pb-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-400">
            {completedTasks} / {totalTasks} 已完成
          </div>
        </div>

        {/* 创建新项 */}
        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-700/50 rounded p-1">
            <Button
              size="sm"
              variant={newItemType === 'task' ? 'default' : 'ghost'}
              onClick={() => setNewItemType('task')}
            >
              ✅ 任务
            </Button>
            <Button
              size="sm"
              variant={newItemType === 'group' ? 'default' : 'ghost'}
              onClick={() => setNewItemType('group')}
            >
              📁 分组
            </Button>
          </div>
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder={newItemType === 'group' ? '新建分组...' : '新建任务...'}
            className="flex-1"
          />
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 待办清单 */}
      <div className="max-h-[500px] overflow-y-auto">
        {rootTodos.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            暂无待办事项，创建一个开始吧！
          </div>
        ) : (
          rootTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              allTodos={todos}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onCreateTask={handleCreateTask}
              level={0}
            />
          ))
        )}
      </div>
    </div>
  )
}

