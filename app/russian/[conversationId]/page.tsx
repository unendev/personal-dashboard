import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getConversationMessages } from '../actions';
import { ChatClient } from '../../components/learning/ChatClient';

interface RussianChatPageProps {
  params: {
    conversationId: string;
  };
}

export default async function RussianChatPage({ params }: RussianChatPageProps) {
  console.log(`[Page: /russian/[id]] - Rendering for conversationId: ${params.conversationId}`);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.log("[Page: /russian/[id]] - No session found, redirecting to signin.");
    redirect('/api/auth/signin');
  }

  const { conversationId } = params;
  const initialMessages = await getConversationMessages(conversationId);
  console.log(`[Page: /russian/[id]] - Fetched ${initialMessages.length} initial messages.`);
  
  return (
    <div className="flex-grow flex flex-col p-4">
        {/* Render the client component */}
        <ChatClient initialMessages={initialMessages} conversationId={conversationId} />
    </div>
  );
}

