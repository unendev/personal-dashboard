# Git Commit 历史修复 - PowerShell 脚本
# 使用 git rebase 交互式修改 commit message

Write-Host "`n=== Git Commit 历史修复脚本 ===" -ForegroundColor Green
Write-Host "`n准备修复 14 条乱码 commit...`n"

# 定义所有需要修改的 commit 和新 message
$commitMessages = @{
    "a523d3d" = @"
feat: 切换到 DeepSeek API 并实现 WebRead IndexedDB 缓存功能
"@
    "d352c99" = @"
fix(reddit-scraper): 修复 Gemini 模型 404 错误
"@
    "3c6a3ae" = @"
refactor(reddit-scraper): 清理冗余代码，统一使用 Gemini API
"@
    "1623691" = @"
optimize: 优化 /log 页面布局，提升空间利用率 70%
"@
    "981ba5f" = @"
fix: 修复 SimpleMdEditor 快捷键和 Markdown 语法
- 添加 Ctrl+D 删除行快捷键
- 确保 Bold 扩展的粗体语法（**text**）正常工作
"@
    "83b986d" = @"
feat: 为笔记编辑器添加边框样式
"@
    "1fd67c1" = @"
revert: 回滚 /log 页面扁平化全屏设计
"@
    "d5fc7d9" = @"
refactor: 重构 /log 页面为扁平化全屏设计，充分利用页面空间
"@
    "df4cda8" = @"
feat: 为笔记编辑器添加 Markdown 样式支持（列表/粗体/斜体/代码等）
"@
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
    "c2a6437" = @"
fix: 修复构建错误和 linting 警告
"@
    "d4bc91b" = @"
fix: 修复 TypeScript 编译错误，完成 Next.js 构建优化
"@
    "d212b67" = @"
chore: 清理项目根目录，移除调试文件和临时脚本
"@
}

# 检查 Git 状态
Write-Host "检查工作区状态..." -ForegroundColor Cyan
$status = & git status --porcelain
if ($status) {
    Write-Host "❌ 工作区有未提交的更改" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 工作区干净`n" -ForegroundColor Green

# 构建 rebase 脚本文件
Write-Host "构建 rebase 指令文件..." -ForegroundColor Cyan

$rebaseTodoPath = "$PSScriptRoot\git-rebase-todo"
$rebaseScript = ""

$logOutput = & git log --oneline HEAD~30..HEAD
$lines = $logOutput -split "`n" | Where-Object { $_ -match '^\w+' }
$lines = $lines | ForEach-Object { $_ }
[Array]::Reverse($lines)

foreach ($line in $lines) {
    $hash = ($line -split '\s+')[0]
    if ($commitMessages.ContainsKey($hash)) {
        $rebaseScript += "reword $hash`n"
    } else {
        $rebaseScript += "pick $hash`n"
    }
}

$rebaseScript | Out-File -FilePath $rebaseTodoPath -Encoding UTF8

Write-Host "✓ rebase 指令文件已生成" -ForegroundColor Green
Write-Host "`n📝 需要修改的 commit 和新 message：`n" -ForegroundColor Yellow

foreach ($hash in $commitMessages.Keys) {
    Write-Host "  $($hash):" -ForegroundColor Cyan
    Write-Host "    $($commitMessages[$hash].Split("`n")[0])" -ForegroundColor White
}

Write-Host "`n" -ForegroundColor Yellow
Write-Host "开始执行 git rebase -i HEAD~30..." -ForegroundColor Yellow
Write-Host "请按照以下步骤操作：`n" -ForegroundColor White

Write-Host "1. 编辑器打开后，将需要修改的 commit 前的 'pick' 改为 'reword':" -ForegroundColor White
Write-Host "   pick a523d3d feat: ... → reword a523d3d feat: ..." -ForegroundColor Gray
Write-Host "`n2. 保存并关闭编辑器（Vim: ESC -> :wq）" -ForegroundColor White
Write-Host "`n3. Git 会逐个停在需要修改的 commit，打开编辑器让你修改 message" -ForegroundColor White
Write-Host "`n4. 逐个复制下面的新 message 粘贴进去，保存关闭" -ForegroundColor White
Write-Host "`n5. rebase 完成后，执行: git push --force-with-lease origin master`n" -ForegroundColor White

Write-Host "准备好了吗？按 Enter 开始..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "`n执行: git rebase -i HEAD~30`n" -ForegroundColor Cyan
& git rebase -i HEAD~30

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ rebase 完成！`n" -ForegroundColor Green
    
    Write-Host "验证结果：" -ForegroundColor Cyan
    $newLog = & git log --oneline -20
    Write-Host $newLog
    
    Write-Host "`n下一步：`n" -ForegroundColor Yellow
    Write-Host "  git push --force-with-lease origin master`n" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  rebase 出错或被中止`n" -ForegroundColor Yellow
    Write-Host "如需回滚：`n" -ForegroundColor White
    Write-Host "  git rebase --abort`n" -ForegroundColor Cyan
}

# 清理临时文件
Remove-Item $rebaseTodoPath -ErrorAction SilentlyContinue
