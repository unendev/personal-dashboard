#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LinuxDo爬虫测试脚本（项目根目录版本）
"""

import asyncio
import sys
import os

# 添加路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'linuxdo-scraper', 'linuxdo'))

async def main():
    print("="*60)
    print("测试LinuxDo评论抓取功能（修复版）")
    print("="*60)
    print()
    
    # 设置环境变量：只测试3个帖子
    os.environ["POST_COUNT_LIMIT"] = "3"
    os.environ["HEADLESS"] = "true"  # 无头模式
    
    try:
        # 导入爬虫函数
        from scripts.scraper_optimized import fetch_linuxdo_posts
        
        print("[INFO] 开始爬取LinuxDo帖子...")
        posts = await fetch_linuxdo_posts()
        
        if posts and len(posts) > 0:
            print(f"\n{'='*60}")
            print(f"[SUCCESS] 成功获取 {len(posts)} 个帖子")
            print(f"{'='*60}\n")
            
            for i, post in enumerate(posts, 1):
                print(f"--- 帖子 {i} ---")
                print(f"标题: {post.get('title', 'N/A')[:60]}...")
                print(f"链接: {post.get('link', 'N/A')}")
                
                comments = post.get('comments', [])
                print(f"评论数: {len(comments)}")
                
                if comments:
                    print("高赞评论示例:")
                    # 按点赞数排序
                    sorted_comments = sorted(comments, key=lambda x: x.get('likes', 0), reverse=True)
                    for j, comment in enumerate(sorted_comments[:3], 1):
                        author = comment.get('author', '匿名')
                        likes = comment.get('likes', 0)
                        content = comment.get('content', '')[:100]
                        print(f"  {j}. [{author}] 👍{likes}")
                        print(f"     {content}...")
                else:
                    print("  ⚠️ 未获取到评论（可能是降级到RSS描述）")
                print()
            
            # 统计
            total_comments = sum(len(p.get('comments', [])) for p in posts)
            posts_with_comments = sum(1 for p in posts if len(p.get('comments', [])) > 0)
            
            print(f"{'='*60}")
            print(f"[统计]")
            print(f"  总帖子数: {len(posts)}")
            print(f"  有评论的帖子: {posts_with_comments}/{len(posts)}")
            print(f"  总评论数: {total_comments}")
            if posts:
                print(f"  平均评论数: {total_comments/len(posts):.1f}")
            print(f"{'='*60}\n")
            
            if total_comments > 0:
                print("✅ 测试通过！LinuxDo评论抓取功能正常工作")
                return 0
            else:
                print("⚠️ 警告：未获取到任何评论（所有帖子都降级到RSS描述）")
                print("   可能原因：")
                print("   1. 页面结构已变化")
                print("   2. 需要登录才能查看评论")
                print("   3. 网络超时")
                return 1
        else:
            print("\n❌ 测试失败：未获取到任何帖子")
            return 1
    
    except Exception as e:
        print(f"\n❌ 测试错误: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)



