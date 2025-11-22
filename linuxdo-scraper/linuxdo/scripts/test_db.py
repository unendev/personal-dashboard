# test_db.py - 数据库连接测试版本
import asyncio
import os
import json
from dotenv import load_dotenv
import asyncpg

# 加载环境变量
load_dotenv()
NEON_DB_URL = os.getenv("DATABASE_URL")

async def test_database_connection():
    """测试数据库连接"""
    if not NEON_DB_URL:
        print("错误: 未找到 DATABASE_URL 环境变量。")
        return False

    conn = None
    try:
        print("正在连接数据库...")
        conn = await asyncpg.connect(NEON_DB_URL)
        print("✅ 数据库连接成功！")
        
        # 测试创建表
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                core_issue TEXT,
                key_info JSONB,
                post_type TEXT,
                value_assessment TEXT,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("✅ 数据库表检查/创建成功！")
        
        # 测试插入数据
        test_data = {
            "id": "test_001",
            "title": "测试帖子标题",
            "url": "https://linux.do/t/test/001",
            "core_issue": "这是一个测试帖子的核心议题",
            "key_info": json.dumps(["关键信息1", "关键信息2"]),
            "post_type": "技术问答",
            "value_assessment": "高"
        }
        
        await conn.execute("""
            INSERT INTO posts (id, title, url, core_issue, key_info, post_type, value_assessment)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                url = EXCLUDED.url,
                core_issue = EXCLUDED.core_issue,
                key_info = EXCLUDED.key_info,
                post_type = EXCLUDED.post_type,
                value_assessment = EXCLUDED.value_assessment,
                timestamp = CURRENT_TIMESTAMP;
        """, test_data["id"], test_data["title"], test_data["url"], 
            test_data["core_issue"], test_data["key_info"], 
            test_data["post_type"], test_data["value_assessment"])
        
        print("✅ 测试数据插入成功！")
        
        # 测试查询数据
        result = await conn.fetchrow("SELECT * FROM posts WHERE id = $1", test_data["id"])
        if result:
            print("✅ 数据查询成功！")
            print(f"   标题: {result['title']}")
            print(f"   类型: {result['post_type']}")
            print(f"   价值: {result['value_assessment']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 数据库操作失败: {e}")
        return False
    finally:
        if conn:
            await conn.close()
            print("数据库连接已关闭。")

async def main():
    print("=== 数据库连接测试 ===")
    success = await test_database_connection()
    
    if success:
        print("\n🎉 所有测试通过！数据库连接正常，可以存储数据。")
    else:
        print("\n💥 测试失败！请检查数据库配置。")

if __name__ == "__main__":
    asyncio.run(main())




