'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { TwitterStyleCard } from '../widgets/TwitterStyleCard'
import { CommentsCard } from './CommentsCard'
import { CommentInputModal } from './CommentInputModal'
// import { sampleTreasures } from './sample-treasures' // 已移除示例数据
import { FloatingActionButton } from '../../shared/FloatingActionButton'
import { TreasureInputModal, TreasureData } from './treasure-input'
import { TreasureTimeline } from './TreasureTimeline'
import { TreasureStatsPanel } from './TreasureStatsPanel'
import { 
  Filter, 
  RefreshCw,
  Search,
  X,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/app/components/ui/button'

interface Treasure {
  id: string
  title: string
  content?: string
  type: 'TEXT' | 'IMAGE' | 'MUSIC'
  tags: string[]
  createdAt: string
  updatedAt: string
  musicTitle?: string
  musicArtist?: string
  musicAlbum?: string
  musicUrl?: string
  musicCoverUrl?: string
  images: Array<{
    id: string
    url: string
    alt?: string
    width?: number
    height?: number
  }>
  _count?: {
    likes: number
    answers: number
  }
}

interface TreasureListProps {
  className?: string
}

export function TreasureList({ className }: TreasureListProps) {
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [allTags, setAllTags] = useState<string[]>([])
  const [primaryCategories, setPrimaryCategories] = useState<string[]>([])
  const [topicTags, setTopicTags] = useState<string[]>([])
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [selectedTreasureForComment, setSelectedTreasureForComment] = useState<Treasure | null>(null)
  const [editingTreasure, setEditingTreasure] = useState<Treasure | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // 时间线相关状态
  const [showTimeline, setShowTimeline] = useState(false) // 移动端时间线显示状态
  const [activeTimelineId, setActiveTimelineId] = useState<string>()
  
  // 虚拟滚动相关
  const parentRef = useRef<HTMLDivElement>(null)
  const treasureRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  // 虚拟滚动配置
  const rowVirtualizer = useVirtualizer({
    count: treasures.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // 估计每个卡片高度，会自动调整
    overscan: 2, // 预渲染前后2个项目
  })

  // 确保组件在客户端挂载
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 获取宝藏列表
  const fetchTreasures = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // 构建查询参数
      const params = new URLSearchParams()
      if (selectedTag) params.append('tag', selectedTag)
      if (selectedType) params.append('type', selectedType)
      if (searchQuery) params.append('search', searchQuery)
      
      // 从 API 获取真实数据
      const response = await fetch(`/api/treasures?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 [FETCH] 获取宝藏列表:', { count: data.length, filters: { tag: selectedTag, type: selectedType, search: searchQuery } })
        if (data.length > 0 && data[0].images?.length > 0) {
          console.log('🖼️ [FETCH] 首个宝藏图片:', data[0].images[0].url)
        }
        setTreasures(data)
        
        // 提取并分类标签
        const allTagsSet = new Set<string>()
        const primaryCategoriesSet = new Set<string>()
        const topicTagsSet = new Set<string>()
        const primaryCategoryList = ['Life', 'Knowledge', 'Thought', 'Root']
        
        data.forEach((treasure: Treasure) => {
          treasure.tags.forEach(tag => {
            allTagsSet.add(tag)
            if (primaryCategoryList.includes(tag)) {
              primaryCategoriesSet.add(tag)
            } else {
              topicTagsSet.add(tag)
            }
          })
        })
        
        setAllTags(Array.from(allTagsSet))
        setPrimaryCategories(Array.from(primaryCategoriesSet))
        setTopicTags(Array.from(topicTagsSet))
      } else {
        console.error('Failed to fetch treasures:', response.status)
        // 降级到示例数据
        setTreasures([])
      }
    } catch (error) {
      console.error('Error fetching treasures:', error)
      // 降级到空数据
      setTreasures([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedTag, selectedType, searchQuery])


  // 创建宝藏
  const handleCreateTreasure = async (data: TreasureData) => {
    try {
      console.log('✨ [CREATE] 创建宝藏:', { title: data.title, type: data.type, imagesCount: data.images?.length })
      const response = await fetch('/api/treasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ [CREATE] 创建成功:', { id: result.id, type: result.type })
        await fetchTreasures()
      } else {
        const errorText = await response.text()
        console.error('❌ [CREATE] 失败:', response.status, errorText)
        alert(`创建失败: ${response.status} ${errorText}`)
      }
    } catch (error) {
      console.error('❌ [CREATE] 网络错误:', error)
      alert(`网络错误: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 删除宝藏
  const handleDeleteTreasure = async (id: string) => {
    try {
      const response = await fetch(`/api/treasures/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchTreasures()
      }
    } catch (error) {
      console.error('Error deleting treasure:', error)
    }
  }

  // 初始加载
  useEffect(() => {
    if (isMounted) {
      fetchTreasures()
    }
  }, [isMounted, fetchTreasures])

  const handleCreateClick = () => {
    setShowCreateModal(true)
  }

  const handleCommentClick = (treasure: Treasure) => {
    setSelectedTreasureForComment(treasure)
    setShowCommentModal(true)
  }

  const handleCommentAdded = () => {
    // 重新获取宝藏列表以更新评论数
    fetchTreasures()
  }

  const handleEditClick = (id: string) => {
    const treasure = treasures.find(t => t.id === id)
    if (treasure) {
      console.log('📝 [EDIT] 准备编辑:', { id, title: treasure.title, type: treasure.type, imagesCount: treasure.images.length })
      setEditingTreasure(treasure)
      setShowEditModal(true)
    }
  }

  const handleEditTreasure = async (data: TreasureData) => {
    if (!editingTreasure) return

    try {
      console.log('📝 [EDIT] 提交更新:', { id: editingTreasure.id, type: data.type, imagesCount: data.images?.length })
      const response = await fetch(`/api/treasures/${editingTreasure.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        console.log('✅ [EDIT] 更新成功')
        // 刷新列表
        await fetchTreasures()
        setShowEditModal(false)
        setEditingTreasure(null)
      } else {
        console.error('❌ [EDIT] 更新失败:', response.status)
      }
    } catch (error) {
      console.error('❌ [EDIT] 网络错误:', error)
    }
  }

  // 时间线项点击跳转
  const handleTimelineItemClick = useCallback((treasureId: string) => {
    const index = treasures.findIndex(t => t.id === treasureId)
    if (index !== -1) {
      // 使用虚拟滚动器的 scrollToIndex 方法
      rowVirtualizer.scrollToIndex(index, {
        align: 'start',
        behavior: 'smooth',
      })
      setActiveTimelineId(treasureId)
      // 移动端点击后关闭时间线
      setShowTimeline(false)
    }
  }, [treasures, rowVirtualizer])

  // 监听滚动，更新活跃的时间线项
  useEffect(() => {
    const scrollElement = parentRef.current
    if (!scrollElement || treasures.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const index = entry.target.getAttribute('data-index')
            if (index !== null) {
              const treasure = treasures[parseInt(index)]
              if (treasure) {
                setActiveTimelineId(treasure.id)
              }
            }
          }
        })
      },
      {
        root: scrollElement,
        threshold: [0.5],
        rootMargin: '-20% 0px -20% 0px',
      }
    )

    // 使用 MutationObserver 监听 DOM 变化
    const mutationObserver = new MutationObserver(() => {
      const items = scrollElement.querySelectorAll('[data-index]')
      items.forEach((item) => observer.observe(item))
    })

    // 初始观察
    const items = scrollElement.querySelectorAll('[data-index]')
    items.forEach((item) => observer.observe(item))

    // 监听DOM变化（虚拟滚动会动态添加/移除元素）
    mutationObserver.observe(scrollElement, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [treasures])

  const renderTreasureCard = (treasure: Treasure, isFirst: boolean) => {
    const hasComments = treasure._count?.answers && treasure._count.answers > 0
    
    return (
      <div key={treasure.id} className="relative">
        {/* 主卡片 - 居中显示（就像原来一样）*/}
        <div className="max-w-2xl mx-auto">
          <TwitterStyleCard
            treasure={treasure}
            onEdit={handleEditClick}
            onDelete={handleDeleteTreasure}
            onComment={handleCommentClick}
            hideComments={true}
          />
        </div>
        
        {/* 热力图和标签云 - 绝对定位在第一个卡片右侧，sticky固定 */}
        {isFirst && (
          <div className="hidden xl:block absolute top-0 right-4 w-80 space-y-4">
            <div className="sticky top-4">
              {/* 热力图 */}
              <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-4">
                <TreasureStatsPanel 
                  treasures={treasures.map(t => ({
                    id: t.id,
                    createdAt: t.createdAt,
                    tags: t.tags
                  }))}
                  onTagClick={setSelectedTag}
                  selectedTag={selectedTag}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* 评论卡片 - 绝对定位在右侧（当有评论且不是第一个卡片时，或者第一个卡片有评论时放在热力图下方）*/}
        {hasComments && !isFirst && (
          <div className="hidden xl:block absolute top-0 right-4 w-80">
            <CommentsCard treasure={treasure} />
          </div>
        )}
      </div>
    )
  }

  // 在客户端挂载前显示静态内容
  if (!isMounted) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 w-8 bg-gray-200 rounded-full mx-auto mb-2"></div>
              <div className="text-gray-400">加载中...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
            <div className="text-gray-400">加载中...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative flex", className)}>
      {/* 时间线 - 浮动在左侧 */}
      <TreasureTimeline
        treasures={treasures.map(t => ({
          id: t.id,
          title: t.title,
          content: t.content,
          createdAt: t.createdAt,
          type: t.type,
          tags: t.tags,
        }))}
        activeId={activeTimelineId}
        isOpen={showTimeline}
        onItemClick={handleTimelineItemClick}
        onClose={() => setShowTimeline(false)}
      />

      {/* 左侧搜索筛选栏 - 紧贴时间线 */}
      <div className="hidden lg:block flex-shrink-0 w-48 xl:w-56 pl-64 xl:pl-72">
        <div className="sticky top-0 pt-4 space-y-3">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <input
              type="text"
              placeholder="搜索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1 text-xs bg-white/5 border border-white/10 rounded-md text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5">
                <X className="h-3 w-3 text-white/60" />
              </button>
            )}
          </div>

          {/* 筛选按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("w-full h-7 text-xs justify-start", showFilters && "bg-white/10")}
          >
            <Filter className="h-3 w-3 mr-1.5" />
            筛选
          </Button>

          {/* 活跃筛选 */}
          {(selectedType || selectedTag) && (
            <div className="space-y-1.5 text-xs">
              {selectedType && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded text-blue-300">
                  {selectedType}
                  <button onClick={() => setSelectedType('')} className="ml-auto">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {selectedTag && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded text-green-300">
                  {selectedTag}
                  <button onClick={() => setSelectedTag('')} className="ml-auto">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 主内容区域 - 居中 */}
      <div className="flex-1 min-w-0 space-y-0">
        {/* 移动端时间线唤出按钮 */}
        <button
          onClick={() => setShowTimeline(true)}
          className="lg:hidden fixed top-20 left-4 z-30 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform"
          aria-label="打开时间线"
        >
          <Calendar className="w-6 h-6" />
        </button>

        {/* 移动端搜索和筛选栏 */}
        <div className="lg:hidden sticky top-0 z-10 backdrop-blur-lg bg-black/40 border-b border-white/10 pb-3 pt-2 px-4">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5">
                  <X className="h-3.5 w-3.5 text-white/60" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={cn("h-7 text-xs", showFilters && "bg-white/10")}>
                <Filter className="h-3.5 w-3.5 mr-1" />
                筛选
              </Button>
              {selectedType && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 rounded-full text-xs text-blue-300">
                  {selectedType}
                  <button onClick={() => setSelectedType('')}><X className="h-3 w-3" /></button>
                </div>
              )}
              {selectedTag && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full text-xs text-green-300">
                  {selectedTag}
                  <button onClick={() => setSelectedTag('')}><X className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 筛选面板 - 移动端 */}
        <div className={cn(
          "lg:hidden fixed inset-x-4 top-20 z-20 max-h-[60vh] overflow-y-auto",
          "bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl",
          "transition-all duration-300",
          showFilters ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-4"
        )}>
          {showFilters && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* 类型筛选 */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">类型</label>
                <div className="flex gap-2">
                  {['TEXT', 'IMAGE', 'MUSIC'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(selectedType === type ? '' : type)}
                      className={cn(
                        "px-4 py-2 rounded-lg border transition-all",
                        selectedType === type
                          ? "bg-blue-500/30 border-blue-500/50 text-blue-300"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      )}
                    >
                      {type === 'TEXT' && '文本'}
                      {type === 'IMAGE' && '图片'}
                      {type === 'MUSIC' && '音乐'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 主要分类筛选 */}
              {primaryCategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">主要分类</label>
                  <div className="flex flex-wrap gap-2">
                    {primaryCategories.map((category) => {
                      // 主要分类的 emoji 映射
                      const categoryEmoji: Record<string, string> = {
                        'Life': '🌱',
                        'Knowledge': '📚',
                        'Thought': '💭',
                        'Root': '🌳'
                      }
                      const categoryLabel: Record<string, string> = {
                        'Life': '生活',
                        'Knowledge': '知识',
                        'Thought': '思考',
                        'Root': '根源'
                      }
                      return (
                        <button
                          key={category}
                          onClick={() => setSelectedTag(selectedTag === category ? '' : category)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all",
                            selectedTag === category
                              ? "bg-gradient-to-r from-blue-500/40 to-purple-500/40 border-blue-500/60 text-blue-200"
                              : "bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 text-blue-300/80 hover:from-blue-500/20 hover:to-purple-500/20"
                          )}
                          title={categoryLabel[category]}
                        >
                          <span>{categoryEmoji[category]}</span>
                          <span className="font-medium">{categoryLabel[category]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 主题标签筛选 */}
              {topicTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">主题标签</label>
                  <div className="flex flex-wrap gap-2">
                    {topicTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                        className={cn(
                          "px-3 py-1 rounded-full border text-sm transition-all",
                          selectedTag === tag
                            ? "bg-green-500/30 border-green-500/50 text-green-300"
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 清除所有筛选 */}
              {(selectedType || selectedTag) && (
                <div className="pt-2 border-t border-white/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedType('')
                      setSelectedTag('')
                    }}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    清除所有筛选
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 宝藏列表 - 虚拟滚动 */}
      {treasures.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-white/40 mb-4">
            <Filter className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {searchQuery || selectedTag || selectedType ? '没有找到匹配的宝藏' : '还没有宝藏'}
          </h3>
          <p className="text-white/60 mb-4">
            {searchQuery || selectedTag || selectedType ? '尝试调整搜索条件' : '点击右下角按钮创建你的第一个宝藏'}
          </p>
        </div>
      ) : (
        <div 
          ref={parentRef}
          className="h-[calc(100vh-16rem)] overflow-auto"
          style={{
            contain: 'strict',
          }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const treasure = treasures[virtualRow.index]
              const isFirst = virtualRow.index === 0
              return (
                <div
                  key={treasure.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="pb-2"
                >
                  {renderTreasureCard(treasure, isFirst)}
                </div>
              )
            })}
          </div>
        </div>
      )}

        {/* 悬浮创建按钮 */}
        <FloatingActionButton onCreateTreasure={handleCreateClick} />

        {/* 创建模态框 */}
        <TreasureInputModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTreasure}
        />

        {/* 编辑模态框 */}
        {editingTreasure && (
          <TreasureInputModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false)
              setEditingTreasure(null)
            }}
            onSubmit={handleEditTreasure}
            initialData={{
              ...editingTreasure,
              id: editingTreasure.id,
              content: editingTreasure.content || ''
            }}
            mode="edit"
          />
        )}

        {/* 评论输入模态框 */}
        {selectedTreasureForComment && (
          <CommentInputModal
            isOpen={showCommentModal}
            onClose={() => {
              setShowCommentModal(false)
              setSelectedTreasureForComment(null)
            }}
            treasureId={selectedTreasureForComment.id}
            treasureTitle={selectedTreasureForComment.title}
            onCommentAdded={handleCommentAdded}
          />
        )}
      </div>

      {/* 右侧统计信息现在通过绝对定位显示在第一个宝藏卡片旁边 */}
    </div>
  )
}



