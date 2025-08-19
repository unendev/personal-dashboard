import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const BASIC_AUTH = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const CURRENTLY_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const RECENTLY_PLAYED_ENDPOINT = `https://api.spotify.com/v1/me/player/recently-played`;

// 这是一个辅助函数，用于通过 refresh_token 获取新的 access_token
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
    // 如果 refresh_token 失效，Spotify 会在这里返回错误
    throw new Error(data.error_description || 'Failed to refresh token');
  }

  return data.access_token;
}

// API 路由的主处理函数
export async function GET(request: NextRequest) {
  // 1. 从 cookie 中读取 refresh_token
  const refreshToken = request.cookies.get('spotify_refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'Spotify refresh token not found. Please authorize.' },
      { status: 401 }
    );
  }

  try {
    // 2. 获取最新的 access_token
    const accessToken = await getAccessToken(refreshToken);

    // 3. 调用 Spotify API 获取最近播放的歌曲
    const response = await fetch(CURRENTLY_PLAYING_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // 如果没有歌曲在播放，Spotify 会返回 204 No Content
    // 如果没有歌曲在播放，Spotify 会返回 204 No Content
    if (response.status === 204 || response.status > 400) {
      const recentlyPlayedResponse = await fetch(RECENTLY_PLAYED_ENDPOINT, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!recentlyPlayedResponse.ok) {
        return NextResponse.json({ message: "Could not get recently played songs." });
      }

      const recentlyPlayed = await recentlyPlayedResponse.json();
      const track = recentlyPlayed.items[0].track;

      const formattedData = {
        isPlaying: false,
        trackName: track.name,
        artist: track.artists.map((_artist: any) => _artist.name).join(', '),
        album: track.album.name,
        albumArtUrl: track.album.images[0]?.url,
        source: 'Spotify',
      };

      return NextResponse.json(formattedData);
    }

    const song = await response.json();
    
    // 确保返回的数据结构是有效的
    if (!song || !song.item) {
      return NextResponse.json({ isPlaying: false });
    }

    // 4. 格式化数据以匹配前端 MusicCard 组件
    const formattedData = {
      isPlaying: song.is_playing,
      trackName: song.item.name,
      artist: song.item.artists.map((_artist: any) => _artist.name).join(', '),
      album: song.item.album.name,
      albumArtUrl: song.item.album.images[0]?.url,
      source: 'Spotify',
    };

    return NextResponse.json(formattedData);

  } catch (error: any) {
    // 统一处理所有可能的错误
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}