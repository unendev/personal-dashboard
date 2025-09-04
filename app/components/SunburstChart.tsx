'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface SunburstData {
  name: string;
  value: number;
  children?: SunburstData[];
  color?: string;
}

interface SunburstChartProps {
  data: SunburstData;
  width?: number;
  height?: number;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B',
  '#8DD1E1', '#82CA9D', '#FFC658', '#FF6B6B'
];

const SunburstChart: React.FC<SunburstChartProps> = ({ 
  data, 
  width = 400, 
  height = 400 
}) => {
  const [selectedNode, setSelectedNode] = React.useState<SunburstData | null>(null);
  const [hoveredNode, setHoveredNode] = React.useState<SunburstData | null>(null);
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());

  // 计算总值
  const calculateTotalValue = (node: SunburstData): number => {
    if (!node.children || node.children.length === 0) {
      return node.value;
    }
    return node.children.reduce((sum, child) => sum + calculateTotalValue(child), 0);
  };

  // 生成旭日图路径
  const generateSunburstPaths = (
    node: SunburstData,
    x0: number,
    y0: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    depth: number = 0,
    colorIndex: number = 0
  ): Array<{
    path: string;
    node: SunburstData;
    centerX: number;
    centerY: number;
    radius: number;
    startAngle: number;
    endAngle: number;
    depth: number;
    color: string;
    isExpanded: boolean;
  }> => {
    const paths: Array<{
      path: string;
      node: SunburstData;
      centerX: number;
      centerY: number;
      radius: number;
      startAngle: number;
      endAngle: number;
      depth: number;
      color: string;
      isExpanded: boolean;
    }> = [];

    const totalValue = calculateTotalValue(node);
    const angleRange = endAngle - startAngle;
    
    // 为当前节点创建路径
    const innerRadius = depth * (radius / 4);
    const outerRadius = (depth + 1) * (radius / 4);
    
    const startRad = startAngle * Math.PI / 180;
    const endRad = endAngle * Math.PI / 180;
    
    const x1 = x0 + innerRadius * Math.cos(startRad);
    const y1 = y0 + innerRadius * Math.sin(startRad);
    const x2 = x0 + outerRadius * Math.cos(startRad);
    const y2 = y0 + outerRadius * Math.sin(startRad);
    const x3 = x0 + outerRadius * Math.cos(endRad);
    const y3 = y0 + outerRadius * Math.sin(endRad);
    const x4 = x0 + innerRadius * Math.cos(endRad);
    const y4 = y0 + innerRadius * Math.sin(endRad);
    
    const largeArcFlag = angleRange > 180 ? 1 : 0;
    
    const path = [
      `M ${x1} ${y1}`,
      `L ${x2} ${y2}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}`,
      `L ${x4} ${y4}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`,
      'Z'
    ].join(' ');

    const color = node.color || COLORS[colorIndex % COLORS.length];
    const isExpanded = expandedNodes.has(node.name);
    
    paths.push({
      path,
      node,
      centerX: x0,
      centerY: y0,
      radius: outerRadius,
      startAngle,
      endAngle,
      depth,
      color,
      isExpanded
    });

    // 为子节点创建路径（只有当父节点展开时才显示）
    if (node.children && node.children.length > 0 && isExpanded) {
      let currentAngle = startAngle;
      node.children.forEach((child, index) => {
        const childValue = calculateTotalValue(child);
        const childAngleRange = (childValue / totalValue) * angleRange;
        const childEndAngle = currentAngle + childAngleRange;
        
        const childPaths = generateSunburstPaths(
          child,
          x0,
          y0,
          radius,
          currentAngle,
          childEndAngle,
          depth + 1,
          colorIndex + index + 1
        );
        
        paths.push(...childPaths);
        currentAngle = childEndAngle;
      });
    }

    return paths;
  };

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 20;
  
  const paths = generateSunburstPaths(data, centerX, centerY, radius, 0, 360);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  const handlePathClick = (node: SunburstData) => {
    if (node.children && node.children.length > 0) {
      // 如果有子节点，切换展开状态
      const newExpandedNodes = new Set(expandedNodes);
      if (newExpandedNodes.has(node.name)) {
        newExpandedNodes.delete(node.name);
      } else {
        newExpandedNodes.add(node.name);
      }
      setExpandedNodes(newExpandedNodes);
    } else {
      // 如果没有子节点，切换选中状态
      setSelectedNode(selectedNode?.name === node.name ? null : node);
    }
  };

  const handlePathMouseEnter = (node: SunburstData) => {
    setHoveredNode(node);
  };

  const handlePathMouseLeave = () => {
    setHoveredNode(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>时间分布旭日图</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg width={width} height={height} className="mx-auto">
            <g>
              {paths.map((pathData, index) => (
                <g key={index}>
                                     <path
                     d={pathData.path}
                     fill={pathData.color}
                     stroke="#fff"
                     strokeWidth={1}
                     opacity={hoveredNode?.name === pathData.node.name ? 0.8 : 0.6}
                     style={{ cursor: 'pointer' }}
                     onClick={() => handlePathClick(pathData.node)}
                     onMouseEnter={() => handlePathMouseEnter(pathData.node)}
                     onMouseLeave={handlePathMouseLeave}
                   />
                   {/* 展开指示器 */}
                   {pathData.node.children && pathData.node.children.length > 0 && (
                     <circle
                       cx={centerX + (pathData.radius * 0.6) * Math.cos((pathData.startAngle + pathData.endAngle) / 2 * Math.PI / 180)}
                       cy={centerY + (pathData.radius * 0.6) * Math.sin((pathData.startAngle + pathData.endAngle) / 2 * Math.PI / 180)}
                       r="8"
                       fill={pathData.isExpanded ? "#fff" : "rgba(255,255,255,0.3)"}
                       stroke="#333"
                       strokeWidth="1"
                       style={{ cursor: 'pointer' }}
                       onClick={() => handlePathClick(pathData.node)}
                     />
                   )}
                  {/* 添加文本标签 */}
                  {pathData.node.children && pathData.node.children.length === 0 && (
                    <text
                      x={centerX + (pathData.radius * 0.7) * Math.cos((pathData.startAngle + pathData.endAngle) / 2 * Math.PI / 180)}
                      y={centerY + (pathData.radius * 0.7) * Math.sin((pathData.startAngle + pathData.endAngle) / 2 * Math.PI / 180)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="10"
                      fill="#fff"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      {pathData.node.name.length > 8 ? 
                        pathData.node.name.substring(0, 8) + '...' : 
                        pathData.node.name
                      }
                    </text>
                  )}
                </g>
              ))}
            </g>
          </svg>
          
          {/* 悬停提示 */}
          {hoveredNode && (
            <div className="absolute bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs z-10"
                 style={{
                   left: Math.min(width - 200, Math.max(0, centerX - 100)),
                   top: Math.min(height - 100, Math.max(0, centerY - 50))
                 }}>
              <p className="font-medium text-gray-800">{hoveredNode.name}</p>
              <p className="text-blue-600 font-semibold">
                {formatTime(Math.round(hoveredNode.value / 60))}
              </p>
              {hoveredNode.children && hoveredNode.children.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  <p className="font-medium">包含子项:</p>
                  {hoveredNode.children.slice(0, 3).map((child, index) => (
                    <p key={index} className="ml-2">• {child.name}</p>
                  ))}
                  {hoveredNode.children.length > 3 && (
                    <p className="ml-2 text-gray-400">...还有 {hoveredNode.children.length - 3} 项</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-600 text-center">
          <p>点击有子项的扇形区域可以展开/收起子项</p>
          <p className="text-xs text-gray-500 mt-1">白色圆点表示可展开的区域</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SunburstChart;
