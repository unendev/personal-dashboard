import Link from 'next/link';
import { getConversationList } from './actions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GuestChatClient } from '../components/learning/GuestChatClient';
import { NewConversationButton } from '../components/learning/NewConversationButton';
import { DeleteConversationButton } from '../components/learning/DeleteConversationButton';

export default async function RussianLearningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    // Guest user experience
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <header className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h1 className="text-xl font-bold">俄语学习</h1>
            <Link href="/api/auth/signin" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
              登录以保存进度
            </Link>
        </header>
        <main className="flex-grow flex flex-col p-4">
          <GuestChatClient />
        </main>
      </div>
    );
  }

  // Logged-in user experience
  console.log("Layout: Rendering for logged-in user:", session.user.id);
  const conversations = await getConversationList();
  console.log(`Layout: Found ${conversations.length} conversations.`);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <NewConversationButton />
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          <ul>
            {conversations.map((convo) => (
              <li key={convo.id} className="flex items-center justify-between group">
                <Link href={`/russian/${convo.id}`} className="flex-grow block px-4 py-2 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 truncate">
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
           {/* Optional: Footer links for notes/review */}
           <ul className="flex justify-around">
             <li><Link href="/notes" className="text-blue-500 hover:underline">笔记</Link></li>
             <li><Link href="/review" className="text-blue-500 hover:underline">复习</Link></li>
           </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}

