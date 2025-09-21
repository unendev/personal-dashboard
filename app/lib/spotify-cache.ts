// Spotify 音乐数据缓存系统
interface SpotifyTrackData {
  isPlaying: boolean;
  trackName: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  source: string;
  cachedAt: string;
  expiresAt: string;
}

interface SpotifyCacheConfig {
  cacheDuration: number; // 缓存持续时间（毫秒）
  refreshThreshold: number; // 刷新阈值（毫秒）
}

class SpotifyCache {
  private static instance: SpotifyCache;
  private cache: SpotifyTrackData | null = null;
  private config: SpotifyCacheConfig = {
    cacheDuration: 5 * 60 * 1000, // 5分钟缓存
    refreshThreshold: 4 * 60 * 1000, // 4分钟后开始刷新
  };

  private constructor() {}

  public static getInstance(): SpotifyCache {
    if (!SpotifyCache.instance) {
      SpotifyCache.instance = new SpotifyCache();
    }
    return SpotifyCache.instance;
  }

  /**
   * 获取缓存的音乐数据
   */
  public getCachedData(): SpotifyTrackData | null {
    if (!this.cache) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(this.cache.expiresAt);

    // 检查缓存是否过期
    if (now > expiresAt) {
      this.cache = null;
      return null;
    }

    return this.cache;
  }

  /**
   * 检查是否需要刷新缓存
   */
  public shouldRefresh(): boolean {
    if (!this.cache) {
      return true;
    }

    const now = new Date();
    const cachedAt = new Date(this.cache.cachedAt);
    const timeSinceCache = now.getTime() - cachedAt.getTime();

    return timeSinceCache > this.config.refreshThreshold;
  }

  /**
   * 更新缓存数据
   */
  public updateCache(trackData: Omit<SpotifyTrackData, 'cachedAt' | 'expiresAt'>): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.cacheDuration);

    this.cache = {
      ...trackData,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    console.log('Spotify缓存已更新:', {
      track: trackData.trackName,
      artist: trackData.artist,
      cachedAt: this.cache.cachedAt,
      expiresAt: this.cache.expiresAt,
    });
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.cache = null;
    console.log('Spotify缓存已清除');
  }

  /**
   * 获取缓存状态信息
   */
  public getCacheStatus(): {
    hasCache: boolean;
    isExpired: boolean;
    timeUntilExpiry?: number;
    cachedTrack?: string;
  } {
    if (!this.cache) {
      return { hasCache: false, isExpired: false };
    }

    const now = new Date();
    const expiresAt = new Date(this.cache.expiresAt);
    const isExpired = now > expiresAt;
    const timeUntilExpiry = isExpired ? 0 : expiresAt.getTime() - now.getTime();

    return {
      hasCache: true,
      isExpired,
      timeUntilExpiry,
      cachedTrack: this.cache.trackName,
    };
  }

  /**
   * 设置缓存配置
   */
  public setConfig(config: Partial<SpotifyCacheConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 导出单例实例
export const spotifyCache = SpotifyCache.getInstance();

// 导出类型
export type { SpotifyTrackData, SpotifyCacheConfig };
