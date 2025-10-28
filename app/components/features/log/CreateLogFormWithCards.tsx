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
  const [isLoading, setIsLoading] = useState(false)

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
        onAddToTimer(taskName.trim(), selectedCategory, undefined, tagsString)
        
        // 重置表单
        setTaskName('')
        setSelectedCategory('')
        setSelectedTags([])
        alert('任务已添加到计时器')
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



