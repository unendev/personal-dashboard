'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FreeLayoutProps, LayoutConfig, Position, Size } from '@/types/layout';
import DraggableWidget from './DraggableWidget';
import AdaptiveGrid from './AdaptiveGrid';

const FreeLayout: React.FC<FreeLayoutProps> = ({
  children,
  layoutConfig: initialLayoutConfig,
  onLayoutChange,
  isEditing = false
}) => {
  const onLayoutChangeRef = useRef(onLayoutChange);

  // 确保 layoutConfig 始终是一个对象
  const currentLayoutConfig = initialLayoutConfig || {};

  // 更新ref以避免依赖问题
  useEffect(() => {
    onLayoutChangeRef.current = onLayoutChange;
  }, [onLayoutChange]);

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
    if (childCount > 0 && (!initialLayoutConfig || Object.keys(initialLayoutConfig).length === 0)) {
      const defaultConfig = getDefaultConfig(childCount);
      if (isEditing) {
        setTimeout(() => {
          onLayoutChangeRef.current?.(defaultConfig);
        }, 0);
      }
    }
  }, [children, initialLayoutConfig, getDefaultConfig, isEditing]);

  const handleWidgetMove = useCallback((id: string, position: Position) => {
    if (currentLayoutConfig) {
      const newConfig = {
        ...currentLayoutConfig,
        [id]: {
          ...currentLayoutConfig[id],
          position
        }
      };
      setTimeout(() => {
        onLayoutChangeRef.current?.(newConfig);
      }, 0);
    }
  }, [currentLayoutConfig]);

  const handleWidgetResize = useCallback((id: string, size: Size) => {
    if (currentLayoutConfig) {
      const newConfig = {
        ...currentLayoutConfig,
        [id]: {
          ...currentLayoutConfig[id],
          size
        }
      };
      setTimeout(() => {
        onLayoutChangeRef.current?.(newConfig);
      }, 0);
    }
  }, [currentLayoutConfig]);

  // 根据是否有保存的布局配置来决定显示方式
  const hasSavedLayout = Object.keys(currentLayoutConfig).length > 0 && Object.keys(currentLayoutConfig).some(id => {
    const config = currentLayoutConfig[id];
    return config && (config.position.x > 0 || config.position.y > 0);
  });

  if (!isEditing && hasSavedLayout) {
    // 有保存的布局时，使用自由布局显示
    return (
      <div className="free-layout-canvas">
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            const id = child.key?.toString() || `widget-${index}`;
            const config = currentLayoutConfig[id];

            if (!config) {
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
                isEditing={false}
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
  }

  if (!isEditing) {
    // 没有保存的布局时，使用网格布局
    return (
      <div className="layout-container">
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
      </div>
    );
  }

  // 编辑模式：显示所有组件的拖拽版本
  return (
    <div className="free-layout-canvas editing">
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const id = child.key?.toString() || `widget-${index}`;
          const config = currentLayoutConfig[id];

          if (!config) {
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