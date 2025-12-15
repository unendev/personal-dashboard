"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownViewProps {
  content: string;
  className?: string;
  variant?: 'default' | 'goc' | 'light';
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  className,
  variant = 'default'
}) => {
  // Light theme styles (for Treasure Pavilion etc.)
  const lightComponents = {
    p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed text-gray-700">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc ml-4 mb-2 space-y-1 text-gray-700">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal ml-4 mb-2 space-y-1 text-gray-700">{children}</ol>,
    li: ({ children }: any) => <li className="">{children}</li>,
    h1: ({ children }: any) => <h1 className="text-xl font-bold text-gray-900 mt-1 mb-2">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-lg font-semibold text-gray-900 mt-1 mb-2">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-base font-semibold text-gray-900 mt-1 mb-2">{children}</h3>,
    blockquote: ({ children }: any) => <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-600 my-2">{children}</blockquote>,
    code: ({ children, className }: any) => {
      const isInline = !className;
      if (isInline) {
        return <code className="bg-gray-100 px-1 py-0.5 rounded text-sm text-gray-800">{children}</code>;
      }
      return <code className="block bg-gray-100 p-3 rounded text-sm overflow-x-auto my-2 text-gray-800">{children}</code>;
    },
    pre: ({ children }: any) => <pre className="m-0">{children}</pre>,
    a: ({ children, href }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">{children}</a>,
  };

  // Base styles for GOC variant (Cyberpunk/Tactical Dark)
  const gocComponents = {
    p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed text-zinc-300">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc ml-4 mb-2 space-y-1 text-zinc-300">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal ml-4 mb-2 space-y-1 text-zinc-300">{children}</ol>,
    li: ({ children }: any) => <li className="">{children}</li>,
    h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2 mt-4 border-b border-white/10 pb-1 text-cyan-400">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-base font-bold mb-2 mt-3 text-cyan-200">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-sm font-bold mb-1 mt-2 text-cyan-100/80">{children}</h3>,
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-cyan-500/50 pl-3 italic text-zinc-400 my-2 bg-white/5 py-1 pr-1 rounded-r">{children}</blockquote>,
    code: ({ children, className }: any) => {
      const isInline = !className;
      if (isInline) {
        return <code className="bg-white/10 px-1 py-0.5 rounded text-xs font-mono text-cyan-300">{children}</code>;
      }
      return <code className="block bg-black/50 p-3 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto my-2 border border-white/10">{children}</code>;
    },
    pre: ({ children }: any) => <pre className="m-0">{children}</pre>,
    a: ({ children, href }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline decoration-dashed">{children}</a>,
  };

  // Select components based on variant
  let components = undefined;
  if (variant === 'goc') components = gocComponents;
  else if (variant === 'light') components = lightComponents;
  
  return (
    <div className={cn("markdown-content w-full", className)}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
