import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import axios from 'axios';

// Feed项目类型
interface FeedItem {
  source: string;
  avatar: string;
  author: string;
  title: string;
  summary: string;
  timestamp: string;
  url?: string;
}

// Configure rss-parser
const parser = new Parser({
  customFields: {
    item: ['description'],
  },
});

const RSS_FEEDS = [
  {
    source: 'Linux.do',
    url: 'https://linux.do/latest.rss',
    avatar: 'https://linux.do/uploads/default/original/1X/261492963c75cf376d1f75c8d52a4799543b8e60.png',
  },
];

export const revalidate = 600; // Revalidate every 10 minutes

export async function GET() {
  try {
    const rssPromises = RSS_FEEDS.map(async (feedInfo) => {
      const response = await axios.get(feedInfo.url, {
        timeout: 15000, // 增加超时时间到15秒
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      const feed = await parser.parseString(response.data);
      return feed.items.slice(0, 1).map(item => ({
        source: feedInfo.source,
        avatar: feedInfo.avatar,
        author: item.creator || feed.title || 'Unknown author',
        title: item.title || 'No title',
        summary: item.contentSnippet?.slice(0, 100) || 'No summary',
        timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        url: item.link,
      }));
    });

    const results = await Promise.allSettled(rssPromises);

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

    return NextResponse.json(allItems);
  } catch (error) {
    console.error('Failed to fetch RSS feeds:', error);
    return NextResponse.json({ error: 'Failed to fetch RSS feeds' }, { status: 500 });
  }
}