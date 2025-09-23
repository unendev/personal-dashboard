'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  author_id: string;
  attachments?: {
    media_keys: string[];
  };
}

interface User {
  id: string;
  name: string;
  username: string;
  profile_image_url: string;
}

interface Media {
  media_key: string;
  type: 'photo' | 'video' | 'animated_gif';
  url?: string;
  preview_image_url?: string;
  width: number;
  height: number;
  alt_text?: string;
}

interface TwitterData {
  data: Tweet[];
  includes: {
    users: User[];
    media?: Media[];
  };
}

const TwitterCard: React.FC = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('nekomataokayu'); // 默认用户名
  const [dataSource, setDataSource] = useState<'api' | 'mock' | 'loading'>('loading');

  const fetchTweets = useCallback(async (targetUsername?: string) => {
    try {
      setLoading(true);
      setError(null);
      setDataSource('loading'); // 开始加载时设置为loading

      const searchUsername = targetUsername || username;
      console.log('Searching for user:', searchUsername);

      const response = await fetch('/api/twitter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: searchUsername }),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        // API请求失败，直接使用模拟数据
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result: TwitterData & { meta?: { cached: boolean } } = await response.json();
      console.log('API data:', result);
      
      setTweets(result.data || []);
      setUsers(result.includes?.users || []);
      setMedia(result.includes?.media || []);
      setDataSource('api'); // 标记数据来源为API
      console.log(`Data source: ${result.meta?.cached ? 'Cache' : 'API'}`);

    } catch (err) {
      console.error('Error fetching tweets:', err);
      console.log('Using mock data due to error...');
      
      const mockTweets = getMockTweets();
      const mockUsers = getMockUsers();
      const mockMedia = getMockMedia();
      setTweets(mockTweets);
      setUsers(mockUsers);
      setMedia(mockMedia);
      setError(null); // 清除错误，因为使用了模拟数据
      setDataSource('mock'); // 标记数据来源
      
      // 调试模拟数据
      console.log('Mock data set due to error:', {
        tweets: mockTweets,
        users: mockUsers
      });
    } finally {
      setLoading(false);
    }
  }, [username]);

  // 模拟数据函数
  const getMockTweets = (): Tweet[] => [
    {
      id: '1234567890123456789', // 真实的Twitter ID格式
      text: '🎮 今天玩了一些有趣的游戏，发现了很多新的玩法！',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
      public_metrics: {
        retweet_count: 125,
        like_count: 890,
        reply_count: 34,
        quote_count: 12
      },
      author_id: '1234567890', // nekomataokayu的模拟Twitter ID
      attachments: {
        media_keys: ['13_12345']
      }
    },
    {
      id: '1234567890123456790', // 真实的Twitter ID格式
      text: '💭 思考一些关于技术和创意的问题，生活总是充满惊喜',
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5小时前
      public_metrics: {
        retweet_count: 89,
        like_count: 560,
        reply_count: 21,
        quote_count: 8
      },
      author_id: '1234567890' // nekomataokayu的模拟Twitter ID
    },
    {
      id: '1234567890123456791', // 真实的Twitter ID格式
      text: '🌟 每一天都是新的开始，保持好奇心和创造力！',
      created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8小时前
      public_metrics: {
        retweet_count: 210,
        like_count: 1200,
        reply_count: 45,
        quote_count: 20
      },
      author_id: '1234567890' // nekomataokayu的模拟Twitter ID
    }
  ];

  const getMockUsers = (): User[] => [
    {
      id: '1234567890', // nekomataokayu的模拟Twitter ID
      name: 'nekomataokayu',
      username: 'nekomataokayu',
      profile_image_url: 'https://pbs.twimg.com/profile_images/default_profile_400x400.png'
    }
  ];

  const getMockMedia = (): Media[] => [
    {
      media_key: '13_12345',
      type: 'photo',
      url: 'https://pbs.twimg.com/media/GOQx2gEXAAAPurl?format=jpg&name=large',
      width: 1920,
      height: 1080,
      alt_text: 'A vibrant and colorful abstract painting.'
    }
  ];

  useEffect(() => {
    fetchTweets();
  }, [fetchTweets]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handleSearch = () => {
    fetchTweets(username);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}天前`;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getUserInfo = (authorId: string) => {
    const foundUser = users.find(user => user.id === authorId);
    console.log('getUserInfo:', {
      authorId,
      users: users,
      foundUser: foundUser
    });
    return foundUser;
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/60"></div>
        <span className="ml-2 text-white/60">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-400 mb-2">⚠️ 加载失败</div>
        <div className="text-white/60 text-sm mb-3">{error}</div>
        <button
          onClick={() => fetchTweets()}
          className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* 数据来源指示器 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded ${
            dataSource === 'api' ? 'bg-green-500/20 text-green-400' :
            dataSource === 'mock' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {dataSource === 'api' ? '🟢 真实数据' :
             dataSource === 'mock' ? '🟡 模拟数据' :
             '⚪ 加载中'}
          </span>
          {dataSource === 'mock' && (
            <span className="text-xs text-yellow-400">
              (API不可用，使用模拟数据)
            </span>
          )}
        </div>
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="输入Twitter用户名"
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
          >
            搜索
          </button>
        </div>
      </div>

      {/* 推文列表 */}
      <div className="space-y-3">
        {tweets.length === 0 ? (
          <div className="text-center text-white/60 py-4">
            <p>暂无推文</p>
          </div>
        ) : (
          tweets.map((tweet) => {
            const user = getUserInfo(tweet.author_id);
            const tweetUrl = `https://twitter.com/${user?.username || 'elonmusk'}/status/${tweet.id}`;
            const tweetMedia = tweet.attachments?.media_keys
              ?.map(key => media.find(m => m.media_key === key))
              .filter((m): m is Media => !!m);

            // 调试信息
            console.log('Tweet data:', {
              tweetId: tweet.id,
              authorId: tweet.author_id,
              user: user,
              tweetUrl: tweetUrl
            });
            
            return (
              <div 
                key={tweet.id} 
                className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group"
                onClick={() => window.open(tweetUrl, '_blank', 'noopener,noreferrer')}
                title="点击跳转到Twitter查看完整推文"
              >
                {/* 用户信息 */}
                {user && (
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-6 h-6 rounded-full hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer overflow-hidden"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://twitter.com/${user.username}`, '_blank', 'noopener,noreferrer');
                      }}
                      title="点击查看用户主页"
                    >
                      {user.profile_image_url ? (
                        <Image
                          src={user.profile_image_url}
                          alt={user.name}
                          width={24}
                          height={24}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div 
                        className="text-white text-sm font-medium group-hover:text-blue-300 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://twitter.com/${user.username}`, '_blank', 'noopener,noreferrer');
                        }}
                        title="点击查看用户主页"
                      >
                        {user.name}
                      </div>
                      <div 
                        className="text-white/60 text-xs group-hover:text-blue-200 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://twitter.com/${user.username}`, '_blank', 'noopener,noreferrer');
                        }}
                        title="点击查看用户主页"
                      >
                        @{user.username}
                      </div>
                    </div>
                    <div className="text-white/40 text-xs">
                      {formatDate(tweet.created_at)}
                    </div>
                    <div className="text-white/30 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      🔗
                    </div>
                  </div>
                )}

                {/* 推文内容 */}
                <div className="text-white/90 text-sm mb-3 leading-relaxed group-hover:text-white transition-colors">
                  {tweet.text}
                </div>

                {/* 推文图片 */}
                {tweetMedia && tweetMedia.length > 0 && (
                  <div className="mt-2.5">
                    {tweetMedia.map(m => {
                      if (m.type === 'photo' && m.url) {
                        return (
                          <div key={m.media_key} className="overflow-hidden rounded-lg border border-white/10">
                            <Image
                              src={m.url}
                              alt={m.alt_text || 'Tweet image'}
                              width={m.width}
                              height={m.height}
                              className="w-full h-auto object-cover"
                              unoptimized
                            />
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                {/* 互动数据 */}
                <div className="flex gap-4 text-white/60 text-xs mt-3">
                  <div className="flex items-center gap-1">
                    <span>💬</span>
                    <span>{formatNumber(tweet.public_metrics.reply_count)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>🔄</span>
                    <span>{formatNumber(tweet.public_metrics.retweet_count)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>❤️</span>
                    <span>{formatNumber(tweet.public_metrics.like_count)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>💬</span>
                    <span>{formatNumber(tweet.public_metrics.quote_count)}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-blue-400">在Twitter中查看 →</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex justify-center gap-3">
        <button
          onClick={() => fetchTweets()}
          className="px-4 py-2 bg-white/10 text-white/80 rounded-lg text-sm hover:bg-white/20 transition-colors"
        >
          🔄 刷新
        </button>
        
        {tweets.length > 0 && users.length > 0 && (
          <button
            onClick={() => {
              const user = users[0];
              if (user) {
                window.open(`https://twitter.com/${user.username}`, '_blank', 'noopener,noreferrer');
              }
            }}
            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
          >
            🐦 在Twitter中查看
          </button>
        )}
      </div>
    </div>
  );
};

export default TwitterCard;
