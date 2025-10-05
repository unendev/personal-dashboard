import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { articleUpdateSchema } from '@/lib/validations/article'
import { z } from 'zod'

// GET /api/articles/[id] - 获取单个文章
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const article = await prisma.article.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        treasureRefs: {
          include: {
            treasure: {
              select: {
                id: true,
                title: true,
                content: true,
                type: true,
                tags: true,
                createdAt: true
              }
            }
          }
        }
      }
    })

    if (!article) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }

    return NextResponse.json(article)
  } catch (error) {
    console.error('获取文章失败:', error)
    return NextResponse.json(
      { error: '获取文章失败' },
      { status: 500 }
    )
  }
}

// PUT /api/articles/[id] - 更新文章
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 检查文章是否存在且属于当前用户
    const existing = await prisma.article.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }

    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: '无权限修改此文章' }, { status: 403 })
    }

    const body = await request.json()
    const validated = articleUpdateSchema.parse({ ...body, id: params.id })

    // 如果修改了 slug，检查是否冲突
    if (validated.slug && validated.slug !== existing.slug) {
      const slugExists = await prisma.article.findUnique({
        where: { slug: validated.slug }
      })
      if (slugExists) {
        return NextResponse.json(
          { error: 'URL标识已存在' },
          { status: 400 }
        )
      }
    }

    // 重新计算字数和阅读时间
    let updateData: any = { ...validated }
    delete updateData.id

    if (validated.content) {
      updateData.wordCount = validated.content.length
      updateData.readingTime = Math.ceil(validated.content.length / 400)
      updateData.toc = generateTOC(validated.content)
    }

    // 如果状态变为 PUBLISHED 且之前未发布，设置发布时间
    if (validated.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      updateData.publishedAt = new Date()
    }

    const article = await prisma.article.update({
      where: { id: params.id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json(article)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      )
    }
    console.error('更新文章失败:', error)
    return NextResponse.json(
      { error: '更新文章失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/articles/[id] - 删除文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 检查文章是否存在且属于当前用户
    const existing = await prisma.article.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }

    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: '无权限删除此文章' }, { status: 403 })
    }

    await prisma.article.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除文章失败:', error)
    return NextResponse.json(
      { error: '删除文章失败' },
      { status: 500 }
    )
  }
}

// 生成目录
function generateTOC(content: string) {
  const headings = content.match(/^#{1,6}\s+.+$/gm) || []
  
  return headings.map((heading, index) => {
    const level = (heading.match(/^#+/) || [''])[0].length
    const text = heading.replace(/^#+\s+/, '')
    const id = slugify(text)
    
    return {
      id,
      level,
      text,
      index
    }
  })
}

// 生成 URL slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}
