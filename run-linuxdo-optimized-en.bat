@echo off
REM ========================================
REM LinuxDo Silent Scraper Launcher
REM ========================================

REM Switch to script directory
cd /d "%~dp0"

REM Run Python scraper silently, output to log file
linuxdo-scraper\venv\Scripts\pythonw.exe linuxdo-scraper\linuxdo\scripts\scraper_optimized.py > linuxdo-scraper\logs\scraper.log 2>&1

REM To view log, open the log file:
REM notepad linuxdo-scraper\logs\scraper.log