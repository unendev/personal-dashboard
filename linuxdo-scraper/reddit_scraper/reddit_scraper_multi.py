# reddit_scraper_multi.py - 多Subreddit爬虫 + 中文翻译优化
import asyncio
import os
import re
import json
import logging
from datetime import datetime
import requests
from dotenv import load_dotenv
import xml.etree.ElementTree as ET
import time
import asyncpg
import ssl

# --- 配置日志 ---
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/reddit_scraper.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# --- 配置 ---
load_dotenv()

# 支持多个subreddit
SUBREDDITS = [
    "technology",    # 科技
    "gamedev",       # 独立游戏开发
    "godot",         # Godot引擎
    "Unity3D",       # Unity引擎
    "unrealengine"   # 虚幻引擎
]

POST_COUNT_PER_SUB = 5  # 每个subreddit取5个帖子
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
NEON_DB_URL = os.getenv("DATABASE_URL")

# asyncpg不支持URL中的查询参数，需要清理
if NEON_DB_URL:
    original_url = NEON_DB_URL
    if '?' in NEON_DB_URL:
        NEON_DB_URL = NEON_DB_URL.split('?')[0]
        logger.info("已清理DATABASE_URL中的查询参数")
    
    # 详细日志：显示URL格式（隐藏密码）
    import re
    safe_url = re.sub(r'://([^:]+):([^@]+)@', r'://\1:****@', NEON_DB_URL)
    logger.info(f"DATABASE_URL格式: {safe_url}")
    
    # 解析URL各部分
    try:
        from urllib.parse import urlparse
        parsed = urlparse(NEON_DB_URL)
        logger.info(f"  - 协议: {parsed.scheme}")
        logger.info(f"  - 主机: {parsed.hostname}")
        logger.info(f"  - 端口: {parsed.port}")
        logger.info(f"  - 数据库: {parsed.path}")
        logger.info(f"  - 用户名: {parsed.username}")
    except Exception as e:
        logger.error(f"解析DATABASE_URL失败: {e}")
else:
    logger.error("DATABASE_URL 为空！")

# GitHub Actions环境检测（不使用代理）
IS_GITHUB_ACTIONS = os.getenv("GITHUB_ACTIONS") == "true"
if not IS_GITHUB_ACTIONS and os.path.exists(".env"):
    # 本地开发环境可以使用代理
    proxy_for_all = os.getenv("PROXY_URL", "")
    if proxy_for_all:
        os.environ['HTTP_PROXY'] = proxy_for_all
        os.environ['HTTPS_PROXY'] = proxy_for_all
        logger.info(f"使用代理: {proxy_for_all}")

# --- Reddit 爬虫函数 ---
def fetch_reddit_posts_from_subreddit(subreddit):
    """从单个Subreddit RSS获取帖子数据"""
    RSS_URL = f"https://www.reddit.com/r/{subreddit}/.rss?sort=hot"
    logger.info(f"  开始爬取 r/{subreddit}...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    proxies = {}
    if not IS_GITHUB_ACTIONS and os.getenv("PROXY_URL"):
        proxy_url = os.getenv("PROXY_URL")
        proxies = {"http": proxy_url, "https": proxy_url}
    
    try:
        response = requests.get(RSS_URL, headers=headers, timeout=30, proxies=proxies)
        response.raise_for_status()
        root = ET.fromstring(response.content)
        posts = []
        
        for i, entry in enumerate(root.findall('{http://www.w3.org/2005/Atom}entry')):
            if i >= POST_COUNT_PER_SUB:
                break
                
            title_tag = entry.find('{http://www.w3.org/2005/Atom}title')
            link_tag = entry.find('{http://www.w3.org/2005/Atom}link')
            content_tag = entry.find('{http://www.w3.org/2005/Atom}content')
            author_tag = entry.find('{http://www.w3.org/2005/Atom}author/{http://www.w3.org/2005/Atom}name')
            
            if title_tag is not None and link_tag is not None:
                title = title_tag.text
                link = link_tag.get('href')
                author = author_tag.text if author_tag is not None else "N/A"
                
                # 清理内容
                content_html = content_tag.text if content_tag is not None else ""
                clean_content = re.sub(r'<.*?>', ' ', content_html)
                clean_content = re.sub(r'\[link\]|\[comments\]', '', clean_content).strip()
                
                # 提取Reddit帖子ID
                post_id = "reddit_unknown"
                if '/comments/' in link:
                    parts = link.split('/comments/')
                    if len(parts) > 1:
                        id_part = parts[1].split('/')[0]
                        post_id = f"reddit_{subreddit}_{id_part}"
                
                posts.append({
                    "id": post_id,
                    "title": title,
                    "link": link,
                    "author": author,
                    "content": clean_content[:500] + '...' if len(clean_content) > 500 else clean_content,
                    "subreddit": subreddit,
                    "score": 0,
                    "num_comments": 0
                })
        
        logger.info(f"    ✓ r/{subreddit} 获取到 {len(posts)} 个帖子")
        return posts
        
    except requests.exceptions.RequestException as e:
        logger.error(f"    ✗ 请求 r/{subreddit} RSS失败: {e}")
        return []
    except ET.ParseError as e:
        logger.error(f"    ✗ 解析 r/{subreddit} XML失败: {e}")
        return []
    except Exception as e:
        logger.error(f"    ✗ 处理 r/{subreddit} 时发生错误: {e}")
        return []

def fetch_all_reddit_posts():
    """从所有配置的subreddit获取帖子"""
    logger.info("=== 开始爬取所有Subreddit ===")
    all_posts = []
    
    for subreddit in SUBREDDITS:
        posts = fetch_reddit_posts_from_subreddit(subreddit)
        all_posts.extend(posts)
        time.sleep(2)  # 避免请求过快
    
    logger.info(f"=== 总计获取 {len(all_posts)} 个帖子 ===")
    return all_posts

# --- AI分析函数 (优化中文输出) ---
def analyze_single_post_with_deepseek(post, retry_count=0):
    """使用DeepSeek分析Reddit帖子并输出完整中文"""
    excerpt = post.get('content', '')[:1000]
    if not excerpt.strip():
        excerpt = "（无详细内容）"

    prompt = f"""
你是一名专业的Reddit技术内容分析师。请分析以下帖子，并生成一份**深度中文分析报告**，让读者无需查看原文即可全面理解。

**重要要求**：
1. 将英文标题翻译成通俗易懂的中文
2. 所有分析内容必须是中文
3. 对于技术类帖子，深入分析技术细节、方案和代码要点
4. 对于游戏开发类，关注开发技巧、工具和最佳实践
5. 返回格式必须是纯JSON，不要包含```json```标记

**原始帖子信息**：
- 标题（英文）: {post['title']}
- 来源板块: r/{post['subreddit']}
- 内容摘要: {excerpt}

**请严格按以下JSON格式输出**：
{{
  "title_cn": "将英文标题翻译成中文（保持原意，简洁明了）",
  "core_issue": "用一句话概括这个帖子的核心议题（中文）",
  "key_info": [
    "关键信息点1（中文）",
    "关键信息点2（中文）",
    "关键信息点3（中文）"
  ],
  "post_type": "从[技术讨论, 新闻分享, 问题求助, 观点讨论, 资源分享, 教程指南, 项目展示, 其他]中选择一个",
  "value_assessment": "从[高, 中, 低]中选择一个",
  "detailed_analysis": "生成300-800字的深度中文分析，包含以下内容（用markdown格式）：\\n\\n## 📋 背景介绍\\n简要说明这个话题的背景和重要性\\n\\n## 🎯 核心内容\\n详细展开帖子的主要内容，包括关键观点、数据或事实\\n\\n## 💡 技术/开发细节（如适用）\\n- 具体的技术方案、工具、引擎或框架\\n- 实现方法、代码思路或架构设计\\n- 性能优化或最佳实践\\n\\n## 🔧 实用价值\\n- 如何应用这些信息到实际开发中\\n- 相关工具、库或资源推荐\\n- 注意事项、坑点或限制\\n\\n## 🚀 总结与建议\\n趋势分析、个人建议或延伸思考"
}}
"""
    
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 2000,
        "temperature": 0.5
    }
    
    proxies = {}
    if not IS_GITHUB_ACTIONS and os.getenv("PROXY_URL"):
        proxy_url = os.getenv("PROXY_URL")
        proxies = {"http": proxy_url, "https": proxy_url}
    
    try:
        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers=headers,
            json=data,
            proxies=proxies,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content'].strip()
            
            # 清理JSON内容
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            try:
                analysis = json.loads(content)
                logger.info(f"  ✓ 帖子分析成功: {analysis.get('title_cn', 'N/A')[:30]}...")
                return analysis
            except json.JSONDecodeError:
                logger.error(f"  ✗ AI返回的内容不是有效JSON: {content[:100]}...")
                return {
                    "title_cn": post['title'][:50] + "...",
                    "core_issue": "JSON解析失败",
                    "key_info": ["解析失败"],
                    "post_type": "其他",
                    "value_assessment": "低"
                }
        else:
            logger.error(f"  ✗ DeepSeek API调用失败: {response.status_code}")
            return {
                "title_cn": post['title'][:50] + "...",
                "core_issue": "API调用失败",
                "key_info": ["API失败"],
                "post_type": "其他",
                "value_assessment": "低"
            }
            
    except Exception as e:
        logger.error(f"  ✗ AI分析失败: {e}")
        if retry_count < 2:
            logger.info(f"  ⟳ 重试AI分析 ({retry_count + 1}/2)...")
            time.sleep(2)
            return analyze_single_post_with_deepseek(post, retry_count + 1)
        else:
            return {
                "title_cn": post['title'][:50] + "...",
                "core_issue": "分析失败",
                "key_info": ["分析失败"],
                "post_type": "其他",
                "value_assessment": "低"
            }

# --- 数据库操作 ---
async def create_posts_table():
    """创建reddit帖子表"""
    if not NEON_DB_URL:
        logger.error("未找到 DATABASE_URL 环境变量")
        return False

    conn = None
    try:
        # Neon需要SSL连接
        logger.info(f"尝试连接数据库...")
        
        # 测试DNS解析
        try:
            from urllib.parse import urlparse
            import socket
            parsed = urlparse(NEON_DB_URL)
            host = parsed.hostname
            logger.info(f"  步骤1: 尝试DNS解析主机 {host}...")
            ip = socket.gethostbyname(host)
            logger.info(f"  ✓ DNS解析成功: {host} -> {ip}")
        except socket.gaierror as e:
            logger.error(f"  ✗ DNS解析失败: {e}")
            logger.error(f"  可能原因: 1)主机名错误 2)网络问题 3)DNS服务器问题")
            raise
        except Exception as e:
            logger.error(f"  ✗ DNS测试异常: {e}")
            raise
        
        logger.info(f"  步骤2: 配置SSL上下文...")
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        logger.info(f"  ✓ SSL配置完成")
        
        logger.info(f"  步骤3: 尝试建立数据库连接...")
        conn = await asyncpg.connect(
            dsn=NEON_DB_URL,
            ssl=ssl_context,
            timeout=60
        )
        logger.info("✓ 数据库连接成功")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS reddit_posts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                title_cn TEXT,
                url TEXT NOT NULL,
                core_issue TEXT,
                key_info JSONB,
                post_type TEXT,
                value_assessment TEXT,
                subreddit TEXT,
                score INTEGER,
                num_comments INTEGER,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logger.info("✓ 数据库表 'reddit_posts' 检查完成")
        return True
    except Exception as e:
        logger.error(f"✗ 创建数据库表失败: {e}")
        return False
    finally:
        if conn:
            await conn.close()

async def insert_posts_into_db(posts_data):
    """将帖子数据插入到数据库"""
    if not NEON_DB_URL:
        logger.error("未找到 DATABASE_URL 环境变量")
        return False

    conn = None
    try:
        # Neon需要SSL连接
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        conn = await asyncpg.connect(
            dsn=NEON_DB_URL,
            ssl=ssl_context,
            timeout=60
        )
        logger.info("开始插入数据到数据库...")
        
        success_count = 0
        for post in posts_data:
            try:
                post_id = post.get('id')
                title = post.get('title')
                title_cn = post.get('analysis', {}).get('title_cn', title)
                url = post.get('link')
                analysis = post.get('analysis', {})
                core_issue = analysis.get('core_issue')
                key_info = json.dumps(analysis.get('key_info', []), ensure_ascii=False)
                post_type = analysis.get('post_type')
                value_assessment = analysis.get('value_assessment')
                detailed_analysis = analysis.get('detailed_analysis')
                subreddit = post.get('subreddit')
                score = post.get('score', 0)
                num_comments = post.get('num_comments', 0)

                await conn.execute("""
                    INSERT INTO reddit_posts (id, title, title_cn, url, core_issue, key_info, post_type, value_assessment, detailed_analysis, subreddit, score, num_comments)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        title_cn = EXCLUDED.title_cn,
                        url = EXCLUDED.url,
                        core_issue = EXCLUDED.core_issue,
                        key_info = EXCLUDED.key_info,
                        post_type = EXCLUDED.post_type,
                        value_assessment = EXCLUDED.value_assessment,
                        detailed_analysis = EXCLUDED.detailed_analysis,
                        subreddit = EXCLUDED.subreddit,
                        score = EXCLUDED.score,
                        num_comments = EXCLUDED.num_comments,
                        timestamp = CURRENT_TIMESTAMP;
                """, post_id, title, title_cn, url, core_issue, key_info, post_type, value_assessment, detailed_analysis, subreddit, score, num_comments)
                
                success_count += 1
                
            except Exception as e:
                logger.error(f"  ✗ 插入帖子 {post.get('id', 'N/A')} 失败: {e}")
                continue
        
        logger.info(f"✓ 成功插入/更新 {success_count}/{len(posts_data)} 条数据")
        return success_count > 0
        
    except Exception as e:
        logger.error(f"✗ 数据库操作失败: {e}")
        return False
    finally:
        if conn:
            await conn.close()

# --- AI整体洞察报告 ---
def generate_ai_summary_report(posts_data):
    """生成整体分析报告"""
    processed_posts = []
    post_summaries = []

    logger.info("=== 开始AI分析 ===")

    for i, post in enumerate(posts_data):
        logger.info(f"[{i+1}/{len(posts_data)}] 分析: r/{post['subreddit']} - {post['title'][:40]}...")
        
        analysis = analyze_single_post_with_deepseek(post)
        
        if analysis:
            processed_posts.append({
                "id": post.get('id'),
                "title": post.get('title'),
                "title_cn": analysis.get('title_cn', post.get('title')),
                "link": post.get('link'),
                "author": post.get('author'),
                "content": post.get('content'),
                "analysis": analysis,
                "subreddit": post.get('subreddit'),
                "score": post.get('score', 0),
                "num_comments": post.get('num_comments', 0)
            })
            
            post_summaries.append({
                "subreddit": post.get('subreddit'),
                "title_cn": analysis.get('title_cn', 'N/A'),
                "core_issue": analysis.get('core_issue', 'N/A'),
                "post_type": analysis.get('post_type', 'N/A'),
                "value_assessment": analysis.get('value_assessment')
            })
            
            time.sleep(3)  # API速率限制
        else:
            logger.error(f"  ✗ 帖子分析失败")

    logger.info("=== AI分析完成 ===")
    
    # 生成整体洞察
    logger.info("=== 生成整体洞察报告 ===")
    
    try:
        all_summaries_text = json.dumps(post_summaries, ensure_ascii=False, indent=2)

        overall_prompt = f"""
你是一名资深的Reddit内容分析师。以下是今天从多个技术/游戏开发相关subreddit采集的热门帖子摘要。

请生成一份简洁的中文"今日热点洞察"报告，严格按JSON格式返回（不要包含```json```标记）。

**今日帖子摘要**：
{all_summaries_text}

**输出格式**：
{{
  "overview": "用1-2句话总结今天这些板块的整体讨论氛围和焦点（中文）",
  "highlights": {{
    "tech_news": ["提炼1-3条最重要的技术新闻或行业动态"],
    "dev_insights": ["提炼1-3条游戏开发相关的有价值见解或资源"],
    "hot_topics": ["提炼1-3个引发广泛讨论的热门话题"]
  }},
  "conclusion": "用一句话做个总结（可以幽默或专业）"
}}
"""

        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": overall_prompt}],
            "max_tokens": 800,
            "temperature": 0.7
        }
        
        proxies = {}
        if not IS_GITHUB_ACTIONS and os.getenv("PROXY_URL"):
            proxy_url = os.getenv("PROXY_URL")
            proxies = {"http": proxy_url, "https": proxy_url}
        
        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers=headers,
            json=data,
            proxies=proxies,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content'].strip()
            
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            summary_analysis = json.loads(content)
            logger.info("✓ 整体洞察报告生成成功")
        else:
            logger.error(f"✗ 整体洞察生成失败: {response.status_code}")
            summary_analysis = {
                "overview": "今日未能生成AI洞察报告。",
                "highlights": {"tech_news": [], "dev_insights": [], "hot_topics": []},
                "conclusion": "系统维护中。"
            }
            
    except Exception as e:
        logger.error(f"✗ 生成整体洞察时出错: {e}")
        summary_analysis = {
            "overview": "今日内容分析遇到技术问题。",
            "highlights": {"tech_news": [], "dev_insights": [], "hot_topics": []},
            "conclusion": "系统维护中，明日恢复。"
        }

    return {
        "summary_analysis": summary_analysis,
        "processed_posts": processed_posts
    }

# --- 报告生成 ---
def generate_json_report(report_data, posts_count):
    """生成JSON报告"""
    try:
        os.makedirs('data', exist_ok=True)
        today_str = datetime.now().strftime("%Y-%m-%d")
        filename = f"data/reddit_multi_report_{today_str}.json"

        final_json = {
            "meta": {
                "report_date": today_str,
                "title": f"Reddit技术+游戏开发每日报告 ({today_str})",
                "subreddits": SUBREDDITS,
                "post_count": posts_count,
                "generation_time": datetime.now().isoformat(),
                "status": "success" if posts_count > 0 else "no_data"
            },
            "summary": report_data.get('summary_analysis', {}),
            "posts": []
        }

        for post in report_data.get('processed_posts', []):
            final_json["posts"].append({
                "id": post.get('id', 'N/A'),
                "subreddit": post.get('subreddit'),
                "title": post.get('title', '无标题'),
                "title_cn": post.get('title_cn', '无标题'),
                "url": post.get('link', '#'),
                "analysis": post.get('analysis', {})
            })

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(final_json, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ JSON报告生成: {filename}")
        return filename
        
    except Exception as e:
        logger.error(f"✗ JSON报告生成失败: {e}")
        return None

def generate_markdown_report(report_data, posts_count):
    """生成Markdown报告"""
    try:
        os.makedirs('reports', exist_ok=True)
        today_str = datetime.now().strftime("%Y-%m-%d")
        filename = f"reports/Reddit_Multi_Daily_Report_{today_str}.md"

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"# Reddit技术+游戏开发每日报告 ({today_str})\n\n")
            f.write(f"> 来源板块: {', '.join([f'r/{s}' for s in SUBREDDITS])}\n\n")
            
            f.write("---\n\n")
            f.write("## 🎯 今日热点洞察\n\n")
            
            summary = report_data.get('summary_analysis', {})
            if summary:
                f.write(f"**整体概况**: {summary.get('overview', '暂无')}\n\n")
                
                highlights = summary.get('highlights', {})
                if highlights.get('tech_news'):
                    f.write("**📰 技术新闻**:\n")
                    for item in highlights['tech_news']:
                        f.write(f"- {item}\n")
                    f.write("\n")
                
                if highlights.get('dev_insights'):
                    f.write("**🎮 开发见解**:\n")
                    for item in highlights['dev_insights']:
                        f.write(f"- {item}\n")
                    f.write("\n")
                
                if highlights.get('hot_topics'):
                    f.write("**🔥 热门话题**:\n")
                    for item in highlights['hot_topics']:
                        f.write(f"- {item}\n")
                    f.write("\n")
                
                f.write(f"**📝 小结**: {summary.get('conclusion', '暂无')}\n\n")
            
            f.write("---\n\n")
            f.write(f"## 📋 帖子列表 (共 {posts_count} 篇)\n\n")
            
            # 按subreddit分组
            posts = report_data.get('processed_posts', [])
            if posts:
                current_sub = None
                for i, post in enumerate(posts, 1):
                    subreddit = post.get('subreddit')
                    if subreddit != current_sub:
                        current_sub = subreddit
                        f.write(f"\n### r/{subreddit}\n\n")
                    
                    title_cn = post.get('title_cn', post.get('title', '无标题'))
                    link = post.get('link', '#')
                    analysis = post.get('analysis', {})
                    
                    f.write(f"{i}. **{title_cn}**\n")
                    f.write(f"   - 原标题: {post.get('title', 'N/A')}\n")
                    f.write(f"   - 链接: {link}\n")
                    f.write(f"   - 核心议题: {analysis.get('core_issue', 'N/A')}\n")
                    f.write(f"   - 类型: {analysis.get('post_type', 'N/A')} | 价值: {analysis.get('value_assessment', 'N/A')}\n\n")
            else:
                f.write("今日未能抓取到任何帖子。\n")

        logger.info(f"✓ Markdown报告生成: {filename}")
        return filename
        
    except Exception as e:
        logger.error(f"✗ Markdown报告生成失败: {e}")
        return None

# --- 主函数 ---
async def main():
    """主函数"""
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info("🚀 Reddit多板块爬虫任务启动")
    logger.info(f"📋 目标板块: {', '.join(SUBREDDITS)}")
    logger.info(f"🌍 运行环境: {'GitHub Actions' if IS_GITHUB_ACTIONS else '本地环境'}")
    logger.info("=" * 60)
    
    try:
        if not DEEPSEEK_API_KEY:
            logger.error("❌ 未找到 DEEPSEEK_API_KEY 环境变量")
            return False
            
        if not NEON_DB_URL:
            logger.error("❌ 未找到 DATABASE_URL 环境变量")
            return False
        
        # 创建数据库表
        if not await create_posts_table():
            logger.error("❌ 数据库表创建失败")
            return False
        
        # 获取所有帖子
        posts_data = fetch_all_reddit_posts()
        
        if not posts_data:
            logger.error("❌ 未能获取到任何帖子")
            return False
        
        logger.info(f"✓ 共获取 {len(posts_data)} 个帖子")
        
        # 生成AI报告
        report_data = generate_ai_summary_report(posts_data)
        
        # 插入数据库
        if report_data.get('processed_posts'):
            await insert_posts_into_db(report_data['processed_posts'])
        
        # 生成报告文件
        json_file = generate_json_report(report_data, len(posts_data))
        md_file = generate_markdown_report(report_data, len(posts_data))
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info("=" * 60)
        logger.info("✅ 任务完成")
        logger.info(f"⏱️  用时: {duration:.2f} 秒")
        logger.info(f"📊 处理: {len(posts_data)} 个帖子")
        logger.info(f"📄 报告: {json_file}")
        logger.info(f"📄 报告: {md_file}")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 任务执行失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)

