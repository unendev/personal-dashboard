import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/reddit
 * 获取Reddit帖子列表
 * 
 * 查询参数:
 * - subreddit: 过滤特定板块
 * - limit: 返回数量 (默认10)
 * - offset: 偏移量 (默认0)
 * - type: 过滤帖子类型
 * - value: 过滤价值评估 (高/中/低)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const subreddit = searchParams.get('subreddit');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');
    const value = searchParams.get('value');

    // 构建查询条件
    const where: {
      subreddit?: string;
      post_type?: string;
      value_assessment?: string;
    } = {};
    
    if (subreddit) {
      where.subreddit = subreddit;
    }
    
    if (type) {
      where.post_type = type;
    }
    
    if (value) {
      where.value_assessment = value;
    }

    // 查询数据
    const [posts, total] = await Promise.all([
      prisma.reddit_posts.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          title_cn: true,
          url: true,
          core_issue: true,
          key_info: true,
          post_type: true,
          value_assessment: true,
          subreddit: true,
          score: true,
          num_comments: true,
          timestamp: true
        }
      }),
      prisma.reddit_posts.count({ where })
    ]);

    // 统计各板块数量
    const subredditStats = await prisma.reddit_posts.groupBy({
      by: ['subreddit'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      stats: {
        subreddits: subredditStats.map(s => ({
          name: s.subreddit,
          count: s._count.id
        }))
      }
    });
  } catch (error) {
    console.error('Reddit API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取Reddit数据失败'
      },
      { status: 500 }
    );
  }
}
