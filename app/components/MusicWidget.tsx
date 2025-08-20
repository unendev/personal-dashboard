'use client';

import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import MusicCard from './MusicCard';

// 定义 fetcher 函数，SWR 会用它来请求数据
const fetcher = async (url: string) => {
  const res = await fetch(url);

  // 如果服务器返回非 2xx 的状态码，则抛出错误
  if (!res.ok) {
    const error: any = new Error('An error occurred while fetching the data.');
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
  const effectRan = useRef(false);

  useEffect(() => {
    // 定义一个异步函数来处理回调逻辑
    const handleCallback = async () => {
      if (code && !effectRan.current) {
        effectRan.current = true; // 立即将 ref 设置为 true，防止重复执行
        try {
          const res = await fetch(`/api/spotify/callback?code=${code}`);
          if (res.ok) {
            // 成功后，重定向到干净的 URL 并刷新数据
            // 使用 replaceState 来避免在历史记录中留下带 code 的 URL
            window.history.replaceState({}, '', '/');
            // 可以在这里触发 SWR 的重新验证，而不是完全重载页面
            // mutate('/api/music/spotify');
            window.location.reload(); // 或者简单地重载页面来刷新所有状态
          } else {
            console.error('Spotify callback failed', await res.text());
          }
        } catch (error) {
          console.error('Error during Spotify callback fetch:', error);
        }
      }
    };

    handleCallback();
    // 依赖项数组保持不变
  }, [code]);

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
      // 如果是我们定义的 401 未授权错误，则显示连接按钮
      if (error.status === 401) {
        return (
          <div className="text-center">
            <p className="mb-4">Connect your Spotify account to see your music.</p>
            <a
              href="/api/spotify/login"
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Connect Spotify
            </a>
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
    <div className="w-full max-w-sm mx-auto p-4 rounded-lg shadow-lg bg-gray-800 text-white">
      <h2 className="text-xl font-bold mb-4 text-center">
        {data?.isPlaying ? 'Playing on Spotify' : 'Last Played on Spotify'}
      </h2>
      {renderContent()}
    </div>
  );
};

export default MusicWidget;