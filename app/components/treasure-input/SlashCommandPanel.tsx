'use client'

import { useEffect, useState } from 'react'
import { Music, Link as LinkIcon, Quote } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface Command {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const COMMANDS: Command[] = [
  {
    id: 'music',
    label: '/music',
    description: '创建音乐卡片',
    icon: Music
  },
  {
    id: 'link',
    label: '/link',
    description: '插入链接（即将推出）',
    icon: LinkIcon
  },
  {
    id: 'quote',
    label: '/quote',
    description: '插入引用（即将推出）',
    icon: Quote
  },
]

interface SlashCommandPanelProps {
  search: string
  onSelect: (commandId: string) => void
  onClose: () => void
}

export function SlashCommandPanel({ 
  search, 
  onSelect, 
  onClose 
}: SlashCommandPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // 过滤命令
  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.id.toLowerCase().includes(search.toLowerCase()) ||
    cmd.label.toLowerCase().includes(search.toLowerCase())
  )

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].id)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredCommands, selectedIndex, onSelect, onClose])

  if (filteredCommands.length === 0) {
    return null
  }

  return (
    <div className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-20">
      <div className="py-1">
        {filteredCommands.map((command, index) => {
          const Icon = command.icon
          const isSelected = index === selectedIndex
          const isDisabled = command.id !== 'music' // 暂时只启用音乐命令
          
          return (
            <button
              key={command.id}
              type="button"
              onClick={() => !isDisabled && onSelect(command.id)}
              disabled={isDisabled}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5",
                "text-left transition-colors",
                isSelected && !isDisabled && "bg-blue-50",
                isDisabled && "opacity-50 cursor-not-allowed",
                !isDisabled && "hover:bg-gray-50"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg",
                isSelected && !isDisabled ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900">
                  {command.label}
                </div>
                <div className="text-xs text-gray-500">
                  {command.description}
                </div>
              </div>

              {isSelected && !isDisabled && (
                <kbd className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                  ⏎
                </kbd>
              )}
            </button>
          )
        })}
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          <kbd className="px-1 py-0.5 bg-white rounded text-xs">↑↓</kbd> 导航 · 
          <kbd className="px-1 py-0.5 bg-white rounded text-xs ml-2">⏎</kbd> 选择 · 
          <kbd className="px-1 py-0.5 bg-white rounded text-xs ml-2">Esc</kbd> 关闭
        </p>
      </div>
    </div>
  )
}
