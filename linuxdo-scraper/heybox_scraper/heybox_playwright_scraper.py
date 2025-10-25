#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小黑盒Playwright爬虫 - 基于MCP测试验证的方案
使用 Playwright 无头浏览器 + x_xhh_tokenid 认证

测试验证：2025-10-25 ✅
- Token认证成功
- 安全验证已绕过
- 页面正常加载帖子内容

使用方法：
  1. 配置 .env 文件中的 HEYBOX_TOKEN_ID
  2. 安装Playwright: pip install playwright playwright-stealth
  3. 安装浏览器: python -m playwright install chromium
  4. 运行: python heybox_playwright_scraper.py
"""

import asyncio
import os
import json
import logging
import time
from datetime import datetime
from typing import List, Dict, Any
from playwright.async_api import async_playwright, Page
from playwright_stealth import Stealth
import asyncpg
import re

# 导入配置
from config import (
    HEYBOX_TOKEN_ID, HEYBOX_HOME_URL,
    POST_LIMIT, COMMENT_LIMIT, REQUEST_INTERVAL,
    MAX_RETRIES, RETRY_DELAY, AI_REQUEST_DELAY,
    DEEPSEEK_API_KEY, DEEPSEEK_API_URL,
    DATABASE_URL, USE_PROXY, get_proxies, check_config
)

# ========== 日志配置 ==========
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('logs/heybox_scraper.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ========== 浏览器初始化 ==========

async def init_browser_with_token(page: Page, token: str):
    """
    初始化浏览器并注入Token
    
    基于MCP测试验证的方法：
    1. 访问首页
    2. 注入token到localStorage、sessionStorage和cookie
    3. 自动绕过安全验证
    """
    logger.info(f"🌐 访问首页: {HEYBOX_HOME_URL}")
    
    try:
        # 访问首页
        await page.goto(HEYBOX_HOME_URL, wait_until='domcontentloaded', timeout=60000)
        logger.info("  ✓ 页面加载完成")
        
        # 注入token（MCP测试验证的方法）
        await page.evaluate(f"""
            () => {{
                const token = "{token}";
                localStorage.setItem('x_xhh_tokenid', token);
                sessionStorage.setItem('x_xhh_tokenid', token);
                document.cookie = `x_xhh_tokenid=${{token}}; path=/; domain=.xiaoheihe.cn`;
            }}
        """)
        logger.info("  ✓ Token注入成功")
        
        # 等待一下让页面反应
        await asyncio.sleep(2)
        
        # 刷新页面使token生效
        await page.reload(wait_until='domcontentloaded')
        logger.info("  ✓ 页面刷新，Token已激活")
        
        # 再等待内容加载
        await asyncio.sleep(3)
        
        return True
        
    except Exception as e:
        logger.error(f"  ✗ 初始化失败: {e}")
        return False

# ========== 数据提取 ==========

async def extract_posts_from_page(page: Page, limit: int = POST_LIMIT) -> List[Dict]:
    """
    从页面提取帖子数据
    
    基于页面实际结构提取（MCP测试中观察到的）
    """
    logger.info(f"📝 开始提取帖子数据（目标{limit}条）...")
    
    try:
        # 获取页面HTML
        content = await page.content()
        
        # 使用正则表达式提取link数据（从href中提取ID）
        post_ids = re.findall(r'/app/bbs/link/(\d+)\?', content)
        logger.info(f"  找到 {len(post_ids)} 个帖子ID")
        
        # 获取页面的纯文本内容用于提取
        posts_data = await page.evaluate("""
            () => {
                const posts = [];
                const links = document.querySelectorAll('a[href*="/app/bbs/link/"]');
                
                links.forEach((link, index) => {
                    if (index >= 20) return;
                    
                    const href = link.href || link.getAttribute('href');
                    const fullText = link.textContent || '';
                    
                    if (href && fullText) {
                        posts.push({
                            href: href,
                            text: fullText.trim()
                        });
                    }
                });
                
                return posts;
            }
        """)
        
        logger.info(f"  提取到 {len(posts_data)} 个帖子的原始数据")
        
        # 解析提取的数据
        posts = []
        for item in posts_data[:limit]:
            try:
                # 提取ID
                id_match = re.search(r'/link/(\d+)', item['href'])
                if not id_match:
                    continue
                
                post_id = id_match.group(1)
                text = item['text']
                
                # 分割文本（格式：作者 Lv.X | 标题 | 摘要 | 点赞数 | 评论数）
                parts = [p.strip() for p in text.split('  ') if p.strip()]
                
                # 提取数字（点赞和评论）
                numbers = re.findall(r'\b(\d+)\b', text)
                
                # 解析各部分
                author = parts[0].replace('Lv.', '').replace('  ', '').strip() if parts else ''
                title = parts[1] if len(parts) > 1 else ''
                summary = parts[2] if len(parts) > 2 else ''
                
                likes = int(numbers[-2]) if len(numbers) >= 2 else 0
                comments = int(numbers[-1]) if len(numbers) >= 1 else 0
                
                post = {
                    'id': post_id,
                    'title': title,
                    'summary': summary,
                    'author': author,
                    'url': item['href'],
                    'likes_count': likes,
                    'comments_count': comments,
                    'created_time': int(time.time())
                }
                
                posts.append(post)
                logger.debug(f"    [{len(posts)}] {title[:30]}...")
                
            except Exception as e:
                logger.warning(f"    解析帖子失败: {e}")
                continue
        
        logger.info(f"✅ 成功提取 {len(posts)} 个帖子")
        return posts
        
    except Exception as e:
        logger.error(f"❌ 提取失败: {e}")
        return []

async def extract_comments(page: Page, post_id: str, post_url: str) -> List[Dict]:
    """提取帖子评论"""
    logger.info(f"  💬 抓取评论: {post_id}")
    
    try:
        # 访问帖子详情页
        await page.goto(post_url, wait_until='domcontentloaded', timeout=30000)
        await asyncio.sleep(2)
        
        # 尝试提取评论（需要根据实际页面结构调整）
        comments_data = await page.evaluate("""
            () => {
                const comments = [];
                // TODO: 根据实际评论结构提取
                return comments;
            }
        """)
        
        logger.info(f"    ✓ 获取到 {len(comments_data)} 条评论")
        return comments_data
        
    except Exception as e:
        logger.warning(f"    ✗ 评论抓取失败: {e}")
        return []

# ========== AI分析 ==========

def analyze_with_ai(post: Dict, comments: List[Dict]) -> Dict:
    """使用DeepSeek AI分析"""
    logger.info(f"  🤖 AI分析: {post['title'][:30]}...")
    
    if not DEEPSEEK_API_KEY:
        return {
            'core_issue': post.get('summary', '')[:100],
            'key_info': [post['title']],
            'post_type': '未分类',
            'value_assessment': '中',
            'detailed_analysis': ''
        }
    
    import requests
    
    comments_text = "\n".join([f"- {c.get('author', '')}: {c.get('content', '')[:100]}" for c in comments[:5]])
    
    prompt = f"""你是专业游戏社区内容分析师。分析以下小黑盒帖子：

标题：{post['title']}
作者：{post['author']}
内容：{post.get('summary', '')}
互动：{post['likes_count']}赞 / {post['comments_count']}评论

评论区（前5条）：
{comments_text if comments_text else '暂无评论'}

返回JSON格式分析（只返回JSON）：
{{
  "core_issue": "核心议题一句话",
  "key_info": ["关键点1", "关键点2", "关键点3"],
  "post_type": "游戏资讯/游戏攻略/玩家讨论/硬件评测/求助问答/其他",
  "value_assessment": "高/中/低",
  "detailed_analysis": "## 📋 内容概述\\n...\\n\\n## 💡 关键信息\\n..."
}}"""
    
    try:
        response = requests.post(
            DEEPSEEK_API_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": "你是专业游戏社区分析师。"},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.5,
                "max_tokens": 2000
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                analysis = json.loads(json_match.group())
                logger.info(f"    ✓ AI分析完成")
                time.sleep(AI_REQUEST_DELAY)
                return analysis
                
    except Exception as e:
        logger.warning(f"    ✗ AI分析失败: {e}")
    
    return {
        'core_issue': post.get('summary', post['title'])[:100],
        'key_info': [post['title']],
        'post_type': '未分类',
        'value_assessment': '中',
        'detailed_analysis': f"## 内容\n\n{post.get('summary', '')}"
    }

# ========== 数据库存储 ==========

async def save_to_database(posts_with_analysis: List[Dict]):
    """保存到PostgreSQL"""
    logger.info(f"\n💾 保存数据到数据库...")
    
    if not DATABASE_URL:
        logger.error("❌ 未配置DATABASE_URL")
        return False
    
    db_url = DATABASE_URL.split('?')[0] if '?' in DATABASE_URL else DATABASE_URL
    
    try:
        conn = await asyncpg.connect(db_url)
        logger.info("  ✓ 数据库连接成功")
        
        saved_posts = 0
        saved_comments = 0
        
        for post in posts_with_analysis:
            try:
                await conn.execute('''
                    INSERT INTO heybox_posts (
                        id, title, url, author, cover_image,
                        content_summary, likes_count, comments_count,
                        core_issue, key_info, post_type,
                        value_assessment, detailed_analysis, timestamp
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    ON CONFLICT (id) DO UPDATE SET
                        likes_count = $7,
                        comments_count = $8,
                        timestamp = $14
                ''', 
                    post['id'], post['title'], post['url'],
                    post.get('author'), None,
                    post.get('summary', '')[:1000], post['likes_count'],
                    post['comments_count'],
                    post['analysis']['core_issue'],
                    json.dumps(post['analysis']['key_info']),
                    post['analysis']['post_type'],
                    post['analysis']['value_assessment'],
                    post['analysis']['detailed_analysis'],
                    datetime.fromtimestamp(post.get('created_time', time.time()))
                )
                saved_posts += 1
                
                # 保存评论
                for comment in post.get('comments', []):
                    try:
                        await conn.execute('''
                            INSERT INTO heybox_comments (
                                id, post_id, author, content, likes_count,
                                created_at, parent_id, depth
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT (id) DO NOTHING
                        ''',
                            comment['id'], post['id'], comment.get('author', ''),
                            comment.get('content', ''), comment.get('likes_count', 0),
                            datetime.fromtimestamp(comment.get('created_time', time.time())),
                            comment.get('parent_id'), comment.get('depth', 0)
                        )
                        saved_comments += 1
                    except Exception as e:
                        logger.warning(f"    保存评论失败: {e}")
                        
            except Exception as e:
                logger.warning(f"    保存帖子失败 {post['id']}: {e}")
        
        await conn.close()
        logger.info(f"✅ 数据保存完成: {saved_posts}个帖子, {saved_comments}条评论")
        return True
        
    except Exception as e:
        logger.error(f"❌ 数据库操作失败: {e}")
        return False

# ========== 主流程 ==========

async def main():
    """主执行流程"""
    logger.info("=" * 80)
    logger.info("🎮 小黑盒Playwright爬虫启动")
    logger.info("=" * 80)
    
    # 检查配置
    issues = check_config()
    if issues:
        logger.error("\n配置问题：")
        for issue in issues:
            logger.error(f"  {issue}")
        return
    
    logger.info(f"\n配置信息：")
    logger.info(f"  - 目标帖子数: {POST_LIMIT}")
    logger.info(f"  - Token已配置: 是")
    logger.info(f"  - AI分析: {'是' if DEEPSEEK_API_KEY else '否'}")
    logger.info(f"  - 使用代理: {'是' if USE_PROXY else '否'}")
    
    async with async_playwright() as p:
        # 启动浏览器
        launch_options = {
            "headless": True,
            "args": ['--no-sandbox', '--disable-dev-shm-usage']
        }
        
        if USE_PROXY:
            proxies = get_proxies()
            if proxies and proxies.get('http'):
                launch_options["proxy"] = {"server": proxies['http']}
        
        browser = await p.chromium.launch(**launch_options)
        logger.info("✓ 浏览器启动成功")
        
        # 创建上下文（反爬虫设置）
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            extra_http_headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9",
            }
        )
        
        # 应用反爬虫
        stealth = Stealth()
        await stealth.apply_stealth_async(context)
        
        page = await context.new_page()
        logger.info("✓ 页面创建成功")
        
        # 初始化并注入Token
        if not await init_browser_with_token(page, HEYBOX_TOKEN_ID):
            logger.error("❌ 初始化失败")
            await browser.close()
            return
        
        # 提取帖子
        posts = await extract_posts_from_page(page, POST_LIMIT)
        if not posts:
            logger.error("❌ 未能提取帖子数据")
            await browser.close()
            return
        
        logger.info(f"\n第1步完成：提取到 {len(posts)} 个帖子\n")
        
        # 提取评论
        for i, post in enumerate(posts, 1):
            logger.info(f"[{i}/{len(posts)}] 处理: {post['title'][:40]}")
            
            # 获取评论
            comments = await extract_comments(page, post['id'], post['url'])
            post['comments'] = comments
            
            await asyncio.sleep(REQUEST_INTERVAL)
        
        logger.info(f"\n第2步完成：获取评论\n")
        
        # AI分析
        logger.info("开始AI分析...")
        for i, post in enumerate(posts, 1):
            logger.info(f"[{i}/{len(posts)}] 分析: {post['title'][:40]}")
            analysis = analyze_with_ai(post, post.get('comments', []))
            post['analysis'] = analysis
        
        logger.info(f"\n第3步完成：AI分析\n")
        
        # 保存数据库
        await save_to_database(posts)
        
        # 保存JSON备份
        os.makedirs('data', exist_ok=True)
        today = datetime.now().strftime("%Y-%m-%d")
        output_file = f"data/heybox_report_{today}.json"
        
        report = {
            'meta': {
                'report_date': today,
                'title': f'小黑盒每日报告 ({today})',
                'post_count': len(posts),
                'generation_time': datetime.now().isoformat()
            },
            'posts': posts
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        logger.info(f"✅ JSON备份已保存: {output_file}")
        
        # 关闭浏览器
        await browser.close()
    
    logger.info("\n" + "=" * 80)
    logger.info("🎉 爬虫执行完成！")
    logger.info("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())

