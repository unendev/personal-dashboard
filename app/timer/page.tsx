'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';
import EnhancedTimer from '@/app/components/EnhancedTimer';

export default function TimerPage() {
  const [isPageReady, setIsPageReady] = useState(false);

  // 确保页面完全加载后再显示内容
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 如果页面还没准备好，显示加载状态
  if (!isPageReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-400">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="timer-page-layout">
      {/* 返回主页按钮 */}
      <div className="fixed top-4 left-4 z-40">
        <Link
          href="/"
          className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <span className="text-white font-bold text-xl">←</span>
        </Link>
      </div>

      {/* 页面导航 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex space-x-6">
          <a href="/dashboard" className="text-gray-600 hover:text-gray-800 font-medium pb-2">🏆 技能树</a>
          <a href="/tools" className="text-gray-600 hover:text-gray-800 font-medium pb-2">📋 任务清单</a>
          <a href="/log" className="text-gray-600 hover:text-gray-800 font-medium pb-2">📝 每日日志</a>
          <a href="/timer" className="text-yellow-600 font-medium border-b-2 border-yellow-600 pb-2">⏱️ 计时器</a>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">计时器</h1>
          <p className="text-gray-600">管理你的时间，追踪任务进度</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <EnhancedTimer />
        </div>
      </div>
    </div>
  );
}
