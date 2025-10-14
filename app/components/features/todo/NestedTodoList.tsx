'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Filter,
  Clock,
} from 'lucide-react'
import useSWR from 'swr'

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
  onStartTimer?: (taskName: string, category: string) => void
  level: number
}

function TodoItem({
  todo,
  allTodos,
  onToggle,
  onDelete,
  onUpdate,
  onCreateTask,
  onStartTimer,
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
          flex items-center gap-2 p-3 rounded-lg border transition-all duration-200
          ${todo.isGroup 
            ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-700/30 hover:from-blue-900/30 hover:to-purple-900/30' 
            : todo.completed
              ? 'bg-green-900/20 border-green-700/30 hover:bg-green-900/30'
              : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70'
          }
          ${todo.priority === 'high' ? 'border-l-4 border-l-red-500' : ''}
          ${todo.priority === 'medium' ? 'border-l-4 border-l-yellow-500' : ''}
          shadow-sm hover:shadow-md
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
            {/* 启动计时器按钮（仅任务） */}
            {!todo.isGroup && !todo.completed && onStartTimer && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStartTimer(todo.text, todo.category || '工作')}
                title="启动计时器"
                className="text-blue-400 hover:text-blue-300"
              >
                <Clock className="h-4 w-4" />
              </Button>
            )}
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
                onStartTimer={onStartTimer}
                level={level + 1}
              />
            ))}
        </div>
      )}
    </div>
  )
}

interface NestedTodoListProps {
  onStartTimer?: (taskName: string, category: string) => void
}

// SWR fetcher
const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function NestedTodoList({ onStartTimer }: NestedTodoListProps = {}) {
  const [newItemText, setNewItemText] = useState('')
  const [newItemType, setNewItemType] = useState<'group' | 'task'>('task')
  
  // 搜索和过滤状态
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all')

  // 使用 SWR 获取待办清单（1分钟缓存）
  const { data: todos = [], error, mutate, isLoading } = useSWR('/api/todos', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60 * 1000, // 1分钟内不重复请求
  })

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
        // 乐观更新：立即添加到列表
        mutate([...todos, newTodo], false)
        setNewItemText('')
      }
    } catch (error) {
      console.error('创建失败:', error)
      mutate() // 失败时重新验证
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
        mutate([...todos, newTodo], false)
      }
    } catch (error) {
      console.error('创建任务失败:', error)
      mutate()
    }
  }

  const handleToggle = async (id: string) => {
    const todo = todos.find((t: Todo) => t.id === id)
    if (!todo) return

    // 乐观更新
    const updatedTodos = todos.map((t: Todo) => (t.id === id ? { ...t, completed: !t.completed } : t))
    mutate(updatedTodos, false)

    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          completed: !todo.completed,
        }),
      })

      if (!response.ok) {
        throw new Error('更新失败')
      }
    } catch (error) {
      console.error('更新失败:', error)
      mutate() // 失败时回滚
    }
  }

  const handleUpdate = async (id: string, updates: Partial<Todo>) => {
    // 乐观更新
    const updatedTodos = todos.map((t: Todo) => (t.id === id ? { ...t, ...updates } : t))
    mutate(updatedTodos, false)

    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!response.ok) {
        throw new Error('更新失败')
      }
    } catch (error) {
      console.error('更新失败:', error)
      mutate() // 失败时回滚
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return

    // 乐观更新：立即移除
    const updatedTodos = todos.filter((t: Todo) => t.id !== id && t.groupId !== id)
    mutate(updatedTodos, false)

    try {
      const response = await fetch(`/api/todos?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // 删除成功，重新验证以确保级联删除生效
        mutate()
      } else {
        throw new Error('删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      mutate() // 失败时回滚
    }
  }

  // 过滤和搜索逻辑
  const getFilteredTodos = () => {
    let filtered = [...todos]
    
    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => 
        t.text.toLowerCase().includes(query)
      )
    }
    
    // 优先级过滤
    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => 
        t.isGroup || t.priority === filterPriority
      )
    }
    
    // 状态过滤
    if (filterStatus === 'active') {
      filtered = filtered.filter(t => t.isGroup || !t.completed)
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(t => t.isGroup || t.completed)
    }
    
    return filtered
  }

  const filteredTodos = getFilteredTodos()
  
  // 过滤出根级项目（没有 groupId 的）
  const rootTodos = filteredTodos.filter(t => !t.groupId).sort((a, b) => a.order - b.order)

  // 统计
  const totalTasks = todos.filter((t: Todo) => !t.isGroup).length
  const completedTasks = todos.filter((t: Todo) => !t.isGroup && t.completed).length
  const highPriorityTasks = todos.filter((t: Todo) => !t.isGroup && t.priority === 'high' && !t.completed).length

  // 加载状态
  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        加载待办清单...
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="p-8 text-center text-red-400">
        加载失败，请刷新重试
      </div>
    )
  }

  return (
    <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/30">
      {/* 统计面板 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/30">
          <div className="text-xs text-blue-300 mb-1">总任务</div>
          <div className="text-2xl font-bold text-blue-400">{totalTasks}</div>
        </div>
        <div className="bg-green-900/20 rounded-lg p-3 border border-green-700/30">
          <div className="text-xs text-green-300 mb-1">已完成</div>
          <div className="text-2xl font-bold text-green-400">
            {completedTasks}
            <span className="text-sm ml-1 text-gray-400">
              ({totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)
            </span>
          </div>
        </div>
        <div className="bg-red-900/20 rounded-lg p-3 border border-red-700/30">
          <div className="text-xs text-red-300 mb-1">高优先级</div>
          <div className="text-2xl font-bold text-red-400">{highPriorityTasks}</div>
        </div>
      </div>

      {/* 搜索和过滤区域 */}
      <div className="border-b border-gray-700 pb-4 mb-4 space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索任务..."
            className="pl-10"
          />
        </div>

        {/* 过滤器 */}
        <div className="flex gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Filter className="h-3 w-3" />
            <span>状态:</span>
          </div>
          <Button
            size="sm"
            variant={filterStatus === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilterStatus('all')}
            className="h-7"
          >
            全部
          </Button>
          <Button
            size="sm"
            variant={filterStatus === 'active' ? 'default' : 'ghost'}
            onClick={() => setFilterStatus('active')}
            className="h-7"
          >
            进行中
          </Button>
          <Button
            size="sm"
            variant={filterStatus === 'completed' ? 'default' : 'ghost'}
            onClick={() => setFilterStatus('completed')}
            className="h-7"
          >
            已完成
          </Button>
          
          <div className="w-px h-6 bg-gray-700 mx-1" />
          
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>优先级:</span>
          </div>
          <Button
            size="sm"
            variant={filterPriority === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilterPriority('all')}
            className="h-7"
          >
            全部
          </Button>
          <Button
            size="sm"
            variant={filterPriority === 'high' ? 'default' : 'ghost'}
            onClick={() => setFilterPriority('high')}
            className="h-7"
          >
            ⚡高
          </Button>
          <Button
            size="sm"
            variant={filterPriority === 'medium' ? 'default' : 'ghost'}
            onClick={() => setFilterPriority('medium')}
            className="h-7"
          >
            📌中
          </Button>
          <Button
            size="sm"
            variant={filterPriority === 'low' ? 'default' : 'ghost'}
            onClick={() => setFilterPriority('low')}
            className="h-7"
          >
            📝低
          </Button>
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
            {searchQuery || filterPriority !== 'all' || filterStatus !== 'all' ? (
              <>
                <div className="text-4xl mb-2">🔍</div>
                <div>未找到匹配的任务</div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('')
                    setFilterPriority('all')
                    setFilterStatus('all')
                  }}
                  className="mt-2"
                >
                  清除筛选
                </Button>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">📝</div>
                <div>暂无待办事项，创建一个开始吧！</div>
              </>
            )}
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
              onStartTimer={onStartTimer}
              level={0}
            />
          ))
        )}
      </div>
    </div>
  )
}

