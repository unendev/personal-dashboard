'use client'

import React from 'react';
import { NotesSection } from './NotesSection';
import { WidgetTodoSection } from '@/app/components/features/todo/WidgetTodoSection';

interface LeftSidebarProps {
  className?: string;
}

export function LeftSidebar({ className = '' }: LeftSidebarProps) {
  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* Upper Part: Memos (Notes) - Takes remaining space */}
      <div className="flex-1 min-h-0 relative">
        <NotesSection className="h-full border-none bg-transparent" />
      </div>
      
      {/* Lower Part: Todos - Fixed height or percentage */}
      <div className="h-[45%] min-h-[300px] border-t border-gray-700/50 bg-gray-900/40 relative z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
        <WidgetTodoSection className="h-full border-none bg-transparent" />
      </div>
    </div>
  );
}
