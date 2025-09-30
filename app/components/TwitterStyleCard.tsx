'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from './ui/button'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Calendar,
  Tag,
  Trash2,
  Edit,
  Play,
  Pause,
  Music,
  Image as ImageIcon,
  FileText
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface TwitterStyleCardProps {
  treasure: {
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
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

export function TwitterStyleCard({ 
  treasure, 
  onEdit, 
  onDelete, 
  className 
}: TwitterStyleCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return `${diffInMinutes}分钟前`
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`
    } else if (diffInHours < 48) {
      return '昨天'
    } else if (diffInHours < 168) { // 一周内
      const days = Math.floor(diffInHours / 24)
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getTypeIcon = () => {
    switch (treasure.type) {
      case 'TEXT': return <FileText className="h-4 w-4 text-blue-400" />
      case 'IMAGE': return <ImageIcon className="h-4 w-4 text-green-400" />
      case 'MUSIC': return <Music className="h-4 w-4 text-purple-400" />
    }
  }

  const getTypeColor = () => {
    switch (treasure.type) {
      case 'TEXT': return 'text-blue-400'
      case 'IMAGE': return 'text-green-400'
      case 'MUSIC': return 'text-purple-400'
    }
  }

  const getTypeGradient = () => {
    switch (treasure.type) {
      case 'TEXT': return 'from-blue-400 to-blue-600'
      case 'IMAGE': return 'from-green-400 to-green-600'
      case 'MUSIC': return 'from-purple-400 to-purple-600'
    }
  }

  const renderContent = () => {
    if (!treasure.content) return null
    
    return (
      <div className="prose prose-sm prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
          // 自定义组件样式
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white mt-4 mb-3">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-white mt-4 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-white mt-3 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 text-white/90">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-white/80">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/30 pl-3 italic text-white/70 my-2">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-white/10 px-1 py-0.5 rounded text-sm text-white/90">
                  {children}
                </code>
              )
            }
            return (
              <code className={cn("text-white/90", className)}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 my-2 text-sm overflow-x-auto">
              {children}
            </pre>
          ),
          ul: ({ children }) => (
            <ul className="ml-4 mb-2 space-y-1 list-disc">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="ml-4 mb-2 space-y-1 list-decimal">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-white/90">
              {children}
            </li>
          ),
          a: ({ children, href }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr className="border-white/20 my-4" />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-white/20 rounded-lg">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-white/20 px-3 py-2 bg-white/5 text-white font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-white/10 px-3 py-2 text-white/90">
              {children}
            </td>
          )
          }}
        >
          {treasure.content}
        </ReactMarkdown>
      </div>
    )
  }

  const renderMedia = () => {
    if (treasure.type === 'IMAGE' && treasure.images.length > 0) {
      if (treasure.images.length === 1) {
        return (
          <div className="mt-3 rounded-2xl overflow-hidden border border-white/10">
            <img
              src={treasure.images[0].url}
              alt={treasure.images[0].alt || treasure.title}
              className="w-full max-h-96 object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        )
      } else if (treasure.images.length === 2) {
        return (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl overflow-hidden border border-white/10">
            {treasure.images.map((image, index) => (
              <img
                key={image.id}
                src={image.url}
                alt={image.alt || treasure.title}
                className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
              />
            ))}
          </div>
        )
      } else if (treasure.images.length === 3) {
        return (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl overflow-hidden border border-white/10">
            <img
              src={treasure.images[0].url}
              alt={treasure.images[0].alt || treasure.title}
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
            />
            <div className="grid grid-rows-2 gap-1">
              {treasure.images.slice(1).map((image, index) => (
                <img
                  key={image.id}
                  src={image.url}
                  alt={image.alt || treasure.title}
                  className="w-full h-24 object-cover hover:scale-105 transition-transform duration-300"
                />
              ))}
            </div>
          </div>
        )
      } else {
        return (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl overflow-hidden border border-white/10">
            {treasure.images.slice(0, 4).map((image, index) => (
              <div key={image.id} className="relative">
                <img
                  src={image.url}
                  alt={image.alt || treasure.title}
                  className={cn(
                    "w-full object-cover hover:scale-105 transition-transform duration-300",
                    index === 0 ? "h-48" : "h-24"
                  )}
                />
                {index === 3 && treasure.images.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      +{treasure.images.length - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    }

    if (treasure.type === 'MUSIC' && treasure.musicTitle) {
      return (
        <div className="mt-3 border border-white/20 rounded-2xl p-4 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
              <Music className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white truncate">{treasure.musicTitle}</div>
              <div className="text-sm text-white/70 truncate">
                {treasure.musicArtist}
                {treasure.musicAlbum && ` • ${treasure.musicAlbum}`}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className="rounded-full w-10 h-10 p-0 bg-white/10 hover:bg-white/20 text-white"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      )
    }

    return null
  }

  const shouldTruncate = treasure.content && treasure.content.length > 280

  return (
    <article className={cn(
      "border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 p-6 group shadow-lg hover:shadow-xl",
      className
    )}>
      {/* 头部信息 */}
      <div className="flex items-start gap-3">
        {/* 头像 */}
        <div className={cn(
          "w-10 h-10 bg-gradient-to-br rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg group-hover:scale-110 transition-transform duration-300",
          getTypeGradient()
        )}>
          {treasure.title.charAt(0).toUpperCase()}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          {/* 时间信息 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/60 text-sm">{formatDate(treasure.createdAt)}</span>
            <div className="flex items-center gap-1 ml-2">
              {getTypeIcon()}
            </div>
          </div>

          {/* 标题 - 引用框风格 */}
          <div className={cn(
            "border-l-4 pl-4 mb-4",
            "text-white text-xl font-bold",
            treasure.type === 'TEXT' && "border-blue-400",
            treasure.type === 'IMAGE' && "border-green-400",
            treasure.type === 'MUSIC' && "border-purple-400"
          )}>
            {treasure.title}
          </div>

          {/* 内容 */}
          {treasure.content && (
            <div className="text-white/90 mb-2">
              <div className={cn(
                "prose prose-sm max-w-none",
                !isExpanded && shouldTruncate && "line-clamp-4"
              )}>
                {renderContent()}
              </div>
              
              {shouldTruncate && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-blue-400 hover:text-blue-300 text-sm mt-1 transition-colors"
                >
                  {isExpanded ? '收起' : '展开'}
                </button>
              )}
            </div>
          )}

          {/* 媒体内容 */}
          {renderMedia()}

          {/* 标签 */}
          {treasure.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {treasure.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 backdrop-blur-sm text-white/80 rounded-full text-xs border border-white/20 hover:bg-white/20 transition-colors"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between mt-3 max-w-md">
            <Button variant="ghost" size="sm" className="gap-2 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
              <Heart className="h-4 w-4" />
              <span className="text-sm">0</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2 text-white/60 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">0</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2 text-white/60 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200">
              <Share2 className="h-4 w-4" />
            </Button>

            {/* 更多操作 */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActions(!showActions)}
                className="text-white/60 hover:text-white/80 transition-all duration-200"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              
              {showActions && (
                <div className="absolute right-0 top-8 bg-gray-800/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-lg py-1 z-10 min-w-[120px] animate-in slide-in-from-top-2 duration-200">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(treasure.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/10 text-white transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      编辑
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(treasure.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/10 text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
