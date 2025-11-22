'use client'

import { cn } from '@/lib/utils'

interface PrimaryCategorySelectorProps {
  value: string
  onChange: (value: string) => void
}

// 主要分类定义
const PRIMARY_CATEGORIES = [
  { id: 'Life', label: '生活', emoji: '🌱' },
  { id: 'Knowledge', label: '知识', emoji: '📚' },
  { id: 'Thought', label: '思考', emoji: '💭' },
  { id: 'Root', label: '根源', emoji: '🌳' },
] as const

export function PrimaryCategorySelector({ value, onChange }: PrimaryCategorySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-400">
        主要分类
      </label>
      <div className="flex flex-wrap gap-2">
        {PRIMARY_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(value === category.id ? '' : category.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
              "hover:scale-105 active:scale-95",
              value === category.id
                ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/20"
                : "bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/50 hover:border-gray-600"
            )}
          >
            <span className="text-lg">{category.emoji}</span>
            <span className="font-medium">{category.label}</span>
          </button>
        ))}
      </div>
      {value && (
        <p className="text-xs text-gray-500">
          已选择：{PRIMARY_CATEGORIES.find(c => c.id === value)?.label}
        </p>
      )}
    </div>
  )
}



