'use client';

import React, { useState } from 'react';

const RealAPITest = () => {
  const [testResults, setTestResults] = useState<{
    type?: string;
    success: boolean;
    message?: string;
    error?: string;
    data?: unknown;
    userApi?: unknown;
    tweetsApi?: unknown;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const testUserAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/twitter/test-real?type=user');
      const data = await response.json();
      setTestResults({ type: 'user', ...data });
    } catch (error) {
      setTestResults({ 
        type: 'user', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const testTweetsAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/twitter/test-real?type=tweets');
      const data = await response.json();
      setTestResults({ type: 'tweets', ...data });
    } catch (error) {
      setTestResults({ 
        type: 'tweets', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const testOurAPI = async () => {
    setLoading(true);
    try {
      // 测试我们的用户API
      const userResponse = await fetch('/api/twitter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'elonmusk', useCache: false })
      });
      const userData = await userResponse.json();

      // 测试我们的推文API
      const tweetsResponse = await fetch('/api/twitter?userId=2244994945&maxResults=3&useCache=false');
      const tweetsData = await tweetsResponse.json();

      setTestResults({
        type: 'our-api',
        success: true,
        userApi: { status: userResponse.status, data: userData },
        tweetsApi: { status: tweetsResponse.status, data: tweetsData }
      });
    } catch (error) {
      setTestResults({ 
        type: 'our-api', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg">
      <h3 className="font-bold mb-4">真实API测试</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={testUserAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mr-2"
        >
          测试用户API
        </button>
        <button
          onClick={testTweetsAPI}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 mr-2"
        >
          测试推文API
        </button>
        <button
          onClick={testOurAPI}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          测试我们的API
        </button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">测试中...</p>
        </div>
      )}

      {testResults && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">
            测试结果: {testResults.type}
            <span className={`ml-2 ${testResults.success ? 'text-green-600' : 'text-red-600'}`}>
              {testResults.success ? '✅' : '❌'}
            </span>
          </h4>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-4 p-3 bg-yellow-50 rounded">
        <h4 className="font-semibold text-yellow-800 mb-2">说明</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• <strong>测试用户API</strong>: 直接调用Twitter API获取用户信息</li>
          <li>• <strong>测试推文API</strong>: 直接调用Twitter API获取推文</li>
          <li>• <strong>测试我们的API</strong>: 测试我们封装的API（禁用缓存）</li>
          <li>• 如果API失败，会显示错误信息</li>
          <li>• 如果API成功，会显示真实的数据结构</li>
        </ul>
      </div>
    </div>
  );
};

export default RealAPITest;
