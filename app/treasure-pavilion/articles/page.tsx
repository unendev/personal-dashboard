import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ArticleList } from '@/app/components/features/articles/ArticleList'
import { TreasurePavilionNav } from '@/app/components/features/treasure/TreasurePavilionNav'

export default async function ArticlesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <TreasurePavilionNav />
      <div className="container mx-auto px-4 py-8">
        <ArticleList />
      </div>
    </div>
  )
}
