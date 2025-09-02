'use client';

import { Suspense } from 'react';
import HealthWidget from './components/HealthWidget';
import InfoStreamWidget from './components/InfoStreamWidget';
import MusicWidget from './components/MusicWidget';
import BiliUserManager from './components/BiliUserManager';
import LinuxDoWidget from './components/LinuxDoWidget';
import FreeLayout from './components/FreeLayout';
import LogDisplayTable from './components/LogDisplayTable'; // 引入 LogDisplayTable
import { DailyHealthData } from '@/types/health-data';
import { LayoutConfig } from '@/types/layout';
import React, { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Home() {
  const [showBiliManager, setShowBiliManager] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 使用 useSWR 获取布局配置
  const { data: fetchedLayout, error: layoutError } = useSWR('/api/layout', fetcher, { revalidateOnFocus: false });

  // 同步 fetchedLayout 到 layoutConfig 状态
  useEffect(() => {
    if (fetchedLayout) {
      setLayoutConfig(fetchedLayout);
    } else if (layoutError) {
      console.error('Failed to fetch layout from DB:', layoutError);
      // 可以在这里设置一个默认布局，或者保持 layoutConfig 为 null，让 FreeLayout 处理默认布局
    }
  }, [fetchedLayout, layoutError]);

  const mockHealthData: DailyHealthData[] = [
    { date: '10-20', steps: 8500, sleepHours: 7.5, heartRate: 72, calories: 2100 },
    { date: '10-21', steps: 12000, sleepHours: 6.8, heartRate: 75, calories: 2500 },
    { date: '10-22', steps: 9800, sleepHours: 8.1, heartRate: 69, calories: 2300 },
    { date: '10-23', steps: 7600, sleepHours: 7.2, heartRate: 71, calories: 2200 },
    { date: '10-24', steps: 15000, sleepHours: 6.5, heartRate: 78, calories: 2800 },
    { date: '10-25', steps: 10500, sleepHours: 7.8, heartRate: 70, calories: 2400 },
    { date: '10-26', steps: 9200, sleepHours: 7.0, heartRate: 73, calories: 2250 },
  ];

  const saveLayoutToDB = async (config: LayoutConfig) => {
    try {
      const response = await fetch('/api/layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        throw new Error('Failed to save layout to DB');
      }
    } catch (error) {
      console.error('Error saving layout to DB:', error);
    }
  };

  const handleLayoutChange = (config: LayoutConfig) => {
    setLayoutConfig(config);
    saveLayoutToDB(config);
  };

  return (
    <main className="w-full min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* 页面标题区域 */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/20 border-b border-white/10">
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold gradient-text mb-2">个人数字枢纽</h1>
          <p className="text-sm text-white/60 max-w-xl mx-auto">
            聚合信息流，追踪健康数据，聆听音乐，洞察社区动态
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <button
              onClick={() => {
                if (isEditing && layoutConfig) {
                  saveLayoutToDB(layoutConfig);
                }
                setIsEditing(!isEditing);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isEditing
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/15'
              }`}
            >
              {isEditing ? '🎯 完成布局' : '🎨 编辑布局'}
            </button>
          </div>
        </div>
      </div>

      {/* 自由布局内容区域 */}
      <div className="relative">
        <FreeLayout
          isEditing={isEditing}
          layoutConfig={layoutConfig || undefined}
          onLayoutChange={handleLayoutChange}
        >
          {/* 信息流组件 */}
          <InfoStreamWidget key="info-stream" />

          {/* 音乐组件 */}
          <Suspense key="music" fallback={<div className="glass-effect rounded-2xl p-6 hover-lift h-full flex items-center justify-center">
            <div className="text-white/60">加载音乐组件中...</div>
          </div>}>
            <MusicWidget />
          </Suspense>

          {/* 健康数据组件 */}
          <div key="health" className="glass-effect rounded-2xl p-6 hover-lift h-full">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold gradient-text mb-1">健康追踪</h2>
              <p className="text-white/60 text-xs">今日概览</p>
            </div>
            <HealthWidget healthData={mockHealthData} />
          </div>

          {/* 快捷操作面板 */}
          <div key="quick-actions" className="glass-effect rounded-2xl p-6 hover-lift">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold gradient-text mb-1">快捷操作</h2>
              <p className="text-white/60 text-xs">常用功能入口</p>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <a href="/dashboard" className="glass-effect rounded-lg p-3 text-center hover-lift transition-all duration-300 group aspect-square">
                <div className="text-xl mb-1 group-hover:scale-110 transition-transform">🏆</div>
                <div className="text-white font-medium text-xs">技能树</div>
              </a>
              <a href="/quests" className="glass-effect rounded-lg p-3 text-center hover-lift transition-all duration-300 group aspect-square">
                <div className="text-xl mb-1 group-hover:scale-110 transition-transform">📋</div>
                <div className="text-white font-medium text-xs">任务</div>
              </a>
              <a href="/log" className="glass-effect rounded-lg p-3 text-center hover-lift transition-all duration-300 group aspect-square">
                <div className="text-xl mb-1 group-hover:scale-110 transition-transform">📝</div>
                <div className="text-white font-medium text-xs">日志</div>
              </a>
              <a href="/timer" className="glass-effect rounded-lg p-3 text-center hover-lift transition-all duration-300 group aspect-square">
                <div className="text-xl mb-1 group-hover:scale-110 transition-transform">⏱️</div>
                <div className="text-white font-medium text-xs">计时器</div>
              </a>
              <button
                onClick={() => setShowBiliManager(!showBiliManager)}
                className={`glass-effect rounded-lg p-3 text-center hover-lift transition-all duration-300 group aspect-square ${
                  showBiliManager ? 'bg-purple-500/20 border-purple-500/30' : ''
                }`}
              >
                <div className="text-xl mb-1 group-hover:scale-110 transition-transform">🎬</div>
                <div className="text-white font-medium text-xs">UP主</div>
              </button>
            </div>
          </div>

          {/* Linux.do 社区报告 */}
          <LinuxDoWidget key="linuxdo" />

          {/* UP主管理界面 */}
          {showBiliManager && (
            <BiliUserManager key="bili-manager" />
          )}

          {/* 日志显示表格 */}
          <div key="log-table" className="glass-effect rounded-2xl p-6 hover-lift">
            <LogDisplayTable />
          </div>
        </FreeLayout>
      </div>
    </main>
  );
}
