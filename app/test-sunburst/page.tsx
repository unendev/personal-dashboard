'use client'

import React from 'react';
import SunburstChart from '../components/SunburstChart';

const TestSunburstPage = () => {
  // 测试数据
  const testData = {
    name: '总时间',
    value: 480, // 8小时
    children: [
      {
        name: '工作',
        value: 240, // 4小时
        children: [
          { name: '编程', value: 120 },
          { name: '会议', value: 60 },
          { name: '文档', value: 60 }
        ]
      },
      {
        name: '学习',
        value: 120, // 2小时
        children: [
          { name: '阅读', value: 60 },
          { name: '练习', value: 60 }
        ]
      },
      {
        name: '休息',
        value: 120, // 2小时
        children: [
          { name: '娱乐', value: 90 },
          { name: '运动', value: 30 }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">旭日图组件测试</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <SunburstChart data={testData} width={500} height={500} />
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">测试说明</h2>
          <ul className="space-y-2 text-gray-600">
            <li>• 这是一个真正的圆形旭日图，不是矩形树图</li>
            <li>• 支持多层嵌套数据结构</li>
            <li>• 鼠标悬停显示详细信息</li>
            <li>• 点击有子项的扇形区域可以展开/收起子项</li>
            <li>• 白色圆点表示可展开的区域</li>
            <li>• 颜色自动分配，支持自定义颜色</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestSunburstPage;
