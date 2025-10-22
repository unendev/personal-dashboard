'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Image from '@tiptap/extension-image'
import { Extension } from '@tiptap/core'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { mergeAttributes } from '@tiptap/core'
import { Button } from '@/app/components/ui/button'
import { Save, Maximize2, Minimize2 } from 'lucide-react'
import { NotesFileBar } from './NotesFileBar'

// Note: The CustomImage implementation and other Tiptap extensions remain unchanged.
// ... (CustomImage, slugify, etc. would be here)

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {}
          }
          return { width: attributes.width }
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) {
            return {}
          }
          return { height: attributes.height }
        },
      },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const container = document.createElement('div')
      container.className = 'image-resizer'
      container.contentEditable = 'false'
      
      const img = document.createElement('img')
      img.src = node.attrs.src
      img.alt = node.attrs.alt || ''
      img.className = 'tiptap-image'
      
      if (node.attrs.width) {
        img.style.width = node.attrs.width + 'px'
      }
      
      img.addEventListener('dblclick', () => {
        img.style.width = ''
        if (typeof getPos === 'function') {
          editor.commands.updateAttributes('image', { width: null, height: null })
        }
      })
      
      const resizeHandle = document.createElement('div')
      resizeHandle.className = 'image-resize-handle'
      
      let isResizing = false
      let startX = 0
      let startWidth = 0
      
      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        isResizing = true
        startX = e.clientX
        startWidth = img.offsetWidth
        
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        
        container.classList.add('resizing')
      })
      
      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return
        
        const diff = e.clientX - startX
        const newWidth = Math.max(100, startWidth + diff)
        img.style.width = newWidth + 'px'
      }
      
      const handleMouseUp = () => {
        if (!isResizing) return
        isResizing = false
        
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        
        container.classList.remove('resizing')
        
        if (typeof getPos === 'function') {
          const width = img.offsetWidth
          const height = img.offsetHeight
          editor.commands.updateAttributes('image', { width, height })
        }
      }
      
      container.appendChild(img)
      container.appendChild(resizeHandle)
      
      return {
        dom: container,
        contentDOM: null,
        ignoreMutation: () => true,
      }
    }
  },

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

// 自定义Ctrl+D删除行扩展（带调试）
const DeleteLineExtension = Extension.create({
  name: 'deleteLine',
  
  addKeyboardShortcuts() {
    return {
      'Mod-d': () => {
        console.log('🔥 Ctrl+D triggered in DeleteLineExtension')
        
        try {
          const { state } = this.editor
          const { $from } = state.selection
          
          console.log('📍 Current depth:', $from.depth)
          
          // 从当前位置向上查找块级节点
          // 优先查找listItem，然后是paragraph和heading
          let targetNode = null
          let targetDepth = 0
          
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d)
            console.log(`📦 Depth ${d}: ${node.type.name}`)
            
            // 优先级：listItem > heading > paragraph
            if (node.type.name === 'listItem') {
              targetNode = node
              targetDepth = d
              console.log(`🎯 Found listItem at depth ${d}`)
              break // 找到listItem就停止，这是最优先的
            } else if (node.type.name === 'heading') {
              targetNode = node
              targetDepth = d
              console.log(`🎯 Found heading at depth ${d}`)
              break // 找到heading也停止
            } else if (node.type.name === 'paragraph' && !targetNode) {
              // 只有还没找到其他目标时才记录paragraph
              targetNode = node
              targetDepth = d
              console.log(`📝 Found paragraph at depth ${d} (will continue looking for listItem)`)
              // 不break，继续向上查找listItem
            }
          }
          
          // 执行删除
          if (targetNode && targetDepth > 0) {
            const pos = $from.before(targetDepth)
            const nodeSize = targetNode.nodeSize
            console.log(`✅ Deleting ${targetNode.type.name} from ${pos} to ${pos + nodeSize}`)
            
            const result = this.editor.commands.deleteRange({ 
              from: pos, 
              to: pos + nodeSize 
            })
            console.log('✅ Delete result:', result)
            return result
          }
          
          // 兜底：删除当前块内容
          const start = $from.start()
          const end = $from.end()
          console.log(`⚠️ Fallback: deleting from ${start} to ${end}`)
          if (start !== undefined && end !== undefined) {
            return this.editor.commands.deleteRange({ from: start, to: end })
          }
          
          console.log('❌ No deletion performed')
          return false
        } catch (error) {
          console.error('❌ DeleteLineExtension error:', error)
          return false
        }
      }
    }
  }
})

interface Note {
  id: string;
  title: string;
  content?: string;
}

interface SimpleMdEditorProps {
  className?: string
}

export default function SimpleMdEditor({ className = '' }: SimpleMdEditorProps) {
  const [notesList, setNotesList] = useState<Note[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [initialContent, setInitialContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const isLoadingContent = useRef(false)
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [showOutline, setShowOutline] = useState(false) // 默认不显示
  const outlineTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  type OutlineItem = {
    id: string
    text: string
    level: number
    pos: number
  }
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)

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
    const from = e.state.selection.from
    const current = items
      .filter((i) => i.pos <= from)
      .sort((a, b) => b.pos - a.pos)[0]
    setActiveHeadingId(current ? current.id : (items[0]?.id ?? null))
  }, [buildOutline])

  const handleGotoHeading = (item: OutlineItem) => {
    if (!editor) return
    editor.chain().focus().setTextSelection(item.pos).run()
    editor.commands.scrollIntoView()
    setActiveHeadingId(item.id)
  }

  const handleOutlineMouseEnter = () => {
    if (outlineTimeoutRef.current) {
      clearTimeout(outlineTimeoutRef.current)
    }
    setShowOutline(true)
  }

  const handleOutlineMouseLeave = () => {
    if (outlineTimeoutRef.current) {
      clearTimeout(outlineTimeoutRef.current)
    }
    outlineTimeoutRef.current = setTimeout(() => {
      setShowOutline(false)
    }, 300)
  }

  const editor = useEditor({
    immediatelyRender: false,
    content: initialContent,
    extensions: [
      StarterKit.configure({ 
        heading: { levels: [1, 2, 3] },
        // 确保Bold和Italic扩展的inputRules启用
        bold: {
          HTMLAttributes: {
            class: 'font-bold',
          },
        },
        italic: {
          HTMLAttributes: {
            class: 'italic',
          },
        },
      }),
      Placeholder.configure({ placeholder: '开始写笔记...' }),
      Typography,
      CustomImage.configure({ allowBase64: true, HTMLAttributes: { class: 'tiptap-image' } }),
      DeleteLineExtension,
    ],
    editorProps: {
        attributes: {
          class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3',
        },
        handlePaste: (view, event) => {
            const items = event.clipboardData?.items
            if (!items) return false
    
            for (let i = 0; i < items.length; i++) {
              const item = items[i]
              if (item.type.indexOf('image') === 0) {
                event.preventDefault()
                const file = item.getAsFile()
                if (file) {
                  uploadImageToOSS(file).then((url) => {
                    const { state, dispatch } = view
                    const node = state.schema.nodes.image.create({ src: url })
                    const transaction = state.tr.replaceSelectionWith(node)
                    dispatch(transaction)
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
      if (isLoadingContent.current) return;
      if (saveTimeout) clearTimeout(saveTimeout);
      const timeout = setTimeout(() => {
        saveContent(editor.getHTML());
      }, 1000);
      setSaveTimeout(timeout);
      updateOutline(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      updateOutline(editor);
    },
    onCreate: ({ editor }) => {
      updateOutline(editor);
    },
  });

  const loadNotesList = useCallback(async () => {
    try {
      const response = await fetch('/api/notes');
      if (!response.ok) throw new Error('Failed to fetch notes list');
      const notes: Note[] = await response.json();
      setNotesList(notes);
      return notes;
    } catch (error) {
      console.error('Error loading notes list:', error);
      return [];
    }
  }, []);

  const loadNoteContent = useCallback(async (noteId: string) => {
    if (!editor) return;
    isLoadingContent.current = true;
    try {
      const response = await fetch(`/api/notes/${noteId}`);
      if (!response.ok) throw new Error('Failed to fetch note content');
      const note: Note = await response.json();
      editor.commands.setContent(note.content || '');
      setInitialContent(note.content || '');
    } catch (error) {
      console.error(`Error loading note ${noteId}:`, error);
    } finally {
      setTimeout(() => { isLoadingContent.current = false; }, 100);
    }
  }, [editor]);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      let notes = await loadNotesList();
      if (notes.length === 0) {
        // No notes exist, create one
        await handleCreateNote(false); // Don't select it yet, loadNotesList will be called again
        notes = await loadNotesList();
      }
      
      if (notes.length > 0) {
        const lastNoteId = notes[0].id; // Assuming list is sorted by updatedAt desc
        setCurrentNoteId(lastNoteId);
        await loadNoteContent(lastNoteId);
      }
      setIsLoading(false);
    };

    if (editor) {
      initialize();
    }
  }, [editor]); // Only run when editor is ready

  const saveContent = useCallback(async (content: string) => {
    if (!currentNoteId) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/${currentNoteId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        }
      );
      if (response.ok) {
        setLastSaved(new Date());
        setInitialContent(content);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  }, [currentNoteId]);

  const saveIfDirty = async () => {
    if (editor && editor.getHTML() !== initialContent) {
      await saveContent(editor.getHTML());
    }
  };

  const handleSelectNote = async (noteId: string) => {
    if (noteId === currentNoteId) return;
    await saveIfDirty();
    setCurrentNoteId(noteId);
    loadNoteContent(noteId);
  };

  const handleCreateNote = async (selectNewNote = true) => {
    await saveIfDirty();

    setIsCreatingNote(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `新建笔记 ${new Date().toLocaleDateString()}` }),
      });
      if (!response.ok) throw new Error('Failed to create note');
      const newNote: Note = await response.json();
      await loadNotesList(); // Refresh the list
      if (selectNewNote) {
        setCurrentNoteId(newNote.id);
        editor?.commands.setContent('');
        setInitialContent('');
      }
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete note');
      
      const remainingNotes = await loadNotesList();
      if (remainingNotes.length > 0) {
        if (noteId === currentNoteId) {
          // If active note was deleted, select the first one
          const newCurrentId = remainingNotes[0].id;
          setCurrentNoteId(newCurrentId);
          loadNoteContent(newCurrentId);
        }
      } else {
        // All notes deleted, create a new one
        await handleCreateNote();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleUpdateTitle = async (noteId: string, newTitle: string) => {
    // Optimistically update the UI
    setNotesList(notesList.map(n => n.id === noteId ? { ...n, title: newTitle } : n));

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to update title');
      }
      
      // Re-fetch from server to ensure consistency
      await loadNotesList();
    } catch (error) {
      console.error('Error updating title:', error);
      alert('标题更新失败');
      // Revert on error
      await loadNotesList();
    }
  };

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
      
      // 5. 生成签名 URL（用于私有 Bucket）
      try {
        const signUrlRes = await fetch('/api/upload/oss/sign-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: imageUrl }),
        })
        
        if (signUrlRes.ok) {
          const { signedUrl } = await signUrlRes.json()
          console.log('✅ 生成签名 URL 成功')
          return signedUrl
        } else {
          console.warn('⚠️ 生成签名 URL 失败，使用原始 URL')
          return imageUrl
        }
      } catch (signError) {
        console.warn('⚠️ 签名 URL 请求失败，使用原始 URL:', signError)
        return imageUrl
      }
    } catch (error) {
      console.error('图片上传失败:', error)
      alert('图片上传失败：' + (error instanceof Error ? error.message : '未知错误'))
      throw error
    } finally {
      setIsUploadingImage(false)
    }
  }

  const manualSave = () => {
    if (editor) saveContent(editor.getHTML());
  };

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

  if (isLoading || !editor) {
    return (
      <div className={`${className} flex items-center justify-center p-8`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-400">加载笔记中...</span>
      </div>
    )
  }

  const renderEditorContent = (isModal = false) => (
    <div className={isModal ? 'h-full flex flex-col' : className}>
      <style jsx global>{`
        /* TipTap编辑器Markdown样式 */
        .ProseMirror {
          outline: none;
          padding: 1rem;
          color: #e5e7eb;
        }

        /* 有序列表样式 */
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }

        /* 无序列表样式 */
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }

        /* 列表项样式 */
        .ProseMirror li {
          margin: 0.25rem 0;
          padding-left: 0.25rem;
          color: #d1d5db;
        }

        /* 嵌套列表 */
        .ProseMirror li > ol,
        .ProseMirror li > ul {
          margin: 0.25rem 0;
        }

        /* 二级无序列表使用空心圆 */
        .ProseMirror ul ul {
          list-style-type: circle;
        }

        /* 三级无序列表使用方块 */
        .ProseMirror ul ul ul {
          list-style-type: square;
        }

        /* 粗体样式 */
        .ProseMirror strong {
          font-weight: 700;
          color: #f3f4f6;
        }

        /* 斜体样式 */
        .ProseMirror em {
          font-style: italic;
          color: #e5e7eb;
        }

        /* 标题样式 */
        .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 1.5rem 0 1rem;
          color: #f9fafb;
          line-height: 1.2;
        }

        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1.25rem 0 0.75rem;
          color: #f3f4f6;
          line-height: 1.3;
        }

        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem;
          color: #e5e7eb;
          line-height: 1.4;
        }

        /* 段落样式 */
        .ProseMirror p {
          margin: 0.75rem 0;
          line-height: 1.6;
          color: #d1d5db;
        }

        /* 代码块样式 */
        .ProseMirror code {
          background-color: #374151;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          color: #fbbf24;
        }

        .ProseMirror pre {
          background-color: #1f2937;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }

        .ProseMirror pre code {
          background-color: transparent;
          padding: 0;
          color: #e5e7eb;
        }

        /* 引用样式 */
        .ProseMirror blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #9ca3af;
          font-style: italic;
        }

        /* 水平分割线 */
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #6b7280;
          margin: 1.5rem 0;
        }

        /* 链接样式 */
        .ProseMirror a {
          color: #60a5fa;
          text-decoration: underline;
          cursor: pointer;
        }

        .ProseMirror a:hover {
          color: #93c5fd;
        }
      `}</style>
      <NotesFileBar 
        notes={notesList}
        activeNoteId={currentNoteId}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onUpdateNoteTitle={handleUpdateTitle}
        isCreating={isCreatingNote}
      />
      <div className="flex items-center justify-end gap-2 text-sm text-gray-400 my-2 flex-shrink-0 px-2">
        {lastSaved && <span>已保存 {lastSaved.toLocaleTimeString()}</span>}
        {isSaving && <span className="text-blue-400">保存中...</span>}
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
      <div className={isModal ? 'flex flex-1 min-h-0 relative' : 'flex relative'}>
        <div className="flex-1 min-w-0">
          <div 
            className="overflow-y-auto"
            style={{ height: isModal ? '100%' : '400px' }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Right-side outline sidebar - 位于编辑器内部 */}
        <div 
          className="hidden md:block absolute right-0 top-0 h-full z-10"
          onMouseEnter={handleOutlineMouseEnter}
          onMouseLeave={handleOutlineMouseLeave}
        >
          {showOutline ? (
            <div className="w-72 h-full bg-gray-900/95 backdrop-blur-sm border-l border-gray-700/50 shadow-2xl overflow-hidden flex flex-col transition-all">
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
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
      </div>
      {/* ... styles and fullscreen portal ... */}
    </div>
  )

  return (
    <>
      {!isFullscreenModalOpen && renderEditorContent(false)}
      {isFullscreenModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-gray-900 p-6">
            <div className="flex justify-end mb-4 flex-shrink-0">
              <button
                onClick={() => setIsFullscreenModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                title="退出全屏 (ESC)"
              >
                <Minimize2 className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {renderEditorContent(true)}
            </div>
        </div>,
        document.body
      )}
    </>
  )
}