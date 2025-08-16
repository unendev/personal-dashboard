'use client';

import React, { useState } from 'react';
import InfoCard from './InfoCard';

// 示例 mock data
const mockFeeds = [
  { id: 1, source: 'Bilibili', avatar: 'https://i0.hdslb.com/bfs/face/member/noface.jpg', author: 'LCTT', title: '【一分钟硬核 linux】...', summary: '这是一个关于Linux的快速技巧分享。', timestamp: '2小时前' },
  { id: 2, source: '阮一峰周刊', avatar: 'https://www.ruanyifeng.com/blog/images/person2_s.jpg', author: '阮一峰', title: '科技爱好者周刊（第 265 期）', summary: '本周的科技动态和值得分享的链接。', timestamp: '昨天' },
  { id: 3, source: 'Twitter', avatar: 'https://pbs.twimg.com/profile_images/1488548719062654976/u6qfBBkF_400x400.jpg', author: 'Elon Musk', title: 'Working on the master plan part 3', summary: 'The future is electric!', timestamp: '3小时前' },
];

const InfoStreamWidget = () => {
  const [filter, setFilter] = useState('All');

  const filteredFeeds = filter === 'All' 
    ? mockFeeds 
    : mockFeeds.filter(feed => feed.source === filter);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex justify-center space-x-4 mb-4">
        <button onClick={() => setFilter('All')} className={`px-4 py-2 rounded-lg ${filter === 'All' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>All</button>
        <button onClick={() => setFilter('Bilibili')} className={`px-4 py-2 rounded-lg ${filter === 'Bilibili' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Bilibili</button>
        <button onClick={() => setFilter('阮一峰周刊')} className={`px-4 py-2 rounded-lg ${filter === '阮一峰周刊' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>阮一峰周刊</button>
        <button onClick={() => setFilter('Twitter')} className={`px-4 py-2 rounded-lg ${filter === 'Twitter' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Twitter</button>
      </div>
      <div className="space-y-4">
        {filteredFeeds.map(feed => (
          <InfoCard
            key={feed.id}
            source={feed.source}
            avatar={feed.avatar}
            author={feed.author}
            title={feed.title}
            summary={feed.summary}
            timestamp={feed.timestamp}
          />
        ))}
      </div>
    </div>
  );
};

export default InfoStreamWidget;