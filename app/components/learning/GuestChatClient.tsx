"use client";

import { useEffect, useRef } from 'react';
import { TextInteractionWrapper } from './TextInteractionWrapper';
import { useChat } from '@ai-sdk/react'; // Import useChat hook

// Define message type
interface Message {
  id: string; // useChat messages have an id
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const initialMessage: Message = {
  id: 'guest-welcome',
  role: 'assistant',
  content: `Привет! Я твой ИИ-помощник для изучения русского языка. Спроси меня что-нибудь! 

(注意：访客模式下聊天记录不保存，刷新页面会丢失。)`,
};

export function GuestChatClient() {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: '/api/ai/chat',
    initialMessages: [initialMessage],
    id: 'guest-chat', // Unique ID for this chat session
    // In guest mode, no server actions for saving are called
    onError: (err) => {
      console.error('[GuestChatClient] useChat error:', err);
      // Display a user-friendly error message if needed
    },
  });

  // Keep auto-scrolling to the latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-bold mb-4 text-center">AI俄语对话 (访客模式)</h1>
      
      {/* Chat Messages Area */}
      <div ref={chatContainerRef} className="flex-grow bg-white dark:bg-gray-800 shadow-inner rounded-lg p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          msg.role !== 'system' && (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
        {error && (
          <div className="flex justify-start">
            <div className="max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg shadow bg-red-100 text-red-700">
              <p className="text-lg">聊天出错: {error.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="mt-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="问我一些俄语问题..."
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? '发送中...' : '发送'}
          </button>
        </form>
      </div>
    </div>
  );
}
