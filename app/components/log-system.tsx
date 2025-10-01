'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createLog } from '@/app/actions'
import { getBeijingTime } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import useSWR from 'swr'

// ==================== 类型定义 ====================

interface LogActivity {
  id: string;
  name: string;
  duration: string;
}

interface LogSubCategory {
  id: string;
  name: string;
  activities: LogActivity[];
}

interface LogCategory {
  id: string;
  name: string;
  subCategories: LogSubCategory[];
}

interface Log {
  id: string;
  content: string | null;
  createdAt: Date;
  timestamp: Date;
  quest?: {
    id: string;
    title: string;
  } | null;
  categories: LogCategory[];
}

interface AISummary {
  summary: string;
  totalTime: number;
  taskCount: number;
  insights: string[];
  categories: Record<string, number>;
  isFromCache?: boolean;
  needsGeneration?: boolean;
}

type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

// ==================== 工具函数 ====================

const fetcher = (url: string) => fetch(url).then(res => res.json())

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

const formatTimeDifference = (date: string): string => {
  const now = new Date()
  const targetDate = new Date(date)
  const diffMs = now.getTime() - targetDate.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) return `${diffDays}天前`
  if (diffHours > 0) return `${diffHours}小时前`
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  return diffMinutes > 0 ? `${diffMinutes}分钟前` : '刚刚'
}

// ==================== AI总结组件 ====================

interface AISummaryWidgetProps {
  userId?: string;
  date?: string;
  compact?: boolean;
}

const AISummaryWidget: React.FC<AISummaryWidgetProps> = ({ 
  userId = 'user-1', 
  date = typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '2024-01-01',
  compact = false
}) => {
  const [summary, setSummary] = useState<AISummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getPreviousDay = (currentDate: string) => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() - 1)
    return date.toISOString().split('T')[0]
  }

  const targetDate = compact ? getPreviousDay(date) : date

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/ai-summary?userId=${userId}&date=${targetDate}`)
      if (!response.ok) {
        throw new Error('Failed to fetch AI summary')
      }
      const data = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [userId, targetDate])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const generateSummary = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: targetDate })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate AI summary')
      }
      
      const data = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (compact && (!summary || summary.needsGeneration)) {
    return null
  }

  return (
    <Card className={compact ? "mb-4 border-green-200" : "w-full max-w-4xl mx-auto"}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <CardTitle className={`flex items-center justify-between ${compact ? "text-lg" : "text-xl"}`}>
          <span className="flex items-center">
            🤖 AI总结 
            {compact && <span className="text-sm text-gray-500 ml-2">({targetDate})</span>}
          </span>
          {!compact && (
            <span className="text-sm font-normal text-gray-500">
              {targetDate} {summary?.isFromCache && '(缓存)'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className={compact ? "pt-0" : ""}>
        {loading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2">生成中...</span>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 p-4 bg-red-50 rounded">
            错误: {error}
            <Button onClick={fetchSummary} className="ml-2" size="sm">重试</Button>
          </div>
        )}
        
        {summary && !loading && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-gray-800">{summary.summary}</p>
            </div>
            
            {!compact && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-3 rounded">
                    <h4 className="font-medium text-green-800">统计信息</h4>
                    <p className="text-sm text-green-700">总时间: {summary.totalTime}小时</p>
                    <p className="text-sm text-green-700">任务数: {summary.taskCount}个</p>
                  </div>
                  
                  {summary.categories && Object.keys(summary.categories).length > 0 && (
                    <div className="bg-purple-50 p-3 rounded">
                      <h4 className="font-medium text-purple-800">时间分布</h4>
                      {Object.entries(summary.categories).map(([category, time]) => (
                        <p key={category} className="text-sm text-purple-700">
                          {category}: {time}小时
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                
                {summary.insights && summary.insights.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded">
                    <h4 className="font-medium text-yellow-800 mb-2">💡 深度洞察</h4>
                    <ul className="space-y-1">
                      {summary.insights.map((insight, index) => (
                        <li key={index} className="text-sm text-yellow-700 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            
            {summary.needsGeneration && !compact && (
              <Button onClick={generateSummary} disabled={loading} className="w-full">
                {loading ? '生成中...' : '重新生成总结'}
              </Button>
            )}
          </div>
        )}
        
        {!summary && !loading && !error && (
          <div className="text-center p-4">
            <p className="text-gray-500 mb-4">暂无AI总结</p>
            <Button onClick={generateSummary} disabled={loading}>
              生成总结
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== 可折叠AI总结组件 ====================

interface CollapsibleAISummaryProps {
  userId?: string;
  date?: string;
}

const CollapsibleAISummary: React.FC<CollapsibleAISummaryProps> = ({ 
  userId = 'user-1', 
  date = typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '2024-01-01'
}) => {
  const [summary, setSummary] = useState<AISummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const getPreviousDay = (currentDate: string) => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() - 1)
    return date.toISOString().split('T')[0]
  }

  const targetDate = getPreviousDay(date)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/ai-summary?userId=${userId}&date=${targetDate}`)
      if (!response.ok) {
        throw new Error('Failed to fetch AI summary')
      }
      const data = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [userId, targetDate])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  if (!summary || summary.needsGeneration) {
    return null
  }

  return (
    <Card className="mb-4 border-blue-200">
      <CardHeader 
        className="pb-2 cursor-pointer hover:bg-gray-50" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center">
            🤖 昨日AI总结
            <span className="text-sm text-gray-500 ml-2">({targetDate})</span>
          </span>
          <span className="text-sm">
            {isExpanded ? '▼' : '▶'}
          </span>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {loading && (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2">加载中...</span>
            </div>
          )}
          
          {error && (
            <div className="text-red-500 p-4 bg-red-50 rounded">
              错误: {error}
            </div>
          )}
          
          {summary && !loading && (
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-gray-800 text-sm">{summary.summary}</p>
              </div>
              
              <div className="flex justify-between text-xs text-gray-600">
                <span>总时间: {summary.totalTime}小时</span>
                <span>任务数: {summary.taskCount}个</span>
                {summary.isFromCache && <span>来源: 缓存</span>}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ==================== 分类管理器 ====================

interface CategoryManagerProps {
  className?: string;
  onLogSaved?: () => void;
  onSelected?: (path: string, taskName: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ className, onLogSaved, onSelected }) => {
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [taskName, setTaskName] = useState('')
  const [duration, setDuration] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch('/data/log-categories.json')
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Failed to load categories:', error)
      setCategories([])
    }
  }

  const renderCategoryTree = (nodes: CategoryNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.id} style={{ marginLeft: level * 20 }}>
        <Button
          variant="ghost"
          className="justify-start p-2 h-auto text-left"
          onClick={() => handleCategoryClick(node)}
        >
          <span className={level === 0 ? 'font-medium' : 'text-sm'}>
            {node.name}
          </span>
        </Button>
        {node.children && renderCategoryTree(node.children, level + 1)}
      </div>
    ))
  }

  const handleCategoryClick = (node: CategoryNode) => {
    const path = buildPath(node, categories)
    setSelectedPath(path)
    setShowDialog(true)
  }

  const buildPath = (node: CategoryNode, nodes: CategoryNode[], currentPath: string[] = []): string => {
    for (const n of nodes) {
      if (n.id === node.id) {
        return [...currentPath, n.name].join(' > ')
      }
      if (n.children) {
        const childPath = buildPath(node, n.children, [...currentPath, n.name])
        if (childPath) return childPath
      }
    }
    return ''
  }

  const handleSaveLog = async () => {
    if (!taskName || !duration) return

    setIsLoading(true)
    try {
      const logData = {
        content: `${selectedPath} > ${taskName} (${duration})`,
        timestamp: getBeijingTime().toISOString(),
        categories: [{
          name: selectedPath.split(' > ')[0] || '未分类',
          subCategories: [{
            name: selectedPath,
            activities: [{
              name: taskName,
              duration: duration
            }]
          }]
        }]
      }

      await createLog(logData)
      
      if (onSelected) {
        onSelected(selectedPath, taskName)
      }
      if (onLogSaved) {
        onLogSaved()
      }
      
      setShowDialog(false)
      setTaskName('')
      setDuration('')
      setSelectedPath('')
    } catch (error) {
      console.error('Failed to save log:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>快速记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无分类</p>
            ) : (
              renderCategoryTree(categories)
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>记录任务</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">分类路径</label>
              <p className="text-sm text-gray-600 mt-1">{selectedPath}</p>
            </div>
            <div>
              <label htmlFor="taskName" className="text-sm font-medium">任务名称</label>
              <Input
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="输入任务名称..."
              />
            </div>
            <div>
              <label htmlFor="duration" className="text-sm font-medium">持续时间</label>
              <Input
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="例如：2小时"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSaveLog} 
              disabled={!taskName || !duration || isLoading}
            >
              {isLoading ? '保存中...' : '保存日志'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== 日志卡片组件 ====================

interface LogCardProps {
  log: Log;
}

const LogCard: React.FC<LogCardProps> = ({ log }) => {
  const renderCategories = (categories: LogCategory[]) => {
    if (!categories || categories.length === 0) {
      return null
    }

    return (
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category.id} className="space-y-2 pl-4 border-l-2 border-purple-300">
            <h4 className="text-md font-medium text-purple-700">{category.name}</h4>
            {Array.isArray(category.subCategories) && category.subCategories.map((subCategory) => (
              <div key={subCategory.id} className="space-y-1 pl-4 border-l border-gray-300">
                <p className="text-sm font-medium text-gray-700">{subCategory.name}</p>
                {Array.isArray(subCategory.activities) && subCategory.activities.map((activity) => (
                  <p key={activity.id} className="text-sm text-gray-700 ml-2">
                    - {activity.name} ({activity.duration})
                  </p>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  const hasCategoriesContent = log.categories && log.categories.length > 0

  return (
    <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-400 mb-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          {log.content && <p className="text-gray-800">{log.content}</p>}
          {!log.content && !hasCategoriesContent && <p className="text-gray-500 italic">无日志内容或每日总结</p>}
        </div>
        <span className="text-xs text-gray-500 ml-4 whitespace-nowrap">
          {formatDate(log.timestamp)}
        </span>
      </div>

      {log.quest && (
        <div className="text-sm text-blue-600 mt-2">
          关联任务: {log.quest.title}
        </div>
      )}

      {hasCategoriesContent && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {renderCategories(log.categories)}
        </div>
      )}
    </div>
  )
}

// ==================== 日志表格显示组件 ====================

interface LogEntry {
  category: string;
  subcategory: string;
  content: string;
  timestamp: string;
}

const LogDisplayTable: React.FC = () => {
  const { data: logs, error } = useSWR<LogEntry[]>('/api/logs', fetcher, { refreshInterval: 5000 })

  if (error) {
    return <div className="text-red-500">错误: {error.message}</div>
  }

  if (!logs) {
    return <div>加载日志中...</div>
  }

  return (
    <div className="card mt-8">
      <h2>最近日志</h2>
      {logs.length === 0 ? (
        <p>暂无日志记录。</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200 mt-4">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                分类
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                子分类
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                内容
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                时间
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.subcategory}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {log.content}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTimeDifference(log.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ==================== 创建日志表单组件 ====================

const initialPresetCategories = [
  {
    name: '',
    subCategories: [
      {
        name: '',
        activities: [
          { name: '', duration: '' }
        ]
      }
    ]
  }
]

const CreateLogForm: React.FC = () => {
  const [categories, setCategories] = useState(initialPresetCategories)
  const [content, setContent] = useState('')
  const [timestamp, setTimestamp] = useState(getBeijingTime().toISOString().slice(0, 16))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateCategory = (categoryIndex: number, field: string, value: string) => {
    const newCategories = [...categories]
    ;(newCategories[categoryIndex] as any)[field] = value
    setCategories(newCategories)
  }

  const updateSubCategory = (categoryIndex: number, subIndex: number, field: string, value: string) => {
    const newCategories = [...categories]
    ;(newCategories[categoryIndex].subCategories[subIndex] as any)[field] = value
    setCategories(newCategories)
  }

  const updateActivity = (categoryIndex: number, subIndex: number, actIndex: number, field: string, value: string) => {
    const newCategories = [...categories]
    ;(newCategories[categoryIndex].subCategories[subIndex].activities[actIndex] as any)[field] = value
    setCategories(newCategories)
  }

  const addCategory = () => {
    setCategories([...categories, {
      name: '',
      subCategories: [
        {
          name: '',
          activities: [
            { name: '', duration: '' }
          ]
        }
      ]
    }])
  }

  const addSubCategory = (categoryIndex: number) => {
    const newCategories = [...categories]
    newCategories[categoryIndex].subCategories.push({
      name: '',
      activities: [
        { name: '', duration: '' }
      ]
    })
    setCategories(newCategories)
  }

  const addActivity = (categoryIndex: number, subIndex: number) => {
    const newCategories = [...categories]
    newCategories[categoryIndex].subCategories[subIndex].activities.push({
      name: '',
      duration: ''
    })
    setCategories(newCategories)
  }

  const removeCategory = (categoryIndex: number) => {
    const newCategories = categories.filter((_, index) => index !== categoryIndex)
    setCategories(newCategories.length > 0 ? newCategories : initialPresetCategories)
  }

  const removeSubCategory = (categoryIndex: number, subIndex: number) => {
    const newCategories = [...categories]
    newCategories[categoryIndex].subCategories = newCategories[categoryIndex].subCategories.filter((_, index) => index !== subIndex)
    if (newCategories[categoryIndex].subCategories.length === 0) {
      newCategories[categoryIndex].subCategories.push({
        name: '',
        activities: [{ name: '', duration: '' }]
      })
    }
    setCategories(newCategories)
  }

  const removeActivity = (categoryIndex: number, subIndex: number, actIndex: number) => {
    const newCategories = [...categories]
    newCategories[categoryIndex].subCategories[subIndex].activities = 
      newCategories[categoryIndex].subCategories[subIndex].activities.filter((_, index) => index !== actIndex)
    if (newCategories[categoryIndex].subCategories[subIndex].activities.length === 0) {
      newCategories[categoryIndex].subCategories[subIndex].activities.push({ name: '', duration: '' })
    }
    setCategories(newCategories)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const logData = {
        content,
        timestamp: new Date(timestamp).toISOString(),
        categories
      }

      await createLog(logData)
      
      // 重置表单
      setContent('')
      setCategories(initialPresetCategories)
      setTimestamp(getBeijingTime().toISOString().slice(0, 16))
      
    } catch (error) {
      console.error('Failed to create log:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>创建日志</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 mb-1">
              时间
            </label>
            <input
              type="datetime-local"
              id="timestamp"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              日志内容（可选）
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入日志内容..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">活动分类</h3>
              <Button type="button" onClick={addCategory} variant="outline" size="sm">
                添加分类
              </Button>
            </div>

            {categories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="text"
                    placeholder="分类名称（如：工作、学习）"
                    value={category.name}
                    onChange={(e) => updateCategory(categoryIndex, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    type="button"
                    onClick={() => addSubCategory(categoryIndex)}
                    variant="outline"
                    size="sm"
                  >
                    添加子分类
                  </Button>
                  <Button
                    type="button"
                    onClick={() => removeCategory(categoryIndex)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    删除
                  </Button>
                </div>

                {category.subCategories.map((subCategory, subIndex) => (
                  <div key={subIndex} className="border border-gray-300 rounded-md p-3 mb-3 bg-white">
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        placeholder="子分类名称（如：前端开发、数学学习）"
                        value={subCategory.name}
                        onChange={(e) => updateSubCategory(categoryIndex, subIndex, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <Button
                        type="button"
                        onClick={() => addActivity(categoryIndex, subIndex)}
                        variant="outline"
                        size="sm"
                      >
                        添加活动
                      </Button>
                      <Button
                        type="button"
                        onClick={() => removeSubCategory(categoryIndex, subIndex)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        删除
                      </Button>
                    </div>

                    {subCategory.activities.map((activity, actIndex) => (
                      <div key={actIndex} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          placeholder="具体活动（如：写组件、背单词）"
                          value={activity.name}
                          onChange={(e) => updateActivity(categoryIndex, subIndex, actIndex, 'name', e.target.value)}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="时长（如：2小时、30分钟）"
                          value={activity.duration}
                          onChange={(e) => updateActivity(categoryIndex, subIndex, actIndex, 'duration', e.target.value)}
                          className="w-32 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <Button
                          type="button"
                          onClick={() => removeActivity(categoryIndex, subIndex, actIndex)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          删除
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? '创建中...' : '创建日志'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ==================== 导出组件 ====================

export {
  AISummaryWidget,
  CollapsibleAISummary,
  CategoryManager,
  LogCard,
  LogDisplayTable,
  CreateLogForm
}

// 默认导出完整系统
export default function LogSystem() {
  return (
    <div className="space-y-6">
      <CreateLogForm />
      <AISummaryWidget />
      <LogDisplayTable />
    </div>
  )
}
