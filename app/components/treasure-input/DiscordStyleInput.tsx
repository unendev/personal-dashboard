'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '../ui/button'
import { Paperclip, Hash, Sparkles } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { TreasureData } from './TreasureInputModal'
import { ImageUploadPreview } from './ImageUploadPreview'
import { SlashCommandPanel } from './SlashCommandPanel'
import { MusicCardForm } from './MusicCardForm'
import { ThemeSelector } from './ThemeSelector'

interface DiscordStyleInputProps {
  onSubmit: (data: TreasureData) => Promise<void>
  onCancel: () => void
}

interface UploadingImage {
  id: string
  file: File
  progress: number
}

export function DiscordStyleInput({ onSubmit, onCancel }: DiscordStyleInputProps) {
  const [content, setContent] = useState('')
  const [images, setImages] = useState<TreasureData['images']>([])
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  // 斜杠命令相关
  const [activeCommand, setActiveCommand] = useState<string | null>(null)
  const [commandSearch, setCommandSearch] = useState('')
  
  // 音乐卡片数据
  const [musicData, setMusicData] = useState({
    title: '',
    artist: '',
    album: '',
    url: '',
    coverUrl: ''
  })
  
  // 主题选择
  const [selectedTheme, setSelectedTheme] = useState<string>('')
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 自动调整 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  // 自动聚焦
  useEffect(() => {
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }, [])

  // 检测斜杠命令
  const detectSlashCommand = (text: string, cursorPos: number) => {
    const beforeCursor = text.slice(0, cursorPos)
    const lastSlash = beforeCursor.lastIndexOf('/')
    
    if (lastSlash === -1) return null
    
    // 检查 / 前是否是空格或行首
    if (lastSlash > 0 && !/\s/.test(beforeCursor[lastSlash - 1])) {
      return null
    }
    
    const command = beforeCursor.slice(lastSlash + 1)
    return command
  }

  // 提取标签
  const extractTags = (text: string): string[] => {
    const tagRegex = /#(\w+)/g
    const matches = text.match(tagRegex)
    return matches ? matches.map(tag => tag.slice(1)) : []
  }

  // 提取标题（第一行非空文本）
  const extractTitle = (text: string): string => {
    const lines = text.split('\n').filter(line => line.trim())
    return lines[0] || '未命名'
  }

  // 处理内容变化
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    
    // 检测斜杠命令
    const cursorPos = e.target.selectionStart
    const command = detectSlashCommand(newContent, cursorPos)
    
    if (command !== null) {
      setCommandSearch(command)
      setActiveCommand('search')
    } else {
      setActiveCommand(null)
      setCommandSearch('')
    }
  }

  // 图片粘贴
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          await uploadImage(file)
        }
      }
    }
  }

  // 图片拖拽
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer?.files || [])
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    
    for (const file of imageFiles) {
      await uploadImage(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  // 上传图片到 OSS
  const uploadImage = async (file: File) => {
    const uploadId = Math.random().toString(36).substr(2, 9)
    
    // 添加到上传列表
    setUploadingImages(prev => [...prev, {
      id: uploadId,
      file,
      progress: 0
    }])

    try {
      // 1. 获取上传签名
      const signatureRes = await fetch('/api/upload/oss/signature')
      if (!signatureRes.ok) {
        throw new Error('获取上传签名失败')
      }
      
      const signatureData = await signatureRes.json()
      console.log('OSS Signature data:', signatureData)
      
      // 检查是否配置了 OSS
      if (signatureData.error) {
        console.warn('OSS 未配置，使用本地预览')
        // 使用本地预览作为降级方案
        const mockUrl = URL.createObjectURL(file)
        setImages(prev => [...prev, {
          url: mockUrl,
          alt: file.name,
          size: file.size
        }])
        setUploadingImages(prev => prev.filter(img => img.id !== uploadId))
        return
      }

      // 2. 构建表单数据
      const formData = new FormData()
      formData.append('key', signatureData.key)
      formData.append('policy', signatureData.policy)
      formData.append('OSSAccessKeyId', signatureData.accessKeyId)
      formData.append('signature', signatureData.signature)
      formData.append('success_action_status', '200')
      formData.append('file', file)

      // 3. 上传到 OSS
      const xhr = new XMLHttpRequest()
      
      // 监听上传进度
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadingImages(prev => 
            prev.map(img => 
              img.id === uploadId ? { ...img, progress } : img
            )
          )
        }
      })

      // 上传完成
      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 204) {
            resolve()
          } else {
            console.error('OSS upload failed:', xhr.status, xhr.responseText)
            reject(new Error(`OSS上传失败: ${xhr.status}`))
          }
        })
        xhr.addEventListener('error', (e) => {
          console.error('Network error during upload:', e)
          reject(new Error('网络错误，请检查OSS配置'))
        })
        xhr.addEventListener('abort', () => reject(new Error('上传取消')))
        
        console.log('Uploading to OSS:', signatureData.endpoint)
        xhr.open('POST', signatureData.endpoint)
        xhr.send(formData)
      })

      // 4. 获取文件 URL
      // 确保使用完整的 URL
      const baseUrl = signatureData.cdnUrl || signatureData.endpoint
      const imageUrl = baseUrl.endsWith('/') 
        ? `${baseUrl}${signatureData.key}` 
        : `${baseUrl}/${signatureData.key}`
      
      console.log('=== 图片上传成功 ===')
      console.log('Base URL:', baseUrl)
      console.log('File Key:', signatureData.key)
      console.log('Final Image URL:', imageUrl)
      console.log('===================')
      
      setImages(prev => [...prev, {
        url: imageUrl,
        alt: file.name,
        size: file.size
      }])

      // 移除上传列表
      setUploadingImages(prev => prev.filter(img => img.id !== uploadId))
    } catch (error) {
      console.error('Upload failed:', error)
      alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setUploadingImages(prev => prev.filter(img => img.id !== uploadId))
    }
  }

  // 删除图片
  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  // 选择斜杠命令
  const handleSelectCommand = (command: string) => {
    if (command === 'music') {
      setActiveCommand('music')
      // 移除输入框中的 /music
      const newContent = content.replace(/\/music\s*$/, '').trim()
      setContent(newContent)
    }
    setCommandSearch('')
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter 提交
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
    
    // ESC 关闭命令面板或取消
    if (e.key === 'Escape') {
      if (activeCommand === 'search') {
        setActiveCommand(null)
        setCommandSearch('')
      } else if (activeCommand === 'music') {
        setActiveCommand(null)
      } else {
        onCancel()
      }
    }
  }

  // 提交
  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return
    if (uploadingImages.length > 0) {
      alert('请等待图片上传完成')
      return
    }

    setIsSubmitting(true)

    // 保存当前内容，以便错误时恢复
    const savedContent = content
    const savedImages = images
    const savedTheme = selectedTheme
    const savedMusicData = { ...musicData }

    try {
      const title = extractTitle(content)
      const tags = extractTags(content)
      
      // 移除第一行（作为标题）后的内容
      const lines = content.split('\n')
      const contentWithoutTitle = lines.slice(1).join('\n').trim()
      
      let type: TreasureData['type'] = 'TEXT'
      if (images.length > 0) type = 'IMAGE'
      if (activeCommand === 'music' && musicData.title) type = 'MUSIC'

      const data: TreasureData = {
        title,
        content: contentWithoutTitle, // 不包含标题的内容
        type,
        tags,
        theme: selectedTheme || undefined,
        images,
        ...(type === 'MUSIC' && {
          musicTitle: musicData.title,
          musicArtist: musicData.artist,
          musicAlbum: musicData.album,
          musicUrl: musicData.url,
          musicCoverUrl: musicData.coverUrl
        })
      }

      await onSubmit(data)
      
      // 提交成功后关闭（由父组件处理）
      onCancel()
    } catch (error) {
      console.error('Submit error:', error)
      
      // 网络错误时恢复内容
      setContent(savedContent)
      setImages(savedImages)
      setSelectedTheme(savedTheme)
      setMusicData(savedMusicData)
      
      alert(`提交失败: ${error instanceof Error ? error.message : '未知错误'}\n\n您的内容已保存，请稍后重试`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const tags = extractTags(content)
  const charCount = content.length
  const maxChars = 2000

  return (
    <div 
      ref={containerRef}
      className="space-y-4"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* 主题选择 */}
      <ThemeSelector
        value={selectedTheme}
        onChange={setSelectedTheme}
      />

      {/* 输入区域 */}
      <div className={cn(
        "relative rounded-lg transition-all",
        isDragging && "ring-2 ring-blue-400 bg-blue-900/50"
      )}>
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-900/90 backdrop-blur-sm rounded-lg z-10">
            <div className="text-center">
              <Paperclip className="h-12 w-12 text-blue-400 mx-auto mb-2" />
              <p className="text-blue-300 font-medium">释放以上传图片</p>
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder="分享你的想法...&#10;&#10;💡 使用 / 调用特殊功能&#10;🏷️ 使用 #标签 进行分类"
          className={cn(
            "w-full resize-none border-0 rounded-lg",
            "bg-gray-800 focus:bg-gray-750",
            "px-4 py-3 text-base leading-relaxed",
            "text-white placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
            "transition-all"
          )}
          style={{ minHeight: '120px' }}
          maxLength={maxChars}
        />

        {/* 斜杠命令面板 */}
        {activeCommand === 'search' && commandSearch !== null && (
          <SlashCommandPanel
            search={commandSearch}
            onSelect={handleSelectCommand}
            onClose={() => {
              setActiveCommand(null)
              setCommandSearch('')
            }}
          />
        )}
      </div>

      {/* 音乐卡片表单 */}
      {activeCommand === 'music' && (
        <MusicCardForm
          data={musicData}
          onChange={setMusicData}
          onClose={() => setActiveCommand(null)}
        />
      )}

      {/* 图片预览 */}
      {(images.length > 0 || uploadingImages.length > 0) && (
        <ImageUploadPreview
          images={images}
          uploadingImages={uploadingImages}
          onRemove={handleRemoveImage}
        />
      )}

      {/* 底部栏 */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <Paperclip className="h-4 w-4" />
            {images.length}/5 张图片
          </span>
          
          {tags.length > 0 && (
            <span className="flex items-center gap-1 text-orange-400">
              <Hash className="h-4 w-4" />
              {tags.length} 个标签
            </span>
          )}
          
          <span className={cn(
            "text-gray-400",
            charCount > maxChars * 0.9 && "text-orange-400 font-medium"
          )}>
            {charCount}/{maxChars}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            取消
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={(!content.trim() && images.length === 0) || isSubmitting || uploadingImages.length > 0}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>创建中...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>创建宝藏</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-white/20 rounded text-xs ml-1">
                  Ctrl+⏎
                </kbd>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
