import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../../lib/auth-utils';
import { generateSignedUrl, extractOssKey } from '../../../lib/oss-utils';
import { prisma } from '@/lib/prisma';
import { createTreasureSchema } from '@/lib/validations/treasure';
import { ZodError } from 'zod';

// GET /api/treasures - 获取用户的所有宝藏（按时间倒序）
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');
    const type = searchParams.get('type');

    const where: { userId: string; tags?: { has: string }; type?: 'TEXT' | 'IMAGE' | 'MUSIC' } = { userId };
    
    // 标签筛选
    if (tag) {
      where.tags = {
        has: tag
      };
    }
    
    // 类型筛选
    if (type && ['TEXT', 'IMAGE', 'MUSIC'].includes(type)) {
      where.type = type as 'TEXT' | 'IMAGE' | 'MUSIC';
    }

    const treasures = await prisma.treasure.findMany({
      where,
      include: {
        images: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

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
      theme,
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
        theme,
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
      data: validated as any, // Zod验证后的数据
      include: {
        images: true
      }
    });

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

    return NextResponse.json({ message: 'Treasure deleted successfully' });
  } catch (error) {
    console.error('Error deleting treasure:', error);
    return NextResponse.json({ error: 'Failed to delete treasure' }, { status: 500 });
  }
}
