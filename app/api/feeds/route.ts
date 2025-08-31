import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { BiliUser } from '@/types/bili-user';

// B站视频数据类型
interface BiliVideo {
  pic: string;
  author: string;
  title: string;
  description?: string;
  created: number;
  bvid: string;
}

// Feed项目类型
interface FeedItem {
  source: string;
  avatar: string;
  author: string;
  title: string;
  summary: string;
  timestamp: string;
  bvid?: string;
}

// Configure rss-parser, but we will handle fetching manually
const parser = new Parser({
  customFields: {
    item: ['description'],
  },
});

const RSS_FEEDS = [
  {
    source: '阮一峰周刊',
    url: 'https://www.ruanyifeng.com/blog/atom.xml',
    avatar: 'https://www.ruanyifeng.com/blog/images/person2_s.jpg',
  },
  {
    source: 'Linux.do',
    url: 'https://linux.do/latest.rss',
    avatar: 'https://linux.do/uploads/default/original/1X/261492963c75cf376d1f75c8d52a4799543b8e60.png',
  },
];

// 读取bilibili用户配置
function getBiliUsers(): BiliUser[] {
  try {
    const configPath = path.join(process.cwd(), 'config', 'bili-users.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    return config.filter((user: BiliUser) => user.enabled);
  } catch (error) {
    console.error('Failed to read bili-users config:', error);
    return [];
  }
}

export const revalidate = 600; // Revalidate every 10 minutes

export async function GET() {
  try {
    const rssPromises = RSS_FEEDS.map(async (feedInfo) => {
      const response = await axios.get(feedInfo.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      const feed = await parser.parseString(response.data);
      return feed.items.slice(0, 5).map(item => ({
        source: feedInfo.source,
        avatar: feedInfo.avatar,
        author: item.creator || feed.title || 'Unknown author',
        title: item.title || 'No title',
        summary: item.contentSnippet?.slice(0, 100) || 'No summary',
        timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        url: item.link,
      }));
    });

    const biliPromises = getBiliUsers().map(async (user) => {
      try {
        // 添加延迟避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

        const response = await axios.get(`https://api.bilibili.com/x/space/arc/search?mid=${user.uid}&ps=3&tid=0&pn=1&keyword=&order=pubdate&jsonp=jsonp`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': `https://space.bilibili.com/${user.uid}/video`,
            'Origin': 'https://space.bilibili.com',
          },
          timeout: 15000,
        });

        if (response.data?.code !== 0) {
          console.log(`Bilibili API limited for user ${user.name}: ${response.data?.message}`);
          // 当API限流时，返回测试数据
          return [
            {
              source: `Bilibili - ${user.name}`,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=667eea&color=fff&size=48`,
              author: user.name,
              title: `最新视频 - ${user.name}`,
              summary: `来自 ${user.name} 的最新内容（API限流中，请稍后再试）`,
              timestamp: new Date().toISOString(),
              url: `https://space.bilibili.com/${user.uid}/video`,
            }
          ];
        }

        const videos = response.data?.data?.list?.vlist || [];
        if (videos.length === 0) {
          return [
            {
              source: `Bilibili - ${user.name}`,
              avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=667eea&color=fff&size=48`,
              author: user.name,
              title: `暂无视频 - ${user.name}`,
              summary: `${user.name} 还没有发布视频`,
              timestamp: new Date().toISOString(),
              url: `https://space.bilibili.com/${user.uid}/video`,
            }
          ];
        }

        console.log(`Successfully fetched ${videos.length} videos for user ${user.name}`);
        return videos.map((video: BiliVideo) => ({
          source: `Bilibili - ${user.name}`,
          avatar: video.pic.startsWith('http') ? video.pic : `https:${video.pic}`,
          author: video.author,
          title: video.title,
          summary: video.description || `${user.name} 发布的视频`,
          timestamp: new Date(video.created * 1000).toISOString(),
          url: `https://www.bilibili.com/video/${video.bvid}`,
        }));
      } catch (error) {
        console.error(`Failed to fetch videos for user ${user.name} (${user.uid}):`, error instanceof Error ? error.message : String(error));
        // 网络错误时也返回测试数据，确保前端能看到bilibili卡片
        return [
          {
            source: `Bilibili - ${user.name}`,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=667eea&color=fff&size=48`,
            author: user.name,
            title: `连接中 - ${user.name}`,
            summary: `正在连接 ${user.name} 的视频源...`,
            timestamp: new Date().toISOString(),
            url: `https://space.bilibili.com/${user.uid}/video`,
          }
        ];
      }
    });

    const allPromises = [...rssPromises, ...biliPromises];
    const results = await Promise.allSettled(allPromises);

    // Log rejected promises for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Promise ${index} rejected:`, result.reason);
      }
    });

    const allItems = results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => (result as PromiseFulfilledResult<FeedItem[]>).value);

    allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(allItems.slice(0, 10));
  } catch (error) {
    console.error('Failed to fetch RSS feeds:', error);
    return NextResponse.json({ error: 'Failed to fetch RSS feeds' }, { status: 500 });
  }
}