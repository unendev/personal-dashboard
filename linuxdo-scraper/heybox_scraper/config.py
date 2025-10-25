"""
小黑盒爬虫配置文件
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# 加载环境变量（从项目根目录）
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# ========== 小黑盒API配置 ==========
HEYBOX_TOKEN_ID = os.getenv("HEYBOX_TOKEN_ID", "")
HEYBOX_BASE_URL = "https://api.xiaoheihe.cn"
HEYBOX_HOME_URL = "https://www.xiaoheihe.cn/app/bbs/home"

# ========== 爬取配置 ==========
POST_LIMIT = int(os.getenv("HEYBOX_POST_LIMIT", "20"))
COMMENT_LIMIT = int(os.getenv("HEYBOX_COMMENT_LIMIT", "50"))
REQUEST_INTERVAL = 2  # 请求间隔（秒）
MAX_RETRIES = 3
RETRY_DELAY = 5

# ========== DeepSeek AI配置 ==========
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
AI_REQUEST_DELAY = 3  # AI请求间隔（秒）

# ========== 数据库配置 ==========
DATABASE_URL = os.getenv("DATABASE_URL", "")

# ========== GitHub Actions检测 ==========
IS_GITHUB_ACTIONS = os.getenv("GITHUB_ACTIONS") == "true"

# ========== 请求头配置 ==========
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.xiaoheihe.cn/",
    "Origin": "https://www.xiaoheihe.cn",
}

# ========== 代理配置 ==========
PROXY_URL = os.getenv("PROXY_URL", "")
USE_PROXY = PROXY_URL and PROXY_URL.lower() != "none" and not IS_GITHUB_ACTIONS

def get_proxies():
    """获取代理配置"""
    if USE_PROXY:
        return {
            "http": PROXY_URL,
            "https": PROXY_URL
        }
    return None

def get_auth_headers():
    """获取认证请求头"""
    headers = HEADERS.copy()
    if HEYBOX_TOKEN_ID:
        headers["x-xhh-tokenid"] = HEYBOX_TOKEN_ID
    return headers

# ========== 环境检查 ==========
def check_config():
    """检查配置是否完整"""
    issues = []
    
    if not HEYBOX_TOKEN_ID:
        issues.append("❌ 未配置 HEYBOX_TOKEN_ID")
    
    if not DEEPSEEK_API_KEY:
        issues.append("❌ 未配置 DEEPSEEK_API_KEY")
    
    if not DATABASE_URL:
        issues.append("❌ 未配置 DATABASE_URL")
    
    return issues

if __name__ == "__main__":
    print("=" * 60)
    print("小黑盒爬虫配置检查")
    print("=" * 60)
    
    issues = check_config()
    if issues:
        print("\n配置问题：")
        for issue in issues:
            print(f"  {issue}")
    else:
        print("\n✅ 配置检查通过！")
    
    print(f"\n当前配置：")
    print(f"  - 帖子数量限制: {POST_LIMIT}")
    print(f"  - 评论数量限制: {COMMENT_LIMIT}")
    print(f"  - 使用代理: {USE_PROXY}")
    print(f"  - GitHub Actions: {IS_GITHUB_ACTIONS}")
    print(f"  - Token已配置: {'是' if HEYBOX_TOKEN_ID else '否'}")



