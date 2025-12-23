'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, Loader2, Sparkles, Copy, Check, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
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

// 推理过程显示组件 - 简约版
const ReasoningBlock = ({ 
  content, 
  isStreaming = false, 
  autoCollapse = false 
}: { 
  content: string; 
  isStreaming?: boolean; 
  autoCollapse?: boolean;
}) => {
  const [expanded, setExpanded] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到底部（流式时）
  useEffect(() => {
    if (isStreaming && expanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isStreaming, expanded]);
  
  // 完成后自动折叠
  useEffect(() => {
    if (autoCollapse && !isStreaming) {
      setExpanded(false);
    }
  }, [autoCollapse, isStreaming]);
  
  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>{isStreaming ? '思考中...' : '思考过程'}</span>
      </button>
      {expanded && (
        <div 
          ref={contentRef}
          className="mt-1 pl-4 text-xs text-slate-500 max-h-[80px] overflow-y-auto custom-scrollbar border-l border-slate-700"
        >
          <span className="whitespace-pre-wrap">{content}</span>
          {isStreaming && <span className="inline-block w-1 h-3 bg-slate-500 animate-pulse ml-0.5" />}
        </div>
      )}
    </div>
  );
};

export function SelectionAIPopup({ selectedText, position, onClose, bookTitle }: SelectionAIPopupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hasSentRef = useRef(false);

  const config = getAIConfig();

  // 使用 useMemo 避免每次渲染都创建新的 transport 实例
  const chatTransport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
  }), []);

  // 使用 useChat hook - 复用 /room 的模式
  const { messages, sendMessage, status, error } = useChat({
    id: `webread-${selectedText.substring(0, 20)}`,
    transport: chatTransport,
  });

  // 获取最后一条 assistant 消息
  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
  const aiResponse = lastAssistantMessage?.parts
    ?.filter(p => p.type === 'text')
    .map(p => (p as any).text)
    .join('') || '';
  
  // 获取 reasoning 内容 - SDK v5: reasoning part 有 text 字段
  const reasoningParts = lastAssistantMessage?.parts?.filter(p => p.type === 'reasoning') || [];
  const reasoning = reasoningParts.map(p => (p as any).text || '').join('');
  const isReasoningStreaming = reasoningParts.some(p => (p as any).state === 'streaming');

  const isLoading = status === 'streaming' || status === 'submitted';

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
    if (isExpanded && selectedText && !hasSentRef.current && status === 'ready') {
      askAI();
    }
  }, [selectedText, isExpanded, status]);

  const askAI = async () => {
    setConfigError(null);
    hasSentRef.current = true;
    
    if (!config.enabled) {
      setConfigError('AI 功能已禁用，请在设置中启用');
      return;
    }
    
    if (!config.apiKey) {
      setConfigError('未配置 API Key，请在书架设置中配置');
      return;
    }

    const systemPrompt = `你是一位博学的阅读助手。用户正在阅读${bookTitle ? `《${bookTitle}》` : '一本书'}，选中了一段文字想要了解更多。请简洁地解释这段文字的含义、背景知识或相关概念。如果是外语，请翻译并解释。回答要简洁有深度，不超过200字。`;

    // 构建请求体 - 传递给 API
    const body: any = {
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
    };
    
    if (config.provider === 'custom' && config.baseUrl) {
      body.baseUrl = config.baseUrl || getProviderBaseUrl(config.provider);
    }

    sendMessage(
      { text: `请解释这段文字：\n\n"${selectedText}"` },
      { 
        body: {
          ...body,
          messages: [
            { role: 'system', content: systemPrompt },
          ]
        }
      }
    );
  };

  const handleRetry = () => {
    hasSentRef.current = false;
    askAI();
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

  const displayError = configError || (error ? error.message : null);

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
        {displayError ? (
          <div className="flex items-start gap-2 text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{displayError}</span>
          </div>
        ) : (
          <>
            {/* 思考中显示 - 有 reasoning 内容时显示，可折叠 */}
            {reasoning && (
              <ReasoningBlock 
                content={reasoning} 
                isStreaming={isReasoningStreaming} 
                autoCollapse={!isLoading && !!aiResponse}
              />
            )}
            
            {/* 加载状态 - 只在没有任何内容时显示 */}
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
            onClick={handleRetry}
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
