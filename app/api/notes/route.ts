import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/notes - 获取当前用户的笔记
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('📖 [GET /api/notes] Session:', session)
    
    if (!session?.user?.email) {
      console.error('❌ [GET /api/notes] 未授权：session或user不存在')
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const userEmail = session.user.email
    console.log('👤 [GET /api/notes] 用户邮箱:', userEmail)

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      console.error('❌ [GET /api/notes] 用户不存在:', userEmail)
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
      console.log('✅ [GET /api/notes] 创建空笔记:', note.id)
    } else {
      console.log('✅ [GET /api/notes] 找到笔记:', note.id, '内容长度:', note.content?.length || 0)
    }

    return NextResponse.json(note)
  } catch (error) {
    console.error('❌ [GET /api/notes] 获取笔记失败:', error)
    console.error('❌ [GET /api/notes] 错误堆栈:', error instanceof Error ? error.stack : 'Unknown')
    return NextResponse.json(
      { error: '获取笔记失败', details: error instanceof Error ? error.message : 'Unknown error' },
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
    
    console.log('📝 [POST /api/notes] Session:', session)
    
    if (!session?.user?.email) {
      console.error('❌ [POST /api/notes] 未授权：session或user不存在')
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const userEmail = session.user.email
    console.log('👤 [POST /api/notes] 用户邮箱:', userEmail)

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      console.error('❌ [POST /api/notes] 用户不存在:', userEmail)
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const { content } = await request.json()
    console.log('📄 [POST /api/notes] 内容长度:', content?.length || 0)

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
      console.log('✅ [POST /api/notes] 更新成功:', note.id)
    } else {
      // 创建新笔记
      note = await prisma.note.create({
        data: {
          userId: user.id,
          content,
        },
      })
      console.log('✅ [POST /api/notes] 创建成功:', note.id)
    }

    return NextResponse.json(note)
  } catch (error) {
    console.error('❌ [POST /api/notes] 保存笔记失败:', error)
    console.error('❌ [POST /api/notes] 错误堆栈:', error instanceof Error ? error.stack : 'Unknown')
    return NextResponse.json(
      { error: '保存笔记失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

