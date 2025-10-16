#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reddit爬虫测试脚本（包含AI分析）
"""

import asyncio
import sys
import os
import time
from datetime import datetime

# 添加路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'linuxdo-scraper', 'reddit_scraper'))

async def main():
    print("="*70)
    print("测试Reddit爬虫 + AI分析功能")
    print("="*70)
    print()
    print("说明：")
    print("  - 将爬取25个帖子（5个板块 × 5篇）")
    print("  - 每个帖子进行AI分析")
    print("  - 观察超时情况和成功率")
    print("="*70)
    print()
    
    start_time = time.time()
    
    try:
        # 动态导入
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'linuxdo-scraper', 'reddit_scraper'))
        
        # 导入爬虫主函数
        import reddit_scraper_multi
        
        # 运行爬虫
        result = await reddit_scraper_multi.main()
        
        elapsed_time = time.time() - start_time
        
        print(f"\n{'='*70}")
        print(f"[测试完成]")
        print(f"  总耗时: {elapsed_time/60:.1f} 分钟")
        print(f"{'='*70}\n")
        
        if result:
            print("✅ Reddit爬虫测试通过")
            print("\n请检查：")
            print("  1. 数据是否已保存到数据库")
            print("  2. AI分析是否成功生成")
            print("  3. 是否有频繁超时（查看日志）")
            return 0
        else:
            print("⚠️ Reddit爬虫测试完成，但可能存在部分失败")
            return 1
    
    except Exception as e:
        print(f"\n❌ 测试错误: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)




