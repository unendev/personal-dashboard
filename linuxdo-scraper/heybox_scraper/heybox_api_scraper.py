#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小黑盒API爬虫
使用 x_xhh_tokenid 认证，抓取首页最新帖子和评论

使用方法：
  1. 配置 .env 文件中的 HEYBOX_TOKEN_ID
  2. 运行: python heybox_api_scraper.py
"""

import asyncio
import os
import json
import logging
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
import requests
from dotenv import load_dotenv
import asyncpg

# 导入配置
from config import (
    HEYBOX_TOKEN_ID, HEYBOX_BASE_URL, HEYBOX_HOME_URL,
    POST_LIMIT, COMMENT_LIMIT, REQUEST_INTERVAL,
    MAX_RETRIES, RETRY_DELAY, AI_REQUEST_DELAY,
    DEEPSEEK_API_KEY, DEEPSEEK_API_URL,
    DATABASE_URL, IS_GITHUB_ACTIONS,
    get_auth_headers, get_proxies, check_config
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

# ========== 重试装饰器 ==========
def retry_on_failure(max_retries=MAX_RETRIES, delay=RETRY_DELAY):
    """请求失败重试装饰器"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    logger.warning(f"尝试 {attempt + 1}/{max_retries} 失败: {e}")
                    if attempt == max_retries - 1:
                        logger.error(f"所有重试失败: {func.__name__}")
                        raise e
                    time.sleep(delay)
            return None
        return wrapper
    return decorator

# ========== API 请求函数 ==========

@retry_on_failure()
def fetch_home_feed(limit=POST_LIMIT) -> List[Dict]:
    """
    获取首页信息流
    
    注意：这里的API端点需要根据实际抓包结果调整
    可能的端点：
    - /bbs/app/api/feed/home
    - /bbs/app/api/link/feed/home
    - /v1/feed/timeline
    """
    logger.info(f"🔍 开始抓取首页信息流（目标{limit}条）...")
    
    # TODO: 根据实际API调整endpoint和参数
    # 这里提供几个可能的尝试方案
    
    possible_endpoints = [
        "/bbs/app/api/feed/home",
        "/bbs/app/api/link/feed/home",
        "/v1/feed/timeline",
        "/bbs/app/link/feed/home"
    ]
    
    headers = get_auth_headers()
    proxies = get_proxies()
    
    # 尝试不同的endpoint
    for endpoint in possible_endpoints:
        url = f"{HEYBOX_BASE_URL}{endpoint}"
        
        try:
            logger.info(f"  尝试API: {url}")
            
            # 常见参数
            params = {
                "limit": limit,
                "offset": 0,
                "time": int(time.time() * 1000)
            }
            
            response = requests.get(
                url,
                headers=headers,
                params=params,
                proxies=proxies,
                timeout=30
            )
            
            logger.info(f"  响应状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"  ✓ 成功获取数据")
                logger.debug(f"  响应结构: {list(data.keys()) if isinstance(data, dict) else type(data)}")
                
                # 解析响应数据（根据实际结构调整）
                posts = parse_feed_response(data)
                if posts:
                    logger.info(f"✅ 成功解析{len(posts)}个帖子")
                    return posts
                    
        except Exception as e:
            logger.debug(f"  ✗ {endpoint} 失败: {e}")
            continue
    
    logger.error("❌ 所有API端点尝试均失败")
    logger.info("💡 提示：请手动抓包确认API地址，并更新脚本")
    return []

def parse_feed_response(data: Dict) -> List[Dict]:
    """
    解析API响应数据
    
    需要根据实际响应结构调整
    """
    posts = []
    
    # 尝试不同的数据结构
    possible_keys = ['data', 'list', 'items', 'feeds', 'result']
    
    feed_list = None
    for key in possible_keys:
        if key in data:
            feed_list = data[key]
            if isinstance(feed_list, list) and len(feed_list) > 0:
                logger.info(f"  找到数据列表: {key}")
                break
    
    if not feed_list:
        logger.warning("  未找到帖子列表数据")
        return []
    
    for item in feed_list[:POST_LIMIT]:
        try:
            # 根据实际字段调整
            post = {
                'id': str(item.get('link_id') or item.get('id') or item.get('post_id')),
                'title': item.get('title', ''),
                'content': item.get('content', '') or item.get('desc', ''),
                'author': item.get('username', '') or item.get('author_name', ''),
                'author_id': str(item.get('userid', '') or item.get('author_id', '')),
                'cover_image': item.get('image', '') or item.get('cover', ''),
                'game_tag': item.get('tag', '') or item.get('game_name', ''),
                'likes_count': int(item.get('like_count', 0) or item.get('likes', 0)),
                'comments_count': int(item.get('comment_count', 0) or item.get('comments', 0)),
                'views_count': int(item.get('view_count', 0) or item.get('views', 0)),
                'created_time': item.get('created_time', 0) or item.get('publish_time', 0),
                'url': f"https://www.xiaoheihe.cn/link/{item.get('link_id', item.get('id', ''))}"
            }
            
            if post['id'] and post['title']:
                posts.append(post)
                
        except Exception as e:
            logger.warning(f"  解析帖子失败: {e}")
            continue
    
    return posts

@retry_on_failure()
def fetch_post_comments(post_id: str, limit=COMMENT_LIMIT) -> List[Dict]:
    """
    获取帖子评论
    
    可能的endpoint：
    - /bbs/app/api/comment/list
    - /bbs/app/link/tree
    """
    logger.info(f"  📝 抓取帖子 {post_id} 的评论...")
    
    headers = get_auth_headers()
    proxies = get_proxies()
    
    possible_endpoints = [
        f"/bbs/app/api/link/tree?link_id={post_id}",
        f"/bbs/app/api/comment/list?link_id={post_id}",
    ]
    
    for endpoint in possible_endpoints:
        url = f"{HEYBOX_BASE_URL}{endpoint}"
        
        try:
            response = requests.get(
                url,
                headers=headers,
                proxies=proxies,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                comments = parse_comments_response(data, post_id)
                if comments:
                    logger.info(f"    ✓ 获取到{len(comments)}条评论")
                    return comments[:limit]
                    
        except Exception as e:
            logger.debug(f"    ✗ {endpoint} 失败: {e}")
            continue
    
    logger.warning(f"    未能获取帖子 {post_id} 的评论")
    return []

def parse_comments_response(data: Dict, post_id: str) -> List[Dict]:
    """解析评论响应"""
    comments = []
    
    # 尝试不同的数据结构
    comment_list = data.get('comments') or data.get('list') or data.get('data') or []
    
    if not comment_list:
        return []
    
    for item in comment_list:
        try:
            comment = {
                'id': str(item.get('comment_id') or item.get('id')),
                'post_id': post_id,
                'author': item.get('username', '') or item.get('author_name', ''),
                'content': item.get('content', '') or item.get('text', ''),
                'likes_count': int(item.get('like_count', 0) or item.get('likes', 0)),
                'created_time': item.get('created_time', 0) or item.get('publish_time', 0),
                'parent_id': str(item.get('parent_id', '') or ''),
                'depth': int(item.get('depth', 0))
            }
            
            if comment['id'] and comment['content']:
                comments.append(comment)
                
        except Exception as e:
            logger.warning(f"    解析评论失败: {e}")
            continue
    
    return comments

# ========== DeepSeek AI 分析 ==========

def analyze_post_with_ai(post: Dict, comments: List[Dict]) -> Dict:
    """
    使用DeepSeek AI分析帖子和评论
    """
    logger.info(f"  🤖 AI分析: {post['title'][:30]}...")
    
    if not DEEPSEEK_API_KEY:
        logger.warning("    未配置DEEPSEEK_API_KEY，跳过AI分析")
        return {
            'core_issue': post.get('content', '')[:100],
            'key_info': [],
            'post_type': '未分类',
            'value_assessment': '中',
            'detailed_analysis': ''
        }
    
    # 构建prompt
    top_comments = comments[:5]  # 取前5条评论
    comments_text = "\n".join([f"- {c['author']}: {c['content'][:100]}" for c in top_comments])
    
    prompt = f"""你是一个专业的游戏社区内容分析师。请分析以下小黑盒帖子：

标题：{post['title']}
作者：{post['author']}
内容摘要：{post.get('content', '')[:500]}
游戏标签：{post.get('game_tag', '无')}
互动数据：{post['likes_count']}赞 / {post['comments_count']}评论

评论区讨论要点（前5条）：
{comments_text if comments_text else '暂无评论'}

请按以下JSON格式返回分析（只返回JSON，不要其他内容）：
{{
  "core_issue": "核心议题一句话总结",
  "key_info": ["关键点1", "关键点2", "关键点3"],
  "post_type": "游戏资讯/游戏攻略/玩家讨论/硬件评测/求助问答/其他",
  "value_assessment": "高/中/低",
  "detailed_analysis": "## 📋 内容概述\\n...\\n\\n## 💡 关键信息\\n...\\n\\n## 💬 社区讨论\\n..."
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
                    {"role": "system", "content": "你是一个专业的游戏社区内容分析师，擅长分析游戏相关帖子和社区讨论。"},
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
            
            # 提取JSON
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                analysis = json.loads(json_match.group())
                logger.info(f"    ✓ AI分析完成")
                time.sleep(AI_REQUEST_DELAY)  # 限速
                return analysis
                
    except Exception as e:
        logger.warning(f"    AI分析失败: {e}")
    
    # 返回默认分析
    return {
        'core_issue': post.get('content', post['title'])[:100],
        'key_info': [post['title']],
        'post_type': '未分类',
        'value_assessment': '中',
        'detailed_analysis': f"## 📋 内容概述\n\n{post.get('content', '')[:200]}"
    }

# ========== 数据库操作 ==========

async def save_to_database(posts_with_analysis: List[Dict]):
    """保存数据到PostgreSQL"""
    logger.info(f"\n💾 保存数据到数据库...")
    
    if not DATABASE_URL:
        logger.error("❌ 未配置DATABASE_URL")
        return False
    
    # 清理URL（asyncpg不支持查询参数）
    db_url = DATABASE_URL.split('?')[0] if '?' in DATABASE_URL else DATABASE_URL
    
    try:
        conn = await asyncpg.connect(db_url)
        logger.info("  ✓ 数据库连接成功")
        
        saved_posts = 0
        saved_comments = 0
        
        for post in posts_with_analysis:
            try:
                # 插入帖子（去重）
                await conn.execute('''
                    INSERT INTO heybox_posts (
                        id, title, url, author, avatar_url, cover_image,
                        content_summary, likes_count, comments_count, views_count,
                        game_tag, core_issue, key_info, post_type,
                        value_assessment, detailed_analysis, timestamp
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                    ON CONFLICT (id) DO UPDATE SET
                        likes_count = $8,
                        comments_count = $9,
                        timestamp = $17
                ''', 
                    post['id'], post['title'], post['url'],
                    post.get('author'), None, post.get('cover_image'),
                    post.get('content', '')[:1000], post['likes_count'],
                    post['comments_count'], post.get('views_count', 0),
                    post.get('game_tag'), post['analysis']['core_issue'],
                    json.dumps(post['analysis']['key_info']),
                    post['analysis']['post_type'],
                    post['analysis']['value_assessment'],
                    post['analysis']['detailed_analysis'],
                    datetime.fromtimestamp(post.get('created_time', time.time()))
                )
                saved_posts += 1
                
                # 插入评论
                for comment in post.get('comments', []):
                    try:
                        await conn.execute('''
                            INSERT INTO heybox_comments (
                                id, post_id, author, content, likes_count,
                                created_at, parent_id, depth
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT (id) DO UPDATE SET
                                likes_count = $5
                        ''',
                            comment['id'], post['id'], comment['author'],
                            comment['content'], comment['likes_count'],
                            datetime.fromtimestamp(comment.get('created_time', time.time())),
                            comment.get('parent_id') or None,
                            comment.get('depth', 0)
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
    logger.info("🎮 小黑盒爬虫启动")
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
    logger.info(f"  - 评论数限制: {COMMENT_LIMIT}")
    logger.info(f"  - Token已配置: 是")
    logger.info(f"  - AI分析: {'是' if DEEPSEEK_API_KEY else '否'}")
    
    # 第1步：获取首页信息流
    posts = fetch_home_feed(POST_LIMIT)
    if not posts:
        logger.error("❌ 未能获取帖子数据")
        logger.info("\n💡 调试建议：")
        logger.info("  1. 使用浏览器开发者工具（F12）访问小黑盒首页")
        logger.info("  2. 查看Network标签，找到获取帖子列表的API请求")
        logger.info("  3. 记录API地址、请求头、参数")
        logger.info("  4. 更新 fetch_home_feed() 函数中的API配置")
        return
    
    logger.info(f"\n第1步完成：获取到{len(posts)}个帖子\n")
    
    # 第2步：获取每个帖子的评论
    for i, post in enumerate(posts, 1):
        logger.info(f"[{i}/{len(posts)}] 处理: {post['title'][:40]}")
        
        # 获取评论
        comments = fetch_post_comments(post['id'], COMMENT_LIMIT)
        post['comments'] = comments
        
        time.sleep(REQUEST_INTERVAL)  # 限速
    
    logger.info(f"\n第2步完成：获取评论\n")
    
    # 第3步：AI分析
    logger.info("开始AI分析...")
    for i, post in enumerate(posts, 1):
        logger.info(f"[{i}/{len(posts)}] 分析: {post['title'][:40]}")
        analysis = analyze_post_with_ai(post, post.get('comments', []))
        post['analysis'] = analysis
    
    logger.info(f"\n第3步完成：AI分析\n")
    
    # 第4步：保存到数据库
    success = await save_to_database(posts)
    
    # 第5步：保存JSON备份
    if success:
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
    
    logger.info("\n" + "=" * 80)
    logger.info("🎉 爬虫执行完成！")
    logger.info("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())



