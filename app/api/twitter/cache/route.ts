import { NextRequest, NextResponse } from 'next/server';
import { TwitterCacheService } from '@/app/lib/twitter-cache';

// 获取缓存统计信息
export async function GET(_request: NextRequest) {
  try {
    const stats = await TwitterCacheService.getCacheStats();
    
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 清理过期缓存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'clean') {
      await TwitterCacheService.cleanExpiredCache();
      
      const stats = await TwitterCacheService.getCacheStats();
      
      return NextResponse.json({
        success: true,
        message: 'Expired cache cleaned successfully',
        stats
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "clean" to clean expired cache.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error cleaning cache:', error);
    return NextResponse.json(
      { error: 'Failed to clean cache', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
