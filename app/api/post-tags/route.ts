import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth-utils';

/**
 * GET /api/post-tags?source=linuxdo&postId=xxx
 * 获取特定帖子的标签，或获取用户的所有标签
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const source = request.nextUrl.searchParams.get('source');
    const postId = request.nextUrl.searchParams.get('postId');
    
    if (postId && source) {
      // 获取特定帖子的标签
      const postTag = await prisma.postTag.findUnique({
        where: {
          userId_source_postId: {
            userId,
            source,
            postId
          }
        }
      });
      
      return NextResponse.json(postTag || { tags: [], category: null });
    }
    
    // 获取用户的所有标签（可选择按source过滤）
    const postTags = await prisma.postTag.findMany({
      where: {
        userId,
        source: source || undefined
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    return NextResponse.json(postTags);
  } catch (error) {
    console.error('Failed to get post tags:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/post-tags
 * 创建或更新帖子标签
 * Body: { source: string, postId: string, tags: string[], category?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const { source, postId, tags, category } = await request.json();
    
    if (!source || !postId) {
      return NextResponse.json({ error: 'Missing source or postId' }, { status: 400 });
    }
    
    if (!Array.isArray(tags)) {
      return NextResponse.json({ error: 'Tags must be an array' }, { status: 400 });
    }
    
    // 如果tags为空且category为空，则删除记录
    if (tags.length === 0 && !category) {
      await prisma.postTag.deleteMany({
        where: {
          userId,
          source,
          postId
        }
      });
      return NextResponse.json({ success: true, deleted: true });
    }
    
    // 创建或更新标签
    const postTag = await prisma.postTag.upsert({
      where: {
        userId_source_postId: {
          userId,
          source,
          postId
        }
      },
      update: {
        tags,
        category: category || null
      },
      create: {
        userId,
        source,
        postId,
        tags,
        category: category || null
      }
    });
    
    return NextResponse.json(postTag);
  } catch (error) {
    console.error('Failed to create/update post tag:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/post-tags?source=linuxdo&postId=xxx
 * 删除帖子标签
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const source = request.nextUrl.searchParams.get('source');
    const postId = request.nextUrl.searchParams.get('postId');
    
    if (!source || !postId) {
      return NextResponse.json({ error: 'Missing source or postId' }, { status: 400 });
    }
    
    await prisma.postTag.deleteMany({
      where: {
        userId,
        source,
        postId
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete post tag:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


