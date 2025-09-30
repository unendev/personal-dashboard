'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog'
import { Music, FileText, Image, Hash, Code, Sparkles } from 'lucide-react'

interface SlashCommandModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateTreasureData) => Promise<void>
}

export interface CreateTreasureData {
  title: string
  content?: string
  type: 'TEXT' | 'IMAGE' | 'MUSIC'
  tags: string[]
  musicTitle?: string
  musicArtist?: string
  musicAlbum?: string
  musicUrl?: string
  musicCoverUrl?: string
  images?: Array<{
    url: string
    alt?: string
    width?: number
    height?: number
    size?: number
  }>
}

export function SlashCommandModal({ 
  isOpen, 
  onClose, 
  onSubmit 
}: SlashCommandModalProps) {
  const [input, setInput] = useState('')
  const [formData, setFormData] = useState<CreateTreasureData>({
    title: '',
    content: '',
    type: 'TEXT',
    tags: [],
    musicTitle: '',
    musicArtist: '',
    musicAlbum: '',
    musicUrl: '',
    musicCoverUrl: '',
    images: []
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 确保组件在客户端挂载
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 解析 slash 指令
  const parseSlashCommand = (text: string) => {
    const lines = text.split('\n')
    const firstLine = lines[0]
    
    // 检测指令类型
    if (firstLine.startsWith('/text ')) {
      return {
        type: 'TEXT' as const,
        title: firstLine.slice(6).trim(),
        content: lines.slice(1).join('\n').trim()
      }
    } else if (firstLine.startsWith('/image ')) {
      return {
        type: 'IMAGE' as const,
        title: firstLine.slice(7).trim(),
        content: lines.slice(1).join('\n').trim()
      }
    } else if (firstLine.startsWith('/music ')) {
      const parts = firstLine.slice(7).trim().split(' - ')
      return {
        type: 'MUSIC' as const,
        title: parts[0] || '',
        musicTitle: parts[0] || '',
        musicArtist: parts[1] || '',
        musicAlbum: parts[2] || '',
        content: lines.slice(1).join('\n').trim()
      }
    }
    
    // 默认文本类型
    return {
      type: 'TEXT' as const,
      title: firstLine,
      content: lines.slice(1).join('\n').trim()
    }
  }

  // 提取标签
  const extractTags = (text: string) => {
    const tagRegex = /#(\w+)/g
    const matches = text.match(tagRegex)
    return matches ? matches.map(tag => tag.slice(1)) : []
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    
    if (value.trim()) {
      const parsed = parseSlashCommand(value)
      const tags = extractTags(value)
      
      setFormData({
        title: parsed.title,
        content: parsed.content,
        type: parsed.type,
        tags,
        musicTitle: parsed.musicTitle || '',
        musicArtist: parsed.musicArtist || '',
        musicAlbum: parsed.musicAlbum || '',
        musicUrl: '',
        musicCoverUrl: '',
        images: []
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      handleClose()
    } catch (error) {
      console.error('Error creating treasure:', error)
      alert(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setInput('')
    setFormData({
      title: '',
      content: '',
      type: 'TEXT',
      tags: [],
      musicTitle: '',
      musicArtist: '',
      musicAlbum: '',
      musicUrl: '',
      musicCoverUrl: '',
      images: []
    })
    onClose()
  }

  // 在客户端挂载前不渲染模态框
  if (!isMounted) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900/95 backdrop-blur-xl border-gray-700">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-400" />
              <span className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                藏宝阁
              </span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            用最自然的方式记录你的想法，支持智能语法识别
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 主输入框 */}
          <div className="relative">
            {/* 输入框头部 */}
            <div className="flex items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                <label className="text-sm font-medium text-white">创作空间</label>
              </div>
              {input && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-white/60">实时识别</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            
            <div className="relative bg-gradient-to-br from-white/5 via-white/3 to-white/8 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
              
              <div className="relative">
                {/* 智能提示条 */}
                <div className="flex items-center justify-between px-4 py-2 bg-white/10 border-b border-white/10">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-blue-300 hover:text-blue-200 transition-colors">
                      <Code className="h-3 w-3" />
                      /text
                    </span>
                    <span className="flex items-center gap-1 text-green-300 hover:text-green-200 transition-colors">
                      <Image className="h-3 w-3" />
                      /image
                    </span>
                    <span className="flex items-center gap-1 text-purple-300 hover:text-purple-200 transition-colors">
                      <Music className="h-3 w-3" />
                      /music
                    </span>
                    <span className="flex items-center gap-1 text-orange-300 hover:text-orange-200 transition-colors">
                      <Hash className="h-3 w-3" />
                      #标签
                    </span>
                  </div>
                  <div className="text-xs text-white/50">
                    {input.length}/1000
                  </div>
                </div>
                
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={`✨ 在这里记录你的想法...

💡 使用指令快速创建：
• /text 我的想法
  这里是内容...

• /image 美好瞬间
  描述图片...

• /music 歌曲名 - 艺术家
  音乐感受...

🏷️ 使用 #标签 进行分类`}
                  rows={8}
                  className="relative w-full bg-transparent border-0 px-4 py-6 text-white placeholder:text-white/40 resize-none focus:outline-none focus:ring-0 text-base leading-relaxed"
                  maxLength={1000}
                />
                
                {/* 底部装饰线 */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent;"></div>
              </div>
            </div>
            
            {/* 智能识别状态 */}
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex items-center gap-4 text-xs">
                {formData.type === 'TEXT' && (
                  <span className="flex items-center gap-1 text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                    <FileText className="h-3 w-3" />
                    文本模式
                  </span>
                )}
                {formData.type === 'IMAGE' && (
                  <span className="flex items-center gap-1 text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                    <Image className="h-3 w-3" />
                    图片模式
                  </span>
                )}
                {formData.type === 'MUSIC' && (
                  <span className="flex items-center gap-1 text-purple-400 bg-purple-400/10 px-2 py-1 rounded-full">
                    <Music className="h-3 w-3" />
                    音乐模式
                  </span>
                )}
                
                {formData.tags.length > 0 && (
                  <span className="text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full">
                    {formData.tags.length} 个标签已识别
                  </span>
                )}
              </div>
              
              <div className="text-xs text-white/50 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Enter</kbd>
                换行 • 
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Ctrl+Enter</kbd>
                提交
              </div>
            </div>
          </div>

          {/* 预览区域 */}
          {formData.title && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
                <h3 className="text-sm font-medium text-white">预览效果</h3>
              </div>
              
              {/* 标题 */}
              <div>
                <label className="text-sm font-medium mb-2 block text-white/70">标题</label>
                <div className="relative">
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20"
                    placeholder="为你的宝藏起个名字..."
                  />
                </div>
              </div>

              {/* 内容 */}
              {formData.content && (
                <div>
                  <label className="text-sm font-medium mb-2 block text-white/70">内容</label>
                  <div className="relative">
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      rows={4}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20 resize-none"
                      placeholder="详细描述..."
                    />
                  </div>
                </div>
              )}

              {/* 音乐信息 */}
              {formData.type === 'MUSIC' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block text-white/70">艺术家</label>
                      <Input
                        value={formData.musicArtist}
                        onChange={(e) => setFormData(prev => ({ ...prev, musicArtist: e.target.value }))}
                        placeholder="艺术家名称"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/20"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block text-white/70">专辑</label>
                      <Input
                        value={formData.musicAlbum}
                        onChange={(e) => setFormData(prev => ({ ...prev, musicAlbum: e.target.value }))}
                        placeholder="专辑名称"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block text-white/70">音乐链接</label>
                    <Input
                      value={formData.musicUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, musicUrl: e.target.value }))}
                      placeholder="Spotify、Apple Music 等平台链接"
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block text-white/70">封面链接</label>
                    <Input
                      value={formData.musicCoverUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, musicCoverUrl: e.target.value }))}
                      placeholder="专辑封面图片链接"
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/20"
                    />
                  </div>
                </div>
              )}

              {/* 标签预览 */}
              {formData.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block text-white/70">标签</label>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-400/20 to-purple-400/20 text-orange-400 rounded-full text-sm border border-orange-400/30 backdrop-blur-sm"
                      >
                        <Hash className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="border-gray-600 text-gray-300 hover:bg-gray-800">
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.title.trim() || isSubmitting}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>创建中...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>创建宝藏</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}