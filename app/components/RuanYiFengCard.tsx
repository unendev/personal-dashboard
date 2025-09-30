
'use client';

import React from 'react';
import useSWR from 'swr';

interface FeedItem {
  source: string;
  avatar: string;
  author: string;
  title: string;
  summary: string;
  timestamp: string;
  url?: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const RuanYiFengCard: React.FC = () => {
  const { data: feeds, error } = useSWR<FeedItem[]>('/api/ruanyifeng-feeds', fetcher, { revalidateOnFocus: false });

  // 调试信息
  console.log('阮一峰数据:', feeds);
  console.log('错误:', error);

  if (error) return <div className="p-6 h-full flex items-center justify-center text-red-400">加载阮一峰周刊失败</div>;
  if (!feeds || !Array.isArray(feeds)) return <div className="p-6 h-full flex items-center justify-center text-white/60">加载阮一峰周刊中...</div>;

  return (
    <div className="p-6 h-full flex flex-col bg-transparent">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
        <h3 className="text-xl font-semibold text-white">阮一峰周刊</h3>
        <div className="flex items-center">
          <img 
            src={feeds[0]?.avatar} 
            alt={feeds[0]?.source || '阮一峰周刊'}
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="ml-2 text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
            RYF
          </span>
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className="flex-grow overflow-y-auto">
        {feeds.map((item, index) => (
          <a 
            key={index} 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block mb-4 last:mb-0 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 border border-white/5"
          >
            <h4 className="text-base font-semibold text-white mb-2 line-clamp-2">{item.title}</h4>
            <p className="text-sm text-white/70 mb-2 line-clamp-3">{item.summary}</p>
            <p className="text-xs text-white/50">{new Date(item.timestamp).toLocaleDateString('zh-CN')}</p>
          </a>
        ))}
      </div>
    </div>
  );
};

export default RuanYiFengCard;