"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { TextInteractionWrapper } from './TextInteractionWrapper';
import { saveChatMessage, updateConversationTitle } from '../../russian/actions';
import { useChat } from '@ai-sdk/react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatClientProps {
  initialMessages: Message[];
  conversationId: string;
}

export function ChatClient({ initialMessages, conversationId }: ChatClientProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [localInput, setLocalInput] = useState('');

  const onFinishCallback = useCallback(async (data: { message: Message }) => {
    const message = data.message; // Extract the message object

    // Add a check to ensure message and message.content exist
    if (message?.content) {
        // Save the final AI message to the database
        if (message.role === 'assistant') {
          await saveChatMessage({ conversationId, role: 'assistant', content: message.content });
        }
    }
  }, [conversationId]); // Dependency on conversationId

  const onErrorCallback = useCallback((error: Error) => {
    console.error('ChatClient: useChat onError triggered. Full error object:', error);
  }, []); // No dependencies for this simple log

  const useChatBody = useMemo(() => ({ conversationId: conversationId }), [conversationId]); // Memoize body object

  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    api: '/api/aichat',
    initialMessages: initialMessages,
    body: useChatBody,
    onFinish: onFinishCallback,
    onError: onErrorCallback,
  });
  const isLoading = status === 'in_progress';

  // Auto-scroll to the latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, chatContainerRef]);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput?.trim()) {
      return;
    }

    // Save user message to database first
    await saveChatMessage({ conversationId, role: 'user', content: localInput });

    // Auto-titling: if this is the first user message in a new conversation
    if (initialMessages.length === 0 && messages.filter(m => m.role !== 'system').length === 0) { // filter out system messages
      const title = localInput.substring(0, 20) + (localInput.length > 20 ? '...' : '');
      await updateConversationTitle(conversationId, title);
    }
    
    // Then let useChat handle the rest (sending to API, streaming assistant response)
    sendMessage({ content: localInput, role: 'user' }); // Use sendMessage with the current input
  };

  return (
    <div className="flex flex-col h-full">

      {/* Chat Messages Area */}
      <div ref={chatContainerRef} className="flex-grow bg-white dark:bg-gray-800 shadow-inner rounded-lg p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          // We filter out system messages from rendering
          msg.role !== 'system' && (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg shadow ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>
                <TextInteractionWrapper>
                  <p className="text-lg whitespace-pre-wrap">{msg.content}</p>
                </TextInteractionWrapper>
              </div>
            </div>
          )
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg shadow bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <p className="text-lg animate-pulse">正在生成回复...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="mt-4">
        <form onSubmit={handleUserSubmit} className="flex space-x-2">
          <input
            type="text"
            value={localInput}
            onChange={(e) => {
              setLocalInput(e.target.value);
            }}
            className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Спроси меня что-нибудь на русском..."
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={!localInput?.trim() || isLoading}
          >
            {isLoading ? '发送中...' : '发送'}
          </button>
        </form>
      </div>
    </div>
  );
}

