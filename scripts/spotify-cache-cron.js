#!/usr/bin/env node

/**
 * Spotify缓存更新脚本
 * 这个脚本会定期更新Spotify音乐数据的缓存
 */

import cron from 'node-cron';

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

// 简单的内存缓存
let spotifyCache: any = null;
let cacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

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

// 更新Spotify缓存的函数
async function updateSpotifyCache() {
  try {
    console.log('开始更新Spotify缓存...');
    
    // 检查缓存是否仍然有效
    const now = Date.now();
    if (spotifyCache && now < cacheExpiry) {
      console.log('缓存仍然有效，跳过更新');
      return;
    }

    // 获取Spotify数据
    const spotifyData = await fetchSpotifyData();
    
    // 更新缓存
    spotifyCache = spotifyData;
    cacheExpiry = now + CACHE_DURATION;
    
    console.log('Spotify缓存更新成功:', {
      track: spotifyData.trackName,
      artist: spotifyData.artist,
      isPlaying: spotifyData.isPlaying,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(cacheExpiry).toISOString()
    });

  } catch (error: unknown) {
    console.error('Spotify缓存更新失败:', error);
  }
}

// 设置定时任务 - 每3分钟执行一次
const schedule = '*/3 * * * *'; // cron 表达式：每3分钟

console.log(`Spotify缓存定时任务将在每3分钟执行一次`);

cron.schedule(schedule, async () => {
  console.log('定时任务触发，开始更新Spotify缓存...');
  await updateSpotifyCache();
}, {
  scheduled: true,
  timezone: "Asia/Shanghai"
});

// 手动触发一次（用于测试）
if (process.argv.includes('--test')) {
  console.log('手动触发Spotify缓存更新...');
  updateSpotifyCache().then(() => {
    console.log('手动更新完成');
    process.exit(0);
  }).catch((error) => {
    console.error('手动更新失败:', error);
    process.exit(1);
  });
} else {
  console.log('Spotify缓存定时任务已启动，按 Ctrl+C 停止');
  
  // 启动时立即执行一次
  updateSpotifyCache();
}
