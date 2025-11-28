"use client";

import { useEffect, useRef } from 'react';
import { TextInteractionWrapper } from './TextInteractionWrapper';
import { useChat } from '@ai-sdk/react'; // Import useChat hook
import { saveChatMessage, updateConversationTitle } from '../../russian/actions'; // Import server actions

interface Message {
  id: string; // useChat messages have an id
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatClientProps {
  initialMessages: Message[];
  conversationId: string;
}

export function ChatClient({ initialMessages, conversationId }: ChatClientProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [initialMessages]); // initialMessages might change if conversationId changes

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages, // To update messages after initial load and for auto-titling
  } = useChat({
    api: '/api/ai/chat',
    initialMessages,
    id: conversationId, // Unique ID for this chat session
    body: {
      conversationId: conversationId, // Pass conversationId to backend for saving
    },
    onResponse: async (response) => {
      // Save user message after it's sent and before AI starts streaming
      // This is a bit tricky with useChat. The first message in `messages` is always the user's.
      // We need to ensure it's saved.
      const userMessage = messages[messages.length - 1]; // This is the message *before* the current user input
      if (userMessage.role === 'user') {
        console.log("[ChatClient] onResponse: Saving user message to DB:", userMessage.content);
        await saveChatMessage({ conversationId, role: 'user', content: userMessage.content });

        // Auto-titling: if this is the first user message in a new conversation
        if (initialMessages.length === 0 && messages.length === 1) { // Only assistant's initial message
            console.log("[ChatClient] onResponse: First user message sent, updating conversation title.");
            // Take the first 20 chars of the user's first message as title
            const title = userMessage.content.substring(0, 20) + (userMessage.content.length > 20 ? '...' : '');
            await updateConversationTitle(conversationId, title);
        }
      }
    },
    onFinish: async (message) => {
      // Save AI's final message after streaming is complete
      console.log("[ChatClient] onFinish: Saving AI message to DB:", message.content);
      await saveChatMessage({ conversationId, role: 'assistant', content: message.content });
    },
    onError: (err) => {
      console.error('[ChatClient] useChat error:', err);
      // Display a user-friendly error message if needed
    },
  });

  // Keep auto-scrolling to the latest message, now listening to useChat's messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);


  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-bold mb-4 text-center">AI俄语对话</h1>
      
      {/* Chat Messages Area */}
      <div ref={chatContainerRef} className="flex-grow bg-white dark:bg-gray-800 shadow-inner rounded-lg p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          // We filter out system messages from rendering
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
            placeholder="Спроси меня что-нибудь на русском..."
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
