'use client';

import React, { useState, useRef } from 'react';
import { Suspense } from 'react';
import MusicWidget from './MusicWidget';
import LinuxDoWidget from './LinuxDoWidget';
import LinuxDoModal from './LinuxDoModal';
import RuanYiFengCard from './RuanYiFengCard';
// import EternalReturnCard from './EternalReturnCard';
import YouTubeLikedCard from './YouTubeLikedCard';
import TwitterCard from './TwitterCard';

interface InfoSource {
  id: string;
  title: string;
  icon: string;
  component: React.ReactNode;
  priority: number;
}

const ScrollableLayout = () => {
  const [isLinuxDoModalOpen, setIsLinuxDoModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 信息源配置
  const infoSources: InfoSource[] = [
    {
      id: 'music',
      title: '音乐播放',
      icon: '🎵',
      component: <MusicWidget />,
      priority: 1
    },
    {
      id: 'linuxdo',
      title: 'Linux.do 报告',
      icon: '🐧',
      component: <LinuxDoWidget />,
      priority: 2
    },
    {
      id: 'twitter',
      title: 'Twitter 动态',
      icon: '🐦',
      component: <TwitterCard />,
      priority: 3
    },
    {
      id: 'youtube',
      title: 'YouTube 我喜欢',
      icon: '❤️',
      component: <YouTubeLikedCard />,
      priority: 4
    },
    {
      id: 'ruanyifeng',
      title: '阮一峰周刊',
      icon: '📚',
      component: <RuanYiFengCard />,
      priority: 5
    }
  ];

  return (
    <main className="w-full min-h-screen">
      {/* 页面标题区域 */}
      <div className="relative z-10 px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Project Nexus
          </h1>
          <p className="text-base md:text-lg text-white/70">
            您的个人数字中心 - 整合所有信息源的智能仪表板
          </p>
        </div>
      </div>

      {/* 可滚动的内容区域 - 移除盒子限制，充分利用空间 */}
      <div className="relative z-10 pb-6">
        <div 
          ref={scrollRef}
          className="scrollable-layout-grid"
        >
          {infoSources.map((source) => (
            <div 
              key={source.id} 
              className={`module-card rounded-2xl hover-lift ${
                source.id === 'linuxdo' ? 'cursor-pointer' : ''
              }`}
              onClick={source.id === 'linuxdo' ? () => setIsLinuxDoModalOpen(true) : undefined}
            >
              <div className="p-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{source.icon}</span>
                  <h3 className="text-base font-semibold text-white">{source.title}</h3>
                  {source.id === 'linuxdo' && (
                    <span className="ml-auto text-xs text-blue-400 opacity-60 hover:opacity-100 transition-opacity">
                      点击查看详情 →
                    </span>
                  )}
                </div>
              </div>
              <div className="h-full">
                <Suspense fallback={
                  <div className="p-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/60"></div>
                  </div>
                }>
                  {source.component}
                </Suspense>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Linux.do 模态框 */}
      <LinuxDoModal 
        isOpen={isLinuxDoModalOpen} 
        onClose={() => setIsLinuxDoModalOpen(false)} 
      />
    </main>
  );
};

export default ScrollableLayout;
