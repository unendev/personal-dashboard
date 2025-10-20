'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Plus, FileText } from 'lucide-react'

interface Note {
  id: string
  title: string
}

interface NotesFileBarProps {
  notes: Note[]
  activeNoteId: string | null
  onSelectNote: (id: string) => void
  onCreateNote: () => void
  onDeleteNote: (id: string) => void
  onUpdateNoteTitle: (id: string, newTitle: string) => void
  isCreating: boolean
}

export const NotesFileBar: React.FC<NotesFileBarProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onUpdateNoteTitle,
  isCreating,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingNoteId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingNoteId]);

  const handleSaveTitle = () => {
    if (editingNoteId && editingTitle.trim() !== '') {
      onUpdateNoteTitle(editingNoteId, editingTitle.trim());
    }
    setEditingNoteId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditingNoteId(null);
    }
  };

  const handleDoubleClick = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingTitle(note.title);
  };

  return (
    <div className="flex items-center bg-gray-900/70 backdrop-blur-sm border-b border-gray-700/50 pr-2">
      <div className="flex items-center gap-1 overflow-x-auto py-2 pl-2">
        {notes.map(note => {
          const isActive = activeNoteId === note.id;
          const isEditing = editingNoteId === note.id;

          return (
            <div 
              key={note.id} 
              onClick={() => !isEditing && onSelectNote(note.id)}
              onDoubleClick={() => handleDoubleClick(note)}
              className={`relative group flex items-center justify-between px-3 py-2 rounded-t-md cursor-pointer border-b-2 transition-colors duration-200 flex-shrink-0 max-w-[200px] ${
                isActive && !isEditing
                  ? 'bg-gray-800 border-blue-500' 
                  : 'bg-transparent border-transparent hover:bg-gray-800/50'
              }`}>
              <div className="flex items-center gap-2">
                <FileText size={14} className={isActive ? 'text-blue-300' : 'text-gray-400'} />
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
                  <span className={`text-sm truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                    {note.title || 'Untitled'}
                  </span>
                )}
              </div>
              {!isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(`确定要删除笔记 "${note.title}" 吗？`)) {
                      onDeleteNote(note.id)
                    }
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center bg-transparent hover:bg-gray-700 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
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
        disabled={isCreating}
        className="flex-shrink-0 ml-2 h-8 w-8 p-0 rounded-full hover:bg-gray-700"
        title="创建新笔记"
      >
        {isCreating ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
        ) : (
          <Plus size={16} />
        )}
      </Button>
    </div>
  )
}
