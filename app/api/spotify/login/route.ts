import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response('Missing Spotify environment variables', { status: 500 });
  }
  
  // 定义我们需要的权限范围
  const scope = [
    'user-read-private', // 读取用户基本信息
    'user-top-read', // 读取用户热门曲目和歌手
    'user-read-recently-played', // 读取用户最近播放的曲目
    'user-read-currently-playing', // 读取用户当前播放的曲目
  ].join(' ');

  // 使用 URLSearchParams 自动处理编码
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId!,
    scope: scope,
    redirect_uri: redirectUri,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  // 将用户重定向到构建好的 URL
  return NextResponse.redirect(authUrl);
}