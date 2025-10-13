'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TwitterStyleCard } from '../widgets/TwitterStyleCard'
// import { CommentInputModal } from './CommentInputModal' // 暂时隐藏评论功能
import { FloatingActionButton } from '../../shared/FloatingActionButton'
import { TreasureInputModal, TreasureData } from './treasure-input'
import { TreasureStatsPanel } from './TreasureStatsPanel'
import { TreasureOutline } from './TreasureOutline'
import { 
  Search,
  X,
} from 'lucide-react'

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
  const [isMounted, setIsMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  // const [showCommentModal, setShowCommentModal] = useState(false) // 暂时隐藏评论功能
  // const [selectedTreasureForComment, setSelectedTreasureForComment] = useState<Treasure | null>(null) // 暂时隐藏评论功能
  const [editingTreasure, setEditingTreasure] = useState<Treasure | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [activeId, setActiveId] = useState<string>('')
  
  // 分页相关
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const pageSize = 20
  
  // 全局统计数据（用于热力图和标签云）
  const [statsData, setStatsData] = useState<Array<{ id: string; createdAt: string; tags: string[] }>>([])
  
  // 元素引用
  const treasureRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())

  // 确保组件在客户端挂载
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 获取全局统计数据（只在初始化时获取一次）
  useEffect(() => {
    const fetchStatsData = async () => {
      try {
        const response = await fetch('/api/treasures?stats=true')
        if (response.ok) {
          const data = await response.json()
          setStatsData(data)
        }
      } catch (error) {
        console.error('获取统计数据失败:', error)
      }
    }

    if (isMounted) {
      fetchStatsData()
    }
  }, [isMounted])

  // 获取宝藏列表（初始加载）
  const fetchTreasures = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedTag) params.append('tag', selectedTag)
      params.append('page', '1')
      params.append('limit', pageSize.toString())
      
      const response = await fetch(`/api/treasures?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTreasures(data)
        setPage(1)
        setHasMore(data.length === pageSize)
      }
    } catch (error) {
      console.error('获取宝藏列表失败:', error)
    }
  }, [searchQuery, selectedTag, pageSize])

  // 加载更多
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    
    try {
      setIsLoadingMore(true)
      
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedTag) params.append('tag', selectedTag)
      params.append('page', (page + 1).toString())
      params.append('limit', pageSize.toString())
      
      const response = await fetch(`/api/treasures?${params}`)
      if (response.ok) {
        const newData = await response.json()
        
        // 数据去重：过滤掉已存在的 ID
        setTreasures(prev => {
          const existingIds = new Set(prev.map(t => t.id))
          const uniqueNewData = newData.filter((t: Treasure) => !existingIds.has(t.id))
          return [...prev, ...uniqueNewData]
        })
        
        setPage(prev => prev + 1)
        setHasMore(newData.length === pageSize)
      }
    } catch (error) {
      console.error('加载更多失败:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, searchQuery, selectedTag, page, pageSize])

  useEffect(() => {
    if (isMounted) {
      fetchTreasures()
    }
  }, [isMounted, searchQuery, fetchTreasures])

  // 监听窗口滚动，实现无限加载（使用节流防止频繁触发）
  useEffect(() => {
    let throttleTimer: NodeJS.Timeout | null = null
    
    const handleScroll = () => {
      // 节流：200ms 内只触发一次
      if (throttleTimer) return
      
      throttleTimer = setTimeout(() => {
        throttleTimer = null
        
        // 计算距离页面底部的距离
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollHeight = document.documentElement.scrollHeight
        const clientHeight = window.innerHeight
        
        // 当滚动到距离底部 300px 时触发加载更多
        if (scrollHeight - scrollTop - clientHeight < 300 && !isLoadingMore && hasMore) {
          loadMore()
        }
      }, 200)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (throttleTimer) {
        clearTimeout(throttleTimer)
      }
    }
  }, [loadMore, isLoadingMore, hasMore])

  // 视口追踪 - 使用 Intersection Observer 追踪当前可见的宝藏（基于窗口滚动）
  useEffect(() => {
    if (treasures.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // 找到最靠近视口中心的元素
        let closestEntry: IntersectionObserverEntry | undefined
        let minDistance = Infinity

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const rect = entry.boundingClientRect
            const viewportCenter = window.innerHeight / 2
            const elementCenter = rect.top + rect.height / 2
            const distance = Math.abs(elementCenter - viewportCenter)
            
            if (distance < minDistance) {
              minDistance = distance
              closestEntry = entry
            }
          }
        })

        if (closestEntry && closestEntry.target instanceof HTMLElement) {
          const id = closestEntry.target.getAttribute('data-treasure-id')
          if (id && id !== activeId) {
            setActiveId(id)
          }
        }
      },
      {
        root: null, // 使用窗口作为根
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    )

    // 延迟观察，避免在初始渲染时触发
    const timeoutId = setTimeout(() => {
      treasureRefsMap.current.forEach((element) => {
        if (element) {
          observer.observe(element)
        }
      })
    }, 200)

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [treasures, activeId])

  const handleCreateClick = () => {
    setShowCreateModal(true)
  }

  const handleCreateTreasure = async (data: TreasureData) => {
    try {
      const response = await fetch('/api/treasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        const newTreasure = await response.json()
        await fetchTreasures()
        setShowCreateModal(false)
        
        // 更新统计数据
        setStatsData(prev => [
          { id: newTreasure.id, createdAt: newTreasure.createdAt, tags: newTreasure.tags },
          ...prev
        ])
      }
    } catch (error) {
      console.error('创建宝藏失败:', error)
    }
  }

  const handleDeleteTreasure = async (id: string) => {
    if (!confirm('确定要删除这个宝藏吗？')) return

    try {
      const response = await fetch(`/api/treasures/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchTreasures()
        
        // 更新统计数据
        setStatsData(prev => prev.filter(item => item.id !== id))
      }
    } catch (error) {
      console.error('删除宝藏失败:', error)
    }
  }

  // 暂时隐藏评论功能
  // const handleCommentClick = (treasure: Treasure) => {
  //   setSelectedTreasureForComment(treasure)
  //   setShowCommentModal(true)
  // }

  // const handleCommentAdded = () => {
  //   fetchTreasures()
  // }

  const handleEditClick = (id: string) => {
    const treasure = treasures.find(t => t.id === id)
    if (treasure) {
      setEditingTreasure(treasure)
      setShowEditModal(true)
    }
  }

  const handleEditTreasure = async (data: TreasureData) => {
    if (!editingTreasure) return

    try {
      const response = await fetch(`/api/treasures/${editingTreasure.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const updatedTreasure = await response.json()
        
        // 为图片生成签名 URL
        if (updatedTreasure.images && updatedTreasure.images.length > 0) {
          const signedImages = await Promise.all(
            updatedTreasure.images.map(async (image: { url: string; id: string; alt?: string; width?: number; height?: number }) => {
              try {
                const signResponse = await fetch('/api/upload/oss/sign-url', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: image.url })
                })
                if (signResponse.ok) {
                  const { signedUrl } = await signResponse.json()
                  return { ...image, url: signedUrl }
                }
              } catch (err) {
                console.error('签名图片失败:', err)
              }
              return image
            })
          )
          updatedTreasure.images = signedImages
        }
        
        // 直接更新本地状态中的宝藏数据，保留点赞和评论计数
        setTreasures(prev => prev.map(t => 
          t.id === editingTreasure.id ? { ...updatedTreasure, _count: t._count } : t
        ))
        
        setShowEditModal(false)
        setEditingTreasure(null)
      }
    } catch (error) {
      console.error('更新宝藏失败:', error)
      alert('更新失败，请重试')
    }
  }

  if (!isMounted) {
    return null
  }

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag === selectedTag ? '' : tag)
  }

  const scrollToTreasure = (id: string) => {
    const element = treasureRefsMap.current.get(id)
    if (element) {
      // 立即更新高亮
      setActiveId(id)
      // 滚动到目标位置
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className={`flex gap-6 max-w-[1920px] mx-auto px-4 ${className}`}>
      {/* 左侧大纲面板 - 跟随滚动 */}
      <aside className="hidden xl:block w-72 flex-shrink-0">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto bg-[#0d1117] rounded-xl border border-white/10">
          <TreasureOutline
            treasures={treasures.map(t => ({ id: t.id, title: t.title, type: t.type, createdAt: t.createdAt }))}
            selectedId={activeId}
            onTreasureClick={scrollToTreasure}
          />
        </div>
      </aside>

      {/* 中间内容区域 */}
      <div className="flex-1 flex flex-col min-w-0 max-w-4xl mx-auto w-full pb-20">
        {/* 搜索栏 */}
        <div className="sticky top-0 z-10 pb-4 pt-2 px-4 mb-4">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="搜索宝藏..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-transparent border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-white/60" />
                </button>
              )}
            </div>
            {selectedTag && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-white/60">筛选:</span>
                <button
                  onClick={() => setSelectedTag('')}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300 hover:bg-blue-500/30 transition-colors"
                >
                  {selectedTag}
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 宝藏列表 */}
        {treasures.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-white/40 mb-4 text-6xl">💎</div>
            <h3 className="text-lg font-medium text-white mb-2">
              {searchQuery || selectedTag ? '没有找到匹配的宝藏' : '还没有宝藏'}
            </h3>
            <p className="text-white/60 mb-4">
              {searchQuery || selectedTag ? '尝试调整搜索条件' : '点击右下角按钮创建你的第一个宝藏'}
            </p>
          </div>
        ) : (
          <div className="px-4 space-y-4">
            {treasures.map((treasure) => (
              <div
                key={treasure.id}
                data-treasure-id={treasure.id}
                ref={(el) => {
                  if (el) {
                    treasureRefsMap.current.set(treasure.id, el)
                  }
                }}
              >
                <div className="max-w-2xl mx-auto">
                  <TwitterStyleCard
                    treasure={treasure}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteTreasure}
                    onComment={() => {}} // 暂时隐藏评论功能
                    hideComments={true}
                  />
                </div>
              </div>
            ))}
            
            {/* 加载更多指示器 */}
            {isLoadingMore && (
              <div className="flex justify-center items-center py-8">
                <div className="flex items-center gap-2 text-white/60">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="text-sm">加载中...</span>
                </div>
              </div>
            )}
            
            {/* 没有更多提示 */}
            {!hasMore && treasures.length > 0 && (
              <div className="flex justify-center items-center py-8 pb-20">
                <span className="text-sm text-white/40">没有更多内容了</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 右侧统计面板 - 跟随滚动 */}
      <aside className="hidden xl:block w-80 flex-shrink-0">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
          <TreasureStatsPanel 
            treasures={statsData}
            onTagClick={handleTagClick}
            selectedTag={selectedTag}
          />
        </div>
      </aside>

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
            mode="edit"
            initialData={{
              ...editingTreasure,
              id: editingTreasure.id,
              title: editingTreasure.title,
              content: editingTreasure.content || '',
              type: editingTreasure.type,
              tags: editingTreasure.tags,
              images: editingTreasure.images || [],
              musicTitle: editingTreasure.musicTitle,
              musicArtist: editingTreasure.musicArtist,
              musicAlbum: editingTreasure.musicAlbum,
              musicUrl: editingTreasure.musicUrl,
              musicCoverUrl: editingTreasure.musicCoverUrl
            }}
          />
        )}

      {/* 评论模态框 - 暂时隐藏 */}
        {/* {selectedTreasureForComment && (
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
        )} */}
    </div>
  )
}
