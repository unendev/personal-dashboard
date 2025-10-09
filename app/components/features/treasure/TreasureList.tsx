'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { TwitterStyleCard } from '../widgets/TwitterStyleCard'
// import { CommentInputModal } from './CommentInputModal' // 暂时隐藏评论功能
import { FloatingActionButton } from '../../shared/FloatingActionButton'
import { TreasureInputModal, TreasureData } from './treasure-input'
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
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  // const [showCommentModal, setShowCommentModal] = useState(false) // 暂时隐藏评论功能
  // const [selectedTreasureForComment, setSelectedTreasureForComment] = useState<Treasure | null>(null) // 暂时隐藏评论功能
  const [editingTreasure, setEditingTreasure] = useState<Treasure | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // 虚拟滚动相关
  const parentRef = useRef<HTMLDivElement>(null)
  
  // 虚拟滚动配置
  const rowVirtualizer = useVirtualizer({
    count: treasures.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400,
    overscan: 2,
  })

  // 确保组件在客户端挂载
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 获取宝藏列表
  const fetchTreasures = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await fetch(`/api/treasures?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTreasures(data)
      }
    } catch (error) {
      console.error('获取宝藏列表失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    if (isMounted) {
      fetchTreasures()
    }
  }, [isMounted, searchQuery, fetchTreasures])

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
        await fetchTreasures()
        setShowCreateModal(false)
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
        await fetchTreasures()
        setShowEditModal(false)
        setEditingTreasure(null)
      }
    } catch (error) {
      console.error('更新宝藏失败:', error)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 搜索栏 */}
      <div className="sticky top-0 z-10 backdrop-blur-lg bg-black/40 border-b border-white/10 pb-4 pt-2 px-4 mb-4">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="搜索宝藏..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
              >
                <X className="h-4 w-4 text-white/60" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 宝藏列表 */}
      {treasures.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-white/40 mb-4 text-6xl">💎</div>
          <h3 className="text-lg font-medium text-white mb-2">
            {searchQuery ? '没有找到匹配的宝藏' : '还没有宝藏'}
          </h3>
          <p className="text-white/60 mb-4">
            {searchQuery ? '尝试调整搜索条件' : '点击右下角按钮创建你的第一个宝藏'}
          </p>
        </div>
      ) : (
        <div 
          ref={parentRef}
          className="flex-1 overflow-auto px-4"
          style={{ height: 'calc(100vh - 12rem)' }}
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
                  className="pb-4"
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
