"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useStorage, useMutation, useSelf, useOthers, useRoom } from "@liveblocks/react/suspense";
import { LiveList } from "@liveblocks/client";
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { SharedMessage, AIMode, AIProvider } from "./types";

export function useGocChat() {
  const room = useRoom();
  const roomId = room.id;
  const notes = useStorage((root) => root.notes);
  const sharedMessages = useStorage((root) => root.messages) as SharedMessage[] | null;
  const me = useSelf();
  const others = useOthers();

  // --- Local State ---
  const [aiMode, setAiMode] = useState<AIMode>('encyclopedia');
  const [aiModeEnabled, setAiModeEnabled] = useState(true);
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const [lastSentNotes, setLastSentNotes] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Local Message Timestamps mapping for stability
  const localMessageTimes = useRef<Map<string, number>>(new Map());

  // --- Persistence ---
  const [aiProvider, setAiProvider] = useState<AIProvider>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('goc_ai_provider') as AIProvider) || 'deepseek';
    }
    return 'deepseek';
  });

  const [aiModelId, setAiModelId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('goc_ai_model_id') || 'deepseek-chat';
    }
    return 'deepseek-chat';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('goc_ai_provider', aiProvider);
      localStorage.setItem('goc_ai_model_id', aiModelId);
    }
  }, [aiProvider, aiModelId]);

  // --- Liveblocks Sync Logic ---
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
        (messages as any).set(existingIndex, message);
      }
    },
    []
  );
  
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

  // --- AI SDK Setup ---
  const chatTransport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat/goc',
  }), []);
  
  const { messages, sendMessage, status } = useChat({
    id: roomId,
    transport: chatTransport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // --- Streaming Sync Effect ---
  const lastSyncTime = useRef<number>(0);
  const lastSyncedLength = useRef<Map<string, number>>(new Map());
  const syncedMessageIds = useRef<Set<string>>(new Set());
  const SYNC_INTERVAL = 500;
  
  // Helper to extract text content
  const getUIMessageContent = (uiMessage: any): string => {
    if (typeof uiMessage.content === 'string') return uiMessage.content;
    if (!uiMessage.parts) return "";
    return uiMessage.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('\n\n');
  };

  useEffect(() => {
    if (messages.length === 0) return;
    
    const now = Date.now();
    const isStreaming = status === 'streaming';
    
    if (isStreaming && now - lastSyncTime.current < SYNC_INTERVAL) {
      return;
    }
    
    messages.forEach((msg: any) => {
      const content = getUIMessageContent(msg);
      const contentLength = content?.length || 0;
      const lastLength = lastSyncedLength.current.get(msg.id) || 0;
      
      if (!content || contentLength === 0) return;
      
      const shouldSync = isStreaming 
        ? contentLength > lastLength + 50 
        : !syncedMessageIds.current.has(msg.id) || contentLength > lastLength;
      
      if (shouldSync) {
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
          createdAt: msg.createdAt instanceof Date ? msg.createdAt.getTime() : (msg.createdAt || Date.now()),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        });
        
        lastSyncedLength.current.set(msg.id, contentLength);
        if (!isStreaming) {
          syncedMessageIds.current.add(msg.id);
        }
      }
    });
    
    lastSyncTime.current = now;
  }, [messages, status, me?.info?.name, syncMessageToLiveblocks]);

  // --- Display Messages Logic ---
  const displayMessages = useMemo(() => {
    const localIds = new Set(messages.map((m: any) => m.id));
    const sharedOnly = (sharedMessages || []).filter((m: any) => !localIds.has(m.id));
    
    const now = Date.now();
    const allMessages = [
      ...messages.map((m: any, idx: number) => {
        if (!localMessageTimes.current.has(m.id)) {
          localMessageTimes.current.set(m.id, m.createdAt instanceof Date ? m.createdAt.getTime() : (m.createdAt || (now - (messages.length - idx) * 10)));
        }
        return {
          ...m,
          createdAt: localMessageTimes.current.get(m.id),
          _isLocal: true,
        };
      }),
      ...sharedOnly.map((m: any) => ({
        ...m, 
        createdAt: typeof m.createdAt === 'number' ? m.createdAt : (m.createdAt instanceof Date ? m.createdAt.getTime() : now),
        _isLocal: false 
      })),
    ];
    
    return allMessages.sort((a: any, b: any) => {
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      if (aTime !== bTime) return aTime - bTime;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [messages, sharedMessages]);

  // --- Send Message Handler ---
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const inputValue = inputRef.current?.value || '';
    if (!inputValue.trim() || isLoading) return;

    const trimmedInput = inputValue.trim();
    const hasAIPrefix = trimmedInput.startsWith('@AI') || trimmedInput.startsWith('@ai');
    const shouldSendToAI = aiModeEnabled || hasAIPrefix;
    
    if (!shouldSendToAI) {
      const playerMsg: SharedMessage = {
        id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role: 'user',
        content: trimmedInput,
        userName: me?.info?.name || 'Operator',
        createdAt: Date.now(),
      };
      syncPlayerMessage(playerMsg);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    
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
      currentPlayerName: me?.info?.name || 'Unknown',
      enableThinking: thinkingEnabled,
    };
    
    if (hasNotesChanged) {
      body.notes = notes;
      setLastSentNotes(notes as string);
    }

    sendMessage({ text: aiQuery }, { body });
    
    if (inputRef.current) inputRef.current.value = '';
  };

  return {
    // State
    displayMessages,
    status,
    isLoading,
    inputRef,
    me,
    others,
    
    // Config State
    aiMode, setAiMode,
    aiProvider, setAiProvider,
    aiModelId, setAiModelId,
    aiModeEnabled, setAiModeEnabled,
    thinkingEnabled, setThinkingEnabled,
    
    // Actions
    handleSendMessage,
    getUIMessageContent,
  };
}
