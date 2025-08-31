'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DraggableWidgetProps } from '@/types/layout';

const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  id,
  children,
  position = { x: 0, y: 0 },
  size = { width: 300, height: 200 },
  onMove,
  onResize,
  isEditing = false,
  zIndex = 1
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(position);
  const [currentSize, setCurrentSize] = useState(size);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  useEffect(() => {
    setCurrentSize(size);
  }, [size]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) return;

    // 阻止事件冒泡，防止与其他事件冲突
    e.stopPropagation();

    setIsDragging(true);
    setDragStart({
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y
    });

    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      setCurrentPosition(newPosition);
    } else if (isResizing) {
      const newWidth = Math.max(200, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = Math.max(150, resizeStart.height + (e.clientY - resizeStart.y));
      setCurrentSize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragStart.x, dragStart.y, resizeStart.width, resizeStart.height, resizeStart.x, resizeStart.y]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onMove?.(id, currentPosition);
    } else if (isResizing) {
      setIsResizing(false);
      onResize?.(id, currentSize);
    }
  }, [isDragging, isResizing, id, currentPosition, currentSize, onMove, onResize]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) return;

    e.stopPropagation();
    e.preventDefault();

    setIsResizing(true);
    setResizeStart({
      width: currentSize.width,
      height: currentSize.height,
      x: e.clientX,
      y: e.clientY
    });
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isDragging ? 'move' : 'nw-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const widgetStyle: React.CSSProperties = {
    position: 'absolute',
    left: currentPosition.x,
    top: currentPosition.y,
    width: currentSize.width,
    height: currentSize.height,
    zIndex: isDragging ? 1000 : zIndex,
    cursor: isEditing ? 'move' : 'default',
    transition: isDragging ? 'none' : 'all 0.2s ease',
    boxShadow: isDragging
      ? '0 15px 35px rgba(0, 0, 0, 0.2)'
      : '0 4px 15px rgba(0, 0, 0, 0.1)',
  };

  return (
    <div
      ref={widgetRef}
      className={`draggable-widget ${isDragging ? 'dragging' : ''}`}
      style={widgetStyle}
      onMouseDown={handleMouseDown}
    >
      {children}

      {isEditing && (
        <div
          className="resize-handle"
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '20px',
            height: '20px',
            cursor: 'nw-resize',
            background: 'linear-gradient(135deg, transparent 0%, transparent 50%, rgba(255,255,255,0.3) 50%)',
            borderRadius: '0 0 16px 0',
          }}
        />
      )}
    </div>
  );
};

export default DraggableWidget;