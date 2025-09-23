'use client';

import React, { useState } from 'react';
import TwitterCard from '@/app/components/TwitterCard';
import TwitterDebug from '@/app/components/TwitterDebug';
import URLTest from '@/app/components/URLTest';
import RealAPITest from '@/app/components/RealAPITest';

const TwitterTestPage = () => {
  const [testResults, setTestResults] = useState<{
    name: string;
    success: boolean;
    message: string;
    data?: unknown;
  }[]>([]);

  const runTests = async () => {
    const tests = [
      {
        name: '测试用户API',
        test: async () => {
          const response = await fetch('/api/twitter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'elonmusk' })
          });
          return await response.json();
        }
      },
      {
        name: '测试推文API',
        test: async () => {
          const response = await fetch('/api/twitter?userId=2244994945&maxResults=3');
          return await response.json();
        }
      },
      {
        name: '测试缓存统计',
        test: async () => {
          const response = await fetch('/api/twitter/cache');
          return await response.json();
        }
      }
    ];

    const results = [];
    for (const test of tests) {
      try {
        console.log(`运行测试: ${test.name}`);
        const result = await test.test();
        results.push({
          name: test.name,
          success: true,
          message: '测试成功',
          data: result
        });
      } catch (error) {
        results.push({
          name: test.name,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setTestResults(results);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Twitter功能测试页面
        </h1>

        {/* 测试按钮 */}
        <div className="text-center mb-8">
          <button
            onClick={runTests}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            🧪 运行所有测试
          </button>
        </div>

        {/* 测试结果 */}
        {testResults.length > 0 && (
          <div className="bg-white/10 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">测试结果</h2>
            <div className="space-y-3">
              {testResults.map((test, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    test.success ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{test.success ? '✅' : '❌'}</span>
                    <span className="font-medium">{test.name}</span>
                  </div>
                  {test.success ? (
                    <pre className="mt-2 text-xs opacity-80 overflow-x-auto">
                      {JSON.stringify(test.data, null, 2)}
                    </pre>
                  ) : (
                    <div className="mt-2 text-sm opacity-80">
                      错误: {test.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

         {/* 状态检查 */}
         <div className="bg-white/5 rounded-lg p-6 mb-8">
           <h2 className="text-xl font-semibold text-white mb-4">功能状态</h2>
           <div className="text-white/60">状态检查功能已移除</div>
         </div>

         {/* 调试信息 */}
         <div className="bg-white/5 rounded-lg p-6 mb-8">
           <h2 className="text-xl font-semibold text-white mb-4">调试信息</h2>
           <TwitterDebug />
         </div>

         {/* URL测试 */}
         <div className="bg-white/5 rounded-lg p-6 mb-8">
           <h2 className="text-xl font-semibold text-white mb-4">URL生成测试</h2>
           <URLTest />
         </div>

         {/* 真实API测试 */}
         <div className="bg-white/5 rounded-lg p-6 mb-8">
           <h2 className="text-xl font-semibold text-white mb-4">真实API测试</h2>
           <RealAPITest />
         </div>

         {/* Twitter卡片组件 */}
         <div className="bg-white/5 rounded-lg p-6">
           <h2 className="text-xl font-semibold text-white mb-4">Twitter卡片组件</h2>
           <div className="bg-white/5 rounded-lg">
             <TwitterCard />
           </div>
         </div>

        {/* 功能说明 */}
        <div className="mt-8 bg-white/5 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">功能说明</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white/80">
            <div>
              <h3 className="font-semibold text-white mb-2">🖱️ 点击交互</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>点击推文卡片 → 跳转到Twitter查看完整推文</li>
                <li>点击用户头像 → 跳转到用户Twitter主页</li>
                <li>点击用户名 → 跳转到用户Twitter主页</li>
                <li>点击&ldquo;在Twitter中查看&rdquo;按钮 → 跳转到用户主页</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">🎨 视觉效果</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>悬停时卡片背景变亮</li>
                <li>悬停时用户名变蓝色</li>
                <li>悬停时显示链接图标</li>
                <li>悬停时显示&ldquo;在Twitter中查看&rdquo;提示</li>
                <li>头像悬停时显示蓝色边框</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 使用提示 */}
        <div className="mt-6 bg-blue-500/20 rounded-lg p-4">
          <h3 className="font-semibold text-blue-200 mb-2">💡 使用提示</h3>
          <ul className="list-disc list-inside space-y-1 text-blue-100 text-sm">
            <li>所有链接都会在新标签页中打开</li>
            <li>API失败时会自动使用模拟数据</li>
            <li>支持搜索任意Twitter用户名</li>
            <li>数据会自动缓存1小时以提高性能</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TwitterTestPage;
