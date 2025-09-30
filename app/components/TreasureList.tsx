'use client'

import { useState, useEffect } from 'react'
import { TextCard } from './TextCard'
import { ImageGalleryCard } from './ImageGalleryCard'
// import { MusicCard } from './MusicCard' // 暂时注释，因为组件为空
import { TwitterStyleCard } from './TwitterStyleCard'
import { TimelineContainer, TimelineItem } from './TimelineContainer'
import { sampleTreasures } from './sample-treasures'
import { FloatingActionButton } from './FloatingActionButton'
import { TreasureInputModal, TreasureData } from './treasure-input'
import { 
  Filter, 
  RefreshCw
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface Treasure {
  id: string
  title: string
  content?: string
  type: 'TEXT' | 'IMAGE' | 'MUSIC'
  tags: string[]
  theme?: string
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
  const [showCreateModal, setShowCreateModal] = useState(false)

  // 确保组件在客户端挂载
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 获取宝藏列表
  const fetchTreasures = async () => {
    try {
      setIsLoading(true)
      
      // 构建查询参数
      const params = new URLSearchParams()
      if (selectedTag) params.append('tag', selectedTag)
      if (selectedType) params.append('type', selectedType)
      
      // 从 API 获取真实数据
      const response = await fetch(`/api/treasures?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        setTreasures(data)
      } else {
        console.error('Failed to fetch treasures:', response.status)
        // 降级到示例数据
        setTreasures(sampleTreasures)
      }
    } catch (error) {
      console.error('Error fetching treasures:', error)
      // 降级到示例数据
      setTreasures(sampleTreasures)
    } finally {
      setIsLoading(false)
    }
  }


  // 创建宝藏
  const handleCreateTreasure = async (data: TreasureData) => {
    try {
      console.log('Creating treasure:', data)
      const response = await fetch('/api/treasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      console.log('Response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Treasure created successfully:', result)
        await fetchTreasures()
      } else {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        alert(`创建失败: ${response.status} ${errorText}`)
      }
    } catch (error) {
      console.error('Error creating treasure:', error)
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
  }, [isMounted, selectedTag, selectedType])

  const handleCreateClick = () => {
    setShowCreateModal(true)
  }

  const renderTreasureCard = (treasure: Treasure, index: number) => {
    // 统一使用 TwitterStyleCard
    return (
      <TwitterStyleCard
        key={treasure.id}
        treasure={treasure}
        onDelete={handleDeleteTreasure}
      />
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
      {/* 宝藏列表 */}
      {treasures.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Filter className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            还没有宝藏
          </h3>
          <p className="text-gray-500 mb-4">
            点击右下角按钮创建你的第一个宝藏
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-8">
          {treasures.map((treasure, index) => renderTreasureCard(treasure, index))}
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
    </div>
  )
}
