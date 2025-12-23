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
          /* 自定义滚动条 */
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
          }
        `}</style>
        {children}
      </div>
    </SessionProvider>
  );
}
