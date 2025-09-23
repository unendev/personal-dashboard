'use client';

import React from 'react';

const URLTest = () => {
  const testUrlGeneration = () => {
    // 模拟数据
    const mockUser = {
      id: 'mock-user-1',
      name: 'Elon Musk',
      username: 'elonmusk',
      profile_image_url: 'https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg'
    };

    const mockTweet = {
      id: '1234567890',
      text: 'Test tweet',
      created_at: new Date().toISOString(),
      public_metrics: {
        retweet_count: 100,
        like_count: 500,
        reply_count: 50,
        quote_count: 10
      },
      author_id: 'mock-user-1'
    };

    // 生成URL
    const tweetUrl = `https://twitter.com/${mockUser.username}/status/${mockTweet.id}`;
    const userUrl = `https://twitter.com/${mockUser.username}`;

    console.log('URL Test Results:', {
      mockUser,
      mockTweet,
      tweetUrl,
      userUrl
    });

    // 测试点击
    const testClick = (url: string, type: string) => {
      console.log(`Testing ${type} click:`, url);
      // 在实际环境中，这会打开新标签页
      // window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
      <div className="p-4 bg-white rounded-lg">
        <h3 className="font-bold mb-2">URL生成测试</h3>
        <div className="space-y-2">
          <div>
            <strong>推文URL:</strong> 
            <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 ml-2">
              {tweetUrl}
            </a>
          </div>
          <div>
            <strong>用户URL:</strong> 
            <a href={userUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 ml-2">
              {userUrl}
            </a>
          </div>
          <div className="mt-4 space-x-2">
            <button
              onClick={() => testClick(tweetUrl, 'tweet')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              测试推文点击
            </button>
            <button
              onClick={() => testClick(userUrl, 'user')}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm"
            >
              测试用户点击
            </button>
          </div>
        </div>
      </div>
    );
  };

  return testUrlGeneration();
};

export default URLTest;

