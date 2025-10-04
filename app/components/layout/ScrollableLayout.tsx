'use client';

import React from 'react';
import { Suspense } from 'react';
import LinuxDoWidget from '../features/widgets/LinuxDoWidget';
import RedditWidget from '../features/widgets/RedditWidget';

interface InfoSource {
  id: string;
  title: string;
  description: string;
  icon: string;
  component: React.ReactNode;
  color: string;
}

const ScrollableLayout = () => {
  // 核心情报源配置
  const infoSources: InfoSource[] = [
    {
      id: 'linuxdo',
      title: 'Linux.do 社区',
      description: '技术社区热门讨论',
      icon: '🐧',
      component: <LinuxDoWidget />,
      color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30'
    },
    {
      id: 'reddit',
      title: 'Reddit 热帖',
      description: '全球热点资讯',
      icon: '🔴',
      component: <RedditWidget />,
      color: 'from-orange-500/20 to-red-500/20 border-orange-500/30'
    }
  ];

  return (
    <main className="w-full min-h-screen">
      {/* 页面标题区域 */}
      <div className="relative z-10 px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Intelligence Hub
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-2">
            情报中心 · 信息聚合
          </p>
          <p className="text-sm text-white/50">
            实时追踪来自全球的技术动态与热门话题
          </p>
        </div>
      </div>

      {/* 3列情报源布局 */}
      <div className="relative z-10 pb-12 px-4 md:px-8 lg:px-12">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-12 gap-6 lg:gap-8">
            {infoSources.map((source) => (
              <div 
                key={source.id} 
                className={`module-card rounded-2xl hover-lift bg-gradient-to-br ${source.color} ${
                  source.id === 'linuxdo' ? '2xl:col-span-5' : '2xl:col-span-4'
                }`}
              >
                {/* 卡片头部 */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{source.icon}</span>
                      <div>
                        <h3 className="text-xl font-bold text-white">{source.title}</h3>
                        <p className="text-sm text-white/60">{source.description}</p>
                      </div>
                    </div>
                    <div className="text-blue-400 opacity-60 hover:opacity-100 transition-opacity">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 卡片内容 */}
                <div className="h-[600px]">
                  <Suspense fallback={
                    <div className="p-8 flex flex-col items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mb-4"></div>
                      <p className="text-white/60">加载中...</p>
                    </div>
                  }>
                    {source.component}
                  </Suspense>
                </div>
              </div>
            ))}

            {/* 侧边栏 - 仅超宽屏显示 */}
            <div className="hidden 2xl:block 2xl:col-span-3">
              <div className="space-y-6 sticky top-4">
                {/* 快速统计 */}
                <div className="module-card rounded-2xl p-5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    今日统计
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/70 text-sm">Linux.do</span>
                      <span className="text-blue-400 font-bold text-lg">实时</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/70 text-sm">Reddit</span>
                      <span className="text-orange-400 font-bold text-lg">实时</span>
                    </div>
                  </div>
                </div>

                {/* 快捷导航 */}
                <div className="module-card rounded-2xl p-5 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">🚀</span>
                    快捷入口
                  </h3>
                  <div className="space-y-2">
                    <a
                      href="/dashboard"
                      className="block px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white text-sm transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>🏆</span>
                        <span>技能树</span>
                      </div>
                    </a>
                    <a
                      href="/timer"
                      className="block px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white text-sm transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>⏱️</span>
                        <span>计时器</span>
                      </div>
                    </a>
                    <a
                      href="/log"
                      className="block px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white text-sm transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>📝</span>
                        <span>日志</span>
                      </div>
                    </a>
                    <a
                      href="/treasure-pavilion"
                      className="block px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white text-sm transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>💎</span>
                        <span>藏宝阁</span>
                      </div>
                    </a>
                  </div>
                </div>

                {/* 提示信息 */}
                <div className="module-card rounded-2xl p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span className="text-2xl">💡</span>
                    提示
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    点击帖子标题即可跳转到原文查看完整内容
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-white/50 text-xs">
                      更多情报源即将上线...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ScrollableLayout;


