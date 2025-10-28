'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { fetchWithRetry } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ==================== 类型定义 ====================

interface TimerTask {
  id: string;
  name: string;
  category?: string;
  categoryPath?: string;
  instanceTag?: string | null;
  startTime: number | null;
  totalTime?: number;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  isPaused: boolean;
  pausedTime: number;
  parentId?: string | null;
  children?: TimerTask[];
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface DailyStats {
  totalTime: number;
  taskCount: number;
  categories: { [key: string]: number };
}

interface QuickTask {
  id: string;
  name: string;
  category: string;
  startTime: number | null;
  totalTime: number;
  isRunning: boolean;
  isPaused: boolean;
  pausedTime: number;
}

// ==================== 工具函数 ====================

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`
  } else {
    return `${minutes}m`
  }
}

const calculateTotalTime = (task: TimerTask): number => {
  let total = task.elapsedTime || 0
  if (task.children) {
    task.children.forEach(child => {
      total += calculateTotalTime(child)
    })
  }
  return total
}

// ==================== 拖拽排序组件 ====================

interface SortableTaskItemProps {
  task: TimerTask;
  level?: number;
  onStart: (task: TimerTask) => void;
  onPause: (task: TimerTask) => void;
  onStop: (task: TimerTask) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (task: TimerTask) => void;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  level = 0,
  onStart,
  onPause,
  onStop,
  onDelete,
  onUpdate
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginLeft: `${level * 20}px`
  }

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(task.name)

  const handleEdit = () => {
    if (isEditing) {
      onUpdate({ ...task, name: editName })
      setIsEditing(false)
    } else {
      setIsEditing(true)
    }
  }

  const totalTime = calculateTotalTime(task)

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-white hover:bg-gray-50">
        <div className="flex items-center space-x-3 flex-1">
          <div {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
            ⋮⋮
          </div>
          
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleEdit}
              onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
              className="flex-1"
              autoFocus
            />
          ) : (
            <div className="flex-1">
              <div className="font-medium">{task.name}</div>
              {task.categoryPath && (
                <div className="text-xs text-gray-500">{task.categoryPath}</div>
              )}
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            {formatTime(totalTime)}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {task.isRunning ? (
            <>
              <Button size="sm" variant="outline" onClick={() => onPause(task)}>
                {task.isPaused ? '继续' : '暂停'}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onStop(task)}>
                停止
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => onStart(task)} className="bg-green-600 hover:bg-green-700">
              开始
            </Button>
          )}
          
          <Button size="sm" variant="outline" onClick={handleEdit}>
            {isEditing ? '保存' : '编辑'}
          </Button>
          
          <Button size="sm" variant="outline" onClick={() => onDelete(task.id)} className="text-red-600">
            删除
          </Button>
        </div>
      </div>
    </div>
  )
}

// ==================== 嵌套计时器组件 ====================

interface NestedTimerZoneProps {
  userId?: string;
  className?: string;
}

const NestedTimerZone: React.FC<NestedTimerZoneProps> = ({ 
  userId = 'user-1', 
  className = '' 
}) => {
  const [tasks, setTasks] = useState<TimerTask[]>([])
  const [currentTask, setCurrentTask] = useState<TimerTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 加载任务
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetchWithRetry(`/api/timer-tasks?userId=${userId}`)
      const data = await response.json()
      
      const tasksArray = Array.isArray(data) ? data : []
      setTasks(tasksArray)
      
      // 查找正在运行的任务
      const runningTask = tasksArray.find(task => task.isRunning && !task.isPaused)
      if (runningTask) {
        setCurrentTask(runningTask)
        if (runningTask.startTime) {
          setElapsedTime(Math.floor(Date.now() / 1000 - runningTask.startTime) + (runningTask.elapsedTime || 0))
        }
      }
    } catch (err) {
      setError('Failed to load timer tasks')
      console.error('Error loading tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // 更新计时器显示
  useEffect(() => {
    if (currentTask && currentTask.isRunning && !currentTask.isPaused && currentTask.startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor(Date.now() / 1000 - currentTask.startTime!) + (currentTask.elapsedTime || 0))
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentTask])

  const createTask = async () => {
    if (!newTaskName.trim()) return

    try {
      const response = await fetch('/api/timer-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTaskName.trim(),
          categoryPath: newTaskCategory.trim() || '未分类',
          userId
        })
      })

      if (response.ok) {
        setNewTaskName('')
        setNewTaskCategory('')
        setShowAddDialog(false)
        await loadTasks()
      }
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const startTask = async (task: TimerTask) => {
    try {
      // 停止当前任务
      if (currentTask && currentTask.isRunning) {
        await stopTask(currentTask)
      }

      const response = await fetch(`/api/timer-tasks/${task.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        const updatedTask = await response.json()
        setCurrentTask(updatedTask)
        setElapsedTime(updatedTask.elapsedTime || 0)
        await loadTasks()
      }
    } catch (error) {
      console.error('Failed to start task:', error)
    }
  }

  const pauseTask = async (task: TimerTask) => {
    try {
      const response = await fetch(`/api/timer-tasks/${task.id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        const updatedTask = await response.json()
        setCurrentTask(updatedTask)
        await loadTasks()
      }
    } catch (error) {
      console.error('Failed to pause task:', error)
    }
  }

  const stopTask = async (task: TimerTask) => {
    try {
      const response = await fetch(`/api/timer-tasks/${task.id}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        setCurrentTask(null)
        setElapsedTime(0)
        await loadTasks()
      }
    } catch (error) {
      console.error('Failed to stop task:', error)
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/timer-tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        if (currentTask?.id === taskId) {
          setCurrentTask(null)
          setElapsedTime(0)
        }
        await loadTasks()
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const updateTask = async (task: TimerTask) => {
    try {
      const response = await fetch(`/api/timer-tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, userId })
      })

      if (response.ok) {
        await loadTasks()
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over?.id)

        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // 更新服务器顺序
        newItems.forEach(async (item, index) => {
          await updateTask({ ...item, order: index })
        })

        return newItems
      })
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>嵌套计时器</span>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            添加任务
          </Button>
        </CardTitle>
        
        {/* 当前任务显示 */}
        {currentTask && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-blue-800">{currentTask.name}</div>
                <div className="text-sm text-blue-600">{currentTask.categoryPath}</div>
              </div>
              <div className="text-2xl font-mono text-blue-600">
                {formatTime(elapsedTime)}
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="text-red-500 bg-red-50 p-3 rounded mb-4">
            {error}
            <Button onClick={loadTasks} size="sm" className="ml-2">重试</Button>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            暂无计时任务，点击&quot;添加任务&quot;开始
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={tasks} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    onStart={startTask}
                    onPause={pauseTask}
                    onStop={stopTask}
                    onDelete={deleteTask}
                    onUpdate={updateTask}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* 添加任务对话框 */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新任务</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">任务名称</label>
                <Input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="输入任务名称..."
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium">分类路径</label>
                <Input
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value)}
                  placeholder="例如：工作 > 开发 > 前端"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                取消
              </Button>
              <Button onClick={createTask} disabled={!newTaskName.trim()}>
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// ==================== 快速计时器组件 ====================

const QuickTimer: React.FC = () => {
  const [tasks, setTasks] = useState<QuickTask[]>([])
  const [currentTask, setCurrentTask] = useState<QuickTask | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 从localStorage加载任务
  useEffect(() => {
    const savedTasks = localStorage.getItem('quick-timer-tasks')
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks)
      setTasks(parsedTasks)
      
      const runningTask = parsedTasks.find((task: QuickTask) => task.isRunning)
      if (runningTask) {
        setCurrentTask(runningTask)
        if (runningTask.startTime && !runningTask.isPaused) {
          setElapsedTime(Math.floor((Date.now() / 1000 - runningTask.startTime)))
        }
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('quick-timer-tasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    if (currentTask && currentTask.isRunning && !currentTask.isPaused && currentTask.startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() / 1000 - currentTask.startTime!)))
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentTask])

  const addTask = () => {
    if (!newTaskName.trim()) {
      alert('请输入任务名称')
      return
    }

    const newTask: QuickTask = {
      id: Date.now().toString(),
      name: newTaskName.trim(),
      category: newTaskCategory.trim(),
      startTime: null,
      totalTime: 0,
      isRunning: false,
      isPaused: false,
      pausedTime: 0
    }

    setTasks([...tasks, newTask])
    setNewTaskName('')
    setNewTaskCategory('')
    setShowAddDialog(false)
  }

  const startTask = (task: QuickTask) => {
    if (currentTask && currentTask.isRunning) {
      stopCurrentTask()
    }

    const updatedTask = {
      ...task,
      startTime: Math.floor(Date.now() / 1000),
      isRunning: true,
      isPaused: false,
      pausedTime: 0
    }

    setTasks(tasks.map(t => t.id === task.id ? updatedTask : t))
    setCurrentTask(updatedTask)
    setElapsedTime(0)
  }

  const pauseTask = async () => {
    if (!currentTask || !currentTask.isRunning) return

    const updatedTask = {
      ...currentTask,
      isPaused: true,
      pausedTime: Math.floor(Date.now() / 1000)
    }

    setTasks(tasks.map(t => t.id === currentTask.id ? updatedTask : t))
    setCurrentTask(updatedTask)
    
    // 持久化到数据库
    await updateTask(updatedTask)
  }

  const resumeTask = async () => {
    if (!currentTask || !currentTask.isPaused) return

    const pauseDuration = Math.floor(Date.now() / 1000) - currentTask.pausedTime
    const updatedTask = {
      ...currentTask,
      startTime: currentTask.startTime! + pauseDuration,
      isPaused: false,
      pausedTime: 0
    }

    setTasks(tasks.map(t => t.id === currentTask.id ? updatedTask : t))
    setCurrentTask(updatedTask)
    
    // 持久化到数据库
    await updateTask(updatedTask)
  }

  const stopCurrentTask = async () => {
    if (!currentTask || !currentTask.startTime) return

    const elapsed = currentTask.isPaused 
      ? currentTask.elapsedTime 
      : Math.floor((Date.now() / 1000 - currentTask.startTime))
    
    const updatedTask = {
      ...currentTask,
      startTime: null,
      elapsedTime: elapsed,
      totalTime: (currentTask.totalTime || 0) + elapsed,
      isRunning: false,
      isPaused: false,
      pausedTime: 0
    }

    setTasks(tasks.map(t => t.id === currentTask.id ? updatedTask : t))
    setCurrentTask(null)
    setElapsedTime(0)
    
    // 持久化到数据库
    await updateTask(updatedTask)
  }

  return (
    <div className="space-y-4">
      {/* 当前任务显示 */}
      {currentTask && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-800 flex items-center justify-between">
              <span>⏱️ {currentTask.name}</span>
              {currentTask.category && (
                <span className="text-sm bg-blue-200 px-2 py-1 rounded-full">
                  {currentTask.category}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono text-blue-600 mb-3 text-center">
              {formatTime(elapsedTime)}
            </div>
            <div className="flex gap-2">
              {currentTask.isPaused ? (
                <Button 
                  onClick={resumeTask}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  继续
                </Button>
              ) : (
                <Button 
                  onClick={pauseTask}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  暂停
                </Button>
              )}
              <Button 
                variant="destructive" 
                onClick={stopCurrentTask}
                className="flex-1"
                size="sm"
              >
                完成
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 快速任务切换 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">快速切换</h3>
          <Button 
            onClick={() => setShowAddDialog(true)}
            size="sm"
            variant="outline"
          >
            添加任务
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {tasks.slice(0, 4).map(task => (
            <div key={task.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{task.name}</div>
                <div className="text-xs text-gray-400">
                  {formatTime(task.totalTime)}
                </div>
              </div>
              <div className="flex gap-1">
                {task.isRunning ? (
                  <Button variant="outline" size="sm" disabled className="text-xs px-2">
                    计时中
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => startTask(task)}
                    className="text-xs px-2"
                  >
                    开始
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {tasks.length === 0 && (
          <div className="text-center text-gray-500 py-4 text-sm">
            暂无任务，点击&quot;添加任务&quot;开始计时
          </div>
        )}
      </div>

      {/* 添加任务弹框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新任务</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                任务名称
              </label>
              <Input
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="输入任务名称..."
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类 (可选)
              </label>
              <Input
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value)}
                placeholder="输入分类..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={addTask}>
              添加任务
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== 行内计时器组件 ====================

interface InlineTimerProps {
  taskName: string;
  categoryPath: string;
  onTimeRecorded: (duration: string) => void;
  onCancel: () => void;
}

const InlineTimer: React.FC<InlineTimerProps> = ({ 
  taskName, 
  categoryPath, 
  onTimeRecorded, 
  onCancel 
}) => {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true)
      setStartTime(Math.floor(Date.now() / 1000))
    }
  }

  const stopTimer = () => {
    if (isRunning) {
      setIsRunning(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }

  const recordTime = () => {
    stopTimer()
    const duration = formatDuration(elapsedTime)
    onTimeRecorded(duration)
  }

  const resetTimer = () => {
    stopTimer()
    setElapsedTime(0)
    setStartTime(null)
  }

  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() / 1000 - startTime)))
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, startTime])

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          计时: {taskName}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          分类: {categoryPath}
        </p>
        
        <div className="text-3xl font-mono text-blue-600 mb-4">
          {formatTime(elapsedTime)}
        </div>
      </div>

      <div className="flex gap-2">
        {!isRunning ? (
          <Button 
            onClick={startTimer}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            开始计时
          </Button>
        ) : (
          <Button 
            onClick={stopTimer}
            variant="outline"
            className="flex-1"
          >
            暂停
          </Button>
        )}
        
        <Button 
          onClick={resetTimer}
          variant="outline"
          size="sm"
        >
          重置
        </Button>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={recordTime}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          disabled={elapsedTime === 0}
        >
          记录时间 ({formatDuration(elapsedTime)})
        </Button>
        
        <Button 
          onClick={onCancel}
          variant="outline"
          className="flex-1"
        >
          取消
        </Button>
      </div>
    </div>
  )
}

// ==================== 计时器小部件 ====================

const TimerWidget: React.FC = () => {
  const [currentTask, setCurrentTask] = useState<TimerTask | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [userId] = useState('user-1')

  useEffect(() => {
    const loadRunningTask = async () => {
      try {
        const response = await fetch('/api/timer-tasks/running')
        if (response.ok) {
          const runningTask = await response.json()
          if (runningTask) {
            setCurrentTask(runningTask)
            if (runningTask.startTime) {
              if (runningTask.isPaused) {
                setElapsedTime(runningTask.elapsedTime)
              } else {
                const currentRunTime = Math.floor((Date.now() / 1000 - runningTask.startTime))
                setElapsedTime(runningTask.elapsedTime + currentRunTime)
              }
            } else {
              setElapsedTime(runningTask.elapsedTime)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load running task:', error)
      }
    }

    loadRunningTask()
  }, [userId])

  useEffect(() => {
    if (currentTask && currentTask.isRunning && !currentTask.isPaused && currentTask.startTime) {
      intervalRef.current = setInterval(() => {
        const currentRunTime = Math.floor((Date.now() / 1000 - currentTask.startTime!))
        setElapsedTime(currentTask.elapsedTime + currentRunTime)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentTask])

  if (!currentTask) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="p-4 text-center text-gray-500">
          当前无计时任务
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
      <CardContent className="p-4">
        <div className="text-center">
          <div className="font-medium text-gray-800 mb-1">{currentTask.name}</div>
          <div className="text-sm text-gray-600 mb-3">{currentTask.categoryPath}</div>
          <div className="text-2xl font-mono text-green-600 mb-2">
            {formatTime(elapsedTime)}
          </div>
          <div className="flex justify-center">
            <span className={`text-xs px-2 py-1 rounded-full ${
              currentTask.isPaused 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {currentTask.isPaused ? '已暂停' : '计时中'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== 增强计时器组件 ====================

const EnhancedTimer: React.FC = () => {
  const [tasks, setTasks] = useState<TimerTask[]>([])
  const [currentTask, setCurrentTask] = useState<TimerTask | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState('')
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    totalTime: 0,
    taskCount: 0,
    categories: {}
  })
  const [elapsedTime, setElapsedTime] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 从localStorage加载任务
  useEffect(() => {
    const savedTasks = localStorage.getItem('enhanced-timer-tasks')
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks)
      setTasks(parsedTasks)
      
      const runningTask = parsedTasks.find((task: TimerTask) => task.isRunning)
      if (runningTask) {
        setCurrentTask(runningTask)
        if (runningTask.startTime && !runningTask.isPaused) {
          setElapsedTime(Math.floor((Date.now() / 1000 - runningTask.startTime)))
        }
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('enhanced-timer-tasks', JSON.stringify(tasks))
    updateDailyStats()
  }, [tasks])

  useEffect(() => {
    if (currentTask && currentTask.isRunning && !currentTask.isPaused && currentTask.startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() / 1000 - currentTask.startTime!)))
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentTask])

  const updateDailyStats = () => {
    const stats = tasks.reduce((acc, task) => {
      const totalTime = (task.totalTime || 0) + (task.elapsedTime || 0)
      acc.totalTime += totalTime
      acc.taskCount += 1
      
      const category = task.category || '未分类'
      acc.categories[category] = (acc.categories[category] || 0) + totalTime
      
      return acc
    }, { totalTime: 0, taskCount: 0, categories: {} as { [key: string]: number } })
    
    setDailyStats(stats)
  }

  const addTask = () => {
    if (!newTaskName.trim()) return

    const newTask: TimerTask = {
      id: Date.now().toString(),
      name: newTaskName.trim(),
      category: newTaskCategory.trim() || '未分类',
      startTime: null,
      totalTime: 0,
      elapsedTime: 0,
      initialTime: 0,
      isRunning: false,
      isPaused: false,
      pausedTime: 0,
      createdAt: new Date().toISOString()
    }

    setTasks([...tasks, newTask])
    setNewTaskName('')
    setNewTaskCategory('')
    setShowAddDialog(false)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>增强计时器</span>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            添加任务
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* 当前任务显示 */}
        {currentTask && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-lg font-medium text-purple-800 mb-2">
                  {currentTask.name}
                </div>
                <div className="text-3xl font-mono text-purple-600 mb-3">
                  {formatTime(elapsedTime)}
                </div>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline">
                    暂停
                  </Button>
                  <Button size="sm" variant="destructive">
                    停止
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 统计信息 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">今日统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(dailyStats.totalTime)}
                </div>
                <div className="text-sm text-gray-600">总时间</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {dailyStats.taskCount}
                </div>
                <div className="text-sm text-gray-600">任务数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(dailyStats.categories).length}
                </div>
                <div className="text-sm text-gray-600">分类数</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 任务列表 */}
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{task.name}</div>
                <div className="text-sm text-gray-500">{task.category}</div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-600">
                  {formatTime((task.totalTime || 0) + (task.elapsedTime || 0))}
                </div>
                <Button size="sm" variant="outline">
                  开始
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* 添加任务对话框 */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新任务</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">任务名称</label>
                <Input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="输入任务名称..."
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium">分类</label>
                <Input
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value)}
                  placeholder="输入分类..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                取消
              </Button>
              <Button onClick={addTask} disabled={!newTaskName.trim()}>
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// ==================== 导出组件 ====================

export {
  NestedTimerZone,
  QuickTimer,
  InlineTimer,
  TimerWidget,
  EnhancedTimer,
  formatTime,
  formatDuration
}

// 默认导出完整系统
export default function TimerSystem() {
  return (
    <div className="space-y-6">
      <EnhancedTimer />
      <QuickTimer />
      <NestedTimerZone />
    </div>
  )
}
