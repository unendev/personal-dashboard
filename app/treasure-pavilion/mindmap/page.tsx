import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function MindMapPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">思维导图功能开发中...</h1>
      <p className="mt-4 text-gray-600">此功能正在开发中，敬请期待。</p>
    </div>
  )
}
