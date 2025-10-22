#!/bin/bash\nexport FILTER_BRANCH_SQUELCH_WARNING=1
COMMIT_HASH=$GIT_COMMIT
case $COMMIT_HASH in
  "a523d3db80314918a9b56bac42f953aefd86247c")
    echo "feat: 切换到 DeepSeek API 并实现 WebRead IndexedDB 缓存功能"
    ;;
  "d352c9995e2c129e792bfa461ceff0746c7cab45")
    echo "fix(reddit-scraper): 修复 Gemini 模型 404 错误"
    ;;
  "3c6a3aebdac2d4035168fdef6b472185abe8b04c")
    echo "refactor(reddit-scraper): 清理冗余代码，统一使用 Gemini API"
    ;;
  "1623691f0eb5b84ca90772f5a4173c29d127f102")
    echo "optimize: 优化 /log 页面布局，提升空间利用率 70%"
    ;;
  "981ba5f0f6fa7235e9a41dae0b7d94944d6b10f0")
    echo "fix: 修复 SimpleMdEditor 快捷键和 Markdown 语法
- 添加 Ctrl+D 删除行快捷键
- 确保 Bold 扩展的粗体语法（**text**）正常工作"
    ;;
  "83b986dac94fe15629eb0152698deff5f6347730")
    echo "feat: 为笔记编辑器添加边框样式"
    ;;
  "1fd67c1d01a285000647e960ab2022e3633e9e1c")
    echo "revert: 回滚 /log 页面扁平化全屏设计"
    ;;
  "d5fc7d907784ab8c3c4d0174864c1b8ad05de0ae")
    echo "refactor: 重构 /log 页面为扁平化全屏设计，充分利用页面空间"
    ;;
  "df4cda8ff6df69d901db4ff9fdb74d83d99154e2")
    echo "feat: 为笔记编辑器添加 Markdown 样式支持（列表/粗体/斜体/代码等）"
    ;;
  "d3bba122f7b31454b98392f1676ac1d313e289fa")
    echo "fix: 修复编译错误并清理代码
- 修复 Button 导入缺失
- 更新 Next.js 15 动态路由参数为异步
- 删除依赖已移除 Todo 组件的 WorkProgressWidget
- 成功编译构建"
    ;;
  "31dbb0a707badaf5f26e098187eecd5f18cc5663")
    echo "feat: 优化 /log 页面布局和交互体验
主要改动：
1. 时间段选择器：支持周/月/自定义时间段查看
2. 移除所有 Card 布局：改用简洁的 section，提升空间利用率 30%
3. 任务列表折叠：默认显示前 5 条，可展开查看全部
4. AI 总结默认展开：提升信息触达率
5. 代码优化：移除未使用的导入，减少 bundle 体积"
    ;;
  "c2a64374a4490bd22f48ae9f12236cbb1b1f3e91")
    echo "fix: 修复构建错误和 linting 警告"
    ;;
  "d4bc91b5c99a625bda8acd2e3851b45b2cf604ed")
    echo "fix: 修复 TypeScript 编译错误，完成 Next.js 构建优化"
    ;;
  "d212b67a75f14ac36a93ec0b0bbdac79d38e7ebe")
    echo "chore: 清理项目根目录，移除调试文件和临时脚本"
    ;;
  *)
    cat
    ;;
esac
