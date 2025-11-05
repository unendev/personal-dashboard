'use client'

import React from 'react';
import SimpleMdEditor from '@/app/components/features/notes/SimpleMdEditor';

interface NotesSectionProps {
  className?: string;
}

/**
 * 笔记区域组件
 * 
 * 简单包装 SimpleMdEditor
 */
export function NotesSection({ className = '' }: NotesSectionProps) {
  return (
    <section className={`bg-gray-800 rounded-lg border-2 border-gray-600 p-6 min-h-[650px] flex flex-col ${className}`}>
      <h3 className="text-xl font-bold text-white mb-4 pb-3 border-b-2 border-gray-600 flex items-center gap-3">
        <span className="text-2xl">📝</span>
        笔记
      </h3>
      
      <div className="flex-1">
        <SimpleMdEditor />
      </div>
    </section>
  );
}

