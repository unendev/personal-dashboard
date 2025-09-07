
'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

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

  if (error) return <div className="p-6 h-full flex items-center justify-center text-red-400">加载阮一峰周刊失败</div>;
  if (!feeds || !Array.isArray(feeds)) return <div className="p-6 h-full flex items-center justify-center text-white/60">加载阮一峰周刊中...</div>;

  return (
    <Card className="p-6 h-full flex flex-col bg-transparent border-none shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-medium text-white">阮一峰周刊</CardTitle>
        <Avatar>
          <AvatarImage src={feeds[0]?.avatar} alt={feeds[0]?.source} />
          <AvatarFallback>RYF</AvatarFallback>
        </Avatar>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {feeds.map((item, index) => (
          <a key={index} href={item.url} target="_blank" rel="noopener noreferrer" className="block mb-4 last:mb-0 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
            <p className="text-sm text-white/70 mb-2">{item.summary}</p>
            <p className="text-xs text-white/50">{new Date(item.timestamp).toLocaleDateString()}</p>
          </a>
        ))}
      </CardContent>
    </Card>
  );
};

export default RuanYiFengCard;