'use client'

import { Lightbulb, Book, Music, Coffee, Heart, Code, Camera, Plane } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface ThemeSelectorProps {
  value: string
  onChange: (value: string) => void
}

const THEMES = [
  { id: 'inspiration', label: '灵感', icon: Lightbulb, color: 'text-yellow-500 bg-yellow-50' },
  { id: 'reading', label: '读书', icon: Book, color: 'text-blue-500 bg-blue-50' },
  { id: 'music', label: '音乐', icon: Music, color: 'text-purple-500 bg-purple-50' },
  { id: 'life', label: '生活', icon: Coffee, color: 'text-amber-500 bg-amber-50' },
  { id: 'emotion', label: '情感', icon: Heart, color: 'text-pink-500 bg-pink-50' },
  { id: 'tech', label: '技术', icon: Code, color: 'text-green-500 bg-green-50' },
  { id: 'photo', label: '摄影', icon: Camera, color: 'text-indigo-500 bg-indigo-50' },
  { id: 'travel', label: '旅行', icon: Plane, color: 'text-cyan-500 bg-cyan-50' },
]

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-400">选择主题</label>
      <div className="flex flex-wrap gap-2">
        {THEMES.map((theme) => {
          const Icon = theme.icon
          const isSelected = value === theme.id
          
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(isSelected ? '' : theme.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                "transition-all duration-200",
                "border border-transparent",
                isSelected 
                  ? `${theme.color} border-current shadow-sm` 
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {theme.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
