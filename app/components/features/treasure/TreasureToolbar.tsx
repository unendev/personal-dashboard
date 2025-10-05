'use client'

import { useMemo } from 'react'
import { Search, X, BarChart3, Tag as TagIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TreasureToolbarProps {
  treasures: Array<{
    id: string
    createdAt: string
    tags: string[]
  }>
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedTag: string
  onTagClick: (tag: string) => void
}

export function TreasureToolbar({
  treasures,
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagClick
}: TreasureToolbarProps) {
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
      .slice(0, 15) // 紧凑版只显示前15个
  }, [treasures])

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

  return (
    <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl pb-4 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左：热力图 */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <div className="text-xs font-medium text-white/80">活跃度热力图</div>
            <span className="text-xs text-white/40 ml-auto">30天</span>
          </div>
          
          <div className="grid grid-cols-10 gap-0.5">
            {heatmapData.map((day) => (
              <div
                key={day.date}
                className={cn(
                  "aspect-square rounded-sm transition-all duration-200 hover:scale-110 cursor-pointer group relative",
                  getHeatColor(day.count)
                )}
                title={`${day.date}: ${day.count} 个`}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-20">
                  {new Date(day.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                  <br />
                  {day.count} 个
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 中：标签云 */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <TagIcon className="w-3.5 h-3.5 text-purple-400" />
            <div className="text-xs font-medium text-white/80">热门标签</div>
            {selectedTag && (
              <button
                onClick={() => onTagClick('')}
                className="ml-auto text-xs text-white/60 hover:text-white/90 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                清除
              </button>
            )}
          </div>
          
          {tagStats.length === 0 ? (
            <div className="text-center py-4 text-white/40 text-xs">
              暂无标签
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tagStats.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => onTagClick(tag === selectedTag ? '' : tag)}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full transition-all duration-200 hover:scale-105",
                    selectedTag === tag
                      ? "bg-purple-500/30 text-purple-200 border border-purple-400/50"
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white/90"
                  )}
                  title={`${count} 个宝藏`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* 右：搜索筛选 */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs font-medium text-white/80 mb-2">
            <Search className="w-3.5 h-3.5 inline mr-1.5 text-blue-400" />
            快速搜索
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="搜索宝藏..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded transition-colors"
              >
                <X className="h-3.5 w-3.5 text-white/60" />
              </button>
            )}
          </div>
          
          {/* 统计信息 */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
            <div className="text-xs text-white/60">
              共 <span className="text-white/90 font-medium">{treasures.length}</span> 个宝藏
            </div>
            <div className="text-xs text-white/60">
              <span className="text-white/90 font-medium">{tagStats.length}</span> 个标签
            </div>
          </div>
        </div>
      </div>
      
      {/* 移动端折叠版本 */}
      <div className="lg:hidden mt-4 space-y-3">
        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="搜索宝藏..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-white/60" />
            </button>
          )}
        </div>
        
        {/* 标签快速筛选（横向滚动） */}
        {tagStats.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {tagStats.slice(0, 10).map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag === selectedTag ? '' : tag)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all flex-shrink-0",
                  selectedTag === tag
                    ? "bg-purple-500/30 text-purple-200 border border-purple-400/50"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                )}
              >
                #{tag} ({count})
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
