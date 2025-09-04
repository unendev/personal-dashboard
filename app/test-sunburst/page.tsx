'use client'

import React from 'react';
import TimeStatsChart from '../components/TimeStatsChart';

const TestSunburstPage = () => {
  // 测试数据
  const testTasks = [
    {
      id: '1',
      name: '编程',
      categoryPath: '工作/开发',
      elapsedTime: 7200, // 2小时
      initialTime: 3600,
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      children: [
        {
          id: '1-1',
          name: '前端开发',
          categoryPath: '工作/开发/前端',
          elapsedTime: 3600,
          initialTime: 1800,
          isRunning: false,
          startTime: null,
          isPaused: false,
          pausedTime: 0
        },
        {
          id: '1-2',
          name: '后端开发',
          categoryPath: '工作/开发/后端',
          elapsedTime: 3600,
          initialTime: 1800,
          isRunning: false,
          startTime: null,
          isPaused: false,
          pausedTime: 0
        }
      ]
    },
    {
      id: '2',
      name: '会议',
      categoryPath: '工作/沟通',
      elapsedTime: 1800, // 30分钟
      initialTime: 1800,
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0
    },
    {
      id: '3',
      name: '阅读',
      categoryPath: '学习/阅读',
      elapsedTime: 3600, // 1小时
      initialTime: 3600,
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">旭日图组件测试</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <TimeStatsChart tasks={testTasks} />
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">测试说明</h2>
          <ul className="space-y-2 text-gray-600">
            <li>• 三种图表类型：旭日图、饼图、柱状图</li>
            <li>• 鼠标悬停切换图表类型</li>
            <li>• 使用原生Recharts组件</li>
            <li>• 旭日图：点击扇形区域进入该类别，点击中心区域返回上一级</li>
            <li>• 饼图：显示分类时间分布</li>
            <li>• 柱状图：显示任务时间排行</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestSunburstPage;
