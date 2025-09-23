// 简化的内存缓存服务
interface TwitterUserData {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
  };
}

interface TwitterTweetData {
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

class SimpleTwitterCache {
  private static userCache = new Map<string, { data: TwitterUserData; expires: number }>();
  private static tweetCache = new Map<string, { data: TwitterTweetData[]; expires: number }>();
  private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1小时

  static getCachedUser(username: string): TwitterUserData | null {
    const cached = this.userCache.get(username);
    if (cached && cached.expires > Date.now()) {
      console.log(`Cache hit for user: ${username}`);
      return cached.data;
    }
    console.log(`Cache miss for user: ${username}`);
    return null;
  }

  static setCachedUser(username: string, userData: TwitterUserData): void {
    this.userCache.set(username, {
      data: userData,
      expires: Date.now() + this.CACHE_DURATION
    });
    console.log(`Cached user: ${username}`);
  }

  static getCachedTweets(userId: string): TwitterTweetData[] | null {
    const cached = this.tweetCache.get(userId);
    if (cached && cached.expires > Date.now()) {
      console.log(`Cache hit for tweets: ${userId}`);
      return cached.data;
    }
    console.log(`Cache miss for tweets: ${userId}`);
    return null;
  }

  static setCachedTweets(userId: string, tweets: TwitterTweetData[]): void {
    this.tweetCache.set(userId, {
      data: tweets,
      expires: Date.now() + this.CACHE_DURATION
    });
    console.log(`Cached tweets for user: ${userId}`);
  }

  static clearExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.userCache.entries()) {
      if (value.expires <= now) {
        this.userCache.delete(key);
      }
    }
    for (const [key, value] of this.tweetCache.entries()) {
      if (value.expires <= now) {
        this.tweetCache.delete(key);
      }
    }
  }

  static getStats() {
    return {
      userCacheSize: this.userCache.size,
      tweetCacheSize: this.tweetCache.size
    };
  }
}

export { SimpleTwitterCache };
export type { TwitterUserData, TwitterTweetData };
