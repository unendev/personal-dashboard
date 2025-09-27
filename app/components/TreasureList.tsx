'use client'

import { useState, useEffect } from 'react'
import { TextCard } from './TextCard'
import { ImageGalleryCard } from './ImageGalleryCard'
import { MusicCard } from './MusicCard'
import { FloatingActionButton } from './FloatingActionButton'
import { QuickCreateModal, CreateTreasureData } from './QuickCreateModal'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { 
  Search, 
  Filter, 
  Grid, 
  List as ListIcon,
  RefreshCw
} from 'lucide-react'
import { cn } from '../../lib/utils'

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
  const [filteredTreasures, setFilteredTreasures] = useState<Treasure[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createType, setCreateType] = useState<'TEXT' | 'IMAGE' | 'MUSIC'>('TEXT')
  const [allTags, setAllTags] = useState<Array<{ name: string; count: number }>>([])

  // 确保组件在客户端挂载
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 获取宝藏列表
  const fetchTreasures = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (selectedTag) params.append('tag', selectedTag)
      if (selectedType) params.append('type', selectedType)
      
      const response = await fetch(`/api/treasures?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTreasures(data)
      }
    } catch (error) {
      console.error('Error fetching treasures:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取标签列表
  const fetchTags = async () => {
    try {
      const response = await fetch('/api/treasures/tags')
      if (response.ok) {
        const data = await response.json()
        setAllTags(data)
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  // 创建宝藏
  const handleCreateTreasure = async (data: CreateTreasureData) => {
    try {
      const response = await fetch('/api/treasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await fetchTreasures()
        await fetchTags()
      }
    } catch (error) {
      console.error('Error creating treasure:', error)
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
        await fetchTags()
      }
    } catch (error) {
      console.error('Error deleting treasure:', error)
    }
  }

  // 搜索过滤
  useEffect(() => {
    let filtered = treasures

    if (searchQuery) {
      filtered = filtered.filter(treasure =>
        treasure.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        treasure.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        treasure.musicTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        treasure.musicArtist?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredTreasures(filtered)
  }, [treasures, searchQuery])

  // 初始加载
  useEffect(() => {
    if (isMounted) {
      fetchTreasures()
      fetchTags()
    }
  }, [isMounted, selectedTag, selectedType])

  const handleCreateClick = (type: 'TEXT' | 'IMAGE' | 'MUSIC') => {
    setCreateType(type)
    setShowCreateModal(true)
  }

  const renderTreasureCard = (treasure: Treasure) => {
    switch (treasure.type) {
      case 'TEXT':
        return (
          <TextCard
            key={treasure.id}
            treasure={treasure}
            onDelete={handleDeleteTreasure}
          />
        )
      case 'IMAGE':
        return (
          <ImageGalleryCard
            key={treasure.id}
            treasure={treasure}
            onDelete={handleDeleteTreasure}
          />
        )
      case 'MUSIC':
        return (
          <MusicCard
            key={treasure.id}
            treasure={treasure}
            onDelete={handleDeleteTreasure}
          />
        )
      default:
        return null
    }
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
    <div className={cn("space-y-6", className)}>
      {/* 搜索和过滤栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索宝藏..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 类型过滤 */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <option value="">所有类型</option>
            <option value="TEXT">文本</option>
            <option value="IMAGE">图片</option>
            <option value="MUSIC">音乐</option>
          </Select>

          {/* 标签过滤 */}
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <option value="">所有标签</option>
            {allTags.map((tag) => (
              <option key={tag.name} value={tag.name}>
                {tag.name} ({tag.count})
              </option>
            ))}
          </Select>
        </div>

        {/* 视图模式切换 */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <ListIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 宝藏列表 */}
      {filteredTreasures.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Filter className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || selectedTag || selectedType ? '没有找到匹配的宝藏' : '还没有宝藏'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || selectedTag || selectedType 
              ? '尝试调整搜索条件' 
              : '点击右下角按钮创建你的第一个宝藏'
            }
          </p>
        </div>
      ) : (
        <div className={cn(
          "space-y-4",
          viewMode === 'grid' && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        )}>
          {filteredTreasures.map(renderTreasureCard)}
        </div>
      )}

      {/* 悬浮创建按钮 */}
      <FloatingActionButton onCreateTreasure={handleCreateClick} />

      {/* 创建模态框 */}
      <QuickCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        type={createType}
        onSubmit={handleCreateTreasure}
      />
    </div>
  )
}
