'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, FileText, GripVertical } from 'lucide-react'

interface Note {
  id: string
  title: string
}

interface NotesHierarchyPanelProps {
  parentNote: Note | null
  childNotes: Note[]
  activeNoteId: string | null
  onSelectNote: (id: string) => void
  onClose: () => void
  onReorder?: (fromIndex: number, toIndex: number) => void
}

export const NotesHierarchyPanel: React.FC<NotesHierarchyPanelProps> = ({
  parentNote,
  childNotes,
  activeNoteId,
  onSelectNote,
  onClose,
  onReorder,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== toIndex && onReorder) {
      onReorder(draggedIndex, toIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  if (!parentNote) return null

  return (
    <div
      ref={panelRef}
      className="fixed right-0 top-0 h-screen w-72 bg-gray-900/95 backdrop-blur-sm border-l border-gray-700/50 shadow-2xl z-40 flex flex-col"
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-300" />
          <div className="min-w-0">
            <div className="text-xs text-gray-500">文件夹</div>
            <div className="text-sm font-medium text-white truncate">{parentNote.title}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-800 rounded transition-colors"
          title="关闭"
        >
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      {/* 子笔记列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        {childNotes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm text-center p-4">
            <div>
              <div className="text-4xl mb-2">📁</div>
              <p>该文件夹中暂无笔记</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {childNotes.map((note, index) => {
              const isActive = activeNoteId === note.id
              const isDragged = draggedIndex === index
              const isDragOver = dragOverIndex === index

              return (
                <div
                  key={note.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectNote(note.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-move transition-all duration-150 group ${
                    isDragged
                      ? 'opacity-50 bg-gray-800/50'
                      : isDragOver
                      ? 'bg-blue-600/20 border-l-2 border-blue-400'
                      : isActive
                      ? 'bg-blue-600/30 border-l-2 border-blue-400'
                      : 'hover:bg-gray-800/50'
                  }`}
                >
                  {/* 拖拽手柄 */}
                  <GripVertical
                    size={14}
                    className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  />

                  {/* 图标和标题 */}
                  <FileText
                    size={14}
                    className={isActive ? 'text-blue-300' : 'text-gray-400'}
                  />
                  <span
                    className={`text-sm truncate ${
                      isActive ? 'text-white font-medium' : 'text-gray-300'
                    }`}
                    title={note.title}
                  >
                    {note.title}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="border-t border-gray-700/50 p-3 text-xs text-gray-500 text-center flex-shrink-0">
        <p>拖拽排序 • 点击选中</p>
      </div>
    </div>
  )
}


