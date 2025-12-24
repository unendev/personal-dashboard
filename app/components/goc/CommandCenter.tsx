/**
 * GOC Command Center - AI 聊天界面
 * 
 * ============================================================================
 * VERCEL AI SDK v5.0+ 客户端规则
 * ============================================================================
 * 
 * 1. 【路由配置】必须使用 DefaultChatTransport：
 *    useChat({ transport: new DefaultChatTransport({ api: '/api/chat/goc' }) })
 *    ❌ 不要用: useChat({ api: '/api/chat/goc' }) // v5 中会被忽略！
 * 
 * 2. 【发送消息】使用 sendMessage 替代 append：
 *    sendMessage({ text: input }, { body: { roomId, mode, model } })
 * 
 * 3. 【动态参数】通过 sendMessage 的第二个参数传递：
 *    sendMessage({ text }, { body: { temperature, userId } })
 * 
 * 官方文档: https://sdk.vercel.ai/docs/migration-guides/migration-guide-5-0
 * ============================================================================
 */

"use client";

import { useState, useRef, useEffect, useMemo, useCallback, memo, useTransition } from "react";
import { useStorage, useMutation, useSelf, useOthers, useRoom } from "@liveblocks/react/suspense";
import { LiveList } from "@liveblocks/client";
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MarkdownView } from "@/app/components/shared/MarkdownView";
import { Shield, HelpCircle, ClipboardList, Bot, Terminal, CheckCircle2, Loader2, FileText, ListTodo, Edit3, Brain, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// 工具名称到显示信息的映射 - 每个工具有不同颜色
const toolDisplayInfo: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  getNotes: { 
    icon: <FileText className="w-3 h-3" />, 
    label: '读取笔记',
    color: 'bg-blue-950/50 text-blue-400 border-blue-500/30'
  },
  updateNote: { 
    icon: <Edit3 className="w-3 h-3" />, 
    label: '更新笔记',
    color: 'bg-amber-950/50 text-amber-400 border-amber-500/30'
  },
  addTodo: { 
    icon: <ListTodo className="w-3 h-3" />, 
    label: '添加待办',
    color: 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
  },
};

// 推理过程显示组件 - 流式时展开，完成后可折叠
const ReasoningBlock = ({ content, isStreaming = false }: { content: string; isStreaming?: boolean }) => {
  const [expanded, setExpanded] = useState(true);
  
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isStreaming]);
  
  // 完成后自动折叠
  useEffect(() => {
    if (!isStreaming && content.length > 0) {
      setExpanded(false);
    }
  }, [isStreaming, content.length]);
  
  return (
    <div className="my-2 border border-zinc-600 rounded-lg overflow-hidden bg-zinc-800/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-xs text-zinc-400 hover:bg-zinc-700/50 transition-colors"
      >
        <span>{isStreaming ? '💭 思考中...' : '💭 思考过程'}</span>
        <span className="text-zinc-500 text-[10px]">({content.length}字)</span>
        <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>
      {expanded && (
        <div 
          ref={contentRef}
          className="px-3 py-2 text-xs text-zinc-400 border-t border-zinc-700 max-h-48 overflow-y-auto custom-scrollbar"
        >
          <pre className="whitespace-pre-wrap font-mono">{content}</pre>
          {isStreaming && <span className="inline-block w-2 h-3 bg-zinc-400 animate-pulse ml-0.5" />}
        </div>
      )}
    </div>
  );
};

// 工具调用组件 - 内联在 AI 回复中，不同工具不同颜色
const ToolCallInline = ({ part }: { part: any }) => {
  const toolName = part.type?.replace('tool-', '') || 'unknown';
  const state = part.state || 'input-available';
  const info = toolDisplayInfo[toolName] || { 
    icon: <Terminal className="w-3 h-3" />, 
    label: toolName,
    color: 'bg-zinc-800/50 text-zinc-400 border-zinc-600/20'
  };
  const isComplete = state === 'output-available';
  const isError = state === 'output-error';
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border",
      isError ? "bg-red-950/50 text-red-400 border-red-500/30" : info.color
    )}>
      {info.icon}
      <span>{info.label}</span>
      {isComplete && <CheckCircle2 className="w-3 h-3" />}
      {isError && <span>✗</span>}
      {!isComplete && !isError && <Loader2 className="w-3 h-3 animate-spin" />}
    </span>
  );
};

type AIMode = 'advisor' | 'interrogator' | 'planner';
type AIProvider = 'deepseek' | 'gemini';

// 模型配置 - 按提供商分组
// thinking: true 表示该模型支持思考，会在 UI 显示思考开关
const MODEL_CONFIG: Record<AIProvider, { label: string; models: { id: string; name: string; desc: string; thinking?: boolean }[] }> = {
  deepseek: {
    label: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', desc: '通用对话' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', desc: '深度推理', thinking: true },
    ]
  },
  gemini: {
    label: 'Gemini',
    models: [
      { id: 'gemini-2.5-flash', name: '2.5 Flash', desc: '快速高效', thinking: true }, // 可选思考
      { id: 'gemini-2.5-pro', name: '2.5 Pro', desc: '高质量+思考', thinking: true }, // 默认思考
      { id: 'gemini-3-pro-preview', name: '3.0 Pro', desc: '深度推理', thinking: true },
    ]
  }
};

interface SharedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  userName?: string;
  createdAt: number;
  // 同步工具调用信息
  toolCalls?: Array<{
    toolName: string;
    state: string;
    toolCallId?: string;
  }>;
}

export default function CommandCenter() {
  const room = useRoom();
  const roomId = room.id;
  const notes = useStorage((root) => root.notes);
  const sharedMessages = useStorage((root) => root.messages) as SharedMessage[] | null;
  const me = useSelf();
  const others = useOthers();

  const [aiMode, setAiMode] = useState<AIMode>('advisor');
  const [aiProvider, setAiProvider] = useState<AIProvider>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goc_ai_provider');
      return (saved as AIProvider) || 'deepseek';
    }
    return 'deepseek';
  });
  const [aiModelId, setAiModelId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goc_ai_model_id');
      return saved || 'deepseek-chat';
    }
    return 'deepseek-chat';
  });
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null); // 使用 ref 避免打字时重新渲染
  const [lastSentNotes, setLastSentNotes] = useState<string>("");
  const [aiModeEnabled, setAiModeEnabled] = useState(true); // AI 模式开关
  const [thinkingEnabled, setThinkingEnabled] = useState(true); // 思考模式开关
  
  // 半流式同步：追踪上次同步时间和内容长度
  const lastSyncTime = useRef<number>(0);
  const lastSyncedLength = useRef<Map<string, number>>(new Map());

  // --- Liveblocks Mutations ---
  // Note: Tool execution (updateNote, addTodo) is handled server-side
  // Client only syncs messages to Liveblocks for multi-player support

  // 同步消息到 Liveblocks（支持更新已存在的消息 - 用于半流式同步）
  const syncMessageToLiveblocks = useMutation(
    ({ storage }, message: SharedMessage) => {
      let messages = storage.get("messages");
      if (!messages) {
        messages = new LiveList([]);
        storage.set("messages", messages);
      }
      const arr = (messages as any).toArray();
      const existingIndex = arr.findIndex((m: any) => m.id === message.id);
      if (existingIndex === -1) {
        (messages as any).push(message);
      } else {
        // 更新已存在的消息（半流式同步）
        (messages as any).set(existingIndex, message);
      }
    },
    []
  );
  
  // 同步纯玩家消息（不触发 AI）
  const syncPlayerMessage = useMutation(
    ({ storage }, message: SharedMessage) => {
      let messages = storage.get("messages");
      if (!messages) {
        messages = new LiveList([]);
        storage.set("messages", messages);
      }
      (messages as any).push(message);
    },
    []
  );


  // --- Vercel AI SDK v5 with DefaultChatTransport ---
  // 使用 useMemo 避免每次渲染都创建新的 transport 实例
  const chatTransport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat/goc',
  }), []);
  
  const { messages, sendMessage, status } = useChat({
    id: roomId,
    transport: chatTransport,
  });
  


  const isLoading = status === 'streaming' || status === 'submitted';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 保存模型选择到 localStorage
  useEffect(() => {
    localStorage.setItem('goc_ai_provider', aiProvider);
    localStorage.setItem('goc_ai_model_id', aiModelId);
  }, [aiProvider, aiModelId]);

  // 半流式同步：流式过程中每 500ms 同步一次，完成后立即同步
  const syncedMessageIds = useRef<Set<string>>(new Set());
  const SYNC_INTERVAL = 500; // 流式同步间隔 ms
  
  useEffect(() => {
    if (messages.length === 0) return;
    
    const now = Date.now();
    const isStreaming = status === 'streaming';
    
    // 流式时节流同步
    if (isStreaming && now - lastSyncTime.current < SYNC_INTERVAL) {
      return;
    }
    
    messages.forEach((msg: any) => {
      const content = getUIMessageContent(msg);
      const contentLength = content?.length || 0;
      const lastLength = lastSyncedLength.current.get(msg.id) || 0;
      
      // 跳过空消息
      if (!content || contentLength === 0) return;
      
      // 流式时：只有内容增长才同步
      // 完成时：确保最终同步
      const shouldSync = isStreaming 
        ? contentLength > lastLength + 50 // 至少增长 50 字符才同步
        : !syncedMessageIds.current.has(msg.id) || contentLength > lastLength;
      
      if (shouldSync) {
        // 提取工具调用信息
        const toolCalls = msg.parts
          ?.filter((p: any) => p.type?.startsWith('tool-'))
          .map((p: any) => ({
            toolName: p.type?.replace('tool-', '') || 'unknown',
            state: p.state || 'output-available',
            toolCallId: p.toolCallId,
          })) || [];
        
        syncMessageToLiveblocks({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content,
          userName: msg.role === 'user' ? (me?.info?.name || 'Operator') : 'NEXUS AI',
          createdAt: msg.createdAt || Date.now(),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        });
        
        lastSyncedLength.current.set(msg.id, contentLength);
        if (!isStreaming) {
          syncedMessageIds.current.add(msg.id);
        }
      }
    });
    
    lastSyncTime.current = now;
  }, [messages, status]);



  // 智能滚动：只在用户已经在底部附近时才自动滚动
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  
  // 追踪用户是否在底部
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // 如果距离底部小于 100px，认为在底部
      isNearBottom.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  };
  
  useEffect(() => {
    // 只在用户已经在底部时才自动滚动
    if (isNearBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, sharedMessages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputValue = inputRef.current?.value || '';
    if (!inputValue.trim() || isLoading) return;

    const trimmedInput = inputValue.trim();
    
    // 判断是否发送给 AI：
    // 1. AI 模式开启时，所有消息发给 AI
    // 2. AI 模式关闭时，只有 @AI 开头的消息发给 AI
    const hasAIPrefix = trimmedInput.startsWith('@AI') || trimmedInput.startsWith('@ai');
    const shouldSendToAI = aiModeEnabled || hasAIPrefix;
    
    // 纯玩家消息
    if (!shouldSendToAI) {
      const playerMsg = {
        id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role: 'user' as const,
        content: trimmedInput,
        userName: me?.info?.name || 'Operator',
        createdAt: Date.now(),
      };
      syncPlayerMessage(playerMsg);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    
    // 移除 @AI 前缀（如果有）
    const aiQuery = hasAIPrefix ? trimmedInput.replace(/^@ai\s*/i, '') : trimmedInput;
    if (!aiQuery) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const playerList = [
      { id: me?.id, name: me?.info?.name },
      ...others.map(u => ({ id: u.id, name: u.info?.name }))
    ];

    const hasNotesChanged = notes !== lastSentNotes;
    
    const body: any = {
      players: playerList,
      mode: aiMode,
      provider: aiProvider,
      modelId: aiModelId,
      roomId: roomId,
      currentPlayerName: me?.info?.name || 'Unknown', // 传递当前玩家名
      enableThinking: thinkingEnabled, // 传递思考开关状态
    };
    
    if (hasNotesChanged) {
      body.notes = notes;
      setLastSentNotes(notes);
    }

    // 使用 v5 的 sendMessage API
    sendMessage({ text: aiQuery }, { body });
    
    if (inputRef.current) inputRef.current.value = '';
  };

  // Helper to extract text content from UIMessage
  const getUIMessageContent = (uiMessage: any): string => {
    if (typeof uiMessage.content === 'string') return uiMessage.content;
    if (!uiMessage.parts) return "";
    return uiMessage.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('\n\n'); // 用双换行连接多个文本块，保持 Markdown 格式
  };

  const getDisplayName = (m: any) => {
    if (m.role === 'user') return m.userName || me?.info?.name || "Operator";
    return "NEXUS AI";
  };

  // 获取用户头像
  const getUserAvatar = (m: any): string | null => {
    if (m.role !== 'user') return null;
    const userName = m.userName || me?.info?.name;
    // 查找匹配的用户
    if (userName === me?.info?.name) {
      return (me?.info as any)?.picture || (me?.info as any)?.avatar || null;
    }
    const other = others.find(o => o.info?.name === userName);
    return (other?.info as any)?.picture || (other?.info as any)?.avatar || null;
  };

  // 判断消息是否是自己发的
  const isMyOwnMessage = (m: any) => {
    if (m.role !== 'user') return false;
    // 本地消息没有 userName，或者 userName 匹配当前用户
    return !m.userName || m.userName === me?.info?.name;
  };

  // 合并本地消息和共享消息，去重
  // 使用 useMemo 避免每次输入都重新计算消息列表
  const displayMessages = useMemo(() => {
    const localIds = new Set(messages.map((m: any) => m.id));
    const sharedOnly = (sharedMessages || []).filter((m: any) => !localIds.has(m.id));
    
    if (sharedOnly.length === 0 && messages.length === 0) return [];
    if (sharedOnly.length === 0) return messages;
    if (messages.length === 0) {
      return sharedOnly.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
    }
    
    const now = Date.now();
    const allMessages = [
      ...messages.map((m: any, idx: number) => ({
        ...m,
        createdAt: m.createdAt || (now - (messages.length - idx) * 1000),
        _isLocal: true,
      })),
      ...sharedOnly.map((m: any) => ({ ...m, _isLocal: false })),
    ];
    
    return allMessages.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [messages, sharedMessages]);


  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] relative">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-2 border-b border-zinc-800 z-10 bg-[#0a0a0a]/90 backdrop-blur flex flex-col gap-2">
        <h2 className="text-xl font-bold text-center text-cyan-400 tracking-widest">COMMAND CENTER</h2>
        
        {/* Model & Mode - 单行紧凑布局 */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* 模型选择器 - 合并提供商和模型 */}
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:border-cyan-600 transition-colors flex items-center gap-2"
            >
              <span className="text-cyan-400 font-medium">{MODEL_CONFIG[aiProvider].label}</span>
              <span className="text-zinc-500">/</span>
              <span>{MODEL_CONFIG[aiProvider].models.find(m => m.id === aiModelId)?.name || aiModelId}</span>
              <span className="text-zinc-600 text-[10px]">▼</span>
            </button>
            {showModelDropdown && (
              <div className="absolute top-full mt-1 left-0 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20 min-w-[200px] overflow-hidden">
                {(Object.keys(MODEL_CONFIG) as AIProvider[]).map(provider => (
                  <div key={provider}>
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-zinc-500 bg-zinc-800/50 border-b border-zinc-800">
                      {MODEL_CONFIG[provider].label}
                    </div>
                    {MODEL_CONFIG[provider].models.map(model => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setAiProvider(provider);
                          setAiModelId(model.id);
                          setShowModelDropdown(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs hover:bg-zinc-800 transition-colors flex justify-between items-center",
                          aiProvider === provider && aiModelId === model.id ? "text-cyan-400 bg-cyan-950/30" : "text-zinc-300"
                        )}
                      >
                        <span>{model.name}</span>
                        <span className="text-[10px] text-zinc-500">{model.desc}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 思考开关 - 仅当模型支持时显示 */}
          {MODEL_CONFIG[aiProvider].models.find(m => m.id === aiModelId)?.thinking && (
            <>
              <div className="w-px h-5 bg-zinc-700" />
              <button
                onClick={() => setThinkingEnabled(!thinkingEnabled)}
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-medium transition-all border flex items-center gap-1",
                  thinkingEnabled 
                    ? "bg-purple-900/50 border-purple-600 text-purple-300" 
                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300"
                )}
                title={thinkingEnabled ? "思考模式开启" : "思考模式关闭"}
              >
                <Brain className="w-3 h-3" />
                <span>{thinkingEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </>
          )}

          {/* 分隔线 */}
          <div className="w-px h-5 bg-zinc-700" />

          {/* Mode Switcher - 带 tooltip */}
          <div className="flex gap-1">
            <div className="relative group">
              <button onClick={() => setAiMode('advisor')} className={cn("p-1.5 rounded transition-all", aiMode === 'advisor' ? "bg-cyan-900/50 text-cyan-400" : "text-zinc-500 hover:text-zinc-300")}>
                <Shield className="w-4 h-4" />
              </button>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 w-40 text-center">
                <div className="text-xs font-bold text-cyan-400 mb-1">Advisor</div>
                <div className="text-[10px] text-zinc-400">战术顾问，提供实时决策支持</div>
              </div>
            </div>
            <div className="relative group">
              <button onClick={() => setAiMode('interrogator')} className={cn("p-1.5 rounded transition-all", aiMode === 'interrogator' ? "bg-amber-900/50 text-amber-400" : "text-zinc-500 hover:text-zinc-300")}>
                <HelpCircle className="w-4 h-4" />
              </button>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 w-40 text-center">
                <div className="text-xs font-bold text-amber-400 mb-1">Interrogator</div>
                <div className="text-[10px] text-zinc-400">情报收集，主动提问获取信息</div>
              </div>
            </div>
            <div className="relative group">
              <button onClick={() => setAiMode('planner')} className={cn("p-1.5 rounded transition-all", aiMode === 'planner' ? "bg-emerald-900/50 text-emerald-400" : "text-zinc-500 hover:text-zinc-300")}>
                <ClipboardList className="w-4 h-4" />
              </button>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 w-40 text-center">
                <div className="text-xs font-bold text-emerald-400 mb-1">Planner</div>
                <div className="text-[10px] text-zinc-400">任务规划，创建结构化计划</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 pt-32 space-y-4 custom-scrollbar"
      >
        {displayMessages.map((m: any) => {
          if (m.role === 'system' || m.role === 'tool') return null;
          
          const isAI = m.role === 'assistant';
          const isMine = isMyOwnMessage(m);
          const content = getUIMessageContent(m);
          const avatar = getUserAvatar(m);
          const displayName = getDisplayName(m);

          // AI 消息居中显示
          if (isAI) {
            // 获取工具调用：优先从 parts，否则从同步的 toolCalls
            const toolCallsFromSync = m.toolCalls || [];
            
            return (
              <div key={m.id} className="flex flex-col items-center">
                {/* AI Header */}
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 opacity-70">
                    {displayName}
                  </span>
                </div>
                {/* AI Bubble */}
                <div className="relative max-w-[90%] p-4 rounded-xl text-sm border shadow-lg backdrop-blur-sm bg-black/40 border-cyan-500/30 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  {m.parts ? (
                    // 本地消息：按 parts 顺序渲染
                    <div className="space-y-2">
                      {(() => {
                        // 收集所有 reasoning 内容（可能分散在多个 part 中）
                        let accumulatedReasoning = '';
                        let reasoningState: 'streaming' | 'done' | undefined;
                        const renderedParts: React.ReactNode[] = [];
                        
                        m.parts.forEach((part: any, idx: number) => {
                          if (part.type === 'text' && part.text) {
                            renderedParts.push(
                              <div key={`text-${idx}`} className="markdown-content">
                                <MarkdownView content={part.text} variant="goc" />
                              </div>
                            );
                          } else if (part.type === 'reasoning') {
                            // SDK v5: reasoning part 有 text 字段和可选的 state 字段
                            const reasoningText = part.text || '';
                            if (reasoningText) {
                              accumulatedReasoning += reasoningText;
                            }
                            // 记录 reasoning 状态
                            if (part.state) {
                              reasoningState = part.state;
                            }
                          } else if (part.type?.startsWith('tool-')) {
                            renderedParts.push(
                              <div key={part.toolCallId || `tool-${idx}`} className="my-1">
                                <ToolCallInline part={part} />
                              </div>
                            );
                          }
                        });
                        
                        // 如果有 reasoning 内容，在最前面显示
                        if (accumulatedReasoning) {
                          const isReasoningStreaming = reasoningState === 'streaming' || status === 'streaming';
                          // 直接渲染，不用 unshift，避免 key 问题
                          renderedParts.unshift(
                            <ReasoningBlock 
                              key={`reasoning-${m.id}-${accumulatedReasoning.length}`} 
                              content={accumulatedReasoning} 
                              isStreaming={isReasoningStreaming}
                            />
                          );
                        }
                        
                        return renderedParts;
                      })()}
                    </div>
                  ) : (
                    // 共享消息：显示内容 + 工具调用摘要
                    <div className="space-y-2">
                      {content && (
                        <div className="markdown-content">
                          <MarkdownView content={content} variant="goc" />
                        </div>
                      )}
                      {/* 从同步数据渲染工具调用 */}
                      {toolCallsFromSync.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-zinc-700/50">
                          {toolCallsFromSync.map((tc: any, idx: number) => (
                            <ToolCallInline 
                              key={tc.toolCallId || `sync-tool-${idx}`} 
                              part={{ type: `tool-${tc.toolName}`, state: tc.state, toolCallId: tc.toolCallId }} 
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // 用户消息：微信风格，头像在气泡外面
          return (
            <div key={m.id} className={cn("flex gap-3", isMine ? "flex-row-reverse" : "flex-row")}>
              {/* Avatar */}
              <div className="flex-shrink-0 relative group">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" className="w-8 h-8 rounded-full border border-zinc-600" />
                ) : (
                  <div className="w-8 h-8 rounded-full border border-zinc-600 flex items-center justify-center text-sm font-bold text-zinc-400">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Tooltip with name */}
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {displayName}
                </span>
              </div>
              
              {/* Bubble */}
              <div className={cn(
                "relative max-w-[75%] p-3 rounded-xl text-sm border shadow-lg backdrop-blur-sm",
                isMine 
                  ? "bg-zinc-800/80 border-zinc-700 text-zinc-100 rounded-tr-none"
                  : "bg-zinc-900/80 border-zinc-600 text-zinc-200 rounded-tl-none"
              )}>
                {content && (
                  <div className="markdown-content">
                    <MarkdownView content={content} variant="goc" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-zinc-800 bg-[#0a0a0a]">
        <form onSubmit={onSubmit} className="flex gap-2 relative">
          <input 
            ref={inputRef}
            placeholder={aiModeEnabled ? "向 AI 发送指令..." : "群聊消息... (@AI 可触发 AI)"} 
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-3 pl-4 text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-zinc-600" 
            disabled={isLoading} 
          />
          {/* AI 模式切换按钮 */}
          <button 
            type="button"
            onClick={() => setAiModeEnabled(!aiModeEnabled)}
            className={cn(
              "px-3 py-2 rounded font-bold transition-all border text-xs",
              aiModeEnabled 
                ? "bg-cyan-900/80 border-cyan-600 text-cyan-100" 
                : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300"
            )}
            title={aiModeEnabled ? "AI 模式：所有消息发给 AI" : "聊天模式：普通群聊"}
          >
            <Bot className={cn("w-4 h-4", aiModeEnabled && "text-cyan-400")} />
          </button>
          <button type="submit" disabled={isLoading} className="bg-cyan-900 hover:bg-cyan-800 text-cyan-100 px-6 py-2 rounded font-bold transition-colors border border-cyan-700 disabled:opacity-50">
            {isLoading ? '...' : 'SEND'}
          </button>
        </form>
      </div>
    </div>
  );
}
