"use client";

import React, { useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeadingItem {
  id: string;
  level: number;
  text: string;
  offset: number;
}

interface MarkdownOutlineProps {
  content: string;
  onHeadingClick?: (offset: number) => void;
  className?: string;
}

export const MarkdownOutline: React.FC<MarkdownOutlineProps> = ({
  content,
  onHeadingClick,
  className
}) => {
  const [expandedLevels, setExpandedLevels] = React.useState<Set<number>>(new Set([1, 2]));

  // 解析 Markdown 中的标题
  const headings = useMemo(() => {
    const lines = content.split('\n');
    const items: HeadingItem[] = [];
    let offset = 0;

    lines.forEach((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        items.push({
          id: `heading-${items.length}`,
          level,
          text,
          offset
        });
      }
      offset += line.length + 1; // +1 for newline
    });

    return items;
  }, [content]);

  const toggleLevel = (level: number) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(level)) {
      newExpanded.delete(level);
    } else {
      newExpanded.add(level);
    }
    setExpandedLevels(newExpanded);
  };

  if (headings.length === 0) {
    return (
      <div className={cn("text-xs text-zinc-500 p-3", className)}>
        无标题
      </div>
    );
  }

  return (
    <div className={cn("text-xs space-y-1 p-3 overflow-y-auto", className)}>
      <div className="text-zinc-400 font-semibold mb-2">大纲</div>
      {headings.map((heading) => {
        const isVisible = expandedLevels.has(heading.level);
        const indent = (heading.level - 1) * 12;

        return (
          <div
            key={heading.id}
            style={{ marginLeft: `${indent}px` }}
            className="flex items-center gap-1"
          >
            {heading.level <= 2 && (
              <button
                onClick={() => toggleLevel(heading.level)}
                className="p-0 hover:bg-white/10 rounded transition-colors"
              >
                {isVisible ? (
                  <ChevronDown className="w-3 h-3 text-cyan-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-cyan-400" />
                )}
              </button>
            )}
            <button
              onClick={() => onHeadingClick?.(heading.offset)}
              className={cn(
                "flex-1 text-left truncate transition-colors hover:text-cyan-300",
                heading.level === 1 ? "text-cyan-400 font-semibold" :
                heading.level === 2 ? "text-cyan-300" :
                "text-zinc-400"
              )}
              title={heading.text}
            >
              {heading.text}
            </button>
          </div>
        );
      })}
    </div>
  );
};
