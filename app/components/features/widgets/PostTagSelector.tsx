'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface PostTagSelectorProps {
  source: 'linuxdo' | 'reddit' | 'heybox';
  postId: string;
  currentTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  compact?: boolean; // 紧凑模式，用于卡片
}

// 预设标签
const DEFAULT_TAGS = [
  "待精读", 
  "已粗览", 
  "高价值", 
  "收藏",
  "技术", 
  "产品", 
  "设计", 
  "管理",
  "投资",
  "游戏"
];

const PostTagSelector: React.FC<PostTagSelectorProps> = ({
  source,
  postId,
  currentTags = [],
  onTagsChange,
  compact = false
}) => {
  const [tags, setTags] = useState<string[]>(currentTags);
  const [customTag, setCustomTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 同步外部传入的tags
  useEffect(() => {
    setTags(currentTags);
  }, [currentTags]);

  const saveTags = async (newTags: string[]) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/post-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source,
          postId,
          tags: newTags,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('保存标签失败:', errorData);
        } else {
          console.error('保存标签失败: API 返回非 JSON 响应');
        }
        throw new Error('Failed to save tags');
      }

      console.log('✅ 标签保存成功');
      if (onTagsChange) {
        onTagsChange(newTags);
      }
    } catch (error) {
      console.error('保存标签失败:', error);
      // 回滚
      setTags(currentTags);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTag = (tag: string) => {
    const newTags = tags.includes(tag)
      ? tags.filter(t => t !== tag)
      : [...tags, tag];
    
    setTags(newTags);
    saveTags(newTags);
  };

  const handleAddCustomTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      saveTags(newTags);
      setCustomTag('');
      setIsAddingTag(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustomTag();
    } else if (e.key === 'Escape') {
      setCustomTag('');
      setIsAddingTag(false);
    }
  };

  if (compact) {
    // 紧凑模式：只显示已选标签 + 添加按钮
    return (
      <div className="flex flex-wrap gap-1 items-center" onClick={(e) => e.stopPropagation()}>
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 
                     rounded text-xs cursor-pointer hover:bg-blue-500/30 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleTag(tag);
            }}
          >
            {tag}
            <X className="w-3 h-3" />
          </span>
        ))}
        
        {isAddingTag ? (
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={() => {
              if (customTag.trim()) {
                handleAddCustomTag();
              } else {
                setIsAddingTag(false);
              }
            }}
            placeholder="标签名..."
            className="w-20 px-2 py-0.5 bg-white/10 border border-white/20 rounded text-xs 
                     text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAddingTag(true);
            }}
            className="p-0.5 text-white/60 hover:text-white/90 hover:bg-white/10 rounded transition-colors"
            title="添加标签"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
        
        {isSaving && (
          <span className="text-xs text-white/40">保存中...</span>
        )}
      </div>
    );
  }

  // 完整模式：显示预设标签 + 自定义
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-2">
        {DEFAULT_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => handleToggleTag(tag)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
              tags.includes(tag)
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 自定义标签 */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="自定义标签..."
          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-sm 
                   text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleAddCustomTag}
          disabled={!customTag.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium 
                   hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed 
                   transition-colors"
        >
          添加
        </button>
      </div>

      {/* 已选标签展示 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
          {tags.filter(tag => !DEFAULT_TAGS.includes(tag)).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 text-purple-400 
                       rounded-md text-sm cursor-pointer hover:bg-purple-500/30 transition-colors"
              onClick={() => handleToggleTag(tag)}
            >
              {tag}
              <X className="w-4 h-4" />
            </span>
          ))}
        </div>
      )}
      
      {isSaving && (
        <div className="text-sm text-white/60 text-center">保存中...</div>
      )}
    </div>
  );
};

export default PostTagSelector;


