'use client'

import React, { useState } from 'react'
import { ThreeLayerCategorySelector } from '../../shared/ThreeLayerCategorySelector'
import { EnhancedInstanceTagInput } from '../../shared/EnhancedInstanceTagInput'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'

interface CreateLogFormWithCardsProps {
  onLogSaved?: () => void
  onAddToTimer?: (taskName: string, categoryPath: string, initialTime?: number, instanceTagNames?: string) => void
}

export default function CreateLogFormWithCards({ onLogSaved, onAddToTimer }: CreateLogFormWithCardsProps) {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [taskName, setTaskName] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [timeInput, setTimeInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 解析时间输入（支持两种格式：数字分钟 或 1h30m）
  const parseTimeInput = (input: string): number | undefined => {
    if (!input.trim()) return undefined

    // 格式1：纯数字（分钟）
    const minutesOnly = input.match(/^\s*(\d+)\s*$/)
    if (minutesOnly) {
      return parseInt(minutesOnly[1]) * 60 // 转换为秒
    }

    // 格式2：1h30m 或 1h 或 30m
    const hourMatch = input.match(/(\d+)h/)
    const minMatch = input.match(/(\d+)m/)

    if (hourMatch || minMatch) {
      const hours = hourMatch ? parseInt(hourMatch[1]) : 0
      const minutes = minMatch ? parseInt(minMatch[1]) : 0
      return (hours * 60 + minutes) * 60 // 转换为秒
    }

    return undefined
  }

  const handleSubmit = async () => {
    if (!taskName.trim()) {
      alert('请输入任务名称')
      return
    }

    if (!selectedCategory) {
      alert('请选择分类')
      return
    }

    setIsLoading(true)
    try {
      if (onAddToTimer) {
        // 将事务项数组转换为逗号分隔的字符串
        const tagsString = selectedTags.length > 0 ? selectedTags.join(',') : undefined
        // 解析时间输入
        const initialTime = parseTimeInput(timeInput)
        onAddToTimer(taskName.trim(), selectedCategory, initialTime, tagsString)
        
        // 重置表单
        setTaskName('')
        setSelectedCategory('')
        setSelectedTags([])
        setTimeInput('')
      }
    } catch (error) {
      console.error('添加任务失败:', error)
      alert('添加任务失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 py-4">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">快速创建任务</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">选择分类、输入任务名称、添加事务项</p>
      </div>

      {/* 三层分类选择器 */}
      <ThreeLayerCategorySelector
        value={selectedCategory}
        onChange={setSelectedCategory}
      />

      {/* 任务名称 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          任务名称 <span className="text-red-500">*</span>
        </label>
        <Input
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="输入要创建的任务名称..."
          className="text-base"
        />
      </div>

      {/* 初始时长（可选） */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          初始时长 <span className="text-gray-500 text-xs font-normal">(可选)</span>
        </label>
        <Input
          value={timeInput}
          onChange={(e) => setTimeInput(e.target.value)}
          placeholder="如: 90 (分钟) 或 1h30m (小时+分钟)"
          className="text-base"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          💡 支持格式：<code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">90</code> (分钟) 或 
          <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded ml-1">1h30m</code> (1小时30分钟)
        </p>
      </div>

      {/* 事务项选择器 */}
      <EnhancedInstanceTagInput
        tags={selectedTags}
        onChange={setSelectedTags}
        userId="user-1"
        placeholder="输入事务项（回车创建）..."
        maxTags={5}
      />

      {/* 提交按钮 */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !taskName.trim() || !selectedCategory}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>添加中...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>⏱️</span>
              <span>添加到计时器</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  )
}



