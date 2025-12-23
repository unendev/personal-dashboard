'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { Extension } from '@tiptap/core'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { createPortal } from 'react-dom'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { Button } from '@/app/components/ui/button'
import { Save, Maximize2, Minimize2, ChevronDown } from 'lucide-react'
import { NotesFileBar } from './NotesFileBar'
import { NotesExpandedList } from './NotesExpandedList'
import { useNoteGrouping } from './hooks/useNoteGrouping'
import { useNoteCache } from './hooks/useNoteCache'
import { useOssUpload } from '@/app/hooks/useOssUpload'
import { SwapLineExtension } from '@/lib/swap-line-extension'
import { DeleteLineExtension } from '@/lib/tiptap-extensions/delete-line'
import { CustomImage } from '@/lib/tiptap-extensions/custom-image'
import { Details } from '@/lib/tiptap-extensions/details'
import { DetailsSummary } from '@/lib/tiptap-extensions/details-summary'
import { DetailsContent } from '@/lib/tiptap-extensions/details-content'
import { AutoOrderListExtension } from '@/lib/tiptap-extensions/auto-order-list'
import { WikiLink, createWikiLinkInputRule } from '@/lib/tiptap-extensions/wiki-link'
import { 
  extractHeadingsFromEditor, 
  getEditorStyles,
  type HeadingItem,
} from '@/lib/markdown'





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
  const { upload: uploadToOss, isUploading: isUploadingImage } = useOssUpload()
  const [showOutline, setShowOutline] = useState(false) // 默认不显示
  const outlineTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 选中的父文件ID - 用于显示子栏
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  
  // 使用 useNoteGrouping 作为唯一的分组数据源
  const { data: session } = useSession()
  const userId = session?.user?.id || 'user-1' // 从 session 获取 userId
  const grouping = useNoteGrouping(userId)
  const noteCache = useNoteCache(userId)

  const [outline, setOutline] = useState<HeadingItem[]>([])
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)

  // 使用统一的大纲提取器
  const updateOutline = useCallback((e: TiptapEditor) => {
    const items = extractHeadingsFromEditor(e)
    setOutline(items)
    const from = e.state.selection.from
    const current = items
      .filter((i) => i.pos <= from)
      .sort((a, b) => b.pos - a.pos)[0]
    setActiveHeadingId(current ? current.id : (items[0]?.id ?? null))
  }, [])

  const handleGotoHeading = (item: HeadingItem) => {
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
      WikiLink.configure({
        onLinkClick: (target: string) => {
          // 查找匹配标题的笔记并跳转
          const matchedNote = notesList.find(n => n.title === target)
          if (matchedNote) {
            handleSelectNote(matchedNote.id)
          } else {
            // 创建新笔记
            if (confirm(`笔记 "${target}" 不存在，是否创建？`)) {
              handleCreateNote(true).then(() => {
                // 创建后更新标题
                const newNote = notesList[notesList.length - 1]
                if (newNote) {
                  handleUpdateTitle(newNote.id, target)
                }
              })
            }
          }
        },
      }),
      Extension.create({
        name: 'wikiLinkInputRule',
        addInputRules() {
          return [createWikiLinkInputRule()]
        },
      }),
    ],
    editorProps: {
        attributes: {
          class: 'prose prose-invert max-w-none focus:outline-none min-h-[200px] md:min-h-[400px] px-4 py-3',
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
                  uploadToOss(file).then((url) => {
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

  // 预计算编辑器样式
  const editorStyles = getEditorStyles('dark')

  const renderEditorContent = (isModal = false) => (
    <div className={isModal || fullHeight ? 'h-full flex flex-col' : className}>
      <style dangerouslySetInnerHTML={{ __html: editorStyles }} />
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
        onSelectParent={(parentId) => {
          setSelectedParentId(parentId)
          // 父笔记只是分类，自动选中第一个子笔记
          const children = grouping.getChildren(parentId)
          if (children.length > 0) {
            handleSelectNote(children[0])
          }
        }}
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
          onUpdateParentTitle={handleUpdateTitle}
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
      <div className={isModal || fullHeight ? 'flex flex-1 min-h-0 relative' : 'flex relative flex-col flex-1'}>
        <div className="flex-1 min-w-0 relative flex flex-col">
          <div 
            className="overflow-y-auto flex-1"
            style={{ height: isModal || fullHeight ? '100%' : 'auto' }}
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