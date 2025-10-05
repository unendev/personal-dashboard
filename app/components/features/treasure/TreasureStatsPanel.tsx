'use client'

import { useMemo } from 'react'
import { BarChart3, Tag as TagIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TreasureStatsPanelProps {
  treasures: Array<{
    id: string
    createdAt: string
    tags: string[]
  }>
  onTagClick?: (tag: string) => void
  selectedTag?: string
}

export function TreasureStatsPanel({ treasures, onTagClick, selectedTag }: TreasureStatsPanelProps) {
  // 计算热力图数据（最近30天）
  const heatmapData = useMemo(() => {
    const days = 30
    const now = new Date()
    const data: Array<{ date: string; count: number }> = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const count = treasures.filter(t => {
        const tDate = new Date(t.createdAt).toISOString().split('T')[0]
        return tDate === dateStr
      }).length
      
      data.push({ date: dateStr, count })
    }
    
    return data
  }, [treasures])

  // 计算标签统计
  const tagStats = useMemo(() => {
    const tagCount: Record<string, number> = {}
    
    treasures.forEach(t => {
      t.tags.forEach(tag => {
        // 排除主要分类
        if (!['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)) {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        }
      })
    })
    
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20) // 只显示前20个
  }, [treasures])

  // 如果没有数据，不渲染
  if (treasures.length === 0) {
    return null
  }

  // 计算热力图颜色
  const getHeatColor = (count: number) => {
    const maxCount = Math.max(...heatmapData.map(d => d.count), 1)
    const intensity = count / maxCount
    
    if (count === 0) return 'bg-white/5'
    if (intensity < 0.25) return 'bg-blue-500/20'
    if (intensity < 0.5) return 'bg-blue-500/40'
    if (intensity < 0.75) return 'bg-blue-500/60'
    return 'bg-blue-500/80'
  }

  // 计算标签字体大小
  const getTagSize = (count: number) => {
    const maxCount = Math.max(...tagStats.map(t => t[1]), 1)
    const ratio = count / maxCount
    
    if (ratio > 0.75) return 'text-xl'
    if (ratio > 0.5) return 'text-lg'
    if (ratio > 0.25) return 'text-base'
    return 'text-sm'
  }

  return (
    <div className="space-y-6 p-4">
      {/* 热力图 */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">创作热力图</h3>
          <span className="text-xs text-white/40 ml-auto">最近30天</span>
        </div>
        
        <div className="grid grid-cols-10 gap-1">
          {heatmapData.map((day, index) => {
            const date = new Date(day.date)
            const dayOfWeek = date.getDay()
            
            return (
              <div
                key={day.date}
                className={cn(
                  "aspect-square rounded-sm transition-all duration-200 hover:scale-110 cursor-pointer group relative",
                  getHeatColor(day.count)
                )}
                title={`${day.date}: ${day.count} 个宝藏`}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                  {day.date}
                  <br />
                  {day.count} 个
                </div>
              </div>
            )
          })}
        </div>
        
        {/* 图例 */}
        <div className="flex items-center gap-2 mt-3 text-xs text-white/50">
          <span>少</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-white/5" />
            <div className="w-3 h-3 rounded-sm bg-blue-500/20" />
            <div className="w-3 h-3 rounded-sm bg-blue-500/40" />
            <div className="w-3 h-3 rounded-sm bg-blue-500/60" />
            <div className="w-3 h-3 rounded-sm bg-blue-500/80" />
          </div>
          <span>多</span>
        </div>
      </div>

      {/* 标签云 */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <TagIcon className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">热门标签</h3>
          {selectedTag && (
            <button
              onClick={() => onTagClick?.('')}
              className="ml-auto text-xs text-white/60 hover:text-white/90 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              清除
            </button>
          )}
        </div>
        
        {tagStats.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">
            暂无标签
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center justify-center">
            {tagStats.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => onTagClick?.(tag)}
                className={cn(
                  "transition-all duration-200 hover:scale-110 font-medium",
                  getTagSize(count),
                  selectedTag === tag
                    ? "text-purple-300"
                    : "text-white/70 hover:text-white/90"
                )}
                title={`${count} 个宝藏`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/5">
          <div className="text-2xl font-bold text-white">{treasures.length}</div>
          <div className="text-xs text-white/60">总宝藏数</div>
        </div>
        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/5">
          <div className="text-2xl font-bold text-white">{tagStats.length}</div>
          <div className="text-xs text-white/60">标签数</div>
        </div>
      </div>
    </div>
  )
}

