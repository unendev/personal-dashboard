'use client'

import React, { useState, useRef, useEffect } from 'react';

export default function TestFunctionsPage() {
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部区域关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (isExpanded && dropdownRef.current && !dropdownRef.current.contains(target)) {
        console.log('点击外部区域，关闭下拉框');
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      console.log('添加点击外部区域监听器');
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-8">功能测试页面</h1>
        
        {/* 测试下拉框 */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              console.log('点击按钮');
              setIsExpanded(!isExpanded);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            点击测试下拉框 {isExpanded ? '▼' : '▲'}
          </button>
          
          {isExpanded && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg p-4 border">
              <h3 className="font-semibold mb-2">下拉内容</h3>
              <p className="text-sm text-gray-600 mb-2">点击页面任何其他区域都会关闭这个下拉框</p>
              <div className="space-y-2">
                <div className="p-2 bg-gray-50 rounded">选项 1</div>
                <div className="p-2 bg-gray-50 rounded">选项 2</div>
                <div className="p-2 bg-gray-50 rounded">选项 3</div>
              </div>
            </div>
          )}
        </div>

        {/* 测试区域 */}
        <div className="mt-8 p-4 bg-white rounded-lg">
          <h3 className="font-semibold mb-2">测试说明</h3>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. 点击上面的按钮打开下拉框</li>
            <li>2. 点击这个白色区域或其他地方</li>
            <li>3. 下拉框应该自动关闭</li>
            <li>4. 查看浏览器控制台的日志信息</li>
          </ol>
        </div>

        {/* 状态显示 */}
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm">
            <strong>当前状态:</strong> {isExpanded ? '下拉框已打开' : '下拉框已关闭'}
          </p>
        </div>
      </div>
    </div>
  );
}
