'use client';

import React, { useState } from 'react';
import { Suspense } from 'react';
import MusicWidget from './MusicWidget';
import LinuxDoWidget from './LinuxDoWidget';
import RuanYiFengCard from './RuanYiFengCard';
import BilibiliCard from './BilibiliCard';
import EternalReturnCard from './EternalReturnCard';
import YouTubeLikedCard from './YouTubeLikedCard';

type TabType = 'overview' | 'social' | 'development' | 'ai';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview' as TabType, label: '概览', icon: '🏠' },
    { id: 'social' as TabType, label: '社交', icon: '💬' },
    { id: 'development' as TabType, label: '开发', icon: '💻' },
    { id: 'ai' as TabType, label: 'AI总结', icon: '🤖' },
  ];

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* 顶部区域 - 音乐和快速信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Suspense key="music" fallback={
            <div className="module-card rounded-2xl p-6 hover-lift h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mx-auto mb-2"></div>
                <div className="text-white/60">加载音乐组件中...</div>
              </div>
            </div>
          }>
            <div className="module-card rounded-2xl hover-lift">
              <MusicWidget />
            </div>
          </Suspense>
        </div>

        <div className="lg:col-span-2">
          <div className="module-card rounded-2xl hover-lift">
            <LinuxDoWidget key="linuxdo" />
          </div>
        </div>
      </div>

      {/* 信息流区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="module-card rounded-2xl hover-lift">
          <RuanYiFengCard />
        </div>
        <div className="module-card rounded-2xl hover-lift">
          <BilibiliCard />
        </div>
        <div className="module-card rounded-2xl hover-lift">
          <EternalReturnCard />
        </div>
        <div className="module-card rounded-2xl hover-lift">
          <YouTubeLikedCard />
        </div>
      </div>
    </div>
  );

  const renderSocialTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Twitter 时间线 */}
        <div className="module-card rounded-2xl hover-lift p-6">
          <h3 className="text-xl font-semibold text-white mb-4">🐦 Twitter 动态</h3>
          <div className="text-center text-white/60 py-8">
            <p>Twitter API 集成待实现</p>
          </div>
        </div>

        {/* Discord 思考 */}
        <div className="module-card rounded-2xl hover-lift p-6">
          <h3 className="text-xl font-semibold text-white mb-4">💭 Discord 思考</h3>
          <div className="text-center text-white/60 py-8">
            <p>Discord API 集成待实现</p>
          </div>
        </div>
      </div>

       {/* YouTube 我喜欢 */}
       <div className="module-card rounded-2xl hover-lift">
         <YouTubeLikedCard />
       </div>
    </div>
  );

  const renderDevelopmentTab = () => (
    <div className="space-y-6">
      {/* GitHub 活动 */}
      <div className="module-card rounded-2xl hover-lift p-6">
        <h3 className="text-xl font-semibold text-white mb-4">🐙 GitHub 活动</h3>
        <div className="text-center text-white/60 py-8">
          <p>GitHub API 集成待实现</p>
        </div>
      </div>

      {/* 项目展示 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="module-card rounded-2xl hover-lift p-6">
          <h3 className="text-xl font-semibold text-white mb-4">🚀 在线项目</h3>
          <div className="text-center text-white/60 py-8">
            <p>项目展示待实现</p>
          </div>
        </div>

        <div className="module-card rounded-2xl hover-lift p-6">
          <h3 className="text-xl font-semibold text-white mb-4">💡 技能展示</h3>
          <div className="text-center text-white/60 py-8">
            <p>技能API化待实现</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAITab = () => (
    <div className="space-y-6">
      {/* AI 总结 */}
      <div className="module-card rounded-2xl hover-lift p-6">
        <h3 className="text-xl font-semibold text-white mb-4">🤖 AI 智能总结</h3>
        <div className="text-center text-white/60 py-8">
          <p>AI总结功能待实现</p>
        </div>
      </div>

      {/* 运动数据 */}
      <div className="module-card rounded-2xl hover-lift p-6">
        <h3 className="text-xl font-semibold text-white mb-4">🏃 运动数据</h3>
        <div className="text-center text-white/60 py-8">
          <p>运动手环数据待集成</p>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverviewTab();
      case 'social': return renderSocialTab();
      case 'development': return renderDevelopmentTab();
      case 'ai': return renderAITab();
      default: return renderOverviewTab();
    }
  };

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
              您的个人数字中心 - 整合信息流、音乐、开发工具于一体的智能仪表板
            </p>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="relative z-10 px-6 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="relative z-10 px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {renderTabContent()}
        </div>
      </div>
    </main>
  );
};

export default HomePage;
