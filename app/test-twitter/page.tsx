'use client';

import React, { useState } from 'react';

const TwitterAPITest = () => {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data?: unknown;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/twitter/test');
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Test request failed',
        data: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const testUserAPI = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/twitter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'elonmusk' }),
      });

      const data = await response.json();
      setTestResult({
        success: response.ok,
        message: response.ok ? 'User API test successful' : 'User API test failed',
        data: data
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'User API test failed',
        data: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Twitter API 测试</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={runTest}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '测试中...' : '测试 Twitter API 连接'}
        </button>
        
        <button
          onClick={testUserAPI}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 ml-4"
        >
          {loading ? '测试中...' : '测试用户 API'}
        </button>
      </div>

      {testResult && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-bold mb-2">测试结果:</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">说明</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>第一个按钮测试 Twitter API 的基本连接和 Bearer Token 有效性</li>
          <li>第二个按钮测试获取用户信息的功能</li>
          <li>如果测试失败，Twitter 卡片会自动使用模拟数据</li>
          <li>查看浏览器控制台获取详细的调试信息</li>
        </ul>
      </div>
    </div>
  );
};

export default TwitterAPITest;
