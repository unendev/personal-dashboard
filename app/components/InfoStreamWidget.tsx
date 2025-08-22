'use client';

import React, { useState, useEffect } from 'react';
import InfoCard from './InfoCard';

type FeedItem = {
  source: string;
  avatar: string;
  author: string;
  title: string;
  summary: string;
  timestamp: string;
  url: string;
};

const InfoStreamWidget = () => {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/feeds');
        if (!response.ok) {
          throw new Error('Failed to fetch feeds');
        }
        const data = await response.json();
        setFeeds(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchFeeds();
  }, []);

  if (loading) {
    return <div className="text-center">Loading feeds...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  // 按来源分组数据
  const groupedFeeds = feeds.reduce((acc, feed) => {
    if (!acc[feed.source]) {
      acc[feed.source] = [];
    }
    acc[feed.source].push(feed);
    return acc;
  }, {} as Record<string, typeof feeds>);

  return (
    <div className="w-full">
      {/* 紧凑的标题区域 */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold gradient-text mb-1">信息流</h2>
        <p className="text-white/60 text-sm">最新更新</p>
      </div>

      {/* 紧凑的内容区域 */}
      <div className="space-y-6">
        {Object.entries(groupedFeeds).map(([source, sourceFeeds], groupIndex) => (
          <div key={source} className={`animate-fade-in-up delay-${Math.min(groupIndex * 100, 300)}`}>
            {/* 来源标题 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h3 className="text-lg font-bold text-white">{source}</h3>
              <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/70">
                {sourceFeeds.length}
              </span>
            </div>

            {/* 紧凑的卡片网格 - 只显示前3个 */}
            <div className="grid grid-cols-1 gap-4">
              {sourceFeeds.slice(0, 3).map((feed, index) => (
                <a
                  href={feed.url}
                  key={`${source}-${index}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block animate-fade-in-up delay-${Math.min((groupIndex * 100) + (index * 50), 600)}`}
                >
                  <InfoCard
                    source={feed.source}
                    avatar={feed.avatar}
                    author={feed.author}
                    title={feed.title}
                    summary={feed.summary}
                    timestamp={new Date(feed.timestamp).toLocaleString()}
                  />
                </a>
              ))}
            </div>

            {/* 如果有更多内容，显示展开按钮 */}
            {sourceFeeds.length > 3 && (
              <div className="text-center mt-3">
                <button className="text-sm text-white/60 hover:text-white/80 transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
                  查看更多 ({sourceFeeds.length - 3} 篇)
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InfoStreamWidget;