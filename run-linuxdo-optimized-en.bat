@echo off
REM ========================================
REM LinuxDo Silent Scraper Launcher
REM 隐式运行Python爬虫，无窗口弹出
REM ========================================

REM 切换到脚本所在目录
cd /d "%~dp0"

REM 使用pythonw.exe隐式运行，日志输出到文件
venv\Scripts\pythonw.exe linuxdo-scraper\linuxdo\scripts\scraper_optimized.py > linuxdo-scraper\logs\scraper.log 2>&1

REM 如果需要查看日志，打开日志文件：
REM notepad linuxdo-scraper\logs\scraper.log
