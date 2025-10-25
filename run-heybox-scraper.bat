@echo off
REM ========================================
REM 小黑盒爬虫启动脚本
REM 每日自动爬取小黑盒最新帖子
REM ========================================

cd /d "%~dp0"

echo ========================================
echo 小黑盒爬虫启动
echo 时间: %date% %time%
echo ========================================

REM 激活Python虚拟环境
if exist venv\Scripts\python.exe (
    echo [1/3] 使用虚拟环境...
    set PYTHON_EXE=venv\Scripts\python.exe
) else (
    echo [1/3] 使用系统Python...
    set PYTHON_EXE=python
)

REM 切换到爬虫目录
cd linuxdo-scraper\heybox_scraper

REM 运行爬虫（使用Playwright版本，已MCP测试验证）
echo [2/3] 运行爬虫脚本...
%PYTHON_EXE% heybox_playwright_scraper.py

REM 检查执行结果
if %ERRORLEVEL% EQU 0 (
    echo [3/3] ✓ 爬虫执行成功！
    echo.
    echo 日志文件: linuxdo-scraper\heybox_scraper\logs\heybox_scraper.log
    echo 数据备份: linuxdo-scraper\heybox_scraper\data\
) else (
    echo [3/3] ✗ 爬虫执行失败 (错误码: %ERRORLEVEL%)
    echo 请查看日志: linuxdo-scraper\heybox_scraper\logs\heybox_scraper.log
)

echo ========================================
echo 完成时间: %date% %time%
echo ========================================

REM 如果需要查看日志，取消下面注释
REM notepad logs\heybox_scraper.log

REM 保持窗口打开（可选）
REM pause

