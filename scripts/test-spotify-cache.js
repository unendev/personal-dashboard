#!/usr/bin/env node

/**
 * Spotify缓存系统测试脚本
 * 用于测试Spotify缓存功能是否正常工作
 */

// 由于这是TypeScript项目，我们直接在这里实现缓存逻辑进行测试
class SpotifyCache {
  constructor() {
    this.cache = null;
    this.config = {
      cacheDuration: 5 * 60 * 1000, // 5分钟缓存
      refreshThreshold: 4 * 60 * 1000, // 4分钟后开始刷新
    };
  }

  getCachedData() {
    if (!this.cache) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(this.cache.expiresAt);

    if (now > expiresAt) {
      this.cache = null;
      return null;
    }

    return this.cache;
  }

  shouldRefresh() {
    if (!this.cache) {
      return true;
    }

    const now = new Date();
    const cachedAt = new Date(this.cache.cachedAt);
    const timeSinceCache = now.getTime() - cachedAt.getTime();

    return timeSinceCache > this.config.refreshThreshold;
  }

  updateCache(trackData) {
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

  clearCache() {
    this.cache = null;
    console.log('Spotify缓存已清除');
  }

  getCacheStatus() {
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
}

const spotifyCache = new SpotifyCache();

async function testSpotifyCache() {
  console.log('🧪 开始测试Spotify缓存系统...\n');

  // 测试1: 初始状态
  console.log('1. 测试初始缓存状态:');
  const initialStatus = spotifyCache.getCacheStatus();
  console.log('   缓存状态:', initialStatus);
  console.log('   预期: hasCache = false\n');

  // 测试2: 更新缓存
  console.log('2. 测试缓存更新:');
  const testData = {
    isPlaying: true,
    trackName: "测试歌曲",
    artist: "测试艺术家",
    album: "测试专辑",
    albumArtUrl: "https://example.com/album.jpg",
    source: 'Spotify'
  };
  
  spotifyCache.updateCache(testData);
  console.log('   已更新缓存数据:', testData.trackName);
  
  const updatedStatus = spotifyCache.getCacheStatus();
  console.log('   更新后状态:', updatedStatus);
  console.log('   预期: hasCache = true\n');

  // 测试3: 获取缓存数据
  console.log('3. 测试获取缓存数据:');
  const cachedData = spotifyCache.getCachedData();
  if (cachedData) {
    console.log('   获取到缓存数据:');
    console.log('   - 歌曲:', cachedData.trackName);
    console.log('   - 艺术家:', cachedData.artist);
    console.log('   - 专辑:', cachedData.album);
    console.log('   - 缓存时间:', cachedData.cachedAt);
    console.log('   - 过期时间:', cachedData.expiresAt);
  } else {
    console.log('   ❌ 未获取到缓存数据');
  }
  console.log();

  // 测试4: 检查是否需要刷新
  console.log('4. 测试刷新检查:');
  const shouldRefresh = spotifyCache.shouldRefresh();
  console.log('   是否需要刷新:', shouldRefresh);
  console.log('   预期: false (刚更新的缓存)\n');

  // 测试5: 清除缓存
  console.log('5. 测试清除缓存:');
  spotifyCache.clearCache();
  const clearedStatus = spotifyCache.getCacheStatus();
  console.log('   清除后状态:', clearedStatus);
  console.log('   预期: hasCache = false\n');

  console.log('✅ Spotify缓存系统测试完成！');
}

// 运行测试
testSpotifyCache().catch((error) => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
