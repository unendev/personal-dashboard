'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Plus, FileText, ChevronRight, ChevronDown, Trash2 } from 'lucide-react'
import { useNoteGrouping } from './hooks/useNoteGrouping'

interface Note {
  id: string
  title: string
}

interface NotesFileBarProps {
  notes: Note[]
  currentNoteId: string | null
  onSelectNote: (id: string) => void
  onCreateNote: () => void
  onDeleteNote: (id: string) => void
  onUpdateNoteTitle: (id: string, newTitle: string) => void
  userId?: string
  onSelectParent?: (parentId: string) => void
  onToggleExpand?: (parentId: string, isExpanded: boolean) => void
  groupingData?: Record<string, string[]>  // 从父组件接收 grouping 数据
}

export const NotesFileBar: React.FC<NotesFileBarProps> = ({
  notes,
  currentNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onUpdateNoteTitle,
  userId = 'user-1',
  onSelectParent,
  onToggleExpand,
  groupingData,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const localGrouping = useNoteGrouping(userId)
  // 优先使用从父组件传来的 groupingData，否则用本地 grouping
  const grouping = groupingData ? { grouping: groupingData, isExpanded: (id: string) => localGrouping.isExpanded(id) } : { grouping: localGrouping.grouping, isExpanded: (id: string) => localGrouping.isExpanded(id) }

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
    const isCurrentlyExpanded = localGrouping.isExpanded(noteId)
    // 切换展开状态
    localGrouping.toggleExpand(noteId)
    // 通知父组件展开状态变化
    onToggleExpand?.(noteId, !isCurrentlyExpanded)
  }

  const handleDeleteNote = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    const note = notes.find(n => n.id === noteId)
    const noteTitle = note?.title || '此笔记'
    if (window.confirm(`确定要删除笔记 "${noteTitle}" 吗？此操作无法撤销。`)) {
      onDeleteNote(noteId)
    }
  }

  // 获取顶级笔记（未分组的笔记）
  const topLevelNotes = notes.filter(note => {
    // 只有在分组加载完成后再进行过滤
    if (!localGrouping.isLoaded) return true  // 加载中时显示所有笔记（等待数据）
    
    const currentGrouping = groupingData || localGrouping.grouping
    for (const children of Object.values(currentGrouping)) {
      if (children.includes(note.id)) {
        return false  // 如果笔记在某个分组的子列表中，就不是顶级
      }
    }
    return true  // 否则视为顶级
  })

  return (
    <div className="flex items-center bg-gray-900/70 backdrop-blur-sm border-b border-gray-700/50 pr-2">
      <div className="flex items-center gap-1 overflow-x-auto py-2 pl-2">
        {topLevelNotes.map(note => {
          const isActive = currentNoteId === note.id
          const isEditing = editingNoteId === note.id
          const hasChildren = (groupingData || localGrouping.grouping)[note.id]?.length > 0
          const isExpanded = localGrouping.isExpanded(note.id)

          return (
            <div
              key={note.id}
              onClick={() => {
                if (!isEditing) {
                  onSelectNote(note.id)
                  onSelectParent?.(note.id)
                }
              }}
              onDoubleClick={() => handleDoubleClick(note)}
              className={`relative group flex items-center justify-between px-3 py-2 rounded-t-md cursor-pointer border-b-2 transition-colors duration-200 flex-shrink-0 max-w-[200px] ${
                isActive && !isEditing
                  ? 'bg-gray-800 border-blue-500'
                  : 'bg-transparent border-transparent hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* 展开/收缩按钮 - 总是显示 */}
                <button
                  onClick={(e) => handleToggleExpand(e, note.id)}
                  className="p-0.5 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
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
              {!isEditing && (
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
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCreateNote}
        className="flex-shrink-0 ml-2 h-8 w-8 p-0 rounded-full hover:bg-gray-700"
        title="创建新笔记"
      >
        <Plus size={16} />
      </Button>
    </div>
  )
}
