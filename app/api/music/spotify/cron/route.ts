import { NextRequest, NextResponse } from 'next/server';
import { spotifyCache } from '@/app/lib/spotify-cache';

// Spotify API 数据类型
interface SpotifyArtist {
  name: string;
}

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const BASIC_AUTH = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const CURRENTLY_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const RECENTLY_PLAYED_ENDPOINT = `https://api.spotify.com/v1/me/player/recently-played`;

// 获取 access_token 的辅助函数
async function getAccessToken(refreshToken: string) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${BASIC_AUTH}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || 'Failed to refresh token');
  }

  return data.access_token;
}

// 获取Spotify音乐数据的核心函数
async function fetchSpotifyData() {
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!refreshToken) {
    console.log('Spotify refresh token 未配置，使用占位数据');
    return {
      isPlaying: false,
      trackName: "音乐服务暂不可用",
      artist: "请稍后再试",
      album: "个人音乐展示",
      albumArtUrl: "https://via.placeholder.com/300x300/1db954/ffffff?text=♪",
      source: 'Spotify',
    };
  }

  try {
    // 获取最新的 access_token
    const accessToken = await getAccessToken(refreshToken);

    // 调用 Spotify API 获取最近播放的歌曲
    const response = await fetch(CURRENTLY_PLAYING_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    let formattedData;

    // 如果没有歌曲在播放，Spotify 会返回 204 No Content
    if (response.status === 204 || response.status > 400) {
      const recentlyPlayedResponse = await fetch(RECENTLY_PLAYED_ENDPOINT, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!recentlyPlayedResponse.ok) {
        // 如果获取最近播放失败，使用占位数据
        formattedData = {
          isPlaying: false,
          trackName: "暂无最近播放记录",
          artist: "请稍后再试",
          album: "个人音乐展示",
          albumArtUrl: "https://via.placeholder.com/300x300/1db954/ffffff?text=♪",
          source: 'Spotify',
        };
      } else {
        const recentlyPlayed = await recentlyPlayedResponse.json();
        const track = recentlyPlayed.items[0].track;

        formattedData = {
          isPlaying: false,
          trackName: track.name,
          artist: track.artists.map((_artist: SpotifyArtist) => _artist.name).join(', '),
          album: track.album.name,
          albumArtUrl: track.album.images[0]?.url,
          source: 'Spotify',
        };
      }
    } else {
      const song = await response.json();
      
      // 确保返回的数据结构是有效的
      if (!song || !song.item) {
        formattedData = {
          isPlaying: false,
          trackName: "暂无播放信息",
          artist: "请稍后再试",
          album: "个人音乐展示",
          albumArtUrl: "https://via.placeholder.com/300x300/1db954/ffffff?text=♪",
          source: 'Spotify',
        };
      } else {
        formattedData = {
          isPlaying: song.is_playing,
          trackName: song.item.name,
          artist: song.item.artists.map((_artist: SpotifyArtist) => _artist.name).join(', '),
          album: song.item.album.name,
          albumArtUrl: song.item.album.images[0]?.url,
          source: 'Spotify',
        };
      }
    }

    return formattedData;

  } catch (error: unknown) {
    console.error('Spotify API 错误:', error);
    throw error;
  }
}

// POST /api/music/spotify/cron - 定时任务：更新Spotify缓存
export async function POST(request: NextRequest) {
  try {
    // 验证请求来源（可选：添加API密钥验证）
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('开始执行Spotify缓存更新任务...');
    
    // 检查是否需要刷新缓存
    if (!spotifyCache.shouldRefresh()) {
      const status = spotifyCache.getCacheStatus();
      console.log('缓存仍然有效，跳过更新:', status);
      return NextResponse.json({ 
        message: '缓存仍然有效，跳过更新',
        cacheStatus: status
      });
    }

    // 获取Spotify数据
    const spotifyData = await fetchSpotifyData();
    
    // 更新缓存
    spotifyCache.updateCache(spotifyData);
    
    console.log('Spotify缓存更新成功:', {
      track: spotifyData.trackName,
      artist: spotifyData.artist,
      isPlaying: spotifyData.isPlaying
    });

    return NextResponse.json({
      message: 'Spotify缓存更新成功',
      data: spotifyData,
      cacheStatus: spotifyCache.getCacheStatus()
    });

  } catch (error: unknown) {
    console.error('Spotify缓存更新失败:', error);
    
    return NextResponse.json({
      error: 'Spotify缓存更新失败',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/music/spotify/cron - 获取缓存状态
export async function GET(request: NextRequest) {
  try {
    const cacheStatus = spotifyCache.getCacheStatus();
    const cachedData = spotifyCache.getCachedData();
    
    return NextResponse.json({
      cacheStatus,
      cachedData: cachedData ? {
        trackName: cachedData.trackName,
        artist: cachedData.artist,
        album: cachedData.album,
        isPlaying: cachedData.isPlaying,
        cachedAt: cachedData.cachedAt,
        expiresAt: cachedData.expiresAt
      } : null
    });

  } catch (error: unknown) {
    return NextResponse.json({
      error: '获取缓存状态失败',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
