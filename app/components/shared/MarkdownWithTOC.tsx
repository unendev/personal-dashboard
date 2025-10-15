'use client';

import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FloatingTOC } from './FloatingTOC';

interface MarkdownWithTOCProps {
  content: string;
  className?: string;
  showTOC?: boolean;
}

/**
 * 带悬浮大纲的Markdown渲染组件
 * 自动提取标题并添加锚点ID
 */
export const MarkdownWithTOC: React.FC<MarkdownWithTOCProps> = ({
  content,
  className = '',
  showTOC = true
}) => {
  const [activeSection, setActiveSection] = useState('');

  // 从markdown内容中提取章节
  const tocSections = useMemo(() => {
    const headingRegex = /^##\s+(.+?)(?:\s+(.+?))?\s*$/gm;
    const sections: Array<{ id: string; title: string; icon?: string }> = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const fullTitle = match[1].trim();
      // 提取emoji图标（如果有）
      const emojiMatch = fullTitle.match(/^([\u{1F300}-\u{1F9FF}])\s+(.+)$/u);
      
      const title = emojiMatch ? emojiMatch[2] : fullTitle;
      const icon = emojiMatch ? emojiMatch[1] : undefined;
      
      // 生成ID：将标题转换为kebab-case
      const id = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      sections.push({ id, title, icon });
    }

    return sections;
  }, [content]);

  // 处理章节点击
  const handleSectionClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  // 自定义heading渲染，添加ID
  const components = {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = String(children);
      // 去除emoji
      const cleanText = text.replace(/^[\u{1F300}-\u{1F9FF}]\s+/u, '');
      const id = cleanText
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      return (
        <h2 id={id} className="text-2xl font-bold text-white mt-6 mb-4 scroll-mt-20" {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className="text-xl font-semibold text-white/90 mt-4 mb-3" {...props}>
        {children}
      </h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className="text-white/80 leading-relaxed mb-4" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="list-disc list-inside space-y-2 mb-4 text-white/80" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
      <ol className="list-decimal list-inside space-y-2 mb-4 text-white/80" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li className="leading-relaxed" {...props}>
        {children}
      </li>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="font-semibold text-white" {...props}>
        {children}
      </strong>
    ),
    code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <code className="bg-gray-800/50 px-1.5 py-0.5 rounded text-sm font-mono text-blue-400" {...props}>
        {children}
      </code>
    ),
    pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
      <pre className="bg-gray-800/50 p-4 rounded-lg overflow-x-auto mb-4" {...props}>
        {children}
      </pre>
    ),
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote className="border-l-4 border-blue-500/50 pl-4 py-2 mb-4 text-white/70 italic" {...props}>
        {children}
      </blockquote>
    ),
  };

  return (
    <div className="relative">
      {/* 悬浮大纲 */}
      {showTOC && tocSections.length > 0 && (
        <FloatingTOC
          sections={tocSections}
          activeSection={activeSection}
          onSectionClick={handleSectionClick}
        />
      )}

      {/* Markdown内容 */}
      <div className={`prose prose-invert max-w-none ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownWithTOC;


