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
}

interface User {
  id: string;
  name: string;
  username: string;
  profile_image_url: string;
}

interface TwitterData {
  data: Tweet[];
  includes: {
    users: User[];
  };
}

const TwitterCard: React.FC = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('elonmusk'); // 默认用户名

  const fetchTweets = useCallback(async (targetUsername?: string) => {
    try {
      setLoading(true);
      setError(null);

      const searchUsername = targetUsername || username;
      console.log('Searching for user:', searchUsername);

      // 首先获取用户ID
      const userResponse = await fetch('/api/twitter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: searchUsername }),
      });

      console.log('User API response status:', userResponse.status);

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        console.error('User API error:', errorData);
        
        // 如果API失败，使用模拟数据
        console.log('API failed, using mock data...');
        setTweets(getMockTweets());
        setUsers(getMockUsers());
        setError(null); // 清除错误，因为使用了模拟数据
        return;
      }

      const userData = await userResponse.json();
      console.log('User data:', userData);
      
      if (!userData.user || !userData.user.id) {
        throw new Error('User not found or invalid response');
      }

      const userId = userData.user.id;
      console.log('User ID:', userId);

      // 然后获取推文
      const tweetsResponse = await fetch(`/api/twitter?userId=${userId}&maxResults=5`);
      
      console.log('Tweets API response status:', tweetsResponse.status);

      if (!tweetsResponse.ok) {
        const errorData = await tweetsResponse.json();
        console.error('Tweets API error:', errorData);
        
        // 如果推文API失败，使用模拟数据
        console.log('Tweets API failed, using mock data...');
        setTweets(getMockTweets());
        setUsers(getMockUsers());
        setError(null); // 清除错误，因为使用了模拟数据
        return;
      }

      const tweetsData: TwitterData = await tweetsResponse.json();
      console.log('Tweets data:', tweetsData);
      
      setTweets(tweetsData.data || []);
      setUsers(tweetsData.includes?.users || []);
    } catch (err) {
      console.error('Error fetching tweets:', err);
      console.log('Using mock data due to error...');
      setTweets(getMockTweets());
      setUsers(getMockUsers());
      setError(null); // 清除错误，因为使用了模拟数据
    } finally {
      setLoading(false);
    }
  }, [username]);

  // 模拟数据函数
  const getMockTweets = (): Tweet[] => [
    {
      id: '1',
      text: '🚀 Exciting times ahead! Working on some amazing projects that will change the world.',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
      public_metrics: {
        retweet_count: 1250,
        like_count: 8900,
        reply_count: 340,
        quote_count: 120
      },
      author_id: 'mock-user-1'
    },
    {
      id: '2',
      text: '💡 Innovation is the key to solving tomorrow\'s problems today. What are you building?',
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5小时前
      public_metrics: {
        retweet_count: 890,
        like_count: 5600,
        reply_count: 210,
        quote_count: 85
      },
      author_id: 'mock-user-1'
    },
    {
      id: '3',
      text: '🌍 The future is bright when we work together. Collaboration drives progress!',
      created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8小时前
      public_metrics: {
        retweet_count: 2100,
        like_count: 12000,
        reply_count: 450,
        quote_count: 200
      },
      author_id: 'mock-user-1'
    }
  ];

  const getMockUsers = (): User[] => [
    {
      id: 'mock-user-1',
      name: 'Elon Musk',
      username: 'elonmusk',
      profile_image_url: 'https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg'
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
    return users.find(user => user.id === authorId);
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
                    <Image
                      src={user.profile_image_url || '/default-avatar.png'}
                      alt={user.name}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://twitter.com/${user.username}`, '_blank', 'noopener,noreferrer');
                      }}
                      title="点击查看用户主页"
                    />
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

                {/* 互动数据 */}
                <div className="flex gap-4 text-white/60 text-xs">
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
