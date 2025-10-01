'use client'

import { useState } from 'react'
import { Card } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { 
  Music, 
  Calendar, 
  Tag, 
  Edit, 
  Trash2, 
  MoreVertical,
  Heart,
  Share2,
  Play,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MusicCardProps {
  treasure: {
    id: string
    title: string
    tags: string[]
    createdAt: string
    updatedAt: string
    musicTitle?: string
    musicArtist?: string
    musicAlbum?: string
    musicUrl?: string
  }
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

export function MusicCard({ 
  treasure, 
  onEdit, 
  onDelete, 
  className 
}: MusicCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handlePlay = () => {
    if (treasure?.musicUrl) {
      window.open(treasure.musicUrl, '_blank')
    }
    setIsPlaying(!isPlaying)
  }

  const getMusicInfo = () => {
    if (!treasure) {
      return { title: '未知音乐', artist: '未知艺术家', album: '未知专辑' }
    }
    
    const title = treasure.musicTitle || treasure.title || '未知音乐'
    const artist = treasure.musicArtist || '未知艺术家'
    const album = treasure.musicAlbum || '未知专辑'
    
    return { title, artist, album }
  }

  const { title: musicTitle, artist, album } = getMusicInfo()

  return (
    <Card className={cn("p-6 hover:shadow-lg transition-shadow duration-200", className)}>
      {/* 头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Music className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{treasure?.title || '未知音乐'}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              {treasure?.createdAt ? formatDate(treasure.createdAt) : '未知日期'}
            </div>
          </div>
        </div>
        
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
            className="h-8 w-8 p-0"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          
          {showActions && (
            <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
              {onEdit && (
                <button
                  onClick={() => onEdit(treasure?.id || '')}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
                >
                  <Edit className="h-4 w-4" />
                  编辑
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(treasure?.id || '')}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 音乐信息卡片 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-4">
          {/* 音乐封面占位符 */}
          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
            <Music className="h-8 w-8 text-white" />
          </div>
          
          {/* 音乐信息 */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">{musicTitle}</h4>
            <p className="text-sm text-gray-600 truncate">{artist}</p>
            <p className="text-xs text-gray-500 truncate">{album}</p>
          </div>
          
          {/* 播放按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={handlePlay}
              variant="create"
              size="sm"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              播放
            </Button>
            
            {treasure?.musicUrl && (
              <Button
                onClick={() => window.open(treasure.musicUrl, '_blank')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                打开
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 标签 */}
      {treasure?.tags && treasure.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {treasure.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 底部操作 */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-2">
            <Heart className="h-4 w-4" />
            喜欢
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            分享
          </Button>
        </div>
        
        <div className="text-xs text-gray-500">
          {treasure?.updatedAt && treasure?.createdAt && treasure.updatedAt !== treasure.createdAt && '已编辑'}
        </div>
      </div>
    </Card>
  )
}



