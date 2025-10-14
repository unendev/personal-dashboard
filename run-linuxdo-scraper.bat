@echo off
REM LinuxDo爬虫快捷运行脚本
REM 使用老目录的虚拟环境，运行当前项目的脚本

echo ========================================
echo   LinuxDo 爬虫启动
echo ========================================
echo.

REM 设置路径
set VENV_PATH=D:\Study\Vue-\linuxdo-scraper\venv\Scripts\python.exe
set SCRIPT_PATH=%~dp0linuxdo-scraper\linuxdo\scripts\scraper.py
set WORK_DIR=%~dp0linuxdo-scraper\linuxdo

REM 检查虚拟环境是否存在
if not exist "%VENV_PATH%" (
    echo [错误] 虚拟环境不存在: %VENV_PATH%
    echo 请确认老项目路径是否正确
    pause
    exit /b 1
)

REM 检查脚本是否存在
if not exist "%SCRIPT_PATH%" (
    echo [错误] 脚本文件不存在: %SCRIPT_PATH%
    pause
    exit /b 1
)

echo [信息] 虚拟环境: %VENV_PATH%
echo [信息] 脚本路径: %SCRIPT_PATH%
echo [信息] 工作目录: %WORK_DIR%
echo.
echo [启动] 开始运行爬虫...
echo.

REM 运行脚本
"%VENV_PATH%" "%SCRIPT_PATH%" "%WORK_DIR%"

echo.
echo [完成] 爬虫运行结束
echo ========================================
pause



