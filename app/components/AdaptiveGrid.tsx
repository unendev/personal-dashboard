'use client';

import React from 'react';
import { AdaptiveGridProps } from '@/types/layout';

const AdaptiveGrid: React.FC<AdaptiveGridProps> = ({
  columns = 5,
  gap = '1.5rem',
  children,
  className = ''
}) => {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap,
    width: '100%',
    minHeight: '100vh',
    padding: gap,
  };

  return (
    <div
      className={`adaptive-grid ${className}`}
      style={gridStyle}
    >
      {children}
    </div>
  );
};

export default AdaptiveGrid;