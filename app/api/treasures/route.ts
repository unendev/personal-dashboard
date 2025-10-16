import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../../lib/auth-utils';
import { generateSignedUrl, extractOssKey } from '../../../lib/oss-utils';
import { prisma } from '@/lib/prisma';
import { createTreasureSchema } from '@/lib/validations/treasure';
import { ZodError } from 'zod';
import { findMatchingTags, invalidateUserTagCache } from '@/lib/tag-cache';
import type { Prisma } from '@prisma/client';

// GET /api/treasures - 获取用户的所有宝藏（按时间倒序，支持分页）
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const statsOnly = searchParams.get('stats') === 'true'; // 只返回统计数据

    const where: Prisma.TreasureWhereInput = { userId };
    
    // 标签筛选 - 支持父标签聚合检索（使用缓存优化）
    if (tag) {
      // 使用缓存查找匹配的标签
      const matchingTags = await findMatchingTags(tag, userId);
      
      // 如果有匹配的标签，使用 hasSome；否则使用 has（避免返回空结果）
      if (matchingTags.length > 0) {
        where.tags = {
          hasSome: matchingTags
        };
      } else {
        where.tags = {
          has: tag
        };
      }
    }
    
    // 类型筛选
    if (type && ['TEXT', 'IMAGE', 'MUSIC'].includes(type)) {
      where.type = type as Prisma.EnumTreasureTypeFilter;
    }

    // 搜索功能 - 标题和内容都搜索
    if (search) {
      where.OR = [
        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { content: { contains: search, mode: Prisma.QueryMode.insensitive } }
      ];
    }

    // 如果只需要统计数据，返回所有宝藏的创建日期和标签
    if (statsOnly) {
      const statsData = await prisma.treasure.findMany({
        where: { userId }, // 统计数据不受筛选影响
        select: {
          id: true,
          createdAt: true,
          tags: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return NextResponse.json(statsData);
    }

    // 计算分页
    const skip = (page - 1) * limit;

    let treasures = await prisma.treasure.findMany({
      where,
      include: {
        images: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            likes: true,
            answers: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    // 如果有搜索关键词，对结果进行二次排序：标题匹配的排在前面
    if (search && treasures.length > 0) {
      const searchLower = search.toLowerCase();
      treasures = treasures.sort((a, b) => {
        const aTitleMatch = a.title.toLowerCase().includes(searchLower);
        const bTitleMatch = b.title.toLowerCase().includes(searchLower);
        
        // 标题匹配的优先
        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;
        
        // 都匹配或都不匹配，按创建时间排序
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // 为每张图片生成签名 URL
    const treasuresWithSignedUrls = treasures.map(treasure => ({
      ...treasure,
      images: treasure.images.map(image => {
        // 提取 OSS key（去掉完整URL部分）
        const ossKey = extractOssKey(image.url)
        // 生成签名 URL（1小时有效期）
        const signedUrl = generateSignedUrl(ossKey, 3600)
        
        return {
          ...image,
          url: signedUrl
        }
      })
    }));

    return NextResponse.json(treasuresWithSignedUrls);
  } catch (error) {
    console.error('Error fetching treasures:', error);
    return NextResponse.json({ error: 'Failed to fetch treasures' }, { status: 500 });
  }
}

// POST /api/treasures - 创建新宝藏
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    
    // 验证输入数据
    const validated = createTreasureSchema.parse(body);
    
    const { 
      title, 
      content, 
      type, 
      tags, 
      musicTitle, 
      musicArtist, 
      musicAlbum, 
      musicUrl,
      musicCoverUrl,
      images
    } = validated;

    // 创建宝藏
    const treasure = await prisma.treasure.create({
      data: {
        userId,
        title,
        content,
        type,
        tags,
        musicTitle,
        musicArtist,
        musicAlbum,
        musicUrl,
        musicCoverUrl,
        images: {
          create: images.map((img: { url: string; alt?: string; width?: number; height?: number; size?: number }) => ({
            url: img.url,
            alt: img.alt,
            width: img.width,
            height: img.height,
            size: img.size
          }))
        }
      },
      include: {
        images: true
      }
    });

    // 使缓存失效
    invalidateUserTagCache(userId);

    return NextResponse.json(treasure, { status: 201 });
  } catch (error) {
    // Zod 验证错误
    if (error instanceof ZodError) {
      return NextResponse.json({ 
        error: '数据验证失败', 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error('Error creating treasure:', error);
    return NextResponse.json({ error: 'Failed to create treasure' }, { status: 500 });
  }
}

// PUT /api/treasures - 更新宝藏
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    
    // 验证更新数据（使用 partial schema）
    const validated = createTreasureSchema.partial().parse(updateData);

    // 验证宝藏属于当前用户
    const existingTreasure = await prisma.treasure.findFirst({
      where: { id, userId }
    });

    if (!existingTreasure) {
      return NextResponse.json({ error: 'Treasure not found' }, { status: 404 });
    }

    const treasure = await prisma.treasure.update({
      where: { id },
      data: validated as Parameters<typeof prisma.treasure.update>[0]['data'], // Zod验证后的数据
      include: {
        images: true
      }
    });

    // 如果更新了标签，使缓存失效
    if (validated.tags) {
      invalidateUserTagCache(userId);
    }

    return NextResponse.json(treasure);
  } catch (error) {
    // Zod 验证错误
    if (error instanceof ZodError) {
      return NextResponse.json({ 
        error: '数据验证失败', 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error('Error updating treasure:', error);
    return NextResponse.json({ error: 'Failed to update treasure' }, { status: 500 });
  }
}

// DELETE /api/treasures - 删除宝藏
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const userId = await getUserId(request);

    // 验证宝藏属于当前用户
    const existingTreasure = await prisma.treasure.findFirst({
      where: { id, userId }
    });

    if (!existingTreasure) {
      return NextResponse.json({ error: 'Treasure not found' }, { status: 404 });
    }

    await prisma.treasure.delete({
      where: { id }
    });

    // 使缓存失效
    invalidateUserTagCache(userId);

    return NextResponse.json({ message: 'Treasure deleted successfully' });
  } catch (error) {
    console.error('Error deleting treasure:', error);
    return NextResponse.json({ error: 'Failed to delete treasure' }, { status: 500 });
  }
}
