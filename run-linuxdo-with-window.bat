@echo off
REM ========================================
REM LinuxDo Scraper with Visible Window (测试用)
REM ========================================

cd /d "%~dp0"

REM 使用 python.exe (有窗口) 而不是 pythonw.exe
venv\Scripts\python.exe linuxdo-scraper\linuxdo\scripts\scraper_optimized.py

pause



