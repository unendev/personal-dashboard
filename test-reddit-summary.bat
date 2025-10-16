@echo off
chcp 65001 >nul
echo ============================================================
echo 测试Reddit爬虫和AI总结功能
echo ============================================================
echo.
echo 说明：
echo - 将爬取5个Reddit帖子
echo - 测试AI分析功能
echo - 观察超时情况
echo.
pause

cd linuxdo-scraper\reddit_scraper
python reddit_scraper_multi.py

echo.
echo ============================================================
echo 测试完成，请查看上方日志
echo ============================================================
pause



