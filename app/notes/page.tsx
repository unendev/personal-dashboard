import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export default async function NotesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    // Redirect to login page if not authenticated
    redirect('/api/auth/signin');
  }

  const notes = await prisma.russianLearningNote.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">俄语学习笔记</h1>

      {notes.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          您还没有创建任何笔记。快去 <a href="/russian" className="text-blue-500 hover:underline">学习页面</a> 添加一些吧！
        </p>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
              {note.sourceText && (
                <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 mb-2 italic text-gray-600 dark:text-gray-400">
                  <p>"{note.sourceText}"</p>
                </blockquote>
              )}
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-right">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
