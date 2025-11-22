#!/usr/bin/env python3
"""
LinuxDo 帖子页面结构调研脚本
用于分析评论区的DOM结构和选择器
"""

import asyncio
from playwright.async_api import async_playwright
import json

async def analyze_post_structure():
    """分析LinuxDo帖子页面结构"""
    
    # 使用一个真实的帖子URL（从RSS中获取）
    # 这里使用调试文件中看到的一个帖子
    test_url = "https://linux.do/t/topic/1048200"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # 非headless模式便于观察
        
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        
        page = await context.new_page()
        
        print(f"🔍 访问帖子页面: {test_url}")
        await page.goto(test_url, wait_until="networkidle", timeout=60000)
        await asyncio.sleep(3)  # 等待页面完全加载
        
        print("\n" + "="*60)
        print("📋 页面结构分析")
        print("="*60)
        
        # 1. 分析帖子容器
        posts = await page.query_selector_all('.topic-post')
        print(f"\n✅ 找到 {len(posts)} 个帖子容器 (.topic-post)")
        
        if len(posts) > 0:
            # 分析第一个帖子（楼主）
            print("\n--- 第1个帖子（楼主）---")
            first_post = posts[0]
            
            # 用户名
            username_elem = await first_post.query_selector('.username')
            if username_elem:
                username = await username_elem.text_content()
                print(f"✓ 用户名: {username.strip()} (选择器: .username)")
            
            # 帖子内容
            content_elem = await first_post.query_selector('.cooked')
            if content_elem:
                content = await content_elem.text_content()
                print(f"✓ 内容长度: {len(content)} 字符 (选择器: .cooked)")
                print(f"  预览: {content[:100].strip()}...")
            
            # 时间
            time_elem = await first_post.query_selector('.post-date')
            if time_elem:
                time_text = await time_elem.get_attribute('title')
                print(f"✓ 时间: {time_text} (选择器: .post-date, 属性: title)")
            
            # 点赞数
            likes_elem = await first_post.query_selector('.likes')
            if likes_elem:
                likes = await likes_elem.text_content()
                print(f"✓ 点赞: {likes.strip()} (选择器: .likes)")
        
        # 2. 分析评论（从第2个帖子开始）
        if len(posts) > 1:
            print("\n--- 评论区分析 ---")
            print(f"✓ 共 {len(posts) - 1} 条评论")
            
            for i in range(1, min(4, len(posts))):  # 分析前3条评论
                print(f"\n  评论 {i}:")
                reply = posts[i]
                
                username_elem = await reply.query_selector('.username')
                content_elem = await reply.query_selector('.cooked')
                
                if username_elem and content_elem:
                    username = await username_elem.text_content()
                    content = await content_elem.text_content()
                    print(f"    作者: {username.strip()}")
                    print(f"    内容: {content[:80].strip()}...")
        
        # 3. 保存完整HTML用于分析
        html = await page.content()
        with open('debug_post_structure.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"\n✅ 完整HTML已保存到: debug_post_structure.html")
        
        # 4. 提取结构化数据
        result = {
            "url": test_url,
            "total_posts": len(posts),
            "main_post": {},
            "comments": []
        }
        
        if len(posts) > 0:
            # 楼主
            first_post = posts[0]
            result["main_post"] = {
                "username_selector": ".username",
                "content_selector": ".cooked",
                "time_selector": ".post-date",
                "likes_selector": ".likes"
            }
            
            # 评论
            for i in range(1, len(posts)):
                reply = posts[i]
                username_elem = await reply.query_selector('.username')
                content_elem = await reply.query_selector('.cooked')
                time_elem = await reply.query_selector('.post-date')
                likes_elem = await reply.query_selector('.likes')
                
                comment_data = {}
                if username_elem:
                    comment_data['author'] = (await username_elem.text_content()).strip()
                if content_elem:
                    comment_data['content'] = (await content_elem.text_content()).strip()[:200]
                if time_elem:
                    comment_data['time'] = await time_elem.get_attribute('title')
                if likes_elem:
                    comment_data['likes'] = (await likes_elem.text_content()).strip()
                
                result["comments"].append(comment_data)
        
        # 保存JSON
        with open('debug_post_structure.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"✅ 结构化数据已保存到: debug_post_structure.json")
        
        print("\n" + "="*60)
        print("📊 总结")
        print("="*60)
        print(f"✓ 帖子容器选择器: .topic-post")
        print(f"✓ 用户名: .username")
        print(f"✓ 内容: .cooked")
        print(f"✓ 时间: .post-date (title属性)")
        print(f"✓ 点赞: .likes")
        print(f"✓ 总帖子数: {len(posts)} (1楼主 + {len(posts)-1}评论)")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(analyze_post_structure())








