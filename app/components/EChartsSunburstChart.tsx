'use client'

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  parentId?: string | null;
  children?: TimerTask[];
  createdAt?: string;
  updatedAt?: string;
}

interface EChartsSunburstChartProps {
  tasks: TimerTask[];
}

const EChartsSunburstChart: React.FC<EChartsSunburstChartProps> = ({ tasks }) => {
  // 递归计算任务的总时间（包括子任务）
  const calculateTotalTime = (task: TimerTask): number => {
    let total = task.elapsedTime;
    if (task.children) {
      task.children.forEach(child => {
        total += calculateTotalTime(child);
      });
    }
    return total;
  };

  // 构建 ECharts 旭日图数据
  const buildEChartsSunburstData = () => {
    const categoryMap = new Map<string, { time: number; tasks: TimerTask[] }>();
    
    // 只统计顶级任务，子任务的时间已经包含在父任务的calculateTotalTime中
    tasks.forEach(task => {
      const category = task.categoryPath || '未分类';
      const taskTotalTime = calculateTotalTime(task);
      
      // 新的两层分类体系：直接使用两级分类
      const categoryParts = category.split('/');
      let targetCategory: string;
      
      if (categoryParts.length >= 2) {
        // 使用完整的两级分类路径
        targetCategory = categoryParts.slice(0, 2).join('/');
      } else {
        // 如果只有一级分类，直接统计
        targetCategory = category;
      }
      
      const current = categoryMap.get(targetCategory) || { time: 0, tasks: [] };
      current.time += taskTotalTime;
      current.tasks.push(task);
      categoryMap.set(targetCategory, current);
    });

    // 构建层级结构
    interface SunburstNode {
      name: string;
      value: number;
      children: SunburstNode[];
      itemStyle?: {
        color: string;
      };
    }

    const root: SunburstNode = {
      name: '总时间',
      value: 0,
      children: []
    };

    // 颜色配置
    const colors = [
      '#5470c6', '#91cc75', '#fac858', '#ee6666', 
      '#73c0de', '#3ba272', '#fc8452', '#9a60b4',
      '#ea7ccc', '#ff9f7f', '#ffdb5c', '#37a2da'
    ];

    let colorIndex = 0;
    categoryMap.forEach((value, category) => {
      const categoryParts = category.split('/');
      let currentLevel = root;
      
      categoryParts.forEach((part) => {
        const existingChild = currentLevel.children?.find(child => child.name === part);
        if (existingChild) {
          currentLevel = existingChild;
        } else {
          const newChild = {
            name: part,
            value: Math.max(value.time, 0),
            children: [],
            itemStyle: {
              color: colors[colorIndex % colors.length]
            }
          };
          currentLevel.children.push(newChild);
          currentLevel = newChild;
          colorIndex++;
        }
      });
    });

    // 计算根节点的总值
    root.value = root.children.reduce((sum, child) => sum + child.value, 0);

    // 确保根节点有有效值
    if (root.value <= 0) {
      root.value = 1; // 设置默认值避免除零错误
    }

    return root;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes > 0 ? `${minutes}分钟` : ''}`;
    }
    return `${minutes}分钟`;
  };

  const sunburstData = buildEChartsSunburstData();

  // ECharts 配置选项
  const option = {
    series: [
      {
        type: 'sunburst',
        data: sunburstData.children,
        radius: [0, '90%'],
        center: ['50%', '50%'],
        itemStyle: {
          borderRadius: 7,
          borderWidth: 2,
          borderColor: '#fff'
        },
        label: {
          show: true,
          formatter: function (params: { data: { children?: unknown[] }; name: string }) {
            // 只显示叶子节点的标签
            if (params.data.children && params.data.children.length > 0) {
              return '';
            }
            const name = params.name;
            return name.length > 6 ? name.substring(0, 6) + '...' : name;
          },
          fontSize: 12,
          color: '#fff',
          fontWeight: 'bold'
        },
        emphasis: {
          focus: 'ancestor',
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        levels: [
          {
            r0: '0%',
            r: '35%',
            itemStyle: {
              borderWidth: 2
            },
            label: {
              rotate: 'tangential'
            }
          },
          {
            r0: '35%',
            r: '70%',
            itemStyle: {
              borderWidth: 2
            },
            label: {
              align: 'right'
            }
          },
          {
            r0: '70%',
            r: '90%',
            itemStyle: {
              borderWidth: 2
            },
            label: {
              position: 'outside',
              padding: 3,
              silent: false
            }
          }
        ]
      }
    ],
    tooltip: {
      trigger: 'item',
      formatter: function (params: { data: { name: string; value: number } }) {
        const data = params.data;
        const time = formatTime(data.value);
        return `${data.name}<br/>时间: ${time}`;
      }
    },
    animation: true,
    animationType: 'scale',
    animationEasing: 'elasticOut',
    animationDelay: function () {
      return Math.random() * 200;
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-500">暂无时间数据</p>
          <p className="text-sm text-gray-400 mt-2">开始计时后这里会显示统计图表</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ReactECharts 
        option={option} 
        style={{ height: '500px', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
      <div className="mt-4 text-sm text-gray-600 text-center">
        <p>点击扇形区域查看详细信息</p>
        <p className="text-xs text-gray-500 mt-1">总时间: {formatTime(sunburstData.value)}</p>
      </div>
    </div>
  );
};

export default EChartsSunburstChart;
