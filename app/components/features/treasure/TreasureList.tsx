'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { TwitterStyleCard } from '../widgets/TwitterStyleCard'
import { CommentsCard } from './CommentsCard'
import { CommentInputModal } from './CommentInputModal'
// import { sampleTreasures } from './sample-treasures' // 已移除示例数据
import { FloatingActionButton } from '../../shared/FloatingActionButton'
import { TreasureInputModal, TreasureData } from './treasure-input'
import { 
  Filter, 
  RefreshCw,
  Search,
  X
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
  
  // 虚拟滚动相关
  const parentRef = useRef<HTMLDivElement>(null)
  
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

  const renderTreasureCard = (treasure: Treasure) => {
    const hasComments = treasure._count?.answers && treasure._count.answers > 0
    
    return (
      <div key={treasure.id} className="relative">
        {/* 主卡片 - 居中显示 */}
        <div className="max-w-2xl mx-auto">
          <TwitterStyleCard
            treasure={treasure}
            onEdit={handleEditClick}
            onDelete={handleDeleteTreasure}
            onComment={handleCommentClick}
            hideComments={true}
          />
        </div>
        
        {/* 评论卡片 - 绝对定位在右侧，PC端显示，移动端隐藏，且只在有评论时显示 */}
        {hasComments && (
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
    <div className={cn("space-y-8", className)}>
      {/* 搜索和筛选栏 */}
      <div className="sticky top-0 z-10 backdrop-blur-lg bg-transparent border-b border-white/10 pb-4 pt-2 -mx-4 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              type="text"
              placeholder="搜索宝藏标题或内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-white/60" />
              </button>
            )}
          </div>

          {/* 筛选按钮和筛选器 */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "gap-2 border-white/20 text-white hover:bg-white/10",
                showFilters && "bg-white/10"
              )}
            >
              <Filter className="h-4 w-4" />
              筛选
            </Button>

            {/* 活跃的筛选标签 */}
            {selectedType && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm text-blue-300">
                类型: {selectedType}
                <button
                  onClick={() => setSelectedType('')}
                  className="hover:bg-blue-500/30 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {selectedTag && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-sm text-green-300">
                标签: {selectedTag}
                <button
                  onClick={() => setSelectedTag('')}
                  className="hover:bg-green-500/30 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* 筛选面板 */}
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
                  className="pb-8"
                >
                  {renderTreasureCard(treasure)}
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
  )
}



