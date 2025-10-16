@echo off
chcp 65001
cls
echo ==============================================================
echo Reddit爬虫 + AI分析功能测试
echo ==============================================================
echo.
echo 说明：
echo - 将爬取25个帖子（technology, gamedev, godot, Unity3D, unrealengine）
echo - 每个帖子进行AI分析（使用DeepSeek API）
echo - 预计耗时：10-15分钟
echo - 请观察超时情况
echo.
pause

python run-test-reddit.py

echo.
echo ==============================================================
echo 测试完成
echo ==============================================================
pause



