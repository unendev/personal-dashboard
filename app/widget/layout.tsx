'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen w-full bg-transparent">
        <style>{`
          html, body {
            background: transparent !important;
          }
          /* 定义可拖拽区域 */
          .drag-region {
            -webkit-app-region: drag;
          }
          /* 定义不可拖拽区域（交互元素） */
          .no-drag {
            -webkit-app-region: no-drag;
          }
          /* 隐藏滚动条但保留滚动功能 */
          .custom-scrollbar {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE/Edge */
          }
          .custom-scrollbar::-webkit-scrollbar {
            display: none; /* Chrome/Safari */
          }
        `}</style>
        {children}
      </div>
    </SessionProvider>
  );
}
