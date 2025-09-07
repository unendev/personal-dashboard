
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

const RUANYIFENG_FEED = {
  source: '阮一峰周刊',
  url: 'https://www.ruanyifeng.com/blog/atom.xml',
  avatar: 'https://www.ruanyifeng.com/blog/images/person2_s.jpg',
};

export const revalidate = 600; // Revalidate every 10 minutes

export async function GET() {
  try {
    const response = await axios.get(RUANYIFENG_FEED.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const feed = await parser.parseString(response.data);
    const items: FeedItem[] = feed.items.slice(0, 5).map(item => ({ // 获取最新的5条
      source: RUANYIFENG_FEED.source,
      avatar: RUANYIFENG_FEED.avatar,
      author: item.creator || feed.title || 'Unknown author',
      title: item.title || 'No title',
      summary: item.contentSnippet?.slice(0, 150) || 'No summary', // 增加摘要长度
      timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      url: item.link,
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error('Failed to fetch Ruan Yi Feng RSS feed:', error);
    return NextResponse.json({ error: 'Failed to fetch Ruan Yi Feng RSS feed' }, { status: 500 });
  }
}