'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { MarkdownView } from '@/app/components/shared/MarkdownView';

export const dynamic = 'force-dynamic';

export default function MemoWidgetPage() {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('widget-memo-content');
    if (saved) setContent(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('widget-memo-content', content);
  }, [content]);

  useEffect(() => {
    if (isEditing && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-900 text-zinc-100 select-none overflow-hidden">
      {/* 标题栏 */}
      <div 
        className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 bg-zinc-800 shrink-0"
        data-drag="true"
      >
        <h2 className="text-xs font-medium text-zinc-300">备忘录</h2>
        <button
          onClick={() => window.close()}
          className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-600 transition-colors"
          data-drag="false"
        >
          <X size={12} />
        </button>
      </div>
      
      {/* 编辑/预览区域 */}
      <div 
        className="flex-1 min-h-0 overflow-hidden cursor-text"
        onClick={() => setIsEditing(true)}
      >
        {isEditing ? (
          <textarea
            ref={textAreaRef}
            className="w-full h-full bg-zinc-900 p-3 text-sm text-zinc-200 resize-none focus:outline-none leading-relaxed overflow-y-auto"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => setIsEditing(false)}
            placeholder="输入笔记... (支持 Markdown)"
          />
        ) : (
          <div className="w-full h-full p-3 overflow-y-auto">
            {content ? (
              <MarkdownView content={content} variant="default" className="text-sm" />
            ) : (
              <div className="text-zinc-500 text-sm">
                点击开始编辑...
              </div>
            )}
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="px-3 py-1.5 border-t border-zinc-700 bg-zinc-800 flex items-center justify-between shrink-0">
        <span className="text-[10px] text-zinc-500">
          {content.length} 字符
        </span>
        <span className="text-[10px] text-zinc-500">
          自动保存
        </span>
      </div>
    </div>
  );
}
