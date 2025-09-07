
import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import axios from 'axios';

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

export const revalidate = 600; // Revalidate every 10 minutes

export async function GET() {
  try {
    const rssPromises = RSS_FEEDS.map(async (feedInfo) => {
      try {
        const response = await axios.get(feedInfo.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image