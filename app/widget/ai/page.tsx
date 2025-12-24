'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, Bot, User, Loader2, FileText, CheckSquare, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MarkdownView } from '@/app/components/shared/MarkdownView';

export const dynamic = 'force-dynamic';

const MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro', provider: 'gemini' },
];

// 思考过程组件
const ReasoningBlock = ({ content, isStreaming = false }: { content: string; isStreaming?: boolean }) => {
  const [expanded, setExpanded] = useState(isStreaming);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => { setExpanded(isStreaming); }, [isStreaming]);
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isStreaming]);
  
  return (
    <div className="my-1 border border-zinc-600 rounded overflow-hidden bg-zinc-800/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-2 py-1 flex items-center gap-1.5 text-[10px] text-zinc-400 hover:bg-zinc-700/50 transition-colors"
      >
        <span>{isStreaming ? '💭 思考中...' : '💭 思考过程'}</span>
        <span className="text-zinc-500 text-[9px]">({content.length}字)</span>
        <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>
      {expanded && (
        <div ref={contentRef} className="px-2 py-1.5 text-[10px] text-zinc-400 border-t border-zinc-700 max-h-32 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
          {isStreaming && <span className="inline-block w-1 h-2 bg-zinc-400 animate-pulse ml-0.5" />}
        </div>
      )}
    </div>
  );
};

// 执行工具调用
function executeToolAction(result: string): void {
  try {
    const action = JSON.parse(result);
    if (action.action === 'UPDATE_MEMO') {
      const current = localStorage.getItem('widget-memo-content') || '';
      const newContent = action.append ? (current ? current + '\n\n' + action.content : action.content) : action.content;
      localStorage.setItem('widget-memo-content', newContent);
    }
    if (action.action === 'ADD_TODO') {
      const saved = localStorage.getItem('widget-todo-items');
      const items = saved ? JSON.parse(saved) : [];
      items.push({
        id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: action.text,
        completed: false,
        group: action.group || 'default',
        createdAt: Date.now(),
      });
      localStorage.setItem('widget-todo-items', JSON.stringify(items));
    }
  } catch { /* ignore */ }
}

export default function AiWidgetPage() {
  const [inputValue, setInputValue] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('deepseek-chat');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const processedToolCalls = useRef<Set<string>>(new Set());

  // 加载模型选择
  useEffect(() => {
    const model = localStorage.getItem('widget-ai-model');
    if (model && MODELS.find(m => m.id === model)) {
      setSelectedModelId(model);
    }
  }, []);

  const selectedModel = MODELS.find(m => m.id === selectedModelId) || MODELS[0];

  const chatTransport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat/widget',
  }), []);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: 'widget-ai',
    transport: chatTransport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    localStorage.setItem('widget-ai-model', modelId);
    setShowModelDropdown(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理工具调用
  useEffect(() => {
    messages.forEach((msg) => {
      if (msg.role === 'assistant' && msg.parts) {
        msg.parts.forEach((part: any) => {
          const isToolCall = part.type?.startsWith('tool-') && !part.type?.includes('step');
          if (isToolCall && part.state === 'output-available' && part.output) {
            const callId = part.toolCallId || `${msg.id}-${part.type}`;
            if (!processedToolCalls.current.has(callId)) {
              processedToolCalls.current.add(callId);
              executeToolAction(part.output);
            }
          }
        });
      }
    });
  }, [messages]);

  // 新建对话
  const handleNewChat = () => {
    setMessages([]);
    processedToolCalls.current.clear();
  };

  const handleSubmit = () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    
    sendMessage({ text }, { 
      body: { provider: selectedModel.provider, modelId: selectedModel.id }
    });
    setInputValue('');
  };

  // 渲染消息内容
  const renderMessageContent = (msg: any) => {
    if (!msg.parts) {
      return <MarkdownView content={msg.content || '...'} variant="default" className="text-xs" />;
    }
    
    let reasoningContent = '';
    let reasoningState: string | undefined;
    const textParts: string[] = [];
    const toolResults: string[] = [];
    
    msg.parts.forEach((part: any) => {
      if (part.type === 'reasoning') {
        reasoningContent += part.text || '';
        reasoningState = part.state;
      } else if (part.type === 'text') {
        textParts.push(part.text || '');
      } else if (part.type?.startsWith('tool-') && part.state === 'output-available' && part.output) {
        try {
          const action = JSON.parse(part.output);
          if (action.action === 'UPDATE_MEMO') {
            toolResults.push(`✅ 已${action.append ? '追加到' : '更新'}备忘录`);
          } else if (action.action === 'ADD_TODO') {
            toolResults.push(`✅ 已添加待办: ${action.text}`);
          }
        } catch { toolResults.push(part.output); }
      }
    });
    
    const isReasoningStreaming = reasoningState === 'streaming' || (status === 'streaming' && !!reasoningContent && !textParts.join(''));
    const textContent = textParts.join('') + (toolResults.length > 0 ? '\n' + toolResults.join('\n') : '');
    
    return (
      <>
        {reasoningContent && <ReasoningBlock content={reasoningContent} isStreaming={isReasoningStreaming} />}
        {textContent && <MarkdownView content={textContent} variant="default" className="text-xs" />}
        {!reasoningContent && !textContent && '...'}
      </>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-900 text-zinc-100 select-none overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 bg-zinc-800 shrink-0" data-drag="true">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-medium text-zinc-300">AI 助手</h2>
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <FileText size={10} />
            <CheckSquare size={10} />
          </div>
        </div>
        <div className="flex items-center gap-1" data-drag="false">
          {/* 新建对话 */}
          <button onClick={handleNewChat} className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors" title="新对话">
            <Plus size={12} />
          </button>
          {/* 清空对话 */}
          <button onClick={handleNewChat} className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors" title="清空对话">
            <Trash2 size={12} />
          </button>
          {/* 模型选择器 */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setShowModelDropdown(!showModelDropdown)} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors">
              <span className="max-w-[60px] truncate">{selectedModel.name}</span>
              <ChevronDown size={10} className={`transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showModelDropdown && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-zinc-800 border border-zinc-700 rounded shadow-lg z-50">
                {MODELS.map(model => (
                  <button key={model.id} onClick={() => handleModelChange(model.id)} className={`w-full text-left px-2 py-1.5 text-[10px] hover:bg-zinc-700 transition-colors ${model.id === selectedModelId ? 'text-emerald-400 bg-zinc-700/50' : 'text-zinc-300'}`}>
                    {model.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => window.close()} className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-600 transition-colors">
            <X size={12} />
          </button>
        </div>
      </div>
      
      {/* 消息区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 text-sm py-6">
            <Bot className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>有什么可以帮你？</p>
            <p className="text-xs mt-1 text-zinc-600">可以帮你记备忘录、添加待办</p>
          </div>
        )}
        
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={10} className="text-zinc-400" />
              </div>
            )}
            <div className={`max-w-[85%] p-2 rounded text-sm ${msg.role === 'user' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 border border-zinc-700 text-zinc-300'}`}>
              {msg.role === 'assistant' ? renderMessageContent(msg) : (
                <span className="text-xs">{(msg as any).content || ((msg as any).parts?.find((p: any) => p.type === 'text') as any)?.text || ''}</span>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                <User size={10} className="text-zinc-400" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center">
              <Loader2 size={10} className="text-zinc-400 animate-spin" />
            </div>
            <div className="bg-zinc-800 border border-zinc-700 rounded p-2">
              <span className="text-xs text-zinc-500">思考中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="p-2 border-t border-zinc-700 bg-zinc-800 shrink-0">
        <div className="flex gap-1.5">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            placeholder="输入问题..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
            disabled={isLoading}
          />
          <button onClick={handleSubmit} disabled={isLoading} className="px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 transition-colors disabled:opacity-50">
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
