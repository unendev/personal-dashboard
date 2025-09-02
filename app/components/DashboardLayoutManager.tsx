'use client';

import React, { useState, useEffect, useCallback } from 'react';
import FreeLayout from '@/app/components/FreeLayout';
import { LayoutConfig } from '@/types/layout';
import { usePathname } from 'next/navigation';

interface DashboardLayoutManagerProps {
  children: React.ReactNode;
  isEditing?: boolean;
}

export default function DashboardLayoutManager({ children, isEditing }: DashboardLayoutManagerProps) {
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true); // 默认为 true
  const [hasLoaded, setHasLoaded] = useState(false); // 新增：标记是否已经加载过
  const pathname = usePathname();
  const isDashboard = pathname === '/dashboard';

  // 加载布局配置
  useEffect(() => {
    async function fetchLayout() {
      if (!isDashboard) {
        setIsLoading(false);
        setHasLoaded(true);
        return;
      }
      
      setIsLoading(true);
      try {
        const response = await fetch('/api/layout', {
          cache: 'no-cache', // 确保每次都获取最新数据
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Loaded layout config:', data); // 调试日志
          setLayoutConfig(data);
        } else {
          console.error('Failed to fetch layout:', response.statusText);
          setLayoutConfig({}); // 失败时设置为空对象
        }
      } catch (error) {
        console.error('Error fetching layout:', error);
        setLayoutConfig({}); // 失败时设置为空对象
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    }

    fetchLayout();
  }, [isDashboard]);

  // 保存布局配置
  const handleLayoutChange = useCallback(async (newConfig: LayoutConfig) => {
    setLayoutConfig(newConfig); // 立即更新本地状态
    console.log('Saving layout config:', newConfig); // 调试日志
    try {
      const response = await fetch('/api/layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      });
      if (response.ok) {
        console.log('Layout saved successfully'); // 调试日志
      } else {
        console.error('Failed to save layout:', response.statusText);
        // 可以考虑添加用户通知
      }
    } catch (error) {
      console.error('Error saving layout:', error);
      // 可以考虑添加用户通知
    }
  }, []);

  // 如果是 dashboard 页面且还在加载中，显示加载状态
  if (isDashboard && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-400">加载布局中...</div>
        </div>
      </div>
    );
  }

  // 如果还没有加载过，也显示加载状态（避免闪烁）
  if (isDashboard && !hasLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-400">加载中...</div>
        </div>
      </div>
    );
  }

  // 布局配置已经加载，渲染 FreeLayout
  return (
    <FreeLayout
      layoutConfig={layoutConfig}
      onLayoutChange={handleLayoutChange}
      isEditing={isEditing}
    >
      {children}
    </FreeLayout>
  );
}






