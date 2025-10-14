# scraper_optimized.py - 优化版Linux.do爬虫（本地PC运行版）
# 功能：爬取Linux.do论坛RSS，使用DeepSeek AI分析，存入Neon数据库
# 使用方法：
#   1. 确保已安装依赖: pip install playwright playwright-stealth asyncpg requests python-dotenv
#   2. 安装浏览器: python -m playwright install chromium
#   3. 配置 .env 文件（见下方配置说明）
#   4. 运行: python scraper_optimized.py

import asyncio
import os
import re
import json
import logging
from datetime import datetime
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
import requests
from dotenv import load_dotenv
import xml.etree.ElementTree as ET
import time
import asyncpg

# =============================================================================
# 配置区域 - 根据你的环境修改
# =============================================================================

# 加载环境变量（从项目根目录）
import pathlib
env_path = pathlib.Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# 代理配置（如果不需要代理，设置为 None）
PROXY_URL = os.getenv("PROXY_URL", "http://127.0.0.1:10809")  # 默认代理地址
USE_PROXY = PROXY_URL and PROXY_URL.lower() != "none"  # 是否使用代理

# API配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# 数据库配置
NEON_DB_URL = os.getenv("DATABASE_URL")

# 爬取配置
WARM_UP_URL = "https://linux.do/"
RSS_URL = "https://linux.do/latest.rss"
POST_COUNT_LIMIT = int(os.getenv("POST_COUNT_LIMIT", "30"))  # 爬取帖子数量

# 重试配置
MAX_RETRIES = 3
RETRY_DELAY = 5

# AI请求间隔（避免触发速率限制）
AI_REQUEST_DELAY = 3

# 浏览器配置
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"  # 是否无头模式

# =============================================================================
# 日志配置
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('scraper.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# =============================================================================
# 启动检查
# =============================================================================

def check_environment():
    """检查运行环境是否配置正确"""
    logger.info("=" * 80)
    logger.info("Linux.do 爬虫 - 本地PC运行版")
    logger.info("=" * 80)
    
    issues = []
    
    # 检查代理配置
    if USE_PROXY:
        logger.info(f"✓ 代理模式: 启用 ({PROXY_URL})")
        os.environ['HTTP_PROXY'] = PROXY_URL
        os.environ['HTTPS_PROXY'] = PROXY_URL
    else:
        logger.info("✓ 代理模式: 禁用（直连）")
    
    # 检查API密钥
    if not DEEPSEEK_API_KEY:
        issues.append("❌ 未找到 DEEPSEEK_API_KEY 环境变量")
    else:
        logger.info(f"✓ DeepSeek API密钥: {DEEPSEEK_API_KEY[:8]}...")
    
    # 检查数据库URL
    if not NEON_DB_URL:
        issues.append("❌ 未找到 DATABASE_URL 环境变量")
    else:
        logger.info(f"✓ 数据库连接: 已配置")
    
    # 检查配置
    logger.info(f"✓ 爬取数量: {POST_COUNT_LIMIT} 篇帖子")
    logger.info(f"✓ 浏览器模式: {'无头' if HEADLESS else '有界面'}")
    logger.info(f"✓ AI请求间隔: {AI_REQUEST_DELAY} 秒")
    logger.info("=" * 80)
    
    if issues:
        logger.error("\n配置问题：")
        for issue in issues:
            logger.error(issue)
        logger.error("\n请在 .env 文件中配置以下变量：")
        logger.error("  DEEPSEEK_API_KEY=your_api_key")
        logger.error("  DATABASE_URL=your_postgres_url")
        logger.error("  PROXY_URL=http://127.0.0.1:10809  # 可选，不用代理则设为 none")
        logger.error("  POST_COUNT_LIMIT=30  # 可选，默认30")
        return False
    
    return True

# =============================================================================
# 重试装饰器
# =============================================================================

def retry_on_failure(max_retries=3, delay=5):
    """重试装饰器"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    logger.warning(f"⚠️ 尝试 {attempt + 1}/{max_retries} 失败: {e}")
                    if attempt == max_retries - 1:
                        logger.error(f"❌ 所有重试失败，函数 {func.__name__} 执行失败")
                        raise e
                    logger.info(f"⏳ 等待 {delay} 秒后重试...")
                    await asyncio.sleep(delay)
            return None
        return wrapper
    return decorator

# =============================================================================
# AI分析函数
# =============================================================================

def analyze_single_post_with_deepseek(post):
    """使用DeepSeek对单个帖子进行深度分析"""
    try:
        # 清理内容
        clean_content = re.sub(r'<.*?>', ' ', post.get('content', ''))
        clean_content = re.sub(r'\s+', ' ', clean_content).strip()
        excerpt = (clean_content[:800] + '...') if len(clean_content) > 800 else clean_content

        if not excerpt or len(excerpt.strip()) < 10:
            logger.warning(f"⚠️ 帖子 '{post.get('title', 'N/A')}' 内容过短，跳过AI分析")
            return {
                "error": "内容过短或为空",
                "core_issue": "N/A", 
                "key_info": [], 
                "post_type": "未知", 
                "value_assessment": "低",
                "detailed_analysis": ""
            }

        # 构建AI分析提示词
        prompt = f"""
        你是一名资深的论坛内容分析师。请仔细分析以下帖子内容，并生成一份**深度分析报告**，让读者无需查看原文即可全面理解。
        你的回复必须是一个有效的JSON对象，不要包含任何解释性文字或Markdown的```json ```标记。

        **帖子标题**: {post['title']}
        **内容节选**: {excerpt}

        **请输出以下结构的JSON**:
        {{
          "core_issue": "用一句话概括帖子的核心议题",
          "key_info": [
            "关键信息或解决方案点1",
            "关键信息或解决方案点2",
            "关键信息或解决方案点3"
          ],
          "post_type": "从[技术问答, 资源分享, 新闻资讯, 优惠活动, 日常闲聊, 求助, 讨论, 产品评测]中选择一个",
          "value_assessment": "从[高, 中, 低]中选择一个",
          "detailed_analysis": "生成300-800字的深度分析，包含以下内容（用markdown格式）：\\n\\n## 📋 背景介绍\\n简要说明这个话题为什么重要、相关背景信息\\n\\n## 🎯 核心内容\\n详细展开帖子的主要内容和关键信息点\\n\\n## 💡 技术细节（如适用）\\n- 具体的技术方案、工具、代码要点\\n- 实现步骤或架构设计\\n- 性能优化或配置方法\\n\\n## 💬 讨论价值\\n- 这个话题可能引发的讨论方向\\n- 社区可能关注的焦点\\n- 常见的疑问或争议点\\n\\n## 🔧 实用价值\\n- 如何应用这些信息\\n- 相关资源链接或推荐\\n- 注意事项或限制\\n\\n## 🚀 总结与建议\\n趋势分析、个人建议或延伸思考"
        }}
        """
        
        # 调用DeepSeek API
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 2000,
            "temperature": 0.5
        }
        
        proxies = {"http": PROXY_URL, "https": PROXY_URL} if USE_PROXY else None
        
        response = requests.post(
            DEEPSEEK_API_URL,
            headers=headers,
            json=data,
            proxies=proxies,
            timeout=90  # 增加超时时间，因为需要生成更长的深度分析
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result['choices'][0]['message']['content']
            
            # 解析JSON
            cleaned_text = ai_response.strip().replace("```json", "").replace("```", "").strip()
            analysis_data = json.loads(cleaned_text)
            logger.info(f"✓ AI分析成功: {post['title'][:40]}...")
            return analysis_data
        else:
            logger.error(f"❌ DeepSeek API调用失败: {response.status_code} - {response.text}")
            return {
                "error": f"API调用失败: {response.status_code}",
                "core_issue": "API调用失败", 
                "key_info": [], 
                "post_type": "错误", 
                "value_assessment": "低",
                "detailed_analysis": ""
            }
        
    except json.JSONDecodeError as e:
        ai_resp = locals().get('ai_response', 'N/A')
        logger.error(f"❌ JSON解析失败! AI返回: '{ai_resp[:100] if ai_resp else 'N/A'}...'")
        return {
            "error": "AI返回了非JSON格式的内容", 
            "raw_response": ai_resp[:200] if ai_resp else "N/A",
            "core_issue": "AI分析失败", 
            "key_info": [], 
            "post_type": "错误", 
            "value_assessment": "低",
            "detailed_analysis": ""
        }
    except requests.exceptions.Timeout:
        logger.error(f"❌ DeepSeek API请求超时")
        return {
            "error": "API请求超时",
            "core_issue": "API超时", 
            "key_info": [], 
            "post_type": "错误", 
            "value_assessment": "低",
            "detailed_analysis": ""
        }
    except Exception as e:
        logger.error(f"❌ 分析失败: {post.get('title', 'N/A')[:30]}... - {e}")
        return {
            "error": f"分析失败: {e}",
            "core_issue": "AI分析失败", 
            "key_info": [], 
            "post_type": "错误", 
            "value_assessment": "低",
            "detailed_analysis": ""
        }

# =============================================================================
# 爬虫核心函数
# =============================================================================

@retry_on_failure(max_retries=MAX_RETRIES, delay=RETRY_DELAY)
async def fetch_linuxdo_posts():
    """爬取Linux.do帖子"""
    logger.info("🚀 开始爬取Linux.do帖子...")
    
    async with async_playwright() as p:
        browser = None
        try:
            # 启动浏览器
            launch_options = {
                "headless": HEADLESS,
                "args": ['--no-sandbox', '--disable-dev-shm-usage']
            }
            if USE_PROXY:
                launch_options["proxy"] = {"server": PROXY_URL}
            
            browser = await p.chromium.launch(**launch_options)
            
            # 创建上下文（模拟真实浏览器）
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                extra_http_headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                    "Accept-Encoding": "gzip, deflate, br",
                    "DNT": "1",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                }
            )
            
            # 应用反爬虫策略
            stealth = Stealth()
            await stealth.apply_stealth_async(context)
            page = await context.new_page()

            # 预热：访问首页建立会话
            logger.info(f"⏳ 访问首页预热: {WARM_UP_URL}")
            await page.goto(WARM_UP_URL, wait_until="domcontentloaded", timeout=60000)
            logger.info("✓ 预热完成")
            await asyncio.sleep(3)

            # 访问RSS源
            logger.info(f"⏳ 访问RSS源: {RSS_URL}")
            await page.goto(RSS_URL, wait_until="networkidle", timeout=120000)
            await asyncio.sleep(2)

            # 获取RSS内容
            rss_text = await page.evaluate("document.documentElement.outerHTML")
            
            # 保存调试文件
            debug_filename = f"debug_rss_content_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
            with open(debug_filename, 'w', encoding='utf-8') as f:
                f.write(rss_text)
            logger.info(f"✓ 已保存调试文件: {debug_filename} ({len(rss_text)} 字符)")

            # 解析RSS内容
            all_posts = []
            logger.info("⏳ 解析RSS内容...")

            # 方式1：直接解析XML
            try:
                root = ET.fromstring(rss_text)
                items = root.findall('.//channel/item')
                logger.info(f"✓ 找到 {len(items)} 个帖子")
                
                for i, item in enumerate(items[:POST_COUNT_LIMIT]):
                    title = item.find('title')
                    link = item.find('link')
                    description = item.find('description')
                    
                    if title is not None and link is not None:
                        title_text = title.text
                        link_text = link.text
                        description_text = description.text if description is not None else ""
                        
                        match = re.search(r'/t/[^/]+/(\d+)', link_text)
                        if match:
                            topic_id = match.group(1)
                            all_posts.append({
                                "title": title_text,
                                "link": link_text,
                                "id": topic_id,
                                "description": description_text
                            })
                        
            except ET.ParseError:
                # 方式2：从HTML中提取XML
                logger.info("⏳ 尝试从HTML中提取XML...")
                try:
                    from bs4 import BeautifulSoup
                    import html
                    
                    soup = BeautifulSoup(rss_text, 'html.parser')
                    pre_tag = soup.find('pre')
                    
                    if pre_tag:
                        xml_content = html.unescape(pre_tag.get_text())
                        root = ET.fromstring(xml_content)
                        items = root.findall('.//channel/item')
                        
                        for i, item in enumerate(items[:POST_COUNT_LIMIT]):
                            title = item.find('title')
                            link = item.find('link')
                            description = item.find('description')
                            
                            if title is not None and link is not None:
                                match = re.search(r'/t/[^/]+/(\d+)', link.text)
                                if match:
                                    all_posts.append({
                                        "title": title.text,
                                        "link": link.text,
                                        "id": match.group(1),
                                        "description": description.text if description is not None else ""
                                    })
                                    
                except Exception as e2:
                    logger.error(f"❌ HTML提取失败: {e2}")

            # 方式3：正则表达式提取（兜底方案）
            if not all_posts:
                logger.info("⏳ 使用正则表达式提取（兜底方案）...")
                title_pattern = r'<title>([^<]+)</title>'
                link_pattern = r'<link>([^<]+)</link>'
                titles = re.findall(title_pattern, rss_text)
                links = re.findall(link_pattern, rss_text)

                for i, (title, link) in enumerate(zip(titles, links)):
                    if i >= POST_COUNT_LIMIT:
                        break
                    match = re.search(r'/t/[^/]+/(\d+)', link)
                    if match:
                        all_posts.append({
                            "title": title,
                            "link": link,
                            "id": match.group(1),
                            "description": ""
                        })
            
            logger.info(f"✓ 成功解析 {len(all_posts)} 篇帖子")
            
            if not all_posts:
                logger.error("❌ 未能解析到任何帖子")
                return []
            
            # 处理帖子内容
            posts_with_content = []
            for i, post in enumerate(all_posts):
                rss_content = post.get('description', '')

                if rss_content:
                    # 提取互动数据："X 个帖子 - Y 位参与者"
                    replies_count = 0
                    participants_count = 0
                    try:
                        match = re.search(r'(\d+)\s*个帖子\s*-\s*(\d+)\s*位参与者', rss_content)
                        if match:
                            replies_count = int(match.group(1))
                            participants_count = int(match.group(2))
                    except Exception:
                        pass

                    # 清理HTML标签，并移除互动统计语句
                    clean_content = re.sub(r'<[^>]+>', ' ', rss_content)
                    clean_content = re.sub(r'\d+\s*个帖子\s*-\s*\d+\s*位参与者', '', clean_content)
                    clean_content = ' '.join(clean_content.split())

                    if len(clean_content.strip()) > 10:
                        post['content'] = clean_content
                        post['replies_count'] = replies_count
                        post['participants_count'] = participants_count
                        logger.info(f"  [{i+1}/{len(all_posts)}] {post['title'][:50]}... ({len(clean_content)} 字符)")
                    else:
                        post['content'] = f"帖子标题：{post['title']}"
                else:
                    post['content'] = f"帖子标题：{post['title']}"
                
                posts_with_content.append(post)

                if i < len(all_posts) - 1:
                    await asyncio.sleep(1)

            logger.info(f"✓ 获取到 {len(posts_with_content)} 篇帖子内容")
            return posts_with_content

        except Exception as e:
            logger.error(f"❌ 爬取失败: {e}")
            # 尝试保存错误截图
            try:
                if browser:
                    page = await browser.new_page()
                    screenshot_path = f"error_screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                    await page.screenshot(path=screenshot_path)
                    logger.info(f"✓ 已保存错误截图: {screenshot_path}")
            except:
                pass
            raise e
        finally:
            if browser:
                await browser.close()

# =============================================================================
# 数据库操作
# =============================================================================

async def create_posts_table():
    """创建数据库表"""
    conn = None
    try:
        conn = await asyncpg.connect(NEON_DB_URL)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                core_issue TEXT,
                key_info JSONB,
                post_type TEXT,
                value_assessment TEXT,
                detailed_analysis TEXT,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logger.info("✓ 数据库表检查完成")
        return True
    except Exception as e:
        logger.error(f"❌ 数据库表创建失败: {e}")
        return False
    finally:
        if conn:
            await conn.close()

async def insert_posts_into_db(posts_data):
    """插入帖子数据到数据库"""
    conn = None
    try:
        conn = await asyncpg.connect(NEON_DB_URL)
        logger.info("⏳ 开始插入数据到数据库...")
        
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
                detailed_analysis = analysis.get('detailed_analysis')

                # 新字段（若存在）：replies_count / participants_count
                replies_count = int(post.get('replies_count') or 0)
                participants_count = int(post.get('participants_count') or 0)

                # 优先尝试插入包含新列的语句；如果失败则回退到旧语句（兼容未迁移的表结构）
                try:
                    await conn.execute("""
                        INSERT INTO posts (id, title, url, core_issue, key_info, post_type, value_assessment, detailed_analysis, replies_count, participants_count)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        ON CONFLICT (id) DO UPDATE SET
                            title = EXCLUDED.title,
                            url = EXCLUDED.url,
                            core_issue = EXCLUDED.core_issue,
                            key_info = EXCLUDED.key_info,
                            post_type = EXCLUDED.post_type,
                            value_assessment = EXCLUDED.value_assessment,
                            detailed_analysis = EXCLUDED.detailed_analysis,
                            replies_count = EXCLUDED.replies_count,
                            participants_count = EXCLUDED.participants_count,
                            timestamp = CURRENT_TIMESTAMP;
                    """, post_id, title, url, core_issue, key_info, post_type, value_assessment, detailed_analysis, replies_count, participants_count)
                except Exception as insert_err:
                    logger.warning(f"posts 表缺少新列，回退旧插入语句: {insert_err}")
                    await conn.execute("""
                        INSERT INTO posts (id, title, url, core_issue, key_info, post_type, value_assessment, detailed_analysis)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT (id) DO UPDATE SET
                            title = EXCLUDED.title,
                            url = EXCLUDED.url,
                            core_issue = EXCLUDED.core_issue,
                            key_info = EXCLUDED.key_info,
                            post_type = EXCLUDED.post_type,
                            value_assessment = EXCLUDED.value_assessment,
                            detailed_analysis = EXCLUDED.detailed_analysis,
                            timestamp = CURRENT_TIMESTAMP;
                    """, post_id, title, url, core_issue, key_info, post_type, value_assessment, detailed_analysis)
                
                success_count += 1
                
            except Exception as e:
                logger.error(f"❌ 插入帖子失败 [{post.get('id', 'N/A')}]: {e}")
                continue
        
        logger.info(f"✓ 成功插入 {success_count}/{len(posts_data)} 条数据")
        return success_count > 0
        
    except Exception as e:
        logger.error(f"❌ 数据库操作失败: {e}")
        return False
    finally:
        if conn:
            await conn.close()

# =============================================================================
# AI报告生成
# =============================================================================

def generate_ai_analysis(posts_data):
    """生成AI分析报告"""
    if not posts_data:
        logger.warning("⚠️ 没有帖子数据")
        return {"summary_analysis": {"error": "没有帖子数据"}, "processed_posts": []}

    logger.info("⏳ 开始AI分析...")
    processed_posts = []
    
    for i, post in enumerate(posts_data):
        logger.info(f"  [{i+1}/{len(posts_data)}] 分析: {post['title'][:40]}...")
        
        try:
            post['analysis'] = analyze_single_post_with_deepseek(post)
            processed_posts.append(post)
            
            if i < len(posts_data) - 1:
                time.sleep(AI_REQUEST_DELAY)
                
        except Exception as e:
            logger.error(f"❌ 分析失败: {e}")
            post['analysis'] = {
                "error": f"分析失败: {e}",
                "core_issue": "分析失败",
                "key_info": [],
                "post_type": "错误",
                "value_assessment": "低",
                "detailed_analysis": ""
            }
            processed_posts.append(post)
            
    logger.info("✓ AI分析完成")

    return {
        "summary_analysis": {"status": "success"},
        "processed_posts": processed_posts
    }

# =============================================================================
# 报告生成
# =============================================================================

def generate_json_report(report_data, posts_count):
    """生成JSON报告"""
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")
        filename = f"../data/linux.do_report_{today_str}.json"

        final_json = {
            "meta": {
                "report_date": today_str,
                "title": f"Linux.do 每日热帖报告 ({today_str})",
                "source": "Linux.do",
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

        # 确保目录存在
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(final_json, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ JSON报告已生成: {filename}")
        return filename
        
    except Exception as e:
        logger.error(f"❌ 生成JSON报告失败: {e}")
        return None

# =============================================================================
# 主函数
# =============================================================================

async def main():
    """主函数"""
    start_time = datetime.now()
    logger.info("")
    
    # 环境检查
    if not check_environment():
        return False
    
    try:
        # 1. 创建数据库表
        if not await create_posts_table():
            return False
        
        # 2. 爬取帖子
        posts_data = await fetch_linuxdo_posts()
        
        if not posts_data:
            logger.error("❌ 未能获取帖子数据")
            return False
        
        logger.info(f"✓ 获取到 {len(posts_data)} 篇帖子")
        
        # 3. AI分析
        report_data = generate_ai_analysis(posts_data)
        
        # 4. 插入数据库
        if report_data.get('processed_posts'):
            await insert_posts_into_db(report_data['processed_posts'])
        
        # 5. 生成报告
        json_file = generate_json_report(report_data, len(posts_data))
        
        # 完成
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info("=" * 80)
        logger.info(f"✓ 任务完成！")
        logger.info(f"  处理时间: {duration:.2f} 秒")
        logger.info(f"  处理帖子: {len(posts_data)} 篇")
        logger.info(f"  生成文件: {json_file}")
        logger.info("=" * 80)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 任务失败: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)




