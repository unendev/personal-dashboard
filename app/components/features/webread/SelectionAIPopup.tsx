'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Sparkles, Copy, Check, AlertCircle, Brain } from 'lucide-react';
import { MarkdownView } from '@/app/components/shared/MarkdownView';
import { getAIConfig, getProviderBaseUrl } from '@/lib/ai-config';

interface SelectionAIPopupProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  bookTitle?: string;
}

// 判断是否是思考模型
function isThinkingModel(provider: string, model: string): boolean {
  if (provider === 'deepseek' && model === 'deepseek-reasoner') return true;
  if (provider === 'gemini' && (model.includes('gemini-2.5-pro') || model.includes('gemini-3'))) return true;
  return false;
}

export function SelectionAIPopup({ selectedText, position, onClose, bookTitle }: SelectionAIPopupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // 当展开且有新的 selectedText 时自动发送
  useEffect(() => {
    if (isExpanded && selectedText && !aiResponse && !isLoading && !error) {
      askAI();
    }
  }, [selectedText, isExpanded]);

  const askAI = async () => {
    setIsLoading(true);
    setAiResponse('');
    setReasoning('');
    setIsThinking(false);
    setError(null);
    
    const config = getAIConfig();
    
    if (!config.enabled) {
      setError('AI 功能已禁用，请在设置中启用');
      setIsLoading(false);
      return;
    }
    
    if (!config.apiKey) {
      setError('未配置 API Key，请在书架设置中配置');
      setIsLoading(false);
      return;
    }

    const useThinking = isThinkingModel(config.provider, config.model);
    if (useThinking) {
      setIsThinking(true);
    }
    
    try {
      const requestBody: any = {
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model,
        messages: [
          {
            role: 'system',
            content: `你是一位博学的阅读助手。用户正在阅读${bookTitle ? `《${bookTitle}》` : '一本书'}，选中了一段文字想要了解更多。请简洁地解释这段文字的含义、背景知识或相关概念。如果是外语，请翻译并解释。回答要简洁有深度，不超过200字。`
          },
          {
            role: 'user',
            content: `请解释这段文字：\n\n"${selectedText}"`
          }
        ]
      };
      
      if (config.provider === 'custom' && config.baseUrl) {
        requestBody.baseUrl = config.baseUrl || getProviderBaseUrl(config.provider);
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: AI 请求失败`);
      }
      
      if (!response.body) {
        throw new Error('无响应内容');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let fullReasoning = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const match = line.match(/^([a-z]):(.*)$/);
          if (match) {
            const [, type, content] = match;
            try {
              const parsed = JSON.parse(content);
              if (type === '0' && typeof parsed === 'string') {
                // 文本内容
                fullContent += parsed;
                setAiResponse(fullContent);
                // 收到正式回复后，标记思考结束
                if (useThinking && fullReasoning) {
                  setIsThinking(false);
                }
              } else if (type === 'g' && typeof parsed === 'string') {
                // reasoning 内容
                fullReasoning += parsed;
                setReasoning(fullReasoning);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
      
      // 流结束后清除思考状态
      setIsThinking(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '抱歉，AI 暂时无法回答。请稍后再试。';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(aiResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - (isExpanded ? 360 : 160)),
    top: Math.max(position.y - 50, 10),
    zIndex: 100,
  };

  if (!isExpanded) {
    return (
      <div 
        ref={popupRef}
        style={popupStyle}
        className="flex items-center gap-1 bg-slate-800/95 backdrop-blur border border-amber-500/30 rounded-full shadow-xl p-1 animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-amber-300 hover:text-amber-100 hover:bg-slate-700 rounded-full transition-colors text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          <span>问 AI</span>
        </button>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-full transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={popupRef}
      style={popupStyle}
      className="w-[340px] max-h-[400px] bg-slate-800/95 backdrop-blur border border-amber-500/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 bg-slate-900/50">
        <div className="flex items-center gap-2 text-amber-300">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">AI 解读</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Text */}
      <div className="px-3 py-2 bg-slate-900/30 border-b border-slate-700/30">
        <p className="text-xs text-slate-400 mb-1">选中内容</p>
        <p className="text-sm text-amber-200/90 line-clamp-3 italic">"{selectedText}"</p>
      </div>

      {/* AI Response */}
      <div className="px-3 py-3 max-h-[240px] overflow-y-auto custom-scrollbar">
        {error ? (
          <div className="flex items-start gap-2 text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <>
            {/* 思考中显示 - 只在思考阶段显示 */}
            {isThinking && reasoning && (
              <div className="mb-3 p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Brain className="w-3 h-3 animate-pulse" />
                  <span>思考中...</span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-3">{reasoning}</p>
              </div>
            )}
            
            {/* 加载状态 */}
            {isLoading && !aiResponse && !reasoning && (
              <div className="flex items-center gap-2 text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">加载中...</span>
              </div>
            )}
            
            {/* 正式回复 */}
            {aiResponse && (
              <div className="text-sm text-slate-200 leading-relaxed">
                <MarkdownView content={aiResponse} variant="default" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {aiResponse && !isLoading && (
        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-slate-700/30 bg-slate-900/30">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>
          <button
            onClick={askAI}
            className="flex items-center gap-1 px-2 py-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-slate-700 rounded transition-colors"
          >
            <Send className="w-3 h-3" />
            <span>重新生成</span>
          </button>
        </div>
      )}
    </div>
  );
}
