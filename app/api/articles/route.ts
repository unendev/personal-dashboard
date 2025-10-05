import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { articleSchema } from '@/lib/validations/article'
import { z } from 'zod'

// GET /api/articles - 获取文章列表
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')

    const where: any = {
      authorId: user.id
    }

    if (status && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      where.status = status
    }

    if (tag) {
      where.tags = {
        has: tag
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { abstract: { contains: search, mode: 'insensitive' } }
      ]
    }

    const articles = await prisma.article.findMany({
      where,
      orderBy: [
        { updatedAt: 'desc' }
      ],
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        _count: {
          select: {
            treasureRefs: true
          }
        }
      }
    })

    return NextResponse.json(articles)
  } catch (error) {
    console.error('获取文章列表失败:', error)
    return NextResponse.json(
      { error: '获取文章列表失败' },
      { status: 500 }
    )
  }
}

// POST /api/articles - 创建新文章
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const validated = articleSchema.parse(body)

    // 计算字数和阅读时间
    const wordCount = validated.content.length
    const readingTime = Math.ceil(wordCount / 400) // 假设每分钟阅读400字

    // 生成目录
    const toc = generateTOC(validated.content)

    // 检查 slug 是否已存在
    const existing = await prisma.article.findUnique({
      where: { slug: validated.slug }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'URL标识已存在' },
        { status: 400 }
      )
    }

    const article = await prisma.article.create({
      data: {
        ...validated,
        authorId: user.id,
        wordCount,
        readingTime,
        toc,
        publishedAt: validated.status === 'PUBLISHED' ? new Date() : null
      },
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
    console.error('创建文章失败:', error)
    return NextResponse.json(
      { error: '创建文章失败' },
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
