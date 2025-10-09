import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ArticleWorkspace } from '@/app/components/features/articles/ArticleWorkspace'

export default async function ArticlesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="h-screen overflow-hidden">
      <ArticleWorkspace />
    </div>
  )
}
