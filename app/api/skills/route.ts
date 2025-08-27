import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// MVP版本：硬编码用户ID
const MOCK_USER_ID = 'user-1'

export async function GET() {
  try {
    const skills = await prisma.skill.findMany({
      where: { userId: MOCK_USER_ID },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(skills)
  } catch (error) {
    console.error('获取技能列表失败:', error)
    return NextResponse.json(
      { error: '获取技能列表失败' },
      { status: 500 }
    )
  }
}