'use client'

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/app/components/ui/button'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Tag,
  Trash2,
  Edit,
  Play,
  Pause,
  Music,
  Image as ImageIcon,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 日期格式化工具函数（组件外部，避免重复创建）
function formatDateString(dateString: string): string {
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
  } else if (diffInHours < 168) {
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

interface Answer {
  id: string
  userId: string
  content: string
  createdAt: string
}

interface TwitterStyleCardProps {
  treasure: {
    id: string
    title: string
    content?: string
    type: 'TEXT' | 'IMAGE' | 'MUSIC'
    tags: string[]
    createdAt: string
    updatedAt: string
    likesCount?: number
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
    _count?: {
      likes: number
      answers: number
    }
  }
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onComment?: (treasure: TwitterStyleCardProps['treasure']) => void
  className?: string
  hideComments?: boolean  // 是否隐藏评论区域
  hideCategoryAvatar?: boolean // 是否隐藏卡片内的分类头像区域
}

function TwitterStyleCardComponent({ 
  treasure, 
  onEdit, 
  onDelete,
  onComment,
  className,
  hideComments = false, 
  hideCategoryAvatar = false
}: TwitterStyleCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [likesCount, setLikesCount] = useState(treasure.likesCount || treasure._count?.likes || 0)
  const [answersCount, setAnswersCount] = useState(treasure._count?.answers || 0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [newAnswer, setNewAnswer] = useState('')
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [showInput, setShowInput] = useState(false) // 输入框默认隐藏
  const actionsRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭更多菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false)
      }
    }

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showActions])

  // 获取回答列表
  const fetchAnswers = useCallback(async () => {
    try {
      const response = await fetch(`/api/treasures/${treasure.id}/answers`)
      if (response.ok) {
        const data = await response.json()
        setAnswers(data)
      }
    } catch (error) {
      console.error('Error fetching answers:', error)
    }
  }, [treasure.id])

  // 初始加载回答
  useEffect(() => {
    if (!hideComments) {
      fetchAnswers()
    }
  }, [fetchAnswers, hideComments])

  // 使用 useMemo 缓存格式化的日期，避免每次渲染都计算
  const formattedDate = useMemo(() => {
    const date = new Date(treasure.createdAt)
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
  }, [treasure.createdAt])

  // 使用 useMemo 缓存类型图标
  const typeIcon = useMemo(() => {
    switch (treasure.type) {
      case 'TEXT': return <FileText className="h-4 w-4 text-blue-400" />
      case 'IMAGE': return <ImageIcon className="h-4 w-4 text-green-400" />
      case 'MUSIC': return <Music className="h-4 w-4 text-purple-400" />
    }
  }, [treasure.type])

  // 使用 useMemo 缓存类型渐变
  const typeGradient = useMemo(() => {
    switch (treasure.type) {
      case 'TEXT': return 'from-blue-400 to-blue-600'
      case 'IMAGE': return 'from-green-400 to-green-600'
      case 'MUSIC': return 'from-purple-400 to-purple-600'
    }
  }, [treasure.type])

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
            <pre className="bg-[#0d1117] border border-white/10 rounded-lg p-3 my-2 text-sm overflow-x-auto">
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

  // 判断图片是否应该使用 object-contain（竖图或小图）
  const shouldUseContain = (image: { width?: number; height?: number }) => {
    if (!image.width || !image.height) return false
    // 竖图：高度大于宽度，或者宽高比 < 0.8
    return image.height > image.width || (image.width / image.height) < 0.8
  }

  const renderMedia = () => {
    // 只要有图片就显示，不限制类型
    if (treasure.images && treasure.images.length > 0) {
      const imageCount = treasure.images.length
      
      // 1张图：大图完整展示，有冲击力
      if (imageCount === 1) {
        const firstImage = treasure.images[0]
        const useContain = shouldUseContain(firstImage)
        
        return (
          <div 
            className="mt-3 rounded-2xl overflow-hidden border border-white/10 bg-gray-900/20 flex items-center justify-center cursor-pointer group"
            onClick={() => setSelectedImageIndex(0)}
          >
            <Image
              src={firstImage.url}
              alt={firstImage.alt || treasure.title}
              width={firstImage.width || 1200}
              height={firstImage.height || 800}
              loading="lazy"
              className={cn(
                "w-full max-h-[500px] transition-transform duration-300",
                useContain ? "object-contain" : "object-cover group-hover:scale-105"
              )}
            />
          </div>
        )
      } 
      // 2张图：左右平铺，完整展示
      else if (imageCount === 2) {
        return (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
            {treasure.images.map((image, index) => {
              const useContain = shouldUseContain(image)
              return (
                <div 
                  key={image.id} 
                  className="relative h-64 bg-gray-900/20 rounded-xl overflow-hidden border border-white/10 cursor-pointer group flex items-center justify-center"
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <Image
                    src={image.url}
                    alt={image.alt || treasure.title}
                    width={image.width || 600}
                    height={image.height || 400}
                    loading="lazy"
                    className={cn(
                      "w-full h-full transition-transform duration-300",
                      useContain ? "object-contain" : "object-cover group-hover:scale-105"
                    )}
                  />
                </div>
              )
            })}
          </div>
        )
      } 
      // 3张图：1大2小布局，完整展示
      else if (imageCount === 3) {
        const firstImageUseContain = shouldUseContain(treasure.images[0])
        
        return (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {/* 第一张大图 */}
            <div 
              className="col-span-2 h-72 bg-gray-900/20 rounded-xl overflow-hidden border border-white/10 cursor-pointer group flex items-center justify-center"
              onClick={() => setSelectedImageIndex(0)}
            >
              <Image
                src={treasure.images[0].url}
                alt={treasure.images[0].alt || treasure.title}
                width={treasure.images[0].width || 1000}
                height={treasure.images[0].height || 600}
                loading="lazy"
                className={cn(
                  "w-full h-full transition-transform duration-300",
                  firstImageUseContain ? "object-contain" : "object-cover group-hover:scale-105"
                )}
              />
            </div>
            {/* 后两张小图 */}
            {treasure.images.slice(1, 3).map((image, index) => {
              const useContain = shouldUseContain(image)
              return (
                <div 
                  key={image.id}
                  className="h-40 bg-gray-900/20 rounded-xl overflow-hidden border border-white/10 cursor-pointer group flex items-center justify-center"
                  onClick={() => setSelectedImageIndex(index + 1)}
                >
                  <Image
                    src={image.url}
                    alt={image.alt || treasure.title}
                    width={image.width || 400}
                    height={image.height || 300}
                    loading="lazy"
                    className={cn(
                      "w-full h-full transition-transform duration-300",
                      useContain ? "object-contain" : "object-cover group-hover:scale-105"
                    )}
                  />
                </div>
              )
            })}
          </div>
        )
      } 
      // 4+张图：展示前3张，第4张显示"+N"
      else {
        const firstImageUseContain = shouldUseContain(treasure.images[0])
        
        return (
          <div className="mt-3">
            <div className="grid grid-cols-2 gap-2">
              {/* 第一张大图 */}
              <div 
                className="col-span-2 h-72 bg-gray-900/20 rounded-xl overflow-hidden border border-white/10 cursor-pointer group flex items-center justify-center"
                onClick={() => setSelectedImageIndex(0)}
              >
                <Image
                  src={treasure.images[0].url}
                  alt={treasure.images[0].alt || treasure.title}
                  width={treasure.images[0].width || 1000}
                  height={treasure.images[0].height || 600}
                  loading="lazy"
                  className={cn(
                    "w-full h-full transition-transform duration-300",
                    firstImageUseContain ? "object-contain" : "object-cover group-hover:scale-105"
                  )}
                />
              </div>
              {/* 第2、3张小图 */}
              {treasure.images.slice(1, 3).map((image, index) => {
                const useContain = shouldUseContain(image)
                return (
                  <div 
                    key={image.id}
                    className="h-40 bg-gray-900/20 rounded-xl overflow-hidden border border-white/10 cursor-pointer group flex items-center justify-center"
                    onClick={() => setSelectedImageIndex(index + 1)}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt || treasure.title}
                      width={image.width || 400}
                      height={image.height || 300}
                      loading="lazy"
                      className={cn(
                        "w-full h-full transition-transform duration-300",
                        useContain ? "object-contain" : "object-cover group-hover:scale-105"
                      )}
                    />
                  </div>
                )
              })}
            </div>
            {/* 查看更多按钮 */}
            <button
              onClick={() => setSelectedImageIndex(0)}
              className="mt-2 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-all flex items-center justify-center gap-2 group"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-sm font-medium">查看全部 {imageCount} 张图片</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )
      }
    }

    if (treasure.type === 'MUSIC' && treasure.musicTitle) {
      return (
        <div className="mt-3 border border-white/20 rounded-2xl p-4 bg-[#0d1117]">
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

  // 图片导航处理 - 使用 useCallback 优化
  const handlePrevImage = useCallback(() => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1)
    }
  }, [selectedImageIndex])

  const handleNextImage = useCallback(() => {
    if (selectedImageIndex !== null && selectedImageIndex < treasure.images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1)
    }
  }, [selectedImageIndex, treasure.images.length])

  const handleCloseImageModal = useCallback(() => {
    setSelectedImageIndex(null)
  }, [])

  // 点赞（允许多次点赞，用于记录查阅次数）- 使用 useCallback 优化
  const handleLike = useCallback(async () => {
    // 乐观更新：直接增加计数
    const previousCount = likesCount
    setLikesCount(prev => prev + 1)

    try {
      const response = await fetch(`/api/treasures/${treasure.id}/like`, {
        method: 'POST'
      })
      
      // 如果请求失败，回滚状态
      if (!response.ok) {
        setLikesCount(previousCount)
        console.error('点赞操作失败')
      }
    } catch (error) {
      // 请求失败，回滚状态
      setLikesCount(previousCount)
      console.error('Error liking:', error)
    }
  }, [likesCount, treasure.id])

  // 切换输入框显示 - 使用 useCallback 优化
  const handleToggleInput = useCallback(() => {
    setShowInput(prev => !prev)
  }, [])

  // 提交回答（乐观更新）- 使用 useCallback 优化
  const handleSubmitAnswer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAnswer.trim() || isSubmittingAnswer) return

    const content = newAnswer.trim()
    
    // 乐观更新：立即添加到 UI
    const optimisticAnswer: Answer = {
      id: `temp-${Date.now()}`,
      userId: 'current-user',
      content,
      createdAt: new Date().toISOString()
    }
    
    setAnswers(prev => [optimisticAnswer, ...prev])
    setAnswersCount(prev => prev + 1)
    setNewAnswer('')
    setShowInput(false) // 提交后关闭输入框

    try {
      setIsSubmittingAnswer(true)
      const response = await fetch(`/api/treasures/${treasure.id}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })

      if (response.ok) {
        // 重新获取完整的回答列表（包含真实 ID）
        await fetchAnswers()
      } else {
        // 请求失败，移除乐观添加的回答
        setAnswers(prev => prev.filter(a => a.id !== optimisticAnswer.id))
        setAnswersCount(prev => prev - 1)
        console.error('提交回答失败')
      }
    } catch (error) {
      // 请求失败，移除乐观添加的回答
      setAnswers(prev => prev.filter(a => a.id !== optimisticAnswer.id))
      setAnswersCount(prev => prev - 1)
      console.error('Error submitting answer:', error)
    } finally {
      setIsSubmittingAnswer(false)
    }
  }, [newAnswer, isSubmittingAnswer, treasure.id, fetchAnswers])

  // 删除回答（乐观更新）- 使用 useCallback 优化
  const handleDeleteAnswer = useCallback(async (answerId: string) => {
    // 乐观更新：立即从 UI 移除
    const deletedAnswer = answers.find(a => a.id === answerId)
    if (!deletedAnswer) return

    setAnswers(prev => prev.filter(a => a.id !== answerId))
    setAnswersCount(prev => Math.max(0, prev - 1))

    try {
      const response = await fetch(`/api/treasures/${treasure.id}/answers/${answerId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        // 请求失败，恢复回答
        setAnswers(prev => [deletedAnswer, ...prev])
        setAnswersCount(prev => prev + 1)
        console.error('删除回答失败')
      }
    } catch (error) {
      // 请求失败，恢复回答
      setAnswers(prev => [deletedAnswer, ...prev])
      setAnswersCount(prev => prev + 1)
      console.error('Error deleting answer:', error)
    }
  }, [answers, treasure.id])

  return (
    <>
      <article className={cn(
        "relative border border-white/10 rounded-2xl bg-[#161b22] hover:bg-[#1c2128] transition-all duration-300 p-6 group shadow-lg hover:shadow-xl",
        showActions && "z-10",
        className
      )}>
        {/* PC端：左右布局；移动端：上下布局 */}
        {!hideComments ? (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* 主内容区域 */}
            <div className="flex-1 min-w-0">
          {/* 头部信息 */}
          <div className="flex items-start gap-3">
            {/* 头像区域 - 包含分类名称和头像 */}
            {!hideCategoryAvatar && (
            <div className="flex flex-col items-center gap-1">
              {/* 分类名称 */}
              {(() => {
                const primaryCategory = treasure.tags.find(tag => 
                  ['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)
                )
                if (primaryCategory) {
                  const categoryLabel: Record<string, string> = {
                    'Life': '生活',
                    'Knowledge': '知识',
                    'Thought': '思考',
                    'Root': '根源'
                  }
                  return (
                    <span className="text-xs text-white/60 font-medium whitespace-nowrap">
                      {categoryLabel[primaryCategory]}
                    </span>
                  )
                }
                return null
              })()}
              {/* 头像 - 使用主要分类emoji或首字母 */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                {(() => {
                  // 如果有主要分类，显示emoji
                  const primaryCategory = treasure.tags.find(tag => 
                    ['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)
                  )
                  if (primaryCategory) {
                    const categoryEmoji: Record<string, string> = {
                      'Life': '🌱',
                      'Knowledge': '📚',
                      'Thought': '💭',
                      'Root': '🌳'
                    }
                    return <span className="text-xl">{categoryEmoji[primaryCategory]}</span>
                  }
                  // 否则显示标题首字母
                  return <span className="text-white font-semibold text-sm">{treasure.title.charAt(0).toUpperCase()}</span>
                })()}
              </div>
            </div>
            )}

            {/* 内容区域 */}
            <div className="flex-1 min-w-0">
              {/* 时间信息 */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white/60 text-sm">{formattedDate}</span>
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

              {/* 主题标签 - 只显示非主要分类的标签 */}
              {treasure.tags.some(tag => !['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)) && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {treasure.tags
                    .filter(tag => !['Life', 'Knowledge', 'Thought', 'Root'].includes(tag))
                    .map((tag, index) => {
                      // 处理层级标签的显示
                      const parts = tag.split('/')
                      const isHierarchical = parts.length > 1
                      
                      return (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2.5 py-1 backdrop-blur-sm rounded-full text-xs border transition-colors bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
                        >
                          <Tag className="h-3 w-3" />
                          {isHierarchical ? (
                            <span className="flex items-center gap-0.5">
                              {parts.map((part, i) => (
                                <span key={i} className="flex items-center">
                                  {i > 0 && <span className="text-white/40 mx-0.5">/</span>}
                                  <span className={i === parts.length - 1 ? "font-medium" : "text-white/60"}>
                                    {part}
                                  </span>
                                </span>
                              ))}
                            </span>
                          ) : (
                            tag
                          )}
                        </span>
                      )
                    })}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center justify-between mt-3 max-w-md">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLike()
                  }}
                  className="gap-2 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                >
                  <Heart className="h-4 w-4" />
                  <span className="text-sm">{likesCount}</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation()
                    onComment?.(treasure)
                  }}
                  className="gap-2 text-white/60 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-sm">{answersCount}</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => e.stopPropagation()}
                  className="gap-2 text-white/60 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200"
                >
                  <Share2 className="h-4 w-4" />
                </Button>

                {/* 更多操作 */}
                <div className="relative" ref={actionsRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowActions(!showActions)
                    }}
                    className="text-white/60 hover:text-white/80 transition-all duration-200"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  
                  {showActions && (
                    <div className="absolute right-0 top-8 bg-[#161b22] border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[120px] animate-in slide-in-from-top-2 duration-200">
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowActions(false)
                            onEdit(treasure.id)
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/10 text-white transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          编辑
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowActions(false)
                            onDelete(treasure.id)
                          }}
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
        </div>

            {/* 评论区域 - PC端右侧，移动端隐藏 */}
            <div className="hidden lg:block lg:w-96 flex-shrink-0">
              <div className="lg:sticky lg:top-4">
                {/* 评论标题 */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-400" />
                    <h3 className="text-white/80 font-medium text-sm">评论 ({answersCount})</h3>
                  </div>
                </div>

                {/* 添加评论按钮 */}
                {!showInput && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowInput(true)
                    }}
                    className="w-full mb-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    写下你的回答
                  </Button>
                )}

                {/* 回答输入框 */}
                {showInput && (
                  <form onSubmit={handleSubmitAnswer} className="mb-3">
                    <div className="space-y-2">
                      <textarea
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        placeholder="写下你的回答..."
                        rows={3}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-sm resize-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowInput(false)
                            setNewAnswer('')
                          }}
                          size="sm"
                          variant="ghost"
                          className="text-white/60 hover:text-white"
                        >
                          取消
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!newAnswer.trim() || isSubmittingAnswer}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isSubmittingAnswer ? '发送中...' : '发送'}
                        </Button>
                      </div>
                    </div>
                  </form>
                )}

                {/* 回答列表 */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {answers.length > 0 ? (
                    answers.map((answer) => (
                      <div
                        key={answer.id}
                        className="bg-white/5 rounded-lg p-3 border border-white/10 group/answer hover:bg-white/10 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-white/90 text-sm flex-1 break-words">{answer.content}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteAnswer(answer.id)
                            }}
                            className="opacity-0 group-hover/answer:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all text-red-400 hover:text-red-300 shrink-0"
                            title="删除回答"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-white/40 text-xs mt-2">{formatDateString(answer.createdAt)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <MessageCircle className="h-12 w-12 mx-auto text-white/20 mb-3" />
                      <p className="text-white/40 text-sm">暂无评论</p>
                      <p className="text-white/30 text-xs mt-1">来抢沙发吧~</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            {/* 头部信息 */}
            <div className="flex items-start gap-3">
            {/* 头像区域 - 包含分类名称和头像 */}
            {!hideCategoryAvatar && (
            <div className="flex flex-col items-center gap-1">
              {/* 分类名称 */}
              {(() => {
                const primaryCategory = treasure.tags.find(tag => 
                  ['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)
                )
                if (primaryCategory) {
                  const categoryLabel: Record<string, string> = {
                    'Life': '生活',
                    'Knowledge': '知识',
                    'Thought': '思考',
                    'Root': '根源'
                  }
                  return (
                    <span className="text-xs text-white/60 font-medium whitespace-nowrap">
                      {categoryLabel[primaryCategory]}
                    </span>
                  )
                }
                return null
              })()}
              {/* 头像 - 使用主要分类emoji或首字母 */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                {(() => {
                  // 如果有主要分类，显示emoji
                  const primaryCategory = treasure.tags.find(tag => 
                    ['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)
                  )
                  if (primaryCategory) {
                    const categoryEmoji: Record<string, string> = {
                      'Life': '🌱',
                      'Knowledge': '📚',
                      'Thought': '💭',
                      'Root': '🌳'
                    }
                    return <span className="text-xl">{categoryEmoji[primaryCategory]}</span>
                  }
                  // 否则显示标题首字母
                  return <span className="text-white font-semibold text-sm">{treasure.title.charAt(0).toUpperCase()}</span>
                })()}
              </div>
            </div>
            )}

            {/* 内容区域 */}
            <div className="flex-1 min-w-0">
              {/* 时间信息 */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white/60 text-sm">{formattedDate}</span>
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

                {/* 主题标签 - 只显示非主要分类的标签 */}
                {treasure.tags.some(tag => !['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)) && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {treasure.tags
                      .filter(tag => !['Life', 'Knowledge', 'Thought', 'Root'].includes(tag))
                      .map((tag, index) => {
                        // 处理层级标签的显示
                        const parts = tag.split('/')
                        const isHierarchical = parts.length > 1
                        
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
                          >
                            <Tag className="h-3 w-3" />
                            {isHierarchical ? (
                              <span className="flex items-center gap-0.5">
                                {parts.map((part, i) => (
                                  <span key={i} className="flex items-center">
                                    {i > 0 && <span className="text-white/40 mx-0.5">/</span>}
                                    <span className={i === parts.length - 1 ? "font-medium" : "text-white/60"}>
                                      {part}
                                    </span>
                                  </span>
                                ))}
                              </span>
                            ) : (
                              tag
                            )}
                          </span>
                        )
                      })}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center justify-between mt-3 max-w-md">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLike()
                    }}
                    className="gap-2 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  >
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">{likesCount}</span>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation()
                      onComment?.(treasure)
                    }}
                    className="gap-2 text-white/60 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">{answersCount}</span>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => e.stopPropagation()}
                    className="gap-2 text-white/60 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>

                  {/* 更多操作 */}
                  <div className="relative" ref={actionsRef}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowActions(!showActions)
                      }}
                      className="text-white/60 hover:text-white/80 transition-all duration-200"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    
                    {showActions && (
                      <div className="absolute right-0 top-8 bg-[#161b22] border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[120px] animate-in slide-in-from-top-2 duration-200">
                        {onEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowActions(false)
                              onEdit(treasure.id)
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/10 text-white transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                            编辑
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowActions(false)
                              onDelete(treasure.id)
                            }}
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
          </div>
        )}
      </article>

    {/* 图片预览模态框 */}
    {selectedImageIndex !== null && (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        onClick={handleCloseImageModal}
      >
        {/* 关闭按钮 */}
        <button
          onClick={handleCloseImageModal}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* 图片计数器 */}
        {treasure.images.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-black/50 text-white text-sm">
            {selectedImageIndex + 1} / {treasure.images.length}
          </div>
        )}

        {/* 左箭头 */}
        {treasure.images.length > 1 && selectedImageIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrevImage()
            }}
            className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}

        {/* 右箭头 */}
        {treasure.images.length > 1 && selectedImageIndex < treasure.images.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleNextImage()
            }}
            className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}

        {/* 图片显示 */}
        <div 
          className="relative max-w-[90vw] max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={treasure.images[selectedImageIndex].url}
            alt={treasure.images[selectedImageIndex].alt || treasure.title}
            width={treasure.images[selectedImageIndex].width || 1200}
            height={treasure.images[selectedImageIndex].height || 800}
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
          />
        </div>
      </div>
    )}
    </>
  )
}

// 使用 React.memo 优化性能，避免不必要的重渲染
export const TwitterStyleCard = memo(TwitterStyleCardComponent, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时才重新渲染
  return (
    prevProps.treasure.id === nextProps.treasure.id &&
    prevProps.treasure.updatedAt === nextProps.treasure.updatedAt &&
    prevProps.treasure._count?.likes === nextProps.treasure._count?.likes &&
    prevProps.treasure._count?.answers === nextProps.treasure._count?.answers &&
    prevProps.hideComments === nextProps.hideComments &&
    prevProps.className === nextProps.className
  )
})

TwitterStyleCard.displayName = 'TwitterStyleCard'
