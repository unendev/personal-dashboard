'use client';

import { Suspense } from 'react';
import MusicWidget from './components/MusicWidget';
import BiliUserManager from './components/BiliUserManager'; // 暂时保留，如果后续不需要可以移除
import LinuxDoWidget from './components/LinuxDoWidget';
import WaterfallGrid from './components/WaterfallGrid';
import RuanYiFengCard from './components/RuanYiFengCard'; // 引入阮一峰周刊卡片
import BilibiliCard from './components/BilibiliCard';     // 引入B站动态卡片
import React from 'react';

export default function Home() {
  return (
    <main className="w-full min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
-------
      <div className="relative">
        <WaterfallGrid>
          {/* 阮一峰周刊卡片 */}
          <Suspense key="ruanyifeng" fallback={<div className="glass-effect rounded-2xl p-6 hover-lift h-full flex items-center justify-center text-white/60">加载阮一峰周刊中...</div>}>
            <RuanYiFengCard />
          </Suspense>

          {/* B站动态卡片 */}
          <Suspense key="bilibili" fallback={<div className="glass-effect rounded-2xl p-6 hover-lift h-full flex items-center justify-center text-white/60">加载B站动态中...</div>}>
            <BilibiliCard />
          </Suspense>

          {/* 音乐组件 */}
          <Suspense key="music" fallback={<div className="glass-effect rounded-2xl p-6 hover-lift h-full flex items-center justify-center">
            <div className="text-white/60">加载音乐组件中...</div>
          </div>}>
            <MusicWidget />
          </Suspense>

          {/* Linux.do 社区报告 */}
          <LinuxDoWidget key="linuxdo" />

          {/* UP主管理界面 (如果不再需要，可以移除) */}
          {/* <BiliUserManager key="bili-manager" /> */}
        </WaterfallGrid>
      </div>
    </main>
  );
}
