'use client';

import React, { useState, useEffect } from 'react';

const TwitterDebug = () => {
  const [debugData, setDebugData] = useState<{
    userApi?: { status: number; data: unknown };
    tweetsApi?: { status: number; data: unknown };
    error?: string;
    cacheStats?: unknown;
    timestamp?: string;
  } | null>(null);

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        // 测试用户API
        const userResponse = await fetch('/api/twitter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'elonmusk' })
        });
        const userData = await userResponse.json();

        // 测试推文API
        const tweetsResponse = await fetch('/api/twitter?userId=2244994945&maxResults=3');
        const tweetsData = await tweetsResponse.json();

        setDebugData({
          userApi: {
            status: userResponse.status,
            data: userData
          },
          tweetsApi: {
            status: tweetsResponse.status,
            data: tweetsData
          }
        });
      } catch (error) {
        setDebugData({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    fetchDebugData();
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-2">Twitter API 调试信息</h3>
      <pre className="text-xs overflow-auto max-h-96 bg-white p-2 rounded">
        {JSON.stringify(debugData, null, 2)}
      </pre>
    </div>
  );
};

export default TwitterDebug;



