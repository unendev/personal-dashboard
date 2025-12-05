"use client";
import { useState, useEffect } from 'react'; // Added useEffect
import { Conversation } from '@prisma/client';
import { NewConversationButton } from '../components/learning/NewConversationButton';
import { DeleteConversationButton } from '../components/learning/DeleteConversationButton';
import { Menu } from 'lucide-react';
import Link from 'next/link'; // Keep Link for consistency, even if not directly modified

interface RussianLayoutClientProps {
  conversations: (Conversation)[];
  children: React.ReactNode;
}

export function RussianLayoutClient({ conversations, children }: RussianLayoutClientProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // State to track mount status

  useEffect(() => {
    setIsMounted(true); // Set to true once component has mounted on client
  }, []);

  return (
    <div className="relative flex h-screen bg-gray-50 dark:bg-gray-900 md:overflow-y-hidden">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        id="sidebar"
        aria-expanded={isSidebarOpen}
        className={`fixed inset-y-0 left-0 z-30 w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <NewConversationButton />
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          <ul>
            {conversations.map((convo) => (
              <li key={convo.id} className="flex items-center justify-between group">
                <Link 
                  href={`/russian/${convo.id}`} 
                  className="flex-grow block px-4 py-2 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
                  onClick={() => setSidebarOpen(false)}
                >
                  {convo.title}
                </Link>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                  <DeleteConversationButton conversationId={convo.id} conversationTitle={convo.title} />
                </div>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
           <ul className="flex justify-around">
             <li><Link href="/notes" onClick={() => setSidebarOpen(false)} className="text-blue-500 hover:underline">笔记</Link></li>
             <li><Link href="/review" onClick={() => setSidebarOpen(false)} className="text-blue-500 hover:underline">复习</Link></li>
           </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-controls="sidebar"
          >
            {isMounted ? <Menu className="h-6 w-6" /> : <div className="h-6 w-6"></div>}
          </button>
          <h1 className="text-lg font-semibold ml-2">学习</h1>
        </header>
        <div className="flex-grow overflow-y-auto p-4">
          {children}
        </div>
      </main>
    </div>
  );
}

