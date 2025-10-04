# reddit_scraper.py - Reddit RSS爬虫，基于linuxdo-scraper架构
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

# --- 配置日志 ---
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
SUBREDDIT = "technology"
RSS_URL = f"https://www.reddit.com/r/{SUBREDDIT}/.rss?sort=hot"
POST_COUNT_LIMIT = 10
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
NEON_DB_URL = os.getenv("DATABASE_URL")

proxy_for_all = "http://127.0.0.1:10809"
os.environ['HTTP_PROXY'] = proxy_for_all
os.environ['HTTPS_PROXY'] = proxy_for_all

# --- Reddit 爬虫函数 ---
def fetch_reddit_posts():
    """从Reddit RSS获取帖子数据"""
    logger.info(f"开始从 r/{SUBREDDIT} 的 RSS 源爬取热门帖子...")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    
    try:
        response = requests.get(RSS_URL, headers=headers, timeout=20, proxies={"http": proxy_for_all, "https": proxy_for_all})
        response.raise_for_status()
        root = ET.fromstring(response.content)
        all_posts = []
        
        for i, entry in enumerate(root.findall('{http://www.w3.org/2005/Atom}entry')):
            if i >= POST_COUNT_LIMIT:
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
                
                # 提取Reddit帖子ID (从URL中提取comments后的部分)
                post_id = "reddit_unknown"
                if '/comments/' in link:
                    # 格式: /r/technology/comments/1nx583c/title/
                    parts = link.split('/comments/')
                    if len(parts) > 1:
                        id_part = parts[1].split('/')[0]
                        post_id = f"reddit_{id_part}"
                
                all_posts.append({
                    "id": post_id,
                    "title": title,
                    "link": link,
                    "author": author,
                    "content": clean_content[:500] + '...' if len(clean_content) > 500 else clean_content,
                    "subreddit": SUBREDDIT,
                    "score": 0,
                    "num_comments": 0
                })
                logger.info(f"  解析帖子 {i+1}: {title[:60]}...")
        
        logger.info(f"成功解析到 {len(all_posts)} 个帖子。")
        return all_posts
        
    except requests.exceptions.RequestException as e:
        logger.error(f"请求 Reddit RSS 源失败: {e}")
        return []
    except ET.ParseError as e:
        logger.error(f"XML 解析失败: {e}")
        return []
    except Exception as e:
        logger.error(f"处理帖子时发生未知错误: {e}")
        return []

# --- AI分析函数 (复用 linuxdo-scraper 的提示词结构) ---
def analyze_single_post_with_deepseek(post, retry_count=0):
    """使用DeepSeek分析单个Reddit帖子"""
    excerpt = post.get('content', '')[:1000]
    if not excerpt.strip():
        excerpt = post.get('title', '')[:100]

    prompt = f"""
你是一名社交媒体内容分析师。请分析以下Reddit帖子内容，并严格按照指定的JSON格式返回结果。
你的回复必须是一个有效的JSON对象，不要包含任何解释性文字或Markdown的```json ```标记。

**帖子标题**: {post['title']}
**帖子内容**: {excerpt}

**请输出以下结构的JSON**:
{{
  "core_issue": "这里用一句话概括帖子的核心议题",
  "key_info": [
    "关键信息或观点1",
    "关键信息或观点2"
  ],
  "post_type": "从[技术讨论, 新闻分享, 问题求助, 观点讨论, 资源分享, 娱乐内容, 其他]中选择一个",
  "value_assessment": "从[高, 中, 低]中选择一个"
}}
"""
    
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 400,
        "temperature": 0.3
    }
    
    try:
        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers=headers,
            json=data,
            proxies={"http": proxy_for_all, "https": proxy_for_all},
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
                logger.info(f"帖子 '{post['title'][:30]}...' AI分析成功")
                return analysis
            except json.JSONDecodeError:
                logger.error(f"AI返回的内容不是有效JSON: {content[:100]}...")
                return {"core_issue": "解析失败", "key_info": ["解析失败"], "post_type": "其他", "value_assessment": "低"}
        
        else:
            logger.error(f"DeepSeek API调用失败: {response.status_code} - {response.text}")
            return {"core_issue": "API失败", "key_info": ["API失败"], "post_type": "其他", "value_assessment": "低"}
            
    except Exception as e:
        logger.error(f"AI分析失败: {e}")
        if retry_count < 2:
            logger.info(f"重试AI分析 ({retry_count + 1}/2)...")
            time.sleep(1)
            return analyze_single_post_with_deepseek(post, retry_count + 1)
        else:
            return {"core_issue": "分析失败", "key_info": ["分析失败"], "post_type": "其他", "value_assessment": "低"}

# --- 数据库操作 ---
async def create_posts_table():
    """创建reddit帖子表"""
    if not NEON_DB_URL:
        logger.error("未找到 DATABASE_URL 环境变量。无法连接到数据库。")
        return False

    conn = None
    try:
        conn = await asyncpg.connect(NEON_DB_URL, command_timeout=30)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS reddit_posts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
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
        logger.info("数据库表 'reddit_posts' 检查或创建成功。")
        return True
    except Exception as e:
        logger.error(f"创建数据库表失败: {e}")
        return False
    finally:
        if conn:
            await conn.close()

async def insert_posts_into_db(posts_data):
    """将帖子数据插入到数据库"""
    if not NEON_DB_URL:
        logger.error("未找到 DATABASE_URL 环境变量。无法连接到数据库。")
        return False

    conn = None
    try:
        conn = await asyncpg.connect(NEON_DB_URL, command_timeout=30)
        logger.info("开始将 Reddit 帖子数据插入到数据库...")
        
        success_count = 0
        for post in posts_data:
            try:
                post_id = post.get('id')
                title = post.get('title')
                url = post.get('link')
                analysis = post.get('analysis', {})
                core_issue = analysis.get('core_issue')
                key_info = json.dumps(analysis.get('key_info', []))
                post_type = analysis.get('post_type')
                value_assessment = analysis.get('value_assessment')
                subreddit = post.get('subreddit', SUBREDDIT)
                score = post.get('score', 0)
                num_comments = post.get('num_comments', 0)

                await conn.execute("""
                    INSERT INTO reddit_posts (id, title, url, core_issue, key_info, post_type, value_assessment, subreddit, score, num_comments)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        url = EXCLUDED.url,
                        core_issue = EXCLUDED.core_issue,
                        key_info = EXCLUDED.key_info,
                        post_type = EXCLUDED.post_type,
                        value_assessment = EXCLUDED.value_assessment,
                        subreddit = EXCLUDED.subreddit,
                        score = EXCLUDED.score,
                        num_comments = EXCLUDED.num_comments,
                        timestamp = CURRENT_TIMESTAMP;
                """, post_id, title, url, core_issue, key_info, post_type, value_assessment, subreddit, score, num_comments)
                
                logger.info(f"  - Reddit 帖子 '{title[:30]}...' (ID: {post_id}) 已插入/更新。")
                success_count += 1
                
            except Exception as e:
                logger.error(f"插入 Reddit 帖子 {post.get('id', 'N/A')} 失败: {e}")
                continue
        
        logger.info(f"成功插入/更新了 {success_count}/{len(posts_data)} 条 Reddit 帖子数据到数据库。")
        return success_count > 0
        
    except Exception as e:
        logger.error(f"插入 Reddit 帖子数据到数据库失败: {e}")
        return False
    finally:
        if conn:
            await conn.close()

# --- AI整体洞察报告生成 ---
def generate_ai_summary_report(posts_data):

    processed_posts = []
    post_summaries = []

    logger.info("--- 开始生成逐帖结构化分析 ---")

    for i, post in enumerate(posts_data):
        logger.info(f"正在分析第 {i+1}/{len(posts_data)} 篇: {post['title'][:50]}...")
        
        analysis = analyze_single_post_with_deepseek(post)
        
        if analysis:
            processed_posts.append({
                "id": post.get('id'),
                "title": post.get('title'),
                "link": post.get('link'),
                "author": post.get('author'),
                "content": post.get('content'),
                "analysis": analysis,
                "subreddit": post.get('subreddit'),
                "score": post.get('score', 0),
                "num_comments": post.get('num_comments', 0)
            })
            
            post_summaries.append({
                "title": post.get('title', 'N/A'),
                "core_issue": analysis.get('core_issue', 'N/A'),
                "post_type": analysis.get('post_type', 'N/A'),
                "value_assessment": analysis.get('value_assessment')

            })
            
            logger.info(f"帖子 '{post['title'][:30]}...' AI分析成功")
            logger.info("    ...等待3秒以遵守API速率限制...")
            time.sleep(3)
        else:
            logger.error(f"帖子 '{post['title'][:30]}...' AI分析失败")

    logger.info("--- 逐帖分析全部完成 ---")

    logger.info("--- 开始生成今日整体洞察报告 (JSON格式) ---")
    
    try:
        all_summaries_text = json.dumps(post_summaries, ensure_ascii=False, indent=2)

        overall_prompt = f"""
你是一名资深的社交媒体内容分析师。以下是今天 Reddit 热门帖子的JSON格式摘要列表。
请根据这些信息，生成一份高度浓缩的中文"今日热点洞察"报告，并严格以指定的JSON格式返回。
你的回复必须是一个有效的JSON对象，不要包含任何解释性文字或Markdown的```json ```标记。

**今日帖子摘要合集 (JSON格式):**
{all_summaries_text}
---
**请输出以下结构的JSON**:
{{
  "overview": "用一两句话总结今天 Reddit 社区的整体氛围和讨论焦点。",
  "highlights": {
    "tech_savvy": ["提炼1-3条最硬核的技术干货或科技资讯"],
    "resources_deals": ["提炼1-3条最值得关注的资源分享或优惠信息"],
    "hot_topics": ["提炼1-3个引发最广泛讨论的热门话题或争议点"]
  },
  "conclusion": "用一句话对今天的内容做个风趣或专业的总结。"
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
        
        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers=headers,
            json=data,
            proxies={"http": proxy_for_all, "https": proxy_for_all},
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
            logger.info("--- 整体洞察报告生成完毕 ---")
        else:
            logger.error(f"整体洞察报告生成失败: {response.status_code}")
            summary_analysis = {
                "overview": "今日未能生成AI洞察报告。",
                "highlights": {"tech_savvy": [], "resources_deals": [], "hot_topics": []},
                "conclusion": "数据解析中，敬请期待明日更精彩的内容。"
            }
            
    except Exception as e:
        logger.error(f"生成整体洞察报告时发生错误: {e}")
        summary_analysis = {
            "overview": "今日内容分析过程中遇到技术问题。",
            "highlights": {"tech_savvy": [], "resources_deals": [], "hot_topics": []},
            "conclusion": "系统维护中，明日恢复正常服务。"
        }

    return {
        "summary_analysis": summary_analysis,
        "processed_posts": processed_posts
    }

# --- JSON报告生成 ---
def generate_json_report(report_data, posts_count):
    """生成JSON报告文件"""
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")
        filename = f"data/reddit_technology_report_{today_str}.json"

        final_json = {
            "meta": {
                "report_date": today_str,
                "title": f"Reddit Technology 每日热点报告 ({today_str})",
                "source": "Reddit",
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
                "title": post.get('title', '无标题'),
                "url": post.get('link', '#'),
                "analysis": post.get('analysis', {})
            })

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(final_json, f, ensure_ascii=False, indent=2)

        logger.info(f"JSON报告已生成: {filename}")
        return filename
        
    except Exception as e:
        logger.error(f"生成JSON报告失败: {e}")
        return None

# --- Markdown报告生成 ---
def generate_markdown_report(report_data, posts_count):
    """生成Markdown报告"""
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")
        filename = f"reports/Reddit_Technology_Daily_Report_{today_str}.md"

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"# Reddit Technology 每日热点报告 ({today_str})\n\n")
            
            f.write("---\n\n")
            f.write("## 🎯 今日热点洞察\n\n")
            
            summary = report_data.get('summary_analysis', {})
            if summary:
                f.write(f"**整体概况**: {summary.get('overview', '暂无分析')}\n\n")
                
                highlights = summary.get('highlights', {})
                if highlights.get('tech_savvy'):
                    f.write("**🔧 技术要闻**:\n")
                    for item in highlights['tech_savvy']:
                        f.write(f"- {item}\n")
                    f.write("\n")
                
                if highlights.get('hot_topics'):
                    f.write("**🔥 热门话题**:\n")
                    for item in highlights['hot_topics']:
                        f.write(f"- {item}\n")
                    f.write("\n")
                
                f.write(f"**📝 小结**: {summary.get('conclusion', '暂无总结')}\n\n")
            
            f.write("---\n\n")
            f.write("## 📋 原始帖子列表 (共 {} 篇)\n\n".format(posts_count))
            
            posts = report_data.get('processed_posts', [])
            if posts:
                for i, post in enumerate(posts, 1):
                    title = post.get('title', '无标题')
                    link = post.get('link', '#')
                    analysis = post.get('analysis', {})
                    
                    f.write(f"{i}. [{title}]({link})\n")
                    f.write(f"   - **议题**: {analysis.get('core_issue', 'N/A')}\n")
                    f.write(f"   - **类型**: {analysis.get('post_type', 'N/A')}\n")
                    f.write(f"   - **价值**: {analysis.get('value_assessment', 'N/A')}\n\n")
            else:
                f.write("今日未能抓取到任何帖子。\n")

        logger.info(f"Markdown报告已生成: {filename}")
        return filename
        
    except Exception as e:
        logger.error(f"生成Markdown报告失败: {e}")
        return None

# --- 主函数 ---
async def main():
    """主函数"""
    start_time = datetime.now()
    logger.info("=== 开始执行 Reddit 爬虫任务 ===")
    
    try:
        if not DEEPSEEK_API_KEY:
            logger.error("未找到 DEEPSEEK_API_KEY 环境变量")
            return False
            
        if not NEON_DB_URL:
            logger.error("未找到 DATABASE_URL 环境变量")
            return False
        
        # 创建数据库表
        if not await create_posts_table():
            logger.error("数据库表创建失败")
            return False
        
        # 获取帖子数据
        posts_data = fetch_reddit_posts()
        
        if not posts_data:
            logger.error("未能获取到任何帖子数据")
            empty_data = {
                "summary_analysis": {
                    "error": "未能抓取到任何帖子数据，可能是网络问题或RSS源异常",
                    "overview": "今日未能抓取到任何帖子数据。"
                }, 
                "processed_posts": []
            }
            generate_json_report(empty_data, 0)
            generate_markdown_report(empty_data, 0)
            return False
        
        logger.info(f"成功获取到 {len(posts_data)} 条帖子数据")
        
        # 生成AI报告
        report_data = generate_ai_summary_report(posts_data)
        
        # 插入数据到数据库
        if report_data.get('processed_posts'):
            db_success = await insert_posts_into_db(report_data['processed_posts'])
            if not db_success:
                logger.error("数据库插入失败")
        
        # 生成报告文件
        json_file = generate_json_report(report_data, len(posts_data))
        md_file = generate_markdown_report(report_data, len(posts_data))
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info(f"=== 任务完成 ===")
        logger.info(f"处理时间: {duration:.2f} 秒")
        logger.info(f"处理帖子: {len(posts_data)} 条")
        logger.info(f"生成文件: {json_file}, {md_file}")
        
        return True
        
    except Exception as e:
        logger.error(f"主函数执行失败: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    if success:
        print("\n🎉 Reddit 爬虫任务执行成功！")
    else:
        print("\n💥 Reddit 爬虫任务执行失败！")