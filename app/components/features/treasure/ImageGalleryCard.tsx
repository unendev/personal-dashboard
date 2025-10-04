 'use client'

import { useState } from 'react'
import { Card } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { 
  Image as ImageIcon, 
  Calendar, 
  Tag, 
  Edit, 
  Trash2, 
  MoreVertical,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageGalleryCardProps {
  treasure: {
    id: string
    title: string
    tags: string[]
    createdAt: string
    updatedAt: string
    images: Array<{
      id: string
      url: string
      alt?: string
      width?: number
      height?: number
    }>
  }
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

export function ImageGalleryCard({ 
  treasure, 
  onEdit, 
  onDelete, 
  className 
}: ImageGalleryCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)
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

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === treasure.images.length - 1 ? 0 : prev + 1
    )
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? treasure.images.length - 1 : prev - 1
    )
  }

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index)
    setShowLightbox(true)
  }

  const renderImageGrid = () => {
    if (treasure.images.length === 0) return null

    if (treasure.images.length === 1) {
      return (
        <div className="relative flex justify-center bg-gray-50 rounded-lg p-2">
          <img
            src={treasure.images[0].url}
            alt={treasure.images[0].alt || treasure.title}
            className="max-h-96 w-auto object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => openLightbox(0)}
          />
        </div>
      )
    }

    if (treasure.images.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-2">
          {treasure.images.map((image, index) => (
            <div 
              key={image.id} 
              className="relative h-32 flex items-center justify-center bg-gray-50 rounded-lg cursor-pointer"
              onClick={() => openLightbox(index)}
            >
              <img
                src={image.url}
                alt={image.alt || treasure.title}
                className="w-full h-full object-contain rounded-lg hover:opacity-90 transition-opacity"
              />
            </div>
          ))}
        </div>
      )
    }

    if (treasure.images.length === 3) {
      return (
        <div className="grid grid-cols-3 gap-2">
          {treasure.images.map((image, index) => (
            <div 
              key={image.id} 
              className="relative h-24 flex items-center justify-center bg-gray-50 rounded-lg cursor-pointer"
              onClick={() => openLightbox(index)}
            >
              <img
                src={image.url}
                alt={image.alt || treasure.title}
                className="w-full h-full object-contain rounded-lg hover:opacity-90 transition-opacity"
              />
            </div>
          ))}
        </div>
      )
    }

    // 4+ 图片：显示前4张，如果超过4张则第4张显示 +N
    return (
      <div className="grid grid-cols-2 gap-2">
        {treasure.images.slice(0, 4).map((image, index) => {
          // 如果是第4张且还有更多图片，显示 +N 叠加层
          const isLastWithMore = index === 3 && treasure.images.length > 4
          
          return (
            <div 
              key={image.id} 
              className={cn(
                "relative flex items-center justify-center bg-gray-50 rounded-lg cursor-pointer group",
                index === 0 ? "h-32" : "h-15"
              )}
              onClick={() => openLightbox(index)}
            >
              <img
                src={image.url}
                alt={image.alt || treasure.title}
                className="w-full h-full object-contain rounded-lg group-hover:opacity-90 transition-opacity"
              />
              {isLastWithMore && (
                <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    +{treasure.images.length - 4}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <Card className={cn("p-6 hover:shadow-lg transition-shadow duration-200", className)}>
        {/* 头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ImageIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{treasure.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                {formatDate(treasure.createdAt)}
                <span className="text-gray-400">•</span>
                <span>{treasure.images.length} 张图片</span>
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
                    onClick={() => onEdit(treasure.id)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4" />
                    编辑
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(treasure.id)}
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

        {/* 图片网格 */}
        <div className="mb-4">
          {renderImageGrid()}
        </div>

        {/* 标签 */}
        {treasure.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {treasure.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
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
            {treasure.updatedAt !== treasure.createdAt && '已编辑'}
          </div>
        </div>
      </Card>

      {/* 图片查看器 */}
      {showLightbox && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-full p-4">
            <img
              src={treasure.images[currentImageIndex].url}
              alt={treasure.images[currentImageIndex].alt || treasure.title}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* 关闭按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLightbox(false)}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* 导航按钮 */}
            {treasure.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {/* 图片计数 */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              {currentImageIndex + 1} / {treasure.images.length}
            </div>
          </div>
        </div>
      )}
    </>
  )
}



