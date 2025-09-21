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
    // 60 秒后自动重新验证（刷新）数据（因为现在有缓存，可以减少刷新频率）
    refreshInterval: 60000,
    // 启用错误重试，但不要过于频繁
    errorRetryInterval: 10000,
    // 保持数据新鲜度
    dedupingInterval: 5000,
  });

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center text-gray-400">Loading music...</div>;
    }

    if (error) {
      // 如果是服务不可用错误（503），显示友好的提示
      if (error.status === 503) {
        return (
          <div className="text-center">
            <div className="text-blue-500 mb-2">🎵</div>
            <p className="text-sm text-gray-600 mb-2">
              音乐服务暂时不可用
            </p>
            <p className="text-xs text-gray-500">
              请稍后再试，或检查网络连接
            </p>
          </div>
        );
      }
      
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
      
      // 检查是否是占位数据
      if (data.trackName === "音乐服务暂不可用" || 
          data.trackName === "暂无最近播放记录" || 
          data.trackName === "暂无播放信息") {
        return (
          <div className="text-center">
            <div className="text-gray-500 mb-2">🎵</div>
            <p className="text-sm text-gray-600 mb-2">{data.trackName}</p>
            <p className="text-xs text-gray-500">{data.artist}</p>
            <div className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={data.albumArtUrl} 
                alt="音乐占位图" 
                className="w-16 h-16 mx-auto rounded-md opacity-50" 
              />
            </div>
          </div>
        );
      }
      
      return <MusicCard {...data} />;
    }

    return null;
  };

  return (
    <div className="p-5 h-full">
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