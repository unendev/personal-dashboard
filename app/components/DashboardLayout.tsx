'use client';

import React, { useState } from 'react';
import { Suspense } from 'react';
import MusicWidget from './MusicWidget';
import LinuxDoWidget from './LinuxDoWidget';
import RuanYiFengCard from './RuanYiFengCard';
import BilibiliCard from './BilibiliCard';

const DashboardLayout = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const sections = [
    {
      id: 'overview',
      title: '概览',
      icon: '📊',
      description: '核心信息和快速访问',
      components: [
        { id: 'music', component: <MusicWidget />, title: '音乐播放', icon: '🎵' },
        { id: 'linuxdo', component: <LinuxDoWidget />, title: 'Linux.do 报告', icon: '🐧' }
      ]
    },
    {
      id: 'social',
      title: '社交信息流',
      icon: '💬',
      description: '社交媒体和互动内容',
      components: [
        { 
          id: 'twitter', 
          component: (
            <div className="p-6">
              <div className="text-center text-white/60 py-8">
                <p>Twitter API 集成待实现</p>
                <p className="text-sm mt-2">将显示最新的推文和互动</p>
              </div>
            </div>
          ), 
          title: 'Twitter 动态', 
          icon: '🐦' 
        },
        { 
          id: 'discord', 
          component: (
            <div className="p-6">
              <div className="text-center text-white/60 py-8">
                <p>Discord API 集成待实现</p>
                <p className="text-sm mt-2">将显示最新的思考和讨论</p>
              </div>
            </div>
          ), 
          title: 'Discord 思考', 
          icon: '💭' 
        },
        { 
          id: 'youtube', 
          component: (
            <div className="p-6">
              <div className="text-center text-white/60 py-8">
                <p>YouTube API 集成待实现</p>
                <p className="text-sm mt-2">将显示观看历史和推荐</p>
              </div>
            </div>
          ), 
          title: 'YouTube 历史', 
          icon: '📺' 
        }
      ]
    },
    {
      id: 'development',
      title: '开发活动',
      icon: '💻',
      description: '代码和项目相关',
      components: [
        { 
          id: 'github', 
          component: (
            <div className="p-6">
              <div className="text-center text-white/60 py-8">
                <p>GitHub API 集成待实现</p>
                <p className="text-sm mt-2">将显示提交、PR、Issues等</p>
              </div>
            </div>
          ), 
          title: 'GitHub 活动', 
          icon: '🐙' 
        },
        { 
          id: 'projects', 
          component: (
            <div className="p-6">
              <div className="text-center text-white/60 py-8">
                <p>项目展示待实现</p>
                <p className="text-sm mt-2">将展示正在运行的项目</p>
              </div>
            </div>
          ), 
          title: '在线项目', 
          icon: '🚀' 
        }
      ]
    },
    {
      id: 'ai',
      title: 'AI 与内容',
      icon: '🤖',
      description: '智能总结和内容聚合',
      components: [
        { id: 'ruanyifeng', component: <RuanYiFengCard />, title: '阮一峰周刊', icon: '📚' },
        { id: 'bilibili', component: <BilibiliCard />, title: 'B站动态', icon: '📱' },
        { 
          id: 'ai-summary', 
          component: (
            <div className="p-6">
              <div className="text-center text-white/60 py-8">
                <p>AI总结功能待实现</p>
                <p className="text-sm mt-2">将提供智能内容总结</p>
              </div>
            </div>
          ), 
          title: 'AI 智能总结', 
          icon: '🤖' 
        },
        { 
          id: 'fitness', 
          component: (
            <div className="p-6">
              <div className="text-center text-white/60 py-8">
                <p>运动手环数据待集成</p>
                <p className="text-sm mt-2">将显示健康数据</p>
              </div>
            </div>
          ), 
          title: '运动数据', 
          icon: '🏃' 
        }
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
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
              您的个人数字中心 - 整合所有信息源的智能仪表板
            </p>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="relative z-10 px-6 pb-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {sections.map((section) => (
            <div key={section.id} className="module-card rounded-2xl hover-lift">
              {/* 区域标题 */}
              <div 
                className="p-6 cursor-pointer border-b border-white/10"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{section.icon}</span>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                      <p className="text-white/60">{section.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-sm">
                      {section.components.length} 个组件
                    </span>
                    <div className={`transform transition-transform duration-300 ${
                      expandedSection === section.id ? 'rotate-180' : ''
                    }`}>
                      <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* 区域内容 */}
              <div className={`transition-all duration-500 overflow-hidden ${
                expandedSection === section.id ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {section.components.map((component) => (
                      <div key={component.id} className="module-card rounded-xl hover-lift">
                        <div className="p-4 border-b border-white/10">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{component.icon}</span>
                            <h3 className="text-lg font-semibold text-white">{component.title}</h3>
                          </div>
                        </div>
                        <div className="h-full">
                          <Suspense fallback={
                            <div className="p-6 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/60"></div>
                            </div>
                          }>
                            {component.component}
                          </Suspense>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default DashboardLayout;