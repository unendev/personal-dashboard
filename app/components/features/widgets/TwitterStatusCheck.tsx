'use client';

import React, { useState, useEffect } from 'react';
import { safeFetchJSON, safePostJSON } from '@/lib/fetch-utils';

const TwitterStatusCheck = () => {
  const [status, setStatus] = useState<{
    apiStatus: 'checking' | 'working' | 'failed';
    cacheStatus: 'checking' | 'working' | 'failed';
    dataSource: 'api' | 'mock' | 'unknown';
    lastCheck: string;
  }>({
    apiStatus: 'checking',
    cacheStatus: 'checking',
    dataSource: 'unknown',
    lastCheck: new Date().toLocaleTimeString()
  });

  const checkStatus = async () => {
    setStatus(prev => ({ ...prev, apiStatus: 'checking', cacheStatus: 'checking' }));

    try {
      // 检查API状态
      const apiData = await safeFetchJSON<{ success: boolean }>('/api/twitter/test-real?type=user', {}, 0);
      
      // 检查缓存状态
      const cacheData = await safeFetchJSON<{ success: boolean }>('/api/twitter/cache', {}, 0);

      // 检查我们的API
      const ourApiData = await safePostJSON<{ cached: boolean }>('/api/twitter', { 
        username: 'elonmusk', 
        useCache: false 
      }, 0);

      setStatus({
        apiStatus: apiData.success ? 'working' : 'failed',
        cacheStatus: cacheData.success ? 'working' : 'failed',
        dataSource: ourApiData.cached ? 'api' : 'mock',
        lastCheck: new Date().toLocaleTimeString()
      });

    } catch {
      setStatus(prev => ({
        ...prev,
        apiStatus: 'failed',
        cacheStatus: 'failed',
        lastCheck: new Date().toLocaleTimeString()
      }));
    }
  };

  useEffect(() => {
    checkStatus();
    // 每30秒检查一次
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'checking': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return '✅';
      case 'failed': return '❌';
      case 'checking': return '🔄';
      default: return '❓';
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">Twitter功能状态</h3>
        <button
          onClick={checkStatus}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
        >
          刷新检查
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className={`p-3 rounded-lg ${getStatusColor(status.apiStatus)}`}>
          <div className="flex items-center gap-2">
            <span>{getStatusIcon(status.apiStatus)}</span>
            <span className="font-medium">Twitter API</span>
          </div>
          <div className="text-sm mt-1">
            {status.apiStatus === 'working' ? 'API正常工作' :
             status.apiStatus === 'failed' ? 'API连接失败' :
             '检查中...'}
          </div>
        </div>

        <div className={`p-3 rounded-lg ${getStatusColor(status.cacheStatus)}`}>
          <div className="flex items-center gap-2">
            <span>{getStatusIcon(status.cacheStatus)}</span>
            <span className="font-medium">缓存系统</span>
          </div>
          <div className="text-sm mt-1">
            {status.cacheStatus === 'working' ? '缓存正常' :
             status.cacheStatus === 'failed' ? '缓存失败' :
             '检查中...'}
          </div>
        </div>
      </div>

      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-gray-700">数据来源: </span>
            <span className={`px-2 py-1 rounded text-sm ${
              status.dataSource === 'api' ? 'bg-green-100 text-green-700' :
              status.dataSource === 'mock' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {status.dataSource === 'api' ? '🟢 真实数据' :
               status.dataSource === 'mock' ? '🟡 模拟数据' :
               '❓ 未知'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            最后检查: {status.lastCheck}
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">功能说明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Twitter API</strong>: 检查与Twitter API的连接状态</li>
          <li>• <strong>缓存系统</strong>: 检查内存缓存是否正常工作</li>
          <li>• <strong>数据来源</strong>: 显示当前使用的数据类型</li>
          <li>• 状态每30秒自动更新一次</li>
        </ul>
      </div>
    </div>
  );
};

export default TwitterStatusCheck;



