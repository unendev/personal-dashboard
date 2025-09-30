'use client'

import { Plus } from 'lucide-react'
import { cn } from '../../lib/utils'

interface FloatingActionButtonProps {
  onCreateTreasure: () => void
  className?: string
}

export function FloatingActionButton({ 
  onCreateTreasure, 
  className 
}: FloatingActionButtonProps) {
  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      {/* 主按钮 */}
      <button
        onClick={onCreateTreasure}
        className="w-14 h-14 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
        title="创建宝藏"
      >
        <Plus className="h-6 w-6 text-gray-700" />
      </button>
    </div>
  )
}
