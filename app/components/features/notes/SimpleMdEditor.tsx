'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Image from '@tiptap/extension-image'
import { Extension } from '@tiptap/core'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { createPortal } from 'react-dom'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { mergeAttributes } from '@tiptap/core'
import { Button } from '@/app/components/ui/button'
import { Save, Maximize2, Minimize2, ChevronDown } from 'lucide-react'
import { NotesFileBar } from './NotesFileBar'
import { NotesExpandedList } from './NotesExpandedList'
import { useNoteGrouping } from './hooks/useNoteGrouping'
import { useNoteCache } from './hooks/useNoteCache'
import { SwapLineExtension } from '@/lib/swap-line-extension'
import { Details } from '@/lib/tiptap-extensions/details'
import { DetailsSummary } from '@/lib/tiptap-extensions/details-summary'
import { DetailsContent } from '@/lib/tiptap-extensions/details-content'
import { AutoOrderListExtension } from '@/lib/tiptap-extensions/auto-order-list'

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
      
      // 检测是否为移动设备
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth < 768
      
      // 仅在桌面端添加拖拽调整手柄
      if (!isMobile) {
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
      } else {
        // 移动端：只添加图片，不添加调整手柄
        container.appendChild(img)
      }
      
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
        try {
          const { state } = this.editor
          const { $from } = state.selection
          
          // 从当前位置向上查找块级节点
          // 优先查找listItem，然后是paragraph和heading
          let targetNode = null
          let targetDepth = 0
          
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d)
            
            // 优先级：listItem > heading > paragraph
            if (node.type.name === 'listItem') {
              targetNode = node
              targetDepth = d
              break // 找到listItem就停止，这是最优先的
            } else if (node.type.name === 'heading') {
              targetNode = node
              targetDepth = d
              break // 找到heading也停止
            } else if (node.type.name === 'paragraph' && !targetNode) {
              // 只有还没找到其他目标时才记录paragraph
              targetNode = node
              targetDepth = d
              // 不break，继续向上查找listItem
            }
          }
          
          // 执行删除
          if (targetNode && targetDepth > 0) {
            const pos = $from.before(targetDepth)
            const nodeSize = targetNode.nodeSize
            
            return this.editor.commands.deleteRange({ 
              from: pos, 
              to: pos + nodeSize 
            })
          }
          
          // 兜底：删除当前块内容
          const start = $from.start()
          const end = $from.end()
          if (start !== undefined && end !== undefined) {
            return this.editor.commands.deleteRange({ from: start, to: end })
          }
          
          return false
        } catch (error) {
          console.error('DeleteLineExtension error:', error)
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
  order: number; // Add order property for sorting
}

interface SimpleMdEditorProps {
  className?: string
  fullHeight?: boolean
}

export default function SimpleMdEditor({ className = '', fullHeight = false }: SimpleMdEditorProps) {
  const [notesList, setNotesList] = useState<Note[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [initialContent, setInitialContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const isLoadingContent = useRef(false)
  const isSystemUpdate = useRef(false)
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [showOutline, setShowOutline] = useState(false) // 默认不显示
  const outlineTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 选中的父文件ID - 用于显示子栏
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  
  // 使用 useNoteGrouping 作为唯一的分组数据源
  const { data: session } = useSession()
  const userId = session?.user?.id || 'user-1' // 从 session 获取 userId
  const grouping = useNoteGrouping(userId)
  const noteCache = useNoteCache(userId)

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
      SwapLineExtension,
      AutoOrderListExtension,
      Details,
      DetailsSummary,
      DetailsContent,
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
      if (isLoadingContent.current || isSystemUpdate.current) return;
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

  const loadNoteContent = useCallback(async (noteId: string, useCache = true) => {
    if (!editor) return;
    
    // 先检查缓存，如果有缓存则立即显示（避免加载延迟）
    if (useCache) {
      const cachedContent = noteCache.getCached(noteId);
      if (cachedContent !== null) {
        // 立即显示缓存内容
        isSystemUpdate.current = true;
        try {
          editor.commands.setContent(cachedContent);
          setInitialContent(cachedContent);
        } finally {
          isSystemUpdate.current = false;
        }
        
        // 检查是否需要后台更新（缓存超过5分钟）
        if (noteCache.needsBackgroundUpdate(noteId)) {
          // 后台静默更新，不阻塞 UI
          fetch(`/api/notes/${noteId}`)
            .then(response => {
              if (!response.ok) throw new Error('Failed to fetch note content');
              return response.json();
            })
            .then((note: Note) => {
              // 更新缓存和编辑器内容（如果用户还在查看这个笔记）
              noteCache.setCached(noteId, note.content || '');
              if (currentNoteId === noteId && editor.getHTML() === cachedContent) {
                // 用户还在查看这个笔记且内容未修改，静默更新
                isSystemUpdate.current = true;
                try {
                  editor.commands.setContent(note.content || '');
                  setInitialContent(note.content || '');
                } finally {
                  isSystemUpdate.current = false;
                }
              }
            })
            .catch(error => {
              console.error(`Background update failed for note ${noteId}:`, error);
              // 静默失败，不影响用户体验
            });
        }
        return; // 使用缓存，不需要加载
      }
    }
    
    // 没有缓存，正常加载
    isLoadingContent.current = true;
    try {
      const response = await fetch(`/api/notes/${noteId}`);
      if (!response.ok) throw new Error('Failed to fetch note content');
      const note: Note = await response.json();
      const content = note.content || '';
      editor.commands.setContent(content);
      setInitialContent(content);
      // 更新缓存
      noteCache.setCached(noteId, content);
    } catch (error) {
      console.error(`Error loading note ${noteId}:`, error);
    } finally {
      setTimeout(() => { isLoadingContent.current = false; }, 100);
    }
  }, [editor, noteCache, currentNoteId]);

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
        await loadNoteContent(lastNoteId, false);
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
        // 保存成功后立即更新缓存（确保缓存是最新的，不会覆盖新内容）
        noteCache.setCached(currentNoteId, content);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  }, [currentNoteId, noteCache]);

  const saveIfDirty = async () => {
    if (editor && editor.getHTML() !== initialContent) {
      await saveContent(editor.getHTML());
    }
  };

  // 清除待处理的自动保存操作
  const clearPendingSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
  };

  const handleSelectNote = async (noteId: string) => {
    if (noteId === currentNoteId) return;
    // 清除任何待处理的自动保存，防止旧笔记内容被保存到新笔记
    clearPendingSave();
    await saveIfDirty();
    setCurrentNoteId(noteId);
    await loadNoteContent(noteId);
  };

  const handleCreateNote = async (selectNewNote = true, parentId?: string) => {
    // 清除任何待处理的自动保存
    clearPendingSave();
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
      
      // 关键：先添加到分组（如果有 parentId），这样新笔记不会显示为顶级
      if (parentId) {
        // 同步添加到分组，然后再添加到列表
        grouping.addToGroup(parentId, newNote.id);
      }
      
      // 添加到笔记列表
      setNotesList(prev => [...prev, newNote]);
      
      // 选中新笔记
      if (selectNewNote) {
        isSystemUpdate.current = true;
        try {
          setCurrentNoteId(newNote.id);
          editor?.commands.setContent('');
          setInitialContent('');
        } finally {
          isSystemUpdate.current = false;
        }
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
      
      // 删除成功后清除缓存
      noteCache.invalidateCache(noteId);
      
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
    const originalNotes = notesList;
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
      setNotesList(originalNotes);
    }
  };

  const handleReorderNotes = async (reorderedNotes: Note[]) => {
    const originalNotes = [...notesList];
    
    // Create a map for quick lookup of reordered notes
    const reorderedMap = new Map(reorderedNotes.map(n => [n.id, n]));
    
    // Create a new list that respects the new order for reordered items,
    // and keeps the original order for other items (like children in other groups).
    const newNotesList = originalNotes
      .map(note => reorderedMap.get(note.id) || note)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    setNotesList(newNotesList);

    try {
      const response = await fetch('/api/notes/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: reorderedNotes.map(({ id, order }) => ({ id, order })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save order');
      }
    } catch (error) {
      console.error('Error reordering notes:', error);
      alert('保存排序失败');
      // Revert on error
      setNotesList(originalNotes);
    }
  };

  const handleReorderChildNotes = async (parentId: string, reorderedChildNotes: Note[]) => {
    const originalNotes = [...notesList];

    // Create a map for quick lookup of the reordered child notes
    const reorderedMap = new Map(reorderedChildNotes.map(n => [n.id, n]));

    // Update the main notes list by only modifying the order of the affected children
    const updatedNotesList = originalNotes.map(note => {
      const reorderedChildNote = reorderedMap.get(note.id);
      if (reorderedChildNote) {
        return { ...note, order: reorderedChildNote.order };
      }
      return note;
    });
    setNotesList(updatedNotesList);

    // Also update the grouping data optimistically
    grouping.updateGroup(parentId, reorderedChildNotes.map(n => n.id));

    try {
      const response = await fetch('/api/notes/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: reorderedChildNotes.map(({ id, order }) => ({ id, order })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save child order');
      }
    } catch (error) {
      console.error('Error reordering child notes:', error);
      alert('保存子笔记排序失败');
      // Revert on error
      setNotesList(originalNotes);
      grouping.updateGroup(parentId, originalNotes.filter(n => grouping.getGroup(parentId)?.includes(n.id)).map(n => n.id));
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
    <div className={isModal || fullHeight ? 'h-full flex flex-col' : className}>
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

        /* 折叠块样式 */
        .ProseMirror details {
          border: 1px solid #4b5563;
          border-radius: 0.5rem;
          padding: 0;
          margin: 1rem 0;
          background-color: #1f2937;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .ProseMirror details:hover {
          border-color: #6b7280;
          background-color: #252d3a;
        }

        .ProseMirror details[open] {
          border-color: #3b82f6;
        }

        .ProseMirror details summary {
          padding: 0.75rem 1rem;
          cursor: pointer;
          font-weight: 500;
          color: #e5e7eb;
          background-color: #374151;
          user-select: none;
          display: flex;
          align-items: center;
          transition: all 0.15s ease;
          position: relative;
        }

        .ProseMirror details summary:hover {
          background-color: #4b5563;
          color: #f9fafb;
        }

        .ProseMirror details[open] summary {
          background-color: #3b82f6;
          color: #ffffff;
          border-bottom: 1px solid #2563eb;
        }

        .ProseMirror details summary::marker,
        .ProseMirror details summary::-webkit-details-marker {
          content: '';
          display: none;
        }

        .ProseMirror details summary::before {
          content: '▶';
          display: inline-block;
          margin-right: 0.5rem;
          transition: transform 0.2s ease;
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .ProseMirror details[open] summary::before {
          transform: rotate(90deg);
          color: #ffffff;
        }

        .ProseMirror .details-content {
          padding: 1rem;
          color: #d1d5db;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* 折叠块内的段落不需要额外上边距 */
        .ProseMirror .details-content > p:first-child {
          margin-top: 0;
        }

        .ProseMirror .details-content > p:last-child {
          margin-bottom: 0;
        }

        /* 嵌套折叠块样式 */
        .ProseMirror .details-content details {
          margin: 0.75rem 0;
        }

        /* 图片调整手柄样式 */
        .image-resizer {
          position: relative;
          display: inline-block;
          max-width: 100%;
        }

        .image-resize-handle {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 20px;
          height: 20px;
          background-color: #3b82f6;
          cursor: nwse-resize;
          border-radius: 0 0 4px 0;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .image-resizer:hover .image-resize-handle {
          opacity: 0.8;
        }

        .image-resizer.resizing .image-resize-handle {
          opacity: 1;
        }

        .tiptap-image {
          max-width: 100%;
          height: auto;
          display: block;
          border-radius: 4px;
        }
      `}</style>
      <NotesFileBar
        notes={notesList}
        currentNoteId={currentNoteId}
        onSelectNote={(id) => {
          console.log('🟢 [SimpleMdEditor] handleSelectNote 被调用:', id)
          handleSelectNote(id)
        }}
        onCreateNote={() => handleCreateNote()}
        onDeleteNote={handleDeleteNote}
        onUpdateNoteTitle={handleUpdateTitle}
        onReorderNotes={handleReorderNotes}
        userId={userId}
        onSelectParent={setSelectedParentId}
        groupingData={grouping.grouping}
        onToggleExpand={(parentId: string, isExpanded: boolean) => {
          // 如果展开，显示子栏；如果收缩，隐藏子栏
          if (isExpanded) {
            setSelectedParentId(parentId)
          } else {
            setSelectedParentId(null)
          }
        }}
      />

      {/* 展开列表 - 显示某个笔记的子笔记 */}
      {selectedParentId && (
        <NotesExpandedList
          parentNote={notesList.find(n => n.id === selectedParentId) || null}
          childNotes={grouping.getChildren(selectedParentId)
            .map((childId: string) => notesList.find(n => n.id === childId))
            .filter(Boolean) as Note[]}
          activeNoteId={currentNoteId}
          onSelectNote={handleSelectNote}
          onCreateNote={() => handleCreateNote(true, selectedParentId)}
          onDeleteNote={handleDeleteNote}
          onUpdateNoteTitle={handleUpdateTitle}
          isCreating={isCreatingNote}
          expandedChildId={selectedParentId}
          onToggleExpand={(childId: string) => {
            // 子栏内文件的展开/收缩逻辑
            if (selectedParentId) {
              grouping.toggleExpand(childId)
            }
          }}
          onReorderChildNotes={handleReorderChildNotes}
        />
      )}
      <div className="flex items-center justify-end gap-2 text-sm text-gray-400 my-2 flex-shrink-0 px-2">
        {lastSaved && <span>已保存 {lastSaved.toLocaleTimeString()}</span>}
        {isSaving && <span className="text-blue-400">保存中...</span>}
        <div className="ml-auto flex gap-2">
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.commands.setDetails()}
              title="插入折叠块 (Ctrl+Shift+D)"
            >
              <ChevronDown className="h-4 w-4" />
            </Button> */}
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
      <div className={isModal || fullHeight ? 'flex flex-1 min-h-0 relative' : 'flex relative'}>
        <div className="flex-1 min-w-0 relative">
          <div 
            className="overflow-y-auto"
            style={{ height: isModal || fullHeight ? '100%' : '400px' }}
          >
            <EditorContent editor={editor} />
          </div>

          {/* Right-side outline sidebar - 位于编辑器内部，不覆盖文件列表 */}
          <div 
            className="hidden md:block absolute right-0 top-0 bottom-0 z-[5] pointer-events-none"
            onMouseEnter={(e) => {
              console.log('🟡 [SimpleMdEditor] outline sidebar mouse enter')
              handleOutlineMouseEnter()
            }}
            onMouseLeave={(e) => {
              console.log('🟡 [SimpleMdEditor] outline sidebar mouse leave')
              handleOutlineMouseLeave()
            }}
            onClick={(e) => {
              console.log('🟡 [SimpleMdEditor] outline sidebar clicked (不应该发生)', e.target)
            }}
          >
            {showOutline ? (
              <div className="w-72 h-full bg-gray-900/80 backdrop-blur-md border-l border-white/5 shadow-2xl overflow-hidden flex flex-col transition-all pointer-events-auto">
              <div className="flex items-center justify-between p-4 border-b border-white/5 flex-shrink-0">
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