'use client'

import React, { useState, useEffect, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { Loader2, Edit3, Save } from 'lucide-react';
import { MarkdownView } from '@/app/components/shared/MarkdownView';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface MemoData {
  id: string;
  content: string;
  updatedAt: string;
}

/**
 * 笔记区域组件
 * 
 * 已重构为只读写 /api/widget/memo，与 Electron 端同步。
 */
export function NotesSection({ className = '', isMobile = false }: NotesSectionProps) {
  const { data: memo, isLoading } = useSWR<MemoData>('/api/widget/memo', fetcher);
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (memo && !isEditing) {
      setContent(memo.content);
    }
  }, [memo, isEditing]);

  useEffect(() => {
    if (isEditing && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async (currentContent: string) => {
    try {
      await fetch('/api/widget/memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentContent }),
      });
      mutate('/api/widget/memo');
    } catch (err) {
      console.error('Failed to save memo:', err);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => handleSave(newContent), 1500);
  };
  
  const renderContent = () => {
    if (isLoading && !content) {
      return <div className="p-4 text-center text-gray-500">加载中...</div>;
    }
    if (!isEditing && !content) {
       return (
        <div 
          className="p-4 text-center text-gray-500 cursor-pointer"
          onClick={() => setIsEditing(true)}
        >
          点击开始编辑便签...
        </div>
      );
    }
    return <MarkdownView content={content} className="p-4 text-sm" />;
  }

  return (
    <section className={`h-full flex flex-col bg-gray-900/40 backdrop-blur-sm border-l border-white/5 ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700/50 text-xs text-gray-400 font-medium">
        <span>快速便签 (与桌面端同步)</span>
        <button onClick={() => setIsEditing(!isEditing)} className="p-1 hover:bg-gray-700 rounded">
          {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
        </button>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isEditing ? (
          <textarea
            ref={textAreaRef}
            className="w-full h-full bg-transparent p-4 text-sm text-gray-200 resize-none focus:outline-none leading-relaxed"
            value={content}
            onChange={handleContentChange}
            onBlur={() => {
              setIsEditing(false);
              if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
              handleSave(content);
            }}
            placeholder="输入笔记... (支持 Markdown)"
          />
        ) : (
          <div className="prose prose-sm prose-invert p-4 max-w-none" onClick={() => setIsEditing(true)}>
             {content ? <MarkdownView content={content} /> : <p className="text-gray-500 italic">点击开始编辑...</p>}
          </div>
        )}
      </div>
    </section>
  );
}

interface NotesSectionProps {
  className?: string;
  isMobile?: boolean;
}

