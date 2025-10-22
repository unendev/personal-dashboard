# Git Commit 历史修复自动化脚本
# 使用 git filter-branch 批量修改 commit message

$ErrorActionPreference = "Stop"

Write-Host "=== Git Commit 历史修复 ===" -ForegroundColor Green
Write-Host ""

# 定义需要修改的 commit 映射
$commitMap = @{
    "a523d3d" = "feat: 切换到 DeepSeek API 并实现 WebRead IndexedDB 缓存功能"
    "d352c99" = "fix(reddit-scraper): 修复 Gemini 模型 404 错误"
    "3c6a3ae" = "refactor(reddit-scraper): 清理冗余代码，统一使用 Gemini API"
    "1623691" = "optimize: 优化 /log 页面布局，提升空间利用率 70%"
    "981ba5f" = @"
fix: 修复 SimpleMdEditor 快捷键和 Markdown 语法
- 添加 Ctrl+D 删除行快捷键
- 确保 Bold 扩展的粗体语法（**text**）正常工作
"@
    "83b986d" = "feat: 为笔记编辑器添加边框样式"
    "1fd67c1" = "revert: 回滚 /log 页面扁平化全屏设计"
    "d5fc7d9" = "refactor: 重构 /log 页面为扁平化全屏设计，充分利用页面空间"
    "df4cda8" = "feat: 为笔记编辑器添加 Markdown 样式支持（列表/粗体/斜体/代码等）"
    "d3bba12" = @"
fix: 修复编译错误并清理代码
- 修复 Button 导入缺失
- 更新 Next.js 15 动态路由参数为异步
- 删除依赖已移除 Todo 组件的 WorkProgressWidget
- 成功编译构建
"@
    "31dbb0a" = @"
feat: 优化 /log 页面布局和交互体验
主要改动：
1. 时间段选择器：支持周/月/自定义时间段查看
2. 移除所有 Card 布局：改用简洁的 section，提升空间利用率 30%
3. 任务列表折叠：默认显示前 5 条，可展开查看全部
4. AI 总结默认展开：提升信息触达率
5. 代码优化：移除未使用的导入，减少 bundle 体积
"@
    "c2a6437" = "fix: 修复构建错误和 linting 警告"
    "d4bc91b" = "fix: 修复 TypeScript 编译错误，完成 Next.js 构建优化"
    "d212b67" = "chore: 清理项目根目录，移除调试文件和临时脚本"
}

Write-Host "准备修改 $($commitMap.Count) 条 commit..." -ForegroundColor Yellow
Write-Host ""

# 使用 git filter-branch 修改 commit message
$filterScript = @'
OLD_MSG="$(git log --format=%B -n 1 $GIT_COMMIT)"
COMMIT_SHORT=$(git rev-parse --short=7 $GIT_COMMIT)

case $COMMIT_SHORT in
'@

foreach ($hash in $commitMap.Keys) {
    $newMsg = $commitMap[$hash]
    $filterScript += @"

    $hash)
        echo "$newMsg"
        ;;
"@
}

$filterScript += @'

    *)
        echo "$OLD_MSG"
        ;;
esac
'@

# 将脚本保存到临时文件
$tempScript = Join-Path $env:TEMP "git-filter-script.sh"
$filterScript | Out-File -FilePath $tempScript -Encoding UTF8

Write-Host "执行 git filter-branch..." -ForegroundColor Cyan

# 执行 filter-branch
git filter-branch -f --msg-filter "bash $tempScript" HEAD~30..HEAD

# 清理临时文件
Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== 修改完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "请检查修改结果：" -ForegroundColor Yellow
Write-Host "  git log --oneline -30" -ForegroundColor Cyan
Write-Host ""
Write-Host "如果确认无误，执行强制推送：" -ForegroundColor Yellow
Write-Host "  git push --force-with-lease origin master" -ForegroundColor Cyan
Write-Host ""
Write-Host "如果需要回滚，切换到备份分支：" -ForegroundColor Yellow
Write-Host "  git checkout backup-before-rebase-20251022" -ForegroundColor Cyan

