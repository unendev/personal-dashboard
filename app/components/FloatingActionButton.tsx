'use client'

import { useState } from 'react'
import { Plus, FileText, Image, Music } from 'lucide-react'
import { cn } from '../../lib/utils'

interface FloatingActionButtonProps {
  onCreateTreasure: (type: 'TEXT' | 'IMAGE' | 'MUSIC') => void
  className?: string
}

export function FloatingActionButton({ 
  onCreateTreasure, 
  className 
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleCreate = (type: 'TEXT' | 'IMAGE' | 'MUSIC') => {
    onCreateTreasure(type)
    setIsExpanded(false)
  }

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      {/* 子按钮 */}
      <div className={cn(
        "absolute bottom-16 right-0 flex flex-col gap-3 transition-all duration-300",
        isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {/* 文本按钮 */}
        <button
          onClick={() => handleCreate('TEXT')}
          className="w-12 h-12 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
          title="创建文本宝藏"
        >
          <FileText className="h-5 w-5 text-gray-700" />
        </button>
        
        {/* 图片按钮 */}
        <button
          onClick={() => handleCreate('IMAGE')}
          className="w-12 h-12 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
          title="创建图片宝藏"
        >
          <Image className="h-5 w-5 text-gray-700" />
        </button>
        
        {/* 音乐按钮 */}
        <button
          onClick={() => handleCreate('MUSIC')}
          className="w-12 h-12 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
          title="创建音乐宝藏"
        >
          <Music className="h-5 w-5 text-gray-700" />
        </button>
      </div>

      {/* 主按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-14 h-14 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105",
          isExpanded && "rotate-45"
        )}
        title="创建宝藏"
      >
        <Plus className="h-6 w-6 text-gray-700" />
      </button>
    </div>
  )
}
