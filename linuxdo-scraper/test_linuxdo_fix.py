#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试LinuxDo评论抓取修复
只测试前3个帖子
"""

import asyncio
import sys
import os

# 添加路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'linuxdo'))

from linuxdo.scripts.scraper_optimized import fetch_linuxdo_posts

async def test_linuxdo_scraper():
    """测试LinuxDo爬虫（只测试3个帖子）"""
    print("="*60)
    print("测试LinuxDo评论抓取功能")
    print("="*60)
    
    # 临时修改环境变量，只爬取3个帖子
    os.environ["POST_COUNT_LIMIT"] = "3"
    
    try:
        posts = await fetch_linuxdo_posts()
        
        if posts:
            print(f"\n[SUCCESS] 成功获取 {len(posts)} 个帖子")
            
            for i, post in enumerate(posts, 1):
                print(f"\n--- 帖子 {i} ---")
                print(f"标题: {post.get('title', 'N/A')[:50]}...")
                print(f"评论数: {len(post.get('comments', []))}")
                
                if post.get('comments'):
                    print("评论示例:")
                    for j, comment in enumerate(post['comments'][:2], 1):
                        print(f"  {j}. [{comment.get('author', '匿名')}] (👍{comment.get('likes', 0)})")
                        print(f"     {comment.get('content', '')[:80]}...")
                else:
                    print("  (无评论)")
            
            # 统计
            total_comments = sum(len(p.get('comments', [])) for p in posts)
            posts_with_comments = sum(1 for p in posts if p.get('comments'))
            
            print(f"\n{'='*60}")
            print(f"[SUMMARY]")
            print(f"  总帖子数: {len(posts)}")
            print(f"  有评论的帖子: {posts_with_comments}/{len(posts)}")
            print(f"  总评论数: {total_comments}")
            print(f"  平均评论数: {total_comments/len(posts) if posts else 0:.1f}")
            print(f"{'='*60}")
            
            if total_comments > 0:
                print("\n✅ 测试通过！评论抓取功能正常")
                return True
            else:
                print("\n⚠️ 警告：未获取到任何评论")
                return False
        else:
            print("\n❌ 测试失败：未获取到帖子")
            return False
    
    except Exception as e:
        print(f"\n❌ 测试错误: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_linuxdo_scraper())
    sys.exit(0 if result else 1)





