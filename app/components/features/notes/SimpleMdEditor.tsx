'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Image from '@tiptap/extension-image'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { mergeAttributes } from '@tiptap/core'
import { Button } from '@/app/components/ui/button'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2,
  Save,
  Maximize2,
  Minimize2
} from 'lucide-react'

// 自定义 Image 扩展，确保正确渲染
const CustomImage = Image.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        draggable: 'false',
        contenteditable: 'false',
      }),
    ]
  },
})

interface SimpleMdEditorProps {
  className?: string
}

export default function SimpleMdEditor({ className = '' }: SimpleMdEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [initialContent, setInitialContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const isLoadingContent = useRef(false) // 防止循环更新
  const [showOutline, setShowOutline] = useState(false) // 默认不显示
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const outlineTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  type OutlineItem = {
    id: string
    text: string
    level: number
    pos: number
  }
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)

  // 上传图片到 OSS
  const uploadImageToOSS = async (file: File): Promise<string> => {
    setIsUploadingImage(true)
    try {
      // 1. 获取上传签名
      const signatureUrl = new URL('/api/upload/oss/signature', window.location.origin)
      signatureUrl.searchParams.set('filename', file.name)
      signatureUrl.searchParams.set('contentType', file.type)
      
      const signatureRes = await fetch(signatureUrl.toString())
      if (!signatureRes.ok) {
        const errorData = await signatureRes.json()
        throw new Error(`获取上传签名失败: ${errorData.error || signatureRes.statusText}`)
      }
      
      const signatureData = await signatureRes.json()
      
      // 检查是否配置了 OSS
      if (signatureData.error) {
        console.warn('OSS 未配置，使用本地预览')
        // 返回 base64 作为降级方案
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
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
      const uploadRes = await fetch(signatureData.endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error('OSS上传失败')
      }

      // 4. 构建图片 URL
      const baseUrl = (signatureData.cdnUrl || signatureData.endpoint).trim().replace(/\/+$/, '')
      const normalizedKey = signatureData.key.replace(/^\/+/, '')
      const imageUrl = `${baseUrl}/${normalizedKey}`
      
      return imageUrl
    } catch (error) {
      console.error('图片上传失败:', error)
      alert('图片上传失败：' + (error instanceof Error ? error.message : '未知错误'))
      throw error
    } finally {
      setIsUploadingImage(false)
    }
  }

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80)

  const buildOutline = useCallback((ed: TiptapEditor): OutlineItem[] => {
    const items: OutlineItem[] = []
    ed.state.doc.descendants((node, pos) => {
      // 仅收集标题节点
      if (node.type.name === 'heading') {
        const level = (node.attrs as { level?: number })?.level ?? 1
        const text = node.textContent || ''
        const id = `${slugify(text) || 'heading'}-${pos}`
        items.push({ id, text, level, pos })
      }
    })
    return items
  }, [])

  const updateOutline = useCallback((e: TiptapEditor) => {
    const items = buildOutline(e)
    setOutline(items)
    // 根据当前选区，计算激活标题
    const from = e.state.selection.from
    const current = items
      .filter((i) => i.pos <= from)
      .sort((a, b) => b.pos - a.pos)[0]
    setActiveHeadingId(current ? current.id : (items[0]?.id ?? null))
  }, [buildOutline])

  const editor = useEditor({
    immediatelyRender: false,
    content: initialContent, // 使用初始内容
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: '开始写笔记...（支持 *斜体* 和 **粗体** Markdown 语法，可直接粘贴图片）',
      }),
      Typography,
      CustomImage.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'tiptap-image',
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
      handleKeyDown: (view, event) => {
        // Ctrl+D (Windows/Linux) 或 Cmd+D (Mac) 删除当前行
        if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
          event.preventDefault()
          
          const { state, dispatch } = view
          const { selection } = state
          const { $from, $to } = selection
          
          // 找到当前行的起始和结束位置
          const lineStart = $from.start()
          const lineEnd = $to.end()
          
          // 如果选中了多行，删除选中的所有行
          const from = Math.min($from.before(), lineStart)
          const to = Math.max($to.after(), lineEnd)
          
          // 删除行内容
          const tr = state.tr.delete(from, to)
          dispatch(tr)
          
          return true
        }
        return false
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false

        // 查找图片项
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item.type.indexOf('image') === 0) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) {
              // 异步上传图片
              uploadImageToOSS(file).then((url) => {
                console.log('📸 图片上传成功，URL:', url)
                const { state, dispatch } = view
                const node = state.schema.nodes.image.create({ src: url })
                console.log('📝 创建图片节点:', node)
                console.log('📝 节点属性:', node.attrs)
                console.log('📝 节点类型:', node.type.name)
                const transaction = state.tr.replaceSelectionWith(node)
                dispatch(transaction)
                console.log('✅ 图片插入完成')
                
                // 调试：检查实际渲染的 HTML
                setTimeout(() => {
                  // 直接使用 view.dom 访问编辑器 DOM
                  const editorDom = view.dom
                  console.log('📦 编辑器 DOM:', editorDom)
                  console.log('📦 编辑器 HTML:', editorDom.innerHTML.substring(0, 500))
                  
                  const images = editorDom.querySelectorAll('img')
                  console.log('🖼️ 找到的图片元素数量:', images.length)
                  images.forEach((img, index) => {
                    console.log(`  图片 ${index}:`, {
                      tagName: img.tagName,
                      src: img.getAttribute('src'),
                      class: img.className,
                      style: img.style.cssText,
                      width: img.width,
                      height: img.height,
                      display: window.getComputedStyle(img).display,
                      visibility: window.getComputedStyle(img).visibility
                    })
                  })
                  
                  // 同时检查是否有其他意外的元素
                  const allChildren = editorDom.querySelectorAll('*')
                  console.log('📊 编辑器内所有元素类型:', Array.from(allChildren).map(el => el.tagName))
                }, 100)
              }).catch((error) => {
                console.error('❌ 图片上传失败:', error)
              })
            }
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      // 如果正在加载内容，不触发保存
      if (isLoadingContent.current) {
        console.log('🔄 正在加载内容，跳过自动保存')
        return
      }
      
      // 自动保存（debounce 1秒）
      console.log('✏️ 内容变化，准备自动保存...')
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
      const timeout = setTimeout(() => {
        saveContent(editor.getHTML())
      }, 1000)
      setSaveTimeout(timeout)

      // 更新大纲
      updateOutline(editor)
    },
    onSelectionUpdate: ({ editor }) => {
      // 选区变化时更新激活标题
      updateOutline(editor)
    },
    onCreate: ({ editor }) => {
      // 初始化时构建大纲
      updateOutline(editor)
    },
  })

  // 首次加载笔记内容
  useEffect(() => {
    const loadNote = async () => {
      try {
        console.log('📖 开始加载笔记...')
        const response = await fetch('/api/notes')
        if (response.ok) {
          const note = await response.json()
          console.log('✅ 加载笔记成功:', note.id, '内容长度:', note.content?.length || 0)
          
          if (editor && note.content) {
            isLoadingContent.current = true // 标记正在加载
            editor.commands.setContent(note.content)
            setInitialContent(note.content)
            console.log('📝 内容已设置到编辑器')
            
            // 100ms后解除加载标记
            setTimeout(() => {
              isLoadingContent.current = false
              console.log('✅ 加载完成，恢复自动保存')
            }, 100)

            // 设置完内容后刷新大纲
            updateOutline(editor)
          }
        } else {
          console.error('❌ 加载笔记失败:', response.status)
        }
      } catch (error) {
        console.error('❌ 加载笔记错误:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (editor) {
      loadNote()
    }
  }, [editor, updateOutline]) // 添加 updateOutline 依赖

  const saveContent = useCallback(async (content: string) => {
    setIsSaving(true)
    console.log('💾 开始保存笔记，内容长度:', content?.length || 0)
    
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (response.ok) {
        const savedNote = await response.json()
        setLastSaved(new Date())
        setInitialContent(content) // 更新初始内容
        console.log('✅ 笔记保存成功:', savedNote.id)
      } else {
        console.error('❌ 保存失败:', response.status, response.statusText)
        alert('保存失败，请检查网络连接')
      }
    } catch (error) {
      console.error('❌ 保存笔记失败:', error)
      alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setIsSaving(false)
    }
  }, [])

  const manualSave = () => {
    if (editor) {
      saveContent(editor.getHTML())
    }
  }

  // ESC键处理（模态框内部会处理）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreenModalOpen) {
        setIsFullscreenModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreenModalOpen])

  // 加载状态
  if (isLoading || !editor) {
    return (
      <div className={`${className} flex items-center justify-center p-8`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-400">加载笔记中...</span>
      </div>
    )
  }

  const handleGotoHeading = (item: OutlineItem) => {
    if (!editor) return
    editor.chain().focus().setTextSelection(item.pos).run()
    editor.commands.scrollIntoView()
    setActiveHeadingId(item.id)
  }

  // 大纲鼠标悬浮展开
  const handleOutlineMouseEnter = () => {
    if (outlineTimeoutRef.current) {
      clearTimeout(outlineTimeoutRef.current)
    }
    setShowOutline(true)
  }

  // 大纲鼠标移出收起
  const handleOutlineMouseLeave = () => {
    if (outlineTimeoutRef.current) {
      clearTimeout(outlineTimeoutRef.current)
    }
    outlineTimeoutRef.current = setTimeout(() => {
      setShowOutline(false)
    }, 300) // 300ms 延迟
  }

  // 渲染编辑器内容（常规和模态框共用）
  const renderEditorContent = (isModal = false) => (
    <div className={isModal ? 'h-full flex flex-col' : className}>
      {/* 状态栏 */}
      <div className="flex items-center justify-end gap-2 text-sm text-gray-400 mb-3 flex-shrink-0">
        {lastSaved && (
          <span>已保存 {lastSaved.toLocaleTimeString()}</span>
        )}
        {isSaving && <span className="text-blue-400">保存中...</span>}
        {isUploadingImage && <span className="text-green-400">上传图片中...</span>}
      </div>

      {/* 工具栏 */}
      <div className="border-b border-gray-700 pb-3 mb-3 flex-shrink-0">
        <div className="flex flex-wrap gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-gray-700' : ''}
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-gray-700' : ''}
          >
            <Italic className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-700 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-700' : ''}
          >
            <Heading1 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-700' : ''}
          >
            <Heading2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-700 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-gray-700' : ''}
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-gray-700' : ''}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreenModalOpen(true)}
              title="全屏编辑"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={manualSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>

      {/* 编辑区（大纲悬浮在编辑器内部） */}
      <div className={isModal ? 'flex flex-1 min-h-0' : 'flex'}>
        <div className="flex-1 min-w-0 relative">
          {/* 可滚动编辑区域，设置合适的固定高度 */}
          <div 
            className="overflow-y-auto"
            style={{ height: isModal ? '100%' : '400px' }}
          >
            <EditorContent editor={editor} />
          </div>

        </div>

        {/* 右侧大纲侧栏 - 居中位置，鼠标悬浮展开 */}
        <div 
          className={`hidden md:block ${isModal ? 'absolute' : 'fixed'} right-0 top-1/2 -translate-y-1/2 z-40`}
          onMouseEnter={handleOutlineMouseEnter}
          onMouseLeave={handleOutlineMouseLeave}
        >
          {showOutline ? (
            <div className="w-72 bg-gray-900/95 backdrop-blur-sm border-l border-gray-700/50 shadow-2xl max-h-[70vh] overflow-hidden flex flex-col transition-all">
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <div className="text-sm font-medium text-gray-300">文档大纲</div>
                <div className="text-xs text-gray-500">鼠标移出自动收起</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {outline.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-8">
                    无标题
                    <br />
                    <span className="text-xs">使用 H1/H2/H3 自动生成</span>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {outline.map((item) => (
                      <li key={item.id}>
                        <button
                          className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                            activeHeadingId === item.id 
                              ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-400' 
                              : 'text-gray-300 hover:bg-gray-800/60 hover:text-gray-200'
                          }`}
                          style={{ paddingLeft: `${(item.level - 1) * 16 + 12}px` }}
                          onClick={() => handleGotoHeading(item)}
                          title={item.text}
                        >
                          <span className="block truncate">{item.text || '（无标题文本）'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div
              className="bg-gray-900/95 backdrop-blur-sm border-l border-gray-700/50 p-3 shadow-lg hover:bg-gray-800/95 transition-all group rounded-l-lg"
              title="悬浮展开大纲"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transform rotate-180 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div>

        {/* 编辑器样式 */}
        <style jsx global>{`
          .ProseMirror {
            color: #e5e7eb;
          }
          
          .ProseMirror h1 {
            font-size: 2em;
            font-weight: bold;
            margin: 1em 0 0.5em;
            color: #f3f4f6;
          }
          
          .ProseMirror h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 0.83em 0 0.5em;
            color: #f3f4f6;
          }
          
          .ProseMirror h3 {
            font-size: 1.17em;
            font-weight: bold;
            margin: 0.67em 0 0.5em;
            color: #f3f4f6;
          }
          
          .ProseMirror ul {
            list-style: disc;
            padding-left: 1.5em;
            margin: 1em 0;
          }
          
          .ProseMirror ol {
            list-style: decimal;
            padding-left: 1.5em;
            margin: 1em 0;
          }
          
          .ProseMirror li {
            margin: 0.5em 0;
          }
          
          .ProseMirror p {
            margin: 1em 0;
          }
          
          .ProseMirror a {
            color: #60a5fa;
            text-decoration: underline;
          }
          
          .ProseMirror code {
            background-color: rgba(255, 255, 255, 0.1);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: monospace;
          }
          
          .ProseMirror pre {
            background-color: rgba(0, 0, 0, 0.3);
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
          }
          
          .ProseMirror pre code {
            background: none;
            padding: 0;
          }
          
          .ProseMirror img,
          .ProseMirror .tiptap-image {
            max-width: 100% !important;
            width: auto !important;
            height: auto !important;
            display: block !important;
            border-radius: 4px;
            margin: 1em 0 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            min-height: 100px !important;
            min-width: 100px !important;
            object-fit: contain !important;
            opacity: 1 !important;
            visibility: visible !important;
            position: relative !important;
            z-index: 1 !important;
            background-color: rgba(255, 255, 255, 0.05) !important;
          }
          
          /* 强制覆盖 Tailwind prose 样式 */
          .prose img {
            max-width: 100% !important;
            height: auto !important;
            display: block !important;
          }
          
          /* 调试：图片加载失败时的占位样式 */
          .ProseMirror img:not([src]),
          .ProseMirror img[src=""] {
            min-height: 200px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .ProseMirror img:not([src])::before,
          .ProseMirror img[src=""]::before {
            content: "图片加载中...";
            color: white;
            font-size: 14px;
          }
          
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #6b7280;
            pointer-events: none;
            height: 0;
          }
        `}</style>
      </div>
    </div>
  )

  return (
    <>
      {/* 常规编辑器视图 - 全屏时隐藏 */}
      {!isFullscreenModalOpen && renderEditorContent(false)}

      {/* 全屏模态框 - 使用 Portal 渲染到 body */}
      {isFullscreenModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-gray-900">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0"
            onClick={() => setIsFullscreenModalOpen(false)}
          />
          
          {/* 模态框内容 - 全屏编辑器 */}
          <div className="relative w-full h-full flex flex-col p-6">
            {/* 顶部关闭按钮 */}
            <div className="flex justify-end mb-4 flex-shrink-0">
              <button
                onClick={() => setIsFullscreenModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                title="退出全屏 (ESC)"
              >
                <Minimize2 className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
              </button>
            </div>
            
            {/* 模态框内的编辑器 */}
            <div className="flex-1 min-h-0">
              {renderEditorContent(true)}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

