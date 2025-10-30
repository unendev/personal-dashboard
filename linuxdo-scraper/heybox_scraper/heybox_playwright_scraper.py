#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小黑盒Playwright爬虫 - 基于MCP测试验证的方案
使用 Playwright 无头浏览器 + x_xhh_tokenid 认证

版本：v2.2.2-no-stealth
更新时间：2025-10-27 13:45
更新内容：
- ✅ 移除playwright_stealth依赖（token认证已足够，避免API不稳定）
- ✅ 通用选择器：不依赖具体class名，通过用户链接反向定位
- ⚠️ 关键修复：详情页Token注入后刷新页面
- 🔧 优化评论数量限制为10条（可配置）

测试验证：2025-10-27 ✅
- Token认证成功
- 安全验证已绕过
- 页面正常加载帖子内容
- MCP验证通用选择器有效

使用方法：
  1. 配置 .env 文件中的 HEYBOX_TOKEN_ID
  2. 安装Playwright: pip install playwright
  3. 安装浏览器: python -m playwright install chromium
  4. 运行: python heybox_playwright_scraper.py
"""

# 版本信息
__version__ = "v2.2.2-no-stealth"
__update_date__ = "2025-10-27 13:45"

import asyncio
import os
import json
import logging
import time
from datetime import datetime
from typing import List, Dict, Any
from playwright.async_api import async_playwright, Page
# from playwright_stealth import stealth  # 已禁用：token认证已足够
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
                
                # 改进的文本解析逻辑
                # 格式分析：作者名 Lv.等级 标题或内容 数字(点赞/评论)...
                
                # 1. 提取作者和等级（格式：作者名 Lv.数字）
                author_match = re.match(r'^(.+?)\s+Lv\.(\d+)\s*(.*)$', text)
                
                if author_match:
                    author = author_match.group(1).strip()
                    level = author_match.group(2)
                    remaining_text = author_match.group(3)
                else:
                    author = ''
                    remaining_text = text
                
                # 2. 提取标题（剩余文本的前200个字符作为标题）
                title = remaining_text[:200].strip() if remaining_text else ''
                
                # 3. 提取所有数字（用于点赞数、评论数、数据等）
                numbers = re.findall(r'\b(\d+)\b', text)
                
                # 4. 智能解析数字（假设最后两个数字通常是点赞和评论）
                likes = 0
                comments = 0
                
                if len(numbers) >= 2:
                    try:
                        # 最后一个通常是评论数
                        comments = int(numbers[-1])
                        # 倒数第二个通常是点赞数
                        likes = int(numbers[-2])
                    except (ValueError, IndexError):
                        pass
                elif len(numbers) == 1:
                    try:
                        # 只有一个数字时当作评论数
                        comments = int(numbers[0])
                    except ValueError:
                        pass
                
                # 只有在提取到有效数据时才添加帖子
                if title:  # 确保至少有标题
                    post = {
                        'id': post_id,
                        'title': title,
                        'summary': title[:100],  # 摘要为标题前100字
                        'author': author,
                        'url': item['href'],
                        'likes_count': likes,
                        'comments_count': comments,
                        'created_time': int(time.time())
                    }
                    
                    posts.append(post)
                    logger.debug(f"    [{len(posts)}] 作者:{author} | 点赞:{likes} 评论:{comments} | {title[:40]}...")
                else:
                    logger.debug(f"    ⚠ 跳过空标题的帖子")
                
            except Exception as e:
                logger.warning(f"    解析帖子失败: {e}")
                logger.debug(f"    原始文本: {text[:100]}")
                continue
        
        logger.info(f"✅ 成功提取 {len(posts)} 个帖子")
        return posts
        
    except Exception as e:
        logger.error(f"❌ 提取失败: {e}")
        return []

async def extract_comments(page: Page, post_id: str, post_url: str) -> List[Dict]:
    """提取帖子评论 - MCP调试验证版本"""
    logger.info(f"  💬 抓取评论: {post_id}")
    logger.info(f"     📍 URL: {post_url}")
    
    try:
        # 访问帖子详情页
        await page.goto(post_url, wait_until='domcontentloaded', timeout=30000)
        
        # 确保Token在详情页也有效（防止cookie作用域问题）
        await page.evaluate(f"""
            () => {{
                const token = "{HEYBOX_TOKEN_ID}";
                localStorage.setItem('x_xhh_tokenid', token);
                sessionStorage.setItem('x_xhh_tokenid', token);
                document.cookie = `x_xhh_tokenid=${{token}}; path=/; domain=.xiaoheihe.cn`;
            }}
        """)
        
        # ⚠️ 关键：刷新页面使Token生效（MCP调试验证必须步骤）
        await page.reload(wait_until='domcontentloaded')
        await asyncio.sleep(3)  # 等待评论加载
        
        # 尝试滚动加载更多评论
        await page.evaluate("""
            () => {
                window.scrollTo(0, document.body.scrollHeight / 2);
            }
        """)
        await asyncio.sleep(1)
        
        # 调试：检查页面结构
        page_info = await page.evaluate("""
            () => {
                const commentSection = document.querySelector('.link-comment');
                const commentItems = document.querySelectorAll('.link-comment__comment-item');
                return {
                    hasCommentSection: !!commentSection,
                    commentItemsCount: commentItems.length,
                    pageTitle: document.title
                };
            }
        """)
        logger.info(f"     🔍 页面检测: 评论区={page_info['hasCommentSection']}, 评论项数={page_info['commentItemsCount']}")
        
        # 提取评论数据 - 通用方法（不依赖具体class）
        comments_data = await page.evaluate(f"""
            () => {{
                const comments = [];
                const limit = {COMMENT_LIMIT};
                
                // 找所有用户链接（评论必有作者链接）
                const allLinks = document.querySelectorAll('a[href*="/app/user/profile/"]');
                const processedContainers = new Set();
                
                for (const link of allLinks) {{
                    if (comments.length >= limit) break;
                    
                    // 找最近的评论容器
                    let container = link.closest('div[class*="comment"]') || link.parentElement?.parentElement;
                    if (!container || processedContainers.has(container)) continue;
                    processedContainers.add(container);
                    
                    // 提取作者
                    const author = link.textContent.trim().split('\\n')[0].replace(/作者|Lv\\.\\d+/g, '').trim();
                    
                    // 提取评论内容（找最长文本）
                    let content = '';
                    const textDivs = container.querySelectorAll('div, p, span');
                    for (const div of textDivs) {{
                        const text = div.textContent.trim();
                        if (text.length > Math.max(20, content.length) && 
                            !text.includes('小时前') && !text.includes('天前') &&
                            !text.includes('Lv.') && !text.includes('回复')) {{
                            content = text.substring(0, 200);
                        }}
                    }}
                    
                    // 提取点赞数
                    const buttons = Array.from(container.querySelectorAll('button'));
                    const likeBtn = buttons.find(b => /^\\s*\\d+\\s*$/.test(b.textContent.trim()));
                    const likes = likeBtn ? parseInt(likeBtn.textContent.trim()) : 0;
                    
                    if (author && content.length > 10) {{
                        comments.push({{
                            id: `comment_{post_id}_${{comments.length}}`,
                            author: author,
                            content: content,
                            likes_count: likes,
                            created_at: '最近'
                        }});
                    }}
                }}
                
                return comments;
            }}
        """)
        
        logger.info(f"    ✓ 获取到 {len(comments_data)} 条评论")
        return comments_data
        
    except Exception as e:
        logger.warning(f"    ✗ 评论抓取失败: {e}")
        return []

# ========== AI分析 ==========

def analyze_with_ai(post: Dict, comments: List[Dict]) -> Dict:
    """使用DeepSeek AI分析 - 对标Reddit的高质量分析"""
    logger.info(f"  🤖 AI分析: {post['title'][:30]}...")
    
    if not DEEPSEEK_API_KEY:
        return {
            'title_cn': post.get('title', ''),
            'core_issue': post.get('summary', '')[:100],
            'key_info': [post['title']],
            'post_type': '未分类',
            'value_assessment': '中',
            'detailed_analysis': ''
        }
    
    import requests
    
    # 构建内容摘要
    excerpt = post.get('summary', '')[:1000]
    if not excerpt.strip():
        excerpt = "（无详细内容）"
    
    # 构建评论区精华（对标Reddit - 高赞前3条）
    comment_section = ""
    if comments and len(comments) > 0:
        # 按点赞数排序（如果有的话）
        sorted_comments = sorted(comments, key=lambda x: x.get('likes_count', 0), reverse=True)
        top_comments = sorted_comments[:3]
        
        comment_section = "\n\n**社区讨论精华**（高赞评论）：\n"
        for i, comment in enumerate(top_comments, 1):
            comment_body = comment.get('content', '')[:200]
            likes = comment.get('likes_count', 0)
            author = comment.get('author', '匿名')
            comment_section += f"{i}. [{author}] (👍{likes}): {comment_body}...\n"
        logger.info(f"  ✓ 包含 {len(top_comments)} 条高赞评论到分析")
    else:
        num_comments = post.get('comments_count', 0)
        if num_comments > 0:
            comment_section = f"\n\n**注意**：该帖子有 {num_comments} 条评论，但评论内容未包含在本次分析中。请仅基于帖子标题和正文内容进行分析，不要推测评论区内容。"
            logger.info(f"  ⚠ 帖子有 {num_comments} 条评论但未获取")
        else:
            logger.info(f"  ℹ 该帖子无评论")
    
    # 构建高质量Prompt（对标Reddit，适配游戏社区）
    prompt = f"""
你是专业的游戏社区内容分析专家，擅长分析小黑盒等游戏平台的帖子和社区讨论。请分析以下帖子（含社区讨论），生成专业分析报告。

**原始帖子信息**：
- 标题: {post['title']}
- 作者: {post['author']}
- 游戏标签: {post.get('game_tag', '未知')}
- 内容: {excerpt}{comment_section}
- 互动数据: {post['likes_count']}赞 / {post['comments_count']}评论

**请严格按JSON格式输出（不要包含```json```标记）**：
{{
  "title_cn": "中文优化标题（如果原标题已是中文，可优化使其更简洁专业；如果是英文或混杂，翻译为中文）",
  "core_issue": "核心议题（一句话概括）",
  "key_info": ["关键信息1", "关键信息2", "关键信息3"],
  "post_type": "从[游戏攻略, 新闻资讯, 玩家讨论, 硬件评测, 问题求助, 资源分享, 视频内容, 其他]选一个",
  "value_assessment": "从[高, 中, 低]选一个",
  "detailed_analysis": "生成600-1200字专业分析，markdown格式，必须包含以下6个维度：\\n\\n## 🎮 内容背景\\n（介绍帖子的游戏/硬件背景、发布时机、社区关注度）\\n\\n## 💡 核心内容\\n（提炼帖子的主要信息、关键观点或攻略要点）\\n\\n## 🛠️ 实用价值\\n（分析对玩家的实际帮助、可操作性、适用场景）\\n\\n## 💬 社区反响\\n（基于评论分析玩家反馈、争议点、共识观点）\\n\\n## 📚 参考价值\\n（对其他玩家的借鉴意义、注意事项）\\n\\n## 🔮 趋势洞察\\n（相关游戏/硬件的发展趋势、潜在影响）"
}}

**分析要求**：
1. title_cn要简洁专业，去除emoji和过度修饰
2. 核心议题要准确抓住帖子的本质
3. key_info要提炼最有价值的3个关键点
4. post_type要根据内容准确分类
5. value_assessment要客观评估对玩家的价值
6. detailed_analysis必须包含完整的6个维度，每个维度2-3句话
"""
    
    # 调试日志
    logger.debug(f"  → Prompt长度: {len(prompt)}字符, 评论区长度: {len(comment_section)}字符")
    
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
                    {
                        "role": "system", 
                        "content": "你是专业的游戏社区内容分析专家，擅长分析游戏攻略、资讯、讨论和硬件评测。你的分析客观专业，注重实用价值。"
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                "temperature": 0.3,
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
        else:
            logger.warning(f"    ✗ API返回错误: {response.status_code}")
                
    except Exception as e:
        logger.warning(f"    ✗ AI分析失败: {e}")
    
    # 返回默认分析
    return {
        'title_cn': post.get('title', ''),
        'core_issue': post.get('summary', post['title'])[:100],
        'key_info': [post['title']],
        'post_type': '未分类',
        'value_assessment': '中',
        'detailed_analysis': f"## 🎮 内容背景\n\n{post.get('summary', '')[:200]}\n\n## 💡 核心内容\n\n待AI分析补充"
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
                        id, title, title_cn, url, author, cover_image,
                        content_summary, likes_count, comments_count,
                        core_issue, key_info, post_type,
                        value_assessment, detailed_analysis, timestamp
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (id) DO UPDATE SET
                        title_cn = $3,
                        likes_count = $8,
                        comments_count = $9,
                        timestamp = $15
                ''', 
                    post['id'], post['title'], post['analysis'].get('title_cn', post['title']),
                    post['url'], post.get('author'), None,
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
    logger.info(f"📦 版本: {__version__}")
    logger.info(f"🕐 更新时间: {__update_date__}")
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
        
        page = await context.new_page()
        
        # 应用反爬虫stealth（已禁用：token认证已足够）
        # await stealth(page)
        logger.info("✓ 页面创建成功（使用Token认证，无需stealth）")
        
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
        
        # 保存数据库（对标Reddit - 仅数据库，不生成JSON文件）
        await save_to_database(posts)
        
        logger.info(f"✅ 数据已存入数据库，前端将从数据库读取")
        
        # 关闭浏览器
        await browser.close()
    
    logger.info("\n" + "=" * 80)
    logger.info("🎉 爬虫执行完成！")
    logger.info("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())

