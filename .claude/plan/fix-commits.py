#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import sys
import json

# 定义需要修改的 commit 映射表（短哈希 -> 新message）
commits_to_fix = {
    'a523d3d': 'feat: 切换到 DeepSeek API 并实现 WebRead IndexedDB 缓存功能',
    'd352c99': 'fix(reddit-scraper): 修复 Gemini 模型 404 错误',
    '3c6a3ae': 'refactor(reddit-scraper): 清理冗余代码，统一使用 Gemini API',
    '1623691': 'optimize: 优化 /log 页面布局，提升空间利用率 70%',
    '981ba5f': '''fix: 修复 SimpleMdEditor 快捷键和 Markdown 语法
- 添加 Ctrl+D 删除行快捷键
- 确保 Bold 扩展的粗体语法（**text**）正常工作''',
    '83b986d': 'feat: 为笔记编辑器添加边框样式',
    '1fd67c1': 'revert: 回滚 /log 页面扁平化全屏设计',
    'd5fc7d9': 'refactor: 重构 /log 页面为扁平化全屏设计，充分利用页面空间',
    'df4cda8': 'feat: 为笔记编辑器添加 Markdown 样式支持（列表/粗体/斜体/代码等）',
    'd3bba12': '''fix: 修复编译错误并清理代码
- 修复 Button 导入缺失
- 更新 Next.js 15 动态路由参数为异步
- 删除依赖已移除 Todo 组件的 WorkProgressWidget
- 成功编译构建''',
    '31dbb0a': '''feat: 优化 /log 页面布局和交互体验
主要改动：
1. 时间段选择器：支持周/月/自定义时间段查看
2. 移除所有 Card 布局：改用简洁的 section，提升空间利用率 30%
3. 任务列表折叠：默认显示前 5 条，可展开查看全部
4. AI 总结默认展开：提升信息触达率
5. 代码优化：移除未使用的导入，减少 bundle 体积''',
    'c2a6437': 'fix: 修复构建错误和 linting 警告',
    'd4bc91b': 'fix: 修复 TypeScript 编译错误，完成 Next.js 构建优化',
    'd212b67': 'chore: 清理项目根目录，移除调试文件和临时脚本',
}

def run_cmd(cmd, shell=True):
    """执行命令"""
    try:
        result = subprocess.run(cmd, shell=shell, capture_output=True, text=True)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return 1, '', str(e)

def main():
    print('\n=== Git Commit 历史修复脚本 (Python) ===\n')
    
    # 1. 检查 git 状态
    print('1️⃣  检查 Git 状态...')
    code, stdout, stderr = run_cmd('git status --porcelain')
    if stdout.strip():
        print('❌ 工作区有未提交的更改')
        return 1
    print('✓ 工作区干净\n')
    
    # 2. 获取所有需要修改的完整哈希
    print('2️⃣  获取完整哈希...')
    full_hashes = {}
    for short_hash in commits_to_fix.keys():
        code, stdout, stderr = run_cmd(f'git rev-parse {short_hash}^{{commit}}')
        if code == 0:
            full_hash = stdout.strip()
            full_hashes[short_hash] = full_hash
            print(f'  {short_hash} -> {full_hash[:12]}')
    print()
    
    # 3. 构建 rebase 脚本
    print('3️⃣  构建交互式 rebase 脚本...')
    code, log_output, _ = run_cmd('git log --oneline HEAD~30..HEAD')
    
    lines = log_output.strip().split('\n')
    lines.reverse()
    
    rebase_commands = []
    for line in lines:
        if not line.strip():
            continue
        parts = line.split(None, 1)
        if len(parts) < 2:
            continue
        short_hash = parts[0]
        
        if short_hash in commits_to_fix:
            rebase_commands.append(f'reword {short_hash}')
        else:
            rebase_commands.append(f'pick {short_hash}')
    
    print(f'  准备 {len(rebase_commands)} 条 rebase 命令\n')
    
    # 4. 使用 git rebase -i 交互式修改
    print('4️⃣  执行交互式 rebase...')
    print('⏳ 这将启动编辑器让你逐个修改 commit message\n')
    
    # 创建临时 git rebase 脚本
    print('💡 提示：使用下面的新 message 替换旧的\n')
    
    for short_hash, new_msg in commits_to_fix.items():
        print(f'commit {short_hash}:')
        print('New message:')
        print(f'  {new_msg}\n')
    
    print('开始手动 rebase (执行: git rebase -i HEAD~30)...')
    print('然后将需要修改的 commit 前面的 pick 改为 reword')
    
    return 0

if __name__ == '__main__':
    sys.exit(main())

