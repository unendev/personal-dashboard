import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TreasureMindMap } from '@/app/components/features/mindmap/TreasureMindMap'
import { TreasurePavilionNav } from '@/app/components/features/treasure/TreasurePavilionNav'
import { prisma } from '@/lib/prisma'

export default async function MindMapPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    redirect('/auth/signin')
  }

  // 获取所有宝藏
  const treasures = await prisma.treasure.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      title: true,
      content: true,
      type: true,
      tags: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div>
      <TreasurePavilionNav />
      <TreasureMindMap treasures={treasures} />
    </div>
  )
}
