'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  url: string;
}

interface YouTubeApiResponse {
  success: boolean;
  data?: YouTubeVideo;
  message?: string;
}

const YouTubeCard: React.FC = () => {
  const [video, setVideo] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchYouTubeVideo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/youtube');
        const data: YouTubeApiResponse = await response.json();
        
        if (data.success && data.data) {
          setVideo(data.data);
        } else {
          setError(data.message || '获取视频失败');
        }
      } catch (err) {
        console.error('Failed to fetch YouTube video:', err);
        setError('网络请求失败');
      } finally {
        setLoading(false);
      }
    };

    fetchYouTubeVideo();
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold gradient-text mb-1">📺 YouTube</h2>
          <p className="text-white/60 text-sm">推荐视频</p>
        </div>
        
        <div className="animate-pulse">
          <div className="bg-white/10 rounded-xl h-48 mb-4"></div>
          <div className="space-y-3">
            <div className="bg-white/10 rounded h-4 w-3/4"></div>
            <div className="bg-white/10 rounded h-3 w-1/2"></div>
            <div className="bg-white/10 rounded h-3 w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold gradient-text mb-1">📺 YouTube</h2>
          <p className="text-white/60 text-sm">推荐视频</p>
        </div>
        
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">⚠️</div>
          <p className="text-white/60 mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold gradient-text mb-1">📺 YouTube</h2>
          <p className="text-white/60 text-sm">推荐视频</p>
        </div>
        
        <div className="text-center py-8">
          <div className="text-white/40 mb-2">📺</div>
          <p className="text-white/60">暂无视频数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold gradient-text mb-1">📺 YouTube</h2>
        <p className="text-white/60 text-sm">最后播放的视频</p>
      </div>

      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="relative overflow-hidden rounded-xl mb-4 hover:scale-[1.02] transition-transform duration-300">
          <Image
            src={video.thumbnail}
            alt={video.title}
            width={400}
            height={192}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
          
          {/* 播放按钮覆盖层 */}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
          
          {/* 时长标签 */}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {video.duration}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-white font-semibold line-clamp-2 group-hover:text-blue-300 transition-colors">
            {video.title}
          </h3>
          
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <span className="font-medium">{video.channelTitle}</span>
            <span>•</span>
            <span>{video.viewCount} 次观看</span>
          </div>
          
          <p className="text-white/50 text-sm line-clamp-2">
            {video.description}
          </p>
          
          <div className="flex items-center justify-between text-white/40 text-xs">
            <span>发布时间: {video.publishedAt}</span>
            <span className="group-hover:text-white transition-colors">点击观看 →</span>
          </div>
        </div>
      </a>
    </div>
  );
};

export default YouTubeCard;
