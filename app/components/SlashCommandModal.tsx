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
import { X, Upload, Music, FileText, Image, Hash } from 'lucide-react'

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

  const getTypeIcon = () => {
    switch (formData.type) {
      case 'TEXT': return <FileText className="h-5 w-5" />
      case 'IMAGE': return <Image className="h-5 w-5" />
      case 'MUSIC': return <Music className="h-5 w-5" />
    }
  }

  const getTypeTitle = () => {
    switch (formData.type) {
      case 'TEXT': return '创建文本宝藏'
      case 'IMAGE': return '创建图片宝藏'
      case 'MUSIC': return '创建音乐宝藏'
    }
  }

  // 在客户端挂载前不渲染模态框
  if (!isMounted) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon()}
            {getTypeTitle()}
          </DialogTitle>
          <DialogDescription>
            使用 slash 指令快速创建宝藏，支持 /text、/image、/music
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 主输入框 */}
          <div>
            <label className="text-sm font-medium mb-2 block text-white">内容 *</label>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={`输入内容，支持 slash 指令：

/text 标题
内容...

/image 标题
描述...

/music 歌曲名 - 艺术家 - 专辑
感受...

使用 #标签 添加标签`}
              rows={8}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
            />
          </div>

          {/* 预览区域 */}
          {formData.title && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white">预览</h3>
              
              {/* 标题 */}
              <div>
                <label className="text-sm font-medium mb-2 block text-white/70">标题</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              {/* 内容 */}
              {formData.content && (
                <div>
                  <label className="text-sm font-medium mb-2 block text-white/70">内容</label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
              )}

              {/* 音乐信息 */}
              {formData.type === 'MUSIC' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-white/70">艺术家</label>
                    <Input
                      value={formData.musicArtist}
                      onChange={(e) => setFormData(prev => ({ ...prev, musicArtist: e.target.value }))}
                      placeholder="艺术家"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block text-white/70">专辑</label>
                    <Input
                      value={formData.musicAlbum}
                      onChange={(e) => setFormData(prev => ({ ...prev, musicAlbum: e.target.value }))}
                      placeholder="专辑"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-2 block text-white/70">音乐链接</label>
                    <Input
                      value={formData.musicUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, musicUrl: e.target.value }))}
                      placeholder="Spotify、Apple Music 等链接"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-2 block text-white/70">封面链接</label>
                    <Input
                      value={formData.musicCoverUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, musicCoverUrl: e.target.value }))}
                      placeholder="专辑封面图片链接"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>
              )}

              {/* 标签 */}
              {formData.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block text-white/70">标签</label>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 text-white/80 rounded-full text-xs border border-white/20"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button type="submit" disabled={!formData.title.trim() || isSubmitting}>
              {isSubmitting ? '创建中...' : '创建宝藏'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
