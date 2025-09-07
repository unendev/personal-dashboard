'use client';

import React, { useEffect, useRef, useState, ReactNode } from 'react';

interface WaterfallGridProps {
  children: ReactNode;
  minColumnWidth?: number; // 最小列宽，单位px
  gap?: number; // 间距，单位px
}

const WaterfallGrid: React.FC<WaterfallGridProps> = ({
  children,
  minColumnWidth = 300,
  gap = 16,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(1);

  const calculateColumnCount = () => {
    if (gridRef.current) {
      const containerWidth = gridRef.current.offsetWidth;
      const newColumnCount = Math.max(1, Math.floor((containerWidth + gap) / (minColumnWidth + gap)));
      setColumnCount(newColumnCount);
    }
  };

  useEffect(() => {
    calculateColumnCount();
    window.addEventListener('resize', calculateColumnCount);
    return () => window.removeEventListener('resize', calculateColumnCount);
  }, [minColumnWidth, gap]);

  const columns: ReactNode[][] = Array.from({ length: columnCount }, () => []);
  const columnHeights: number[] = Array.from({ length: columnCount }, () => 0);

  React.Children.forEach(children, (child, index) => {
    if (React.isValidElement(child)) {
      const minHeightColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      columns[minHeightColumnIndex].push(
        <div key={child.key || index} style={{ marginBottom: `${gap}px` }}>
          {child}
        </div>
      );
      // 估算子组件高度，这里简化处理，实际应用可能需要更精确的测量
      // 暂时假设所有子组件高度大致相同，或者通过其他方式获取实际高度
      // 为了演示，我们假设每个子组件的高度为 minColumnWidth * 0.75 (一个大致的比例)
      // 实际项目中，可能需要使用 ResizeObserver 或其他方式来获取准确的子组件高度
      columnHeights[minHeightColumnIndex] += minColumnWidth * 0.75 + gap;
    }
  });

  return (
    <div
      ref={gridRef}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        gap: `${gap}px`,
        padding: `${gap}px`,
        alignItems: 'flex-start', // 确保内容从顶部开始对齐
      }}
    >
      {columns.map((col, colIndex) => (
        <div key={colIndex} style={{ display: 'flex', flexDirection: 'column' }}>
          {col}
        </div>
      ))}
    </div>
  );
};

export default WaterfallGrid;