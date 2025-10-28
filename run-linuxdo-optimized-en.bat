@echo off
REM ========================================
REM LinuxDo Scraper - 无弹窗后台运行
REM ========================================

REM 切换到脚本所在目录
cd /d "%~dp0\linuxdo-scraper"

REM 确保日志目录存在
if not exist "logs" mkdir "logs"

REM 使用 pythonw.exe 无窗口运行，日志追加到文件
..\venv\Scripts\pythonw.exe linuxdo\scripts\scraper_optimized.py >> logs\scraper.log 2>&1