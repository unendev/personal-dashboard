'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { 
  FileText, 
  Calendar, 
  Tag, 
  Edit, 
  Trash2, 
  MoreVertical,
  Heart,
  Share2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TextCardProps {
  treasure: {
    id: string
    title: string
    content?: string
    tags: string[]
    createdAt: string
    updatedAt: string
  }
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

export function TextCard({ 
  treasure, 
  onEdit, 
  onDelete, 
  className 
}: TextCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
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

  const renderContent = () => {
    if (!treasure.content) return null
    
    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-gray-900 mt-1 mb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-gray-900 mt-1 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-gray-900 mt-1 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 text-gray-700">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-600">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-600 my-2">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm text-gray-800">
                  {children}
                </code>
              )
            }
            return (
              <code className={cn("text-gray-800", className)}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto my-2">
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
            <li className="text-gray-700">
              {children}
            </li>
          ),
          a: ({ children, href }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr className="border-gray-300 my-4" />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-300 rounded-lg">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-gray-900 font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-200 px-3 py-2 text-gray-700">
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

  const shouldTruncate = treasure.content && treasure.content.length > 200

  return (
    <Card className={cn("p-6 hover:shadow-lg transition-shadow duration-200", className)}>
      {/* 头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{treasure.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              {formatDate(treasure.createdAt)}
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

      {/* 内容 */}
      {treasure.content && (
        <div className="mb-4">
          <div className={cn(
            "prose prose-sm max-w-none",
            !isExpanded && shouldTruncate && "line-clamp-4"
          )}>
            {renderContent()}
          </div>
          
          {shouldTruncate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              {isExpanded ? '收起' : '展开'}
            </Button>
          )}
        </div>
      )}

      {/* 标签 */}
      {treasure.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {treasure.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
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
  )
}



