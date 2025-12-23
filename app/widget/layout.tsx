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
      <div className="min-h-screen w-full overflow-hidden bg-transparent">
        <style>{`
          html, body {
            background: transparent !important;
            overflow: hidden !important;
          }
          /* 定义可拖拽区域 */
          .drag-region {
            -webkit-app-region: drag;
          }
          /* 定义不可拖拽区域（交互元素） */
          .no-drag {
            -webkit-app-region: no-drag;
          }
        `}</style>
        {children}
      </div>
    </SessionProvider>
  );
}
