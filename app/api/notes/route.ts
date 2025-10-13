import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/notes - 获取当前用户的笔记
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 查询用户的笔记（每个用户只有一条笔记记录）
    let note = await prisma.note.findFirst({
      where: { userId: user.id },
    })

    // 如果没有笔记，创建一个空笔记
    if (!note) {
      note = await prisma.note.create({
        data: {
          userId: user.id,
          content: '',
        },
      })
    }

    return NextResponse.json(note)
  } catch (error) {
    console.error('获取笔记失败:', error)
    return NextResponse.json(
      { error: '获取笔记失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notes - 创建或更新笔记
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const { content } = await request.json()

    // 查找现有笔记
    const existingNote = await prisma.note.findFirst({
      where: { userId: user.id },
    })

    let note
    if (existingNote) {
      // 更新现有笔记
      note = await prisma.note.update({
        where: { id: existingNote.id },
        data: { content },
      })
    } else {
      // 创建新笔记
      note = await prisma.note.create({
        data: {
          userId: user.id,
          content,
        },
      })
    }

    return NextResponse.json(note)
  } catch (error) {
    console.error('保存笔记失败:', error)
    return NextResponse.json(
      { error: '保存笔记失败' },
      { status: 500 }
    )
  }
}

