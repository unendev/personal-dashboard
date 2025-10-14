@echo off
REM LinuxDo Scraper - Optimized Version
REM Uses venv from old directory, runs script from current project

echo ========================================
echo   LinuxDo Scraper (Optimized)
echo ========================================
echo.

REM Set paths
set VENV_PATH=D:\Study\Vue-\linuxdo-scraper\venv\Scripts\python.exe
set SCRIPT_PATH=%~dp0linuxdo-scraper\linuxdo\scripts\scraper_optimized.py
set WORK_DIR=%~dp0linuxdo-scraper\linuxdo

REM Check if virtual environment exists
if not exist "%VENV_PATH%" (
    echo [ERROR] Virtual environment not found: %VENV_PATH%
    echo Please check if the old project path is correct
    pause
    exit /b 1
)

REM Check if script exists
if not exist "%SCRIPT_PATH%" (
    echo [ERROR] Script file not found: %SCRIPT_PATH%
    pause
    exit /b 1
)

echo [INFO] Virtual Env: %VENV_PATH%
echo [INFO] Script Path: %SCRIPT_PATH%
echo [INFO] Work Dir: %WORK_DIR%
echo.
echo [START] Running scraper (optimized version)...
echo.

REM Run the script
"%VENV_PATH%" "%SCRIPT_PATH%" "%WORK_DIR%"

echo.
echo [DONE] Scraper execution completed
echo ========================================
pause



