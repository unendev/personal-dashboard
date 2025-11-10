'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Plus, FileText, ChevronRight, ChevronDown, Trash2 } from 'lucide-react'

interface Note {
  id: string
  title: string
}

interface NotesExpandedListProps {
  parentNote: Note | null
  childNotes: Note[]
  activeNoteId: string | null
  onSelectNote: (id: string) => void
  onCreateNote: () => void
  onDeleteNote?: (id: string) => void
  onUpdateNoteTitle: (id: string, newTitle: string) => void
  isCreating: boolean
  expandedChildId?: string | null
  onToggleExpand?: (id: string) => void
}

export const NotesExpandedList: React.FC<NotesExpandedListProps> = ({
  parentNote,
  childNotes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onUpdateNoteTitle,
  isCreating,
  expandedChildId,
  onToggleExpand,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingNoteId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingNoteId])

  const handleSaveTitle = () => {
    if (editingNoteId && editingTitle.trim() !== '') {
      onUpdateNoteTitle(editingNoteId, editingTitle.trim())
    }
    setEditingNoteId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      setEditingNoteId(null)
    }
  }

  const handleDoubleClick = (note: Note) => {
    setEditingNoteId(note.id)
    setEditingTitle(note.title)
  }

  const handleToggleExpand = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    if (onToggleExpand) {
      onToggleExpand(noteId)
    }
  }

  const handleDeleteNote = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    if (!onDeleteNote) return
    
    const note = childNotes.find(n => n.id === noteId) || parentNote
    const noteTitle = note?.title || '此笔记'
    if (window.confirm(`确定要删除笔记 "${noteTitle}" 吗？此操作无法撤销。`)) {
      onDeleteNote(noteId)
    }
  }

  if (!parentNote) return null

  return (
    <div className="bg-gray-800/50 border-b border-gray-700/30 px-2 relative z-30">
      {/* 子栏标题 - 显示父笔记信息 */}
      <div className="py-1.5 px-2 text-xs text-gray-600 border-b border-gray-700/20 mb-1">
        📁 {parentNote.title}
      </div>

      {/* 子文件列表 */}
      <div className="flex items-center gap-1 overflow-x-auto py-2 pl-2">
        {/* 第一项：父文件本身 */}
        {parentNote && (
          <div
            key={parentNote.id}
            onClick={() => onSelectNote(parentNote.id)}
            className={`relative group flex items-center justify-between px-3 py-2 rounded-t-md cursor-pointer border-b-2 transition-colors duration-200 flex-shrink-0 max-w-[200px] font-semibold ${
              activeNoteId === parentNote.id
                ? 'bg-gray-700 border-blue-500'
                : 'bg-gray-800 border-gray-700 hover:bg-gray-700/70'
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText
                size={14}
                className={activeNoteId === parentNote.id ? 'text-blue-300' : 'text-gray-400'}
              />
              <span className={`text-sm truncate flex-1 ${activeNoteId === parentNote.id ? 'text-white' : 'text-gray-300'}`}>
                {parentNote.title || 'Untitled'}
              </span>
            </div>
            {/* 删除按钮 - hover 时显示 */}
            {onDeleteNote && (
              <button
                onClick={(e) => handleDeleteNote(e, parentNote.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all flex-shrink-0 ml-1"
                title="删除笔记"
              >
                <Trash2 size={12} className="text-red-400 hover:text-red-300" />
              </button>
            )}
          </div>
        )}

        {/* 子文件列表 */}
        {childNotes.map((note) => {
          const isActive = activeNoteId === note.id
          const isEditing = editingNoteId === note.id
          const isExpanded = expandedChildId === note.id

          return (
            <div
              key={note.id}
              onClick={(e) => {
                console.log('🟣 [NotesExpandedList] 点击事件触发:', {
                  noteId: note.id,
                  noteTitle: note.title,
                  isEditing,
                  onSelectNote: typeof onSelectNote,
                  eventTarget: e.target,
                  currentTarget: e.currentTarget,
                  timestamp: new Date().toISOString()
                })
                e.stopPropagation()
                if (!isEditing) {
                  console.log('🟣 [NotesExpandedList] 调用 onSelectNote:', note.id)
                  onSelectNote(note.id)
                } else {
                  console.log('🟣 [NotesExpandedList] 跳过点击（正在编辑）')
                }
              }}
              onDoubleClick={() => handleDoubleClick(note)}
              className={`relative group flex items-center justify-between px-3 py-2 rounded-t-md cursor-pointer border-b-2 transition-colors duration-200 flex-shrink-0 max-w-[200px] ${
                isActive && !isEditing
                  ? 'bg-gray-700 border-blue-500'
                  : 'bg-gray-800 border-gray-700 hover:bg-gray-700/70'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* 展开按钮 */}
                <button
                  onClick={(e) => handleToggleExpand(e, note.id)}
                  className="p-0.5 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                  title={isExpanded ? '收缩' : '展开'}
                >
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-400" />
                  )}
                </button>

                <FileText
                  size={14}
                  className={isActive ? 'text-blue-300' : 'text-gray-400'}
                />
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={handleKeyDown}
                    className="bg-gray-700 text-white text-sm p-0.5 rounded border border-blue-500 focus:outline-none w-full"
                  />
                ) : (
                  <span className={`text-sm truncate flex-1 ${isActive ? 'text-white' : 'text-gray-300'}`}>
                    {note.title || 'Untitled'}
                  </span>
                )}
              </div>
              {/* 删除按钮 - hover 时显示 */}
              {!isEditing && onDeleteNote && (
                <button
                  onClick={(e) => handleDeleteNote(e, note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all flex-shrink-0 ml-1"
                  title="删除笔记"
                >
                  <Trash2 size={12} className="text-red-400 hover:text-red-300" />
                </button>
              )}
            </div>
          )
        })}

        {/* 新建按钮 */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onCreateNote}
          disabled={isCreating}
          className="flex-shrink-0 h-8 w-8 p-0 rounded-full hover:bg-gray-700"
          title="在此分组中创建新文件"
        >
          {isCreating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
          ) : (
            <Plus size={16} />
          )}
        </Button>
      </div>
    </div>
  )
}
