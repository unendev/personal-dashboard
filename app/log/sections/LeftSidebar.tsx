'use client'

import React, { useState, useEffect, useRef } from 'react';
import { NotesSection } from './NotesSection';
import { WidgetTodoSection } from '@/app/components/features/todo/WidgetTodoSection';
import { GripHorizontal } from 'lucide-react';

interface LeftSidebarProps {
  className?: string;
}

const STORAGE_KEY = 'log-page-sidebar-split-ratio';
const DEFAULT_RATIO = 0.55; // Notes takes 55% height by default
const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;

export function LeftSidebar({ className = '' }: LeftSidebarProps) {
  const [splitRatio, setSplitRatio] = useState(DEFAULT_RATIO);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Load saved ratio on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= MIN_RATIO && parsed <= MAX_RATIO) {
        setSplitRatio(parsed);
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none'; // Prevent text selection
    document.body.style.cursor = 'row-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeY = e.clientY - containerRect.top;
    let newRatio = relativeY / containerRect.height;

    // Clamp ratio
    if (newRatio < MIN_RATIO) newRatio = MIN_RATIO;
    if (newRatio > MAX_RATIO) newRatio = MAX_RATIO;

    setSplitRatio(newRatio);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // Save persistence
    // We access the current state via a ref wrapper or simple logic if available,
    // but here we can just re-read the last set value or rely on the state update being fast enough.
    // Actually, inside this closure splitRatio is stale. 
    // Best way: save in setSplitRatio or use a ref for the value.
    // Let's use a simple effect for saving to avoid stale closure issues.
  };

  // Save to localStorage whenever ratio changes (debounced ideally, but simple here)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, splitRatio.toString());
  }, [splitRatio]);

  return (
    <div ref={containerRef} className={`flex flex-col h-full overflow-hidden relative ${className}`}>
      {/* Upper Part: Memos (Notes) */}
      <div 
        style={{ height: `${splitRatio * 100}%` }} 
        className="min-h-0 relative transition-[height] duration-0 ease-linear"
      >
        <NotesSection className="h-full border-none bg-transparent" />
      </div>
      
      {/* Resizer Handle */}
      <div 
        className="h-2 bg-gray-800 hover:bg-indigo-500/50 cursor-row-resize flex items-center justify-center transition-colors z-20 shrink-0 select-none group border-y border-gray-700/50"
        onMouseDown={handleMouseDown}
      >
        <GripHorizontal size={16} className="text-gray-600 group-hover:text-white transition-colors" />
      </div>

      {/* Lower Part: Todos */}
      <div 
        style={{ height: `${(1 - splitRatio) * 100}%` }} 
        className="min-h-0 bg-gray-900/40 relative z-10"
      >
        <WidgetTodoSection className="h-full border-none bg-transparent" />
      </div>
    </div>
  );
}
