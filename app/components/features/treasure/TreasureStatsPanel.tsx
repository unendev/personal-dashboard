'use client'

import { useMemo, useState, useEffect } from 'react'
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
  const [snakePath, setSnakePath] = useState<number[]>([])
  const [isSnakeAnimating, setIsSnakeAnimating] = useState(false)
  const [showSnakeSvg, setShowSnakeSvg] = useState(false)

  // 计算热力图数据（最近12周，每周7天）
  const heatmapData = useMemo(() => {
    const weeks = 12
    const now = new Date()
    const data: Array<{ date: string; count: number; dayOfWeek: number }> = []
    
    // 计算总天数
    const totalDays = weeks * 7
    
    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay() // 0=周日, 1=周一, ..., 6=周六
      
      const count = treasures.filter(t => {
        const tDate = new Date(t.createdAt).toISOString().split('T')[0]
        return tDate === dateStr
      }).length
      
      data.push({ date: dateStr, count, dayOfWeek })
    }
    
    return data
  }, [treasures])

  // 将数据转换为周视图（7行 x N列）
  const weeklyData = useMemo(() => {
    const weeks: Array<Array<{ date: string; count: number; index: number } | null>> = []
    
    // 初始化7行（周日到周六）
    for (let i = 0; i < 7; i++) {
      weeks.push([])
    }
    
    // 填充数据
    heatmapData.forEach((day, index) => {
      weeks[day.dayOfWeek].push({ 
        date: day.date, 
        count: day.count,
        index  // 添加索引用于贪吃蛇动画
      })
    })
    
    // 确保每行长度一致
    const maxLength = Math.max(...weeks.map(w => w.length))
    weeks.forEach(week => {
      while (week.length < maxLength) {
        week.push(null)
      }
    })
    
    return weeks
  }, [heatmapData])

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

  // 贪吃蛇动画逻辑 - 自动循环播放
  useEffect(() => {
    if (treasures.length === 0) return
    
    // 初始延迟2秒后开始动画
    const startDelay = setTimeout(() => {
      setShowSnakeSvg(true)
    }, 2000)
    
    return () => clearTimeout(startDelay)
  }, [treasures.length])
  
  // 生成贪吃蛇 SVG 路径
  const snakeSvgPath = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) return ''
    
    const cellSize = 12 + 3 // 12px (w-3) + 3px gap
    const startX = 0
    const startY = 0
    
    const path: string[] = []
    const points: Array<{ x: number; y: number }> = []
    
    // 生成所有单元格的中心点坐标（从左到右，从上到下）
    weeklyData[0]?.forEach((_, colIndex) => {
      weeklyData.forEach((row, rowIndex) => {
        const cell = row[colIndex]
        if (cell) {
          const x = startX + colIndex * cellSize + 6 // 中心点
          const y = startY + rowIndex * cellSize + 6 // 中心点
          points.push({ x, y })
        }
      })
    })
    
    // 构建 SVG 路径
    if (points.length > 0) {
      path.push(`M ${points[0].x} ${points[0].y}`)
      for (let i = 1; i < points.length; i++) {
        path.push(`L ${points[i].x} ${points[i].y}`)
      }
    }
    
    return path.join(' ')
  }, [weeklyData])
  
  // 计算路径总长度用于动画
  const pathLength = useMemo(() => {
    if (!snakeSvgPath) return 0
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', snakeSvgPath)
    svg.appendChild(path)
    return path.getTotalLength()
  }, [snakeSvgPath])

  // 如果没有数据，不渲染
  if (treasures.length === 0) {
    return null
  }

  // 计算热力图颜色（GitHub 风格）
  const getHeatColor = (count: number, index: number) => {
    const isInSnakePath = snakePath.includes(index)
    const maxCount = Math.max(...heatmapData.map(d => d.count), 1)
    const intensity = count / maxCount
    
    // 贪吃蛇效果
    if (isInSnakePath) {
      return 'bg-green-500 border border-green-400 animate-pulse'
    }
    
    // GitHub 风格配色
    if (count === 0) return 'bg-[#161b22] border border-white/5'
    if (intensity < 0.25) return 'bg-green-900/40 border border-green-700/30'
    if (intensity < 0.5) return 'bg-green-700/60 border border-green-600/40'
    if (intensity < 0.75) return 'bg-green-600/80 border border-green-500/50'
    return 'bg-green-500 border border-green-400'
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
      {/* GitHub 风格热力图 */}
      <div className="bg-[#0d1117] rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-semibold text-white">创作热力图</h3>
          <span className="text-xs text-white/40 ml-auto">最近12周</span>
        </div>
        
        {/* 周视图网格 */}
        <div className="overflow-x-auto">
          <div className="flex gap-[3px] min-w-max">
            {/* 星期标签 */}
            <div className="flex flex-col gap-[3px] pr-2">
              <div className="h-3 text-[10px] text-white/40 leading-3">日</div>
              <div className="h-3 text-[10px] text-white/0 leading-3">一</div>
              <div className="h-3 text-[10px] text-white/40 leading-3">二</div>
              <div className="h-3 text-[10px] text-white/0 leading-3">三</div>
              <div className="h-3 text-[10px] text-white/40 leading-3">四</div>
              <div className="h-3 text-[10px] text-white/0 leading-3">五</div>
              <div className="h-3 text-[10px] text-white/40 leading-3">六</div>
            </div>
            
            {/* 热力图方块 */}
            {weeklyData[0]?.map((_, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-[3px]">
                {weeklyData.map((row, rowIndex) => {
                  const cell = row[colIndex]
                  if (!cell) {
                    return <div key={rowIndex} className="w-3 h-3 bg-transparent" />
                  }
                  
                  return (
                    <div
                      key={rowIndex}
                      className={cn(
                        "w-3 h-3 rounded-sm transition-all duration-200 hover:scale-150 hover:z-10 cursor-pointer group relative",
                        getHeatColor(cell.count, cell.index)
                      )}
                      onClick={() => !isSnakeAnimating && setIsSnakeAnimating(true)}
                      title={`${cell.date}: ${cell.count} 个宝藏`}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/95 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-30 shadow-lg border border-white/10">
                        <div>{cell.count} 个宝藏</div>
                        <div className="text-white/60">{cell.date}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* 图例和控制 */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>少</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-[#161b22] border border-white/5" />
              <div className="w-3 h-3 rounded-sm bg-green-900/40 border border-green-700/30" />
              <div className="w-3 h-3 rounded-sm bg-green-700/60 border border-green-600/40" />
              <div className="w-3 h-3 rounded-sm bg-green-600/80 border border-green-500/50" />
              <div className="w-3 h-3 rounded-sm bg-green-500 border border-green-400" />
            </div>
            <span>多</span>
          </div>
          
          <button
            onClick={() => setIsSnakeAnimating(true)}
            disabled={isSnakeAnimating}
            className="text-[10px] px-2 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSnakeAnimating ? '贪吃蛇中...' : '🐍 贪吃蛇'}
          </button>
        </div>
      </div>

      {/* 标签云 */}
      <div className="bg-[#161b22] rounded-xl p-4 border border-white/10">
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
        <div className="bg-[#161b22] rounded-lg p-3 border border-white/10">
          <div className="text-2xl font-bold text-white">{treasures.length}</div>
          <div className="text-xs text-white/60">总宝藏数</div>
        </div>
        <div className="bg-[#161b22] rounded-lg p-3 border border-white/10">
          <div className="text-2xl font-bold text-white">{tagStats.length}</div>
          <div className="text-xs text-white/60">标签数</div>
        </div>
      </div>
    </div>
  )
}

