import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ArticleEditor } from '@/app/components/features/articles/ArticleEditor'

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const { id } = await params
  return <ArticleEditor articleId={id} />
}








