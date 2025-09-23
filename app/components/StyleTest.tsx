'use client';

import React from 'react';

const StyleTest = () => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="font-bold mb-4 text-gray-800">样式测试</h3>
      
      <div className="space-y-2 mb-4">
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mr-2">
          蓝色按钮
        </button>
        <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors mr-2">
          绿色按钮
        </button>
        <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors">
          紫色按钮
        </button>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
        <h4 className="font-semibold text-yellow-800 mb-2">测试说明</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 如果你能看到这个样式，说明CSS正常工作</li>
          <li>• 按钮应该有颜色和悬停效果</li>
          <li>• 背景应该是黄色</li>
        </ul>
      </div>

      <div className="mt-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600 text-center">加载动画测试</p>
      </div>
    </div>
  );
};

export default StyleTest;

