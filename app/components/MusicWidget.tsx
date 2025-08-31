'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import MusicCard from './MusicCard';
import { isMobileDevice, isSmallScreen } from '@/lib/device-utils';

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
  const effectRan = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSmallViewport, setIsSmallViewport] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // 检测设备类型和处理成功消息
  useEffect(() => {
    setIsMobile(isMobileDevice());
    setIsSmallViewport(isSmallScreen());
    
    // 处理移动端认证成功消息
    if (spotifySuccess && isMobileDevice()) {
      setShowSuccessMessage(true);
      // 3秒后隐藏成功消息
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
        // 清理URL参数
        const url = new URL(window.location.href);
        url.searchParams.delete('spotify_success');
        window.history.replaceState({}, '', url.toString());
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    
    const handleResize = () => {
      setIsSmallViewport(isSmallScreen());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [spotifySuccess]);

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
    // 显示移动端认证成功消息
    if (showSuccessMessage) {
      return (
        <div className="text-center">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            🎉 Spotify连接成功！
          </div>
          <div className="text-gray-400">正在加载你的音乐...</div>
        </div>
      );
    }

    if (isLoading) {
      return <div className="text-center text-gray-400">Loading music...</div>;
    }

    if (error) {
      // 如果是我们定义的 401 未授权错误，则显示连接按钮
      if (error.status === 401) {
        return (
          <div className="text-center">
            <p className={`mb-4 ${isSmallViewport ? 'text-sm' : ''}`}>
              {isMobile ? '连接你的Spotify账户来查看音乐' : 'Connect your Spotify account to see your music.'}
            </p>
            {isMobile && (
              <p className="text-xs text-gray-400 mb-3">
                📱 移动端提示：点击下方按钮将在新窗口中打开Spotify登录页面
              </p>
            )}
            <a
              href="/api/spotify/login"
              className={`bg-green-500 hover:bg-green-600 text-white font-bold transition-colors rounded ${
                isSmallViewport ? 'py-3 px-6 text-sm' : 'py-2 px-4'
              }`}
              target={isMobile ? '_blank' : '_self'}
              rel={isMobile ? 'noopener noreferrer' : undefined}
            >
              {isMobile ? '🎵 连接Spotify' : 'Connect Spotify'}
            </a>
            {isMobile && (
              <p className="text-xs text-gray-500 mt-2">
                完成登录后请返回此页面
              </p>
            )}
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