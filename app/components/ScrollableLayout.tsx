'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Suspense } from 'react';
import MusicWidget from './MusicWidget';
import LinuxDoWidget from './LinuxDoWidget';
import RuanYiFengCard from './RuanYiFengCard';
import BilibiliCard from './BilibiliCard';

interface InfoSource {
  id: string;
  title: string;
  icon: string;
  component: React.ReactNode;
  category: 'overview' | 'social' | 'development' | 'ai';
  priority: number;
}

const ScrollableLayout = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 信息源配置
  const infoSources: InfoSource[] = [
    // 概览类
    {
      id: 'music',
      title: '音乐播放',
      icon: '🎵',
      component: <MusicWidget />,
      category: 'overview',
      priority: 1
    },
    {
      id: 'linuxdo',
      title: 'Linux.do 报告',
      icon: '🐧',
      component: <LinuxDoWidget />,
      category: 'overview',
      priority: 2
    },
    
    // 社交类
    {
      id: 'twitter',
      title: 'Twitter 动态',
      icon: '🐦',
      component: (
        <div className="p-6">
          <div className="text-center text-white/60 py-8">
            <p>Twitter API 集成待实现</p>
            <p className="text-sm mt-2">将显示最新的推文和互动</p>
          </div>
        </div>
      ),
      category: 'social',
      priority: 3
    },
    {
      id: 'discord',
      title: 'Discord 思考',
      icon: '💭',
      component: (
        <div className="p-6">
          <div className="text-center text-white/60 py-8">
            <p>Discord API 集成待实现</p>
            <p className="text-sm mt-2">将显示最新的思考和讨论</p>
          </div>
        </div>
      ),
      category: 'social',
      priority: 4
    },
    {
      id: 'youtube',
      title: 'YouTube 历史',
      icon: '📺',
      component: (
        <div className="p-6">
          <div className="text-center text-white/60 py-8">
            <p>YouTube API 集成待实现</p>
            <p className="text-sm mt-2">将显示观看历史和推荐</p>
          </div>
        </div>
      ),
      category: 'social',
      priority: 5
    },
    
    // 开发类
    {
      id: 'github',
      title: 'GitHub 活动',
      icon: '🐙',
      component: (
        <div className="p-6">
          <div className="text-center text-white/60 py-8">
            <p>GitHub API 集成待实现</p>
            <p className="text-sm mt-2">将显示提交、PR、Issues等</p>
          </div>
        </div>
      ),
      category: 'development',
      priority: 6
    },
    {
      id: 'projects',
      title: '在线项目',
      icon: '🚀',
      component: (
        <div className="p-6">
          <div className="text-center text-white/60 py-8">
            <p>项目展示待实现</p>
            <p className="text-sm mt-2">将展示正在运行的项目</p>
          </div>
        </div>
      ),
      category: 'development',
      priority: 7
    },
    
    // AI类
    {
      id: 'ruanyifeng',
      title: '阮一峰周刊',
      icon: '📚',
      component: <RuanYiFengCard />,
      category: 'ai',
      priority: 8
    },
    {
      id: 'bilibili',
      title: 'B站动态',
      icon: '📱',
      component: <BilibiliCard />,
      category: 'ai',
      priority: 9
    },
    {
      id: 'ai-summary',
      title: 'AI 智能总结',
      icon: '🤖',
      component: (
        <div className="p-6">
          <div className="text-center text-white/60 py-8">
            <p>AI总结功能待实现</p>
            <p className="text-sm mt-2">将提供智能内容总结</p>
          </div>
        </div>
      ),
      category: 'ai',
      priority: 10
    },
    {
      id: 'fitness',
      title: '运动数据',
      icon: '🏃',
      component: (
        <div className="p-6">
          <div className="text-center text-white/60 py-8">
            <p>运动手环数据待集成</p>
            <p className="text-sm mt-2">将显示健康数据</p>
          </div>
        </div>
      ),
      category: 'ai',
      priority: 11
    }
  ];

  const categories = [
    { id: 'all', label: '全部', icon: '🏠' },
    { id: 'overview', label: '概览', icon: '📊' },
    { id: 'social', label: '社交', icon: '💬' },
    { id: 'development', label: '开发', icon: '💻' },
    { id: 'ai', label: 'AI', icon: '🤖' }
  ];

  const filteredSources = activeCategory === 'all' 
    ? infoSources 
    : infoSources.filter(source => source.category === activeCategory);

  return (
    <main className="w-full min-h-screen">
      {/* 页面标题区域 */}
      <div className="relative z-10 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Project Nexus
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              您的个人数字中心 - 整合所有信息源的智能仪表板
            </p>
          </div>
        </div>
      </div>

      {/* 分类导航 */}
      <div className="relative z-10 px-6 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeCategory === category.id
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
          
          {/* 统计信息 */}
          <div className="text-center text-white/50 text-sm">
            显示 {filteredSources.length} 个信息源
          </div>
        </div>
      </div>

      {/* 可滚动的内容区域 */}
      <div className="relative z-10 px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          <div 
            ref={scrollRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[calc(100vh-300px)] overflow-y-auto"
          >
            {filteredSources.map((source) => (
              <div key={source.id} className="module-card rounded-2xl hover-lift">
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{source.icon}</span>
                    <h3 className="text-lg font-semibold text-white">{source.title}</h3>
                  </div>
                </div>
                <div className="h-full">
                  <Suspense fallback={
                    <div className="p-6 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/60"></div>
                    </div>
                  }>
                    {source.component}
                  </Suspense>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default ScrollableLayout;
