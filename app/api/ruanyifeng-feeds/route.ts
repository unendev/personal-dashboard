
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
  headers: {
    'Accept': 'application/rss+xml, application/xml, text/xml',
    'Accept-Charset': 'UTF-8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
  }
});

const RUANYIFENG_FEED = {
  source: '阮一峰周刊',
  url: 'https://www.ruanyifeng.com/blog/atom.xml',
  avatar: 'https://www.ruanyifeng.com/blog/images/person2_s.jpg',
};

// 修复编码问题 - 暂时注释掉未使用的函数
// function fixEncoding(text: string): string {
//   if (!text) return '';
//   
//   try {
//     // 使用Buffer来处理编码转换
//     const buffer = Buffer.from(text, 'latin1');
//     const utf8Text = buffer.toString('utf8');
//     
//     // 如果转换后的文本包含乱码，则使用原始文本
//     if (utf8Text.includes('�') || utf8Text.length !== text.length) {
//       return text;
//     }
//     
//     return utf8Text;
//   } catch (error) {
//     console.error('Encoding fix error:', error);
//     return text;
//   }
// }

// 清理摘要中的冗余广告语
function cleanSummary(summary: string): string {
  if (!summary) return 'No summary';
  
  let cleanedSummary = summary;
  
  // 去除阮一峰周刊的固定广告语
  const adPatterns = [
    /^这里记录每周值得分享的科技内容，周五发布。\s*/,
    /^本杂志开源，欢迎投稿。\s*/,
    /^另有《谁在招人》服务，发布程序员招聘信息。\s*/,
    /^合作请邮件联系（yifeng\.ruan@gmail\.com）。\s*/,
    /^这里记录每周值得分享的科技内容，周五发布。\s*本杂志开源，欢迎投稿。\s*/,
    /^这里记录每周值得分享的科技内容，周五发布。\s*本杂志开源，欢迎投稿。\s*另有《谁在招人》服务，发布程序员招聘信息。\s*/,
    /^这里记录每周值得分享的科技内容，周五发布。\s*本杂志开源，欢迎投稿。\s*另有《谁在招人》服务，发布程序员招聘信息。\s*合作请邮件联系（yifeng\.ruan@gmail\.com）。\s*/,
    // 处理编码问题后的版本
    /^è¿éè®°å½æ¯å¨å¼å¾åäº«çç§æåå®¹ï¼å¨äºåå¸ã\s*/,
    /^æ¬æå¿å¼æºï¼æ¬¢è¿æç¨¿ã\s*/,
    /^å¦æãè°å¨æäººãæå¡ï¼åå¸ç¨åºåæèä¿¡æ¯ã\s*/,
    /^åä½è¯·é®ä»¶èç³»ï¼yifeng\.ruan@gmail\.comï¼ã\s*/,
  ];
  
  // 移除广告语
  adPatterns.forEach(pattern => {
    cleanedSummary = cleanedSummary.replace(pattern, '');
  });
  
  // 去除多余的空格和换行
  cleanedSummary = cleanedSummary.trim();
  
  // 限制长度并确保以句号结尾
  if (cleanedSummary.length > 120) {
    cleanedSummary = cleanedSummary.slice(0, 120);
    const lastPeriod = cleanedSummary.lastIndexOf('。');
    if (lastPeriod > 80) {
      cleanedSummary = cleanedSummary.slice(0, lastPeriod + 1);
    } else {
      cleanedSummary += '...';
    }
  }
  
  return cleanedSummary || '暂无摘要';
}

export const revalidate = 600; // Revalidate every 10 minutes

export async function GET() {
  try {
    const response = await axios.get(RUANYIFENG_FEED.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Charset': 'UTF-8'
      },
      responseType: 'text',
      responseEncoding: 'utf8',
      timeout: 10000
    });
    
    // 确保响应数据是UTF-8编码
    let xmlData = response.data;
    if (typeof xmlData === 'string') {
      // 检查是否有编码声明，如果没有则添加
      if (!xmlData.includes('encoding=')) {
        xmlData = xmlData.replace('<?xml version="1.0"?>', '<?xml version="1.0" encoding="UTF-8"?>');
      }
    }
    
    const feed = await parser.parseString(xmlData);
    const items: FeedItem[] = feed.items?.slice(0, 3).map(item => ({ // 获取最新的3条
      source: RUANYIFENG_FEED.source,
      avatar: RUANYIFENG_FEED.avatar,
      author: item.creator || feed.title || 'Unknown author',
      title: item.title || 'No title',
      summary: cleanSummary(item.contentSnippet || item.description || 'No summary'),
      timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      url: item.link,
    })) || [];

    return NextResponse.json(items, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Failed to fetch Ruan Yi Feng RSS feed:', error);
    // 返回空数组而不是错误对象，确保前端能正常处理
    return NextResponse.json([]);
  }
}