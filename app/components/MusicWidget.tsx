'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import MusicCard from './MusicCard';

// 定义 fetcher 函数，SWR 会用它来请求数据
const fetcher = async (url: string) => {
  const res = await fetch(url);

  // 如果服务器返回非 2xx 的状态码，则抛出错误
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.') as Error & {
      info?: unknown;
      status?: number;
    };
    // 将状态码和响应体附加到错误对象上
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }

  return res.json();
};

const MusicWidget = () => {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const spotifySuccess = searchParams.get('spotify_success');




  // 清理URL中的Spotify相关参数（如果有的话）
  useEffect(() => {
    if (code || spotifySuccess) {
      // 清理URL参数
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('spotify_success');
      window.history.replaceState({}, '', url.toString());
    }
  }, [code, spotifySuccess]);

  // 使用 useSWR hook 来获取数据
  const { data, error, isLoading } = useSWR('/api/music/spotify', fetcher, {
    // 配置 SWR 在出错时自动重试 3 次
    shouldRetryOnError: true,
    errorRetryCount: 3,
    // 30 秒后自动重新验证（刷新）数据
    refreshInterval: 30000,
  });

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center text-gray-400">Loading music...</div>;
    }

    if (error) {
      // 如果是我们定义的 401 未授权错误，显示配置提示
      if (error.status === 401) {
        return (
          <div className="text-center">
            <div className="text-yellow-600 mb-2">⚠️</div>
            <p className="text-sm text-gray-600 mb-2">
              Spotify配置未完成
            </p>
            <p className="text-xs text-gray-500">
              请在环境变量中设置 SPOTIFY_REFRESH_TOKEN
            </p>
          </div>
        );
      }
      // 其他错误
      return <div className="text-center text-red-500">Error: {error.info?.error || error.message}</div>;
    }

    if (data) {
      // 如果 API 返回了 message，说明没有找到最近播放的歌曲
      if (data.message) {
        return <div className="text-center text-gray-400">{data.message}</div>;
      }
      return <MusicCard {...data} />;
    }

    return null;
  };

  return (
    <div className="glass-effect rounded-2xl p-5 hover-lift animate-fade-in-up delay-200 h-full">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 mb-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h2 className="text-lg font-bold gradient-text">
            {data?.isPlaying ? '正在播放' : '最近播放'}
          </h2>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        <p className="text-white/60 text-xs">Spotify</p>
      </div>
      {renderContent()}
    </div>
  );
};

export default MusicWidget;