import { NextRequest, NextResponse } from 'next/server';
import { SimpleTwitterCache } from '@/app/lib/simple-twitter-cache';

const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAEY14QEAAAAAgRSvzkQdsFffGg3JxfFHgCFqKnc%3Dz1d9S20iXUXNLJI8aaUZJa0sMUpvji0MNIfmvPVRlYAmG4q4eN';

// 默认用户ID - Elon Musk作为示例
const DEFAULT_USER_ID = '2244994945';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;
    const maxResults = parseInt(searchParams.get('maxResults') || '5');
    const useCache = searchParams.get('useCache') !== 'false';

    // 如果启用缓存，先尝试从缓存获取
    if (useCache) {
      const cachedTweets = SimpleTwitterCache.getCachedTweets(userId);
      if (cachedTweets && cachedTweets.length > 0) {
        console.log(`Returning ${cachedTweets.length} cached tweets for user ${userId}`);
        return NextResponse.json({
          success: true,
          data: cachedTweets,
          includes: { users: [] },
          meta: { cached: true, count: cachedTweets.length }
        });
      }
    }

    // 缓存未命中，从API获取
    console.log(`Fetching fresh tweets from API for user ${userId}`);
    
    const tweetParams = new URLSearchParams({
      'max_results': maxResults.toString(),
      'tweet.fields': 'created_at,public_metrics,author_id',
      'expansions': 'author_id',
      'user.fields': 'name,username,profile_image_url'
    });

    const response = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?${tweetParams}`,
      {
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Twitter API Error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        errorData: errorData,
        url: `https://api.twitter.com/2/users/${userId}/tweets?${tweetParams}`
      });
      
      let errorMessage = 'Failed to fetch tweets';
      try {
        const parsedError = JSON.parse(errorData);
        if (parsedError.detail) {
          errorMessage = parsedError.detail;
        } else if (parsedError.title) {
          errorMessage = parsedError.title;
        }
      } catch {
        // 如果无法解析JSON，使用原始错误数据
        errorMessage = errorData || response.statusText;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage, 
          details: errorData,
          status: response.status,
          statusText: response.statusText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 缓存新获取的数据
    if (data.data && data.data.length > 0) {
      try {
        SimpleTwitterCache.setCachedTweets(userId, data.data);
        console.log(`Cached ${data.data.length} tweets for user ${userId}`);
      } catch (cacheError) {
        console.error('Error caching tweets:', cacheError);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: data.data || [],
      includes: data.includes || {},
      meta: { ...data.meta, cached: false }
    });

  } catch (error) {
    console.error('Twitter API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 获取用户信息
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, useCache = true } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // 如果启用缓存，先尝试从缓存获取
    if (useCache) {
      const cachedUser = SimpleTwitterCache.getCachedUser(username);
      if (cachedUser) {
        console.log(`Returning cached user: ${username}`);
        return NextResponse.json({
          success: true,
          user: cachedUser,
          cached: true
        });
      }
    }

    // 缓存未命中，从API获取
    console.log(`Fetching fresh user data from API: ${username}`);

    const userParams = new URLSearchParams({
      'user.fields': 'id,name,username,profile_image_url,public_metrics'
    });

    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}?${userParams}`,
      {
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Twitter User API Error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        errorData: errorData
      });
      
      let errorMessage = 'Failed to fetch user info';
      try {
        const parsedError = JSON.parse(errorData);
        if (parsedError.detail) {
          errorMessage = parsedError.detail;
        } else if (parsedError.title) {
          errorMessage = parsedError.title;
        }
      } catch {
        // 如果无法解析JSON，使用原始错误数据
        errorMessage = errorData || response.statusText;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage, 
          details: errorData,
          status: response.status,
          statusText: response.statusText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 缓存用户信息
    if (data.data) {
      try {
        SimpleTwitterCache.setCachedUser(username, data.data);
        console.log(`Cached user: ${username}`);
      } catch (cacheError) {
        console.error('Error caching user:', cacheError);
      }
    }
    
    return NextResponse.json({
      success: true,
      user: data.data,
      cached: false
    });

  } catch (error) {
    console.error('Twitter User API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
