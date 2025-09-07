'use client';

import React, { useState } from 'react';
import TabbedLayout from './components/TabbedLayout';
import ScrollableLayout from './components/ScrollableLayout';
import DashboardLayout from './components/DashboardLayout';

type LayoutType = 'tabbed' | 'scrollable' | 'dashboard';

export default function Home() {
  const [layoutType, setLayoutType] = useState<LayoutType>('dashboard');

  const layouts = [
    { id: 'dashboard' as LayoutType, label: '仪表板式', description: '分类折叠，适合大量信息源' },
    { id: 'tabbed' as LayoutType, label: '标签页式', description: '按类别分页，清晰简洁' },
    { id: 'scrollable' as LayoutType, label: '滚动式', description: '单页滚动，适合快速浏览' }
  ];

  const renderLayout = () => {
    switch (layoutType) {
      case 'tabbed': return <TabbedLayout />;
      case 'scrollable': return <ScrollableLayout />;
      case 'dashboard': return <DashboardLayout />;
      default: return <DashboardLayout />;
    }
  };

  return (
    <main className="w-full min-h-screen">
      {/* 布局选择器 */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="text-white/80 text-sm mb-2">布局模式</div>
          <div className="flex gap-2">
            {layouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() => setLayoutType(layout.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
                  layoutType === layout.id
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title={layout.description}
              >
                {layout.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 渲染选中的布局 */}
      {renderLayout()}
    </main>
  );
}