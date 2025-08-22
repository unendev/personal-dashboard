'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FreeLayoutProps, LayoutConfig, Position, Size } from '@/types/layout';
import DraggableWidget from './DraggableWidget';
import AdaptiveGrid from './AdaptiveGrid';

const FreeLayout: React.FC<FreeLayoutProps> = ({
  children,
  layoutConfig: initialLayoutConfig,
  onLayoutChange,
  isEditing = false
}) => {
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(initialLayoutConfig || {});

  // 默认布局配置
  const getDefaultConfig = useCallback((childCount: number): LayoutConfig => {
    const config: LayoutConfig = {};
    const columns = Math.min(childCount, 5);

    React.Children.forEach(children, (child, index) => {
      if (React.isValidElement(child)) {
        const id = child.key?.toString() || `widget-${index}`;
        const col = index % columns;
        const row = Math.floor(index / columns);

        config[id] = {
          id,
          position: { x: col * 320 + 20, y: row * 250 + 100 }, // 调整起始位置
          size: { width: 300, height: 200 },
          isVisible: true,
          zIndex: 1
        };
      }
    });

    return config;
  }, [children]);

  useEffect(() => {
    const childCount = React.Children.count(children);
    if (childCount > 0 && Object.keys(layoutConfig).length === 0) {
      const defaultConfig = getDefaultConfig(childCount);
      setLayoutConfig(defaultConfig);
      if (isEditing) {
        onLayoutChange?.(defaultConfig);
      }
    }
  }, [children, layoutConfig, getDefaultConfig, onLayoutChange, isEditing]);

  const handleWidgetMove = useCallback((id: string, position: Position) => {
    const newConfig = {
      ...layoutConfig,
      [id]: {
        ...layoutConfig[id],
        position
      }
    };
    setLayoutConfig(newConfig);
    console.log('Widget moved:', id, position);
    onLayoutChange?.(newConfig);
  }, [layoutConfig, onLayoutChange]);

  const handleWidgetResize = useCallback((id: string, size: Size) => {
    const newConfig = {
      ...layoutConfig,
      [id]: {
        ...layoutConfig[id],
        size
      }
    };
    setLayoutConfig(newConfig);
    onLayoutChange?.(newConfig);
  }, [layoutConfig, onLayoutChange]);


  // 如果没有启用自由布局模式，使用自适应网格
  if (!isEditing) {
    return (
      <AdaptiveGrid
        columns={5}
        gap="1.5rem"
        className="free-layout-grid"
      >
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            const id = child.key?.toString() || `widget-${index}`;
            return (
              <div key={id} className="grid-item">
                {child}
              </div>
            );
          }
          return child;
        })}
      </AdaptiveGrid>
    );
  }

  // 自由布局模式
  return (
    <div className="free-layout-canvas">
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const id = child.key?.toString() || `widget-${index}`;
          const config = layoutConfig[id];

          if (!config) {
            console.warn('No config found for widget:', id);
            return null;
          }

          return (
            <DraggableWidget
              key={id}
              id={id}
              position={config.position}
              size={config.size}
              onMove={handleWidgetMove}
              onResize={handleWidgetResize}
              isEditing={true}
              zIndex={config.zIndex}
            >
              {child}
            </DraggableWidget>
          );
        }
        return child;
      })}
    </div>
  );
};

export default FreeLayout;