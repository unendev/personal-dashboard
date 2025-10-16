/**
 * 层级标签组件 - 统一显示普通标签和层级标签
 * 
 * 支持斜杠分隔的层级标签，自动识别并美化显示
 */

import { cn } from '@/lib/utils'
import { Hash, X } from 'lucide-react'

interface HierarchicalTagProps {
  tag: string
  variant?: 'default' | 'cloud'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isSelected?: boolean
  onRemove?: () => void
  onClick?: () => void
  className?: string
}

export function HierarchicalTag({
  tag,
  variant = 'default',
  size = 'md',
  isSelected = false,
  onRemove,
  onClick,
  className
}: HierarchicalTagProps) {
  // 检测层级标签（包含斜杠）
  const isHierarchical = tag.includes('/')
  const parts = isHierarchical ? tag.split('/') : [tag]

  // 尺寸样式映射
  const sizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-xl'
  }

  // 变体样式映射
  const variantStyles = {
    // 默认样式（标签输入）
    default: isHierarchical
      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-300'
      : 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-300',
    
    // 标签云样式
    cloud: isSelected
      ? (isHierarchical ? 'text-blue-300' : 'text-purple-300')
      : (isHierarchical ? 'text-blue-400/80 hover:text-blue-300' : 'text-white/70 hover:text-white/90')
  }

  // 悬停按钮样式
  const hoverButtonStyle = isHierarchical ? 'hover:bg-blue-500/30' : 'hover:bg-green-500/30'

  if (variant === 'cloud') {
    // 标签云样式（简化版，无边框无背景）
    return (
      <button
        onClick={onClick}
        className={cn(
          'transition-all duration-200 hover:scale-110 font-medium inline-flex items-center gap-1',
          sizeStyles[size],
          variantStyles.cloud,
          className
        )}
        title={`${isHierarchical ? `层级标签：${parts.join(' → ')}` : tag}`}
      >
        <span>#</span>
        {isHierarchical ? (
          <span className="inline-flex items-center gap-0.5">
            {parts.map((part, i) => (
              <span key={i} className="inline-flex items-center">
                {i > 0 && <span className="mx-0.5 opacity-50">/</span>}
                <span>{part}</span>
              </span>
            ))}
          </span>
        ) : (
          tag
        )}
      </button>
    )
  }

  // 默认样式（标签输入）
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md',
        variantStyles.default,
        sizeStyles[size],
        'animate-in fade-in-0 zoom-in-95 duration-200',
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={onClick}
      title={isHierarchical ? `层级标签：${parts.join(' → ')}` : undefined}
    >
      <Hash className="h-3 w-3" />
      {isHierarchical ? (
        <span className="flex items-center gap-1">
          {parts.map((part, i) => (
            <span key={i} className="inline-flex items-center">
              {i > 0 && <span className="mx-0.5 text-blue-400/60">/</span>}
              <span>{part}</span>
            </span>
          ))}
        </span>
      ) : (
        tag
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className={cn('rounded-full p-0.5 transition-colors', hoverButtonStyle)}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

