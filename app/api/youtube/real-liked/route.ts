import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// YouTube 喜欢视频类型定义
interface YouTubeLikedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  url: string;
  likedAt?: string;
}

interface YouTubeVideoApiResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        medium: { url: string };
        high: { url: string };
      };
      channelTitle: string;
      publishedAt: string;
    };
    contentDetails: {
      duration: string;
    };
    statistics: {
      viewCount: string;
    };
  }>;
}

// 带超时的 fetch 包装器
async function fetchWithTimeout(url: string, timeoutMs: number = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Authorization': `Bearer ${process.env.YOUTUBE_ACCESS_TOKEN}` // 这里需要从用户会话中获取
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 获取用户真实的喜欢视频
async function getUserLikedVideos(accessToken: string): Promise<YouTubeLikedVideo[]> {
  try {
    console.log('[YouTube API] Fetching user liked videos with access token');
    
    // 首先获取用户喜欢的视频ID列表
    const likedVideosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&myRating=like&maxResults=25&key=${process.env.YOUTUBE_API_KEY}`;
    
    const likedResponse = await fetchWithTimeout(likedVideosUrl, 30000);
    if (!likedResponse.ok) {
      const errorBody = await likedResponse.json();
      console.error('[YouTube API] Failed to get liked videos:', JSON.stringify(errorBody, null, 2));
      throw new Error(`Failed to get liked videos: ${likedResponse.status}`);
    }
    
    const likedData = await likedResponse.json();
    
    if (!likedData.items || likedData.items.length === 0) {
      console.log('[YouTube API] No liked videos found');
      return [];
    }
    
    // 获取视频详细信息
    const videoIds = likedData.items.map((item: any) => item.id).join(',');
    const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${process.env.YOUTUBE_API_KEY}`;
    
    const videoResponse = await fetchWithTimeout(videoDetailsUrl, 30000);
    if (!videoResponse.ok) {
      const errorBody = await videoResponse.json();
      console.error('[YouTube API] Failed to get video details:', JSON.stringify(errorBody, null, 2));
      throw new Error(`Failed to get video details: ${videoResponse.status}`);
    }
    
    const videoData: YouTubeVideoApiResponse = await videoResponse.json();
    
    const videos: YouTubeLikedVideo[] = videoData.items.map(video => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      duration: video.contentDetails.duration,
      viewCount: video.statistics.viewCount,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      likedAt: new Date().toISOString() // 这里应该从API获取真实的喜欢时间
    }));
    
    console.log(`[YouTube API] Successfully fetched ${videos.length} liked videos`);
    return videos;
    
  } catch (error) {
    console.error('[YouTube API] Error fetching user liked videos:', error);
    throw error;
  }
}

// 格式化持续时间
function formatDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// 格式化观看次数
function formatViewCount(count: string): string {
  const num = parseInt(count);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export const revalidate = 0; // 不缓存，每次都获取最新数据

export async function GET() {
  try {
    // 检查用户是否已登录
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        message: '请先登录以获取您的YouTube喜欢视频',
        requiresAuth: true
      }, { status: 401 });
    }

    // 检查用户是否已连接YouTube账户
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { accounts: true }
    });

    if (!user?.accounts?.some(account => account.provider === 'google')) {
      return NextResponse.json({
        success: false,
        message: '请先连接您的Google账户以获取YouTube数据',
        requiresGoogleAuth: true
      }, { status: 401 });
    }

    // 获取用户的访问令牌（这里需要从数据库中获取）
    // 注意：这需要修改Prisma schema来存储访问令牌
    const googleAccount = user.accounts.find(account => account.provider === 'google');
    if (!googleAccount?.access_token) {
      return NextResponse.json({
        success: false,
        message: 'YouTube访问令牌已过期，请重新授权',
        requiresReauth: true
      }, { status: 401 });
    }

    // 获取真实的喜欢视频
    const videos = await getUserLikedVideos(googleAccount.access_token);
    
    if (videos.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: '您还没有喜欢的视频'
      });
    }
    
    // 格式化数据
    const formattedVideos = videos.map(video => ({
      ...video,
      duration: formatDuration(video.duration),
      viewCount: formatViewCount(video.viewCount),
      publishedAt: new Date(video.publishedAt).toLocaleString('zh-CN'),
      likedAt: video.likedAt ? new Date(video.likedAt).toLocaleString('zh-CN') : undefined
    }));
    
    // 缓存到数据库（可选）
    // 这里可以添加缓存逻辑，将视频数据存储到数据库中
    
    return NextResponse.json({
      success: true,
      data: formattedVideos,
      message: '成功获取您的喜欢视频'
    });
    
  } catch (error) {
    console.error('YouTube Liked Videos API error:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取喜欢视频失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
