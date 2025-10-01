'use client';

import React from 'react';
import LinuxDoWidget from '../components/features/widgets/LinuxDoWidget';

export default function TestLinuxDoExpansion() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Linux.do 展开功能测试
        </h1>
        
        <div className="module-card rounded-2xl hover-lift">
          <LinuxDoWidget />
        </div>
        
        <div className="mt-8 p-6 bg-white/5 rounded-lg border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">功能说明</h2>
          <div className="space-y-3 text-white/70">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>移除了固定的高度限制，卡片现在可以根据内容自适应高度</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>添加了&quot;展开/收起&quot;按钮，可以控制内容的显示状态</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>实现了平滑的展开/收起动画效果</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>移除了所有line-clamp限制，内容可以完整显示</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>帖子卡片现在显示更多信息，包括核心议题和关键点数量</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

