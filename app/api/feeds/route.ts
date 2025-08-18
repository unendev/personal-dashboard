import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import axios from 'axios';

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

const BILI_USER_ID = 10885326; // LCTT

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

    const biliPromise = async () => {
      const response = await axios.get(`https://api.bilibili.com/x/space/arc/search?mid=${BILI_USER_ID}&ps=5&tid=0&pn=1&keyword=&order=pubdate&jsonp=jsonp`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': `https://space.bilibili.com/${BILI_USER_ID}/`,
        }
      });
      const videos = response.data?.data?.list?.vlist || [];
      return videos.map((video: any) => ({
        source: 'Bilibili',
        avatar: `https:${video.pic}`,
        author: video.author,
        title: video.title,
        summary: video.description,
        timestamp: new Date(video.created * 1000).toISOString(),
        url: `https://www.bilibili.com/video/${video.bvid}`,
      }));
    };

    const allPromises = [...rssPromises, biliPromise()];
    const results = await Promise.allSettled(allPromises);

    // Log rejected promises for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Promise ${index} rejected:`, result.reason);
      }
    });

    const allItems = results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => (result as PromiseFulfilledResult<any[]>).value);

    allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(allItems.slice(0, 10));
  } catch (error) {
    console.error('Failed to fetch RSS feeds:', error);
    return NextResponse.json({ error: 'Failed to fetch RSS feeds' }, { status: 500 });
  }
}