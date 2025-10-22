#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n=== Git Commit 历史修复自动化脚本 ===\n');

// 定义需要修改的 commit 映射表
const commitMap = {
  'a523d3d': 'feat: 切换到 DeepSeek API 并实现 WebRead IndexedDB 缓存功能',
  'd352c99': 'fix(reddit-scraper): 修复 Gemini 模型 404 错误',
  '3c6a3ae': 'refactor(reddit-scraper): 清理冗余代码，统一使用 Gemini API',
  '1623691': 'optimize: 优化 /log 页面布局，提升空间利用率 70%',
  '981ba5f': `fix: 修复 SimpleMdEditor 快捷键和 Markdown 语法
- 添加 Ctrl+D 删除行快捷键
- 确保 Bold 扩展的粗体语法（**text**）正常工作`,
  '83b986d': 'feat: 为笔记编辑器添加边框样式',
  '1fd67c1': 'revert: 回滚 /log 页面扁平化全屏设计',
  'd5fc7d9': 'refactor: 重构 /log 页面为扁平化全屏设计，充分利用页面空间',
  'df4cda8': 'feat: 为笔记编辑器添加 Markdown 样式支持（列表/粗体/斜体/代码等）',
  'd3bba12': `fix: 修复编译错误并清理代码
- 修复 Button 导入缺失
- 更新 Next.js 15 动态路由参数为异步
- 删除依赖已移除 Todo 组件的 WorkProgressWidget
- 成功编译构建`,
  '31dbb0a': `feat: 优化 /log 页面布局和交互体验
主要改动：
1. 时间段选择器：支持周/月/自定义时间段查看
2. 移除所有 Card 布局：改用简洁的 section，提升空间利用率 30%
3. 任务列表折叠：默认显示前 5 条，可展开查看全部
4. AI 总结默认展开：提升信息触达率
5. 代码优化：移除未使用的导入，减少 bundle 体积`,
  'c2a6437': 'fix: 修复构建错误和 linting 警告',
  'd4bc91b': 'fix: 修复 TypeScript 编译错误，完成 Next.js 构建优化',
  'd212b67': 'chore: 清理项目根目录，移除调试文件和临时脚本',
};

function exec(cmd, options = {}) {
  try {
    console.log(`▶ 执行: ${cmd}`);
    const result = execSync(cmd, {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...options,
    });
    return result;
  } catch (error) {
    console.error(`✗ 命令执行失败: ${cmd}`);
    console.error(`错误信息: ${error.message}`);
    throw error;
  }
}

function checkGitStatus() {
  try {
    const status = exec('git status --porcelain');
    if (status.trim() !== '') {
      console.log('⚠️  工作区有未提交的更改:');
      console.log(status);
      throw new Error('请先提交所有更改或暂存');
    }
    console.log('✓ 工作区干净');
  } catch (error) {
    throw error;
  }
}

function getCurrentBranch() {
  return exec('git rev-parse --abbrev-ref HEAD').trim();
}

function createFilterScript() {
  const scriptPath = path.join(__dirname, 'temp-filter-script.sh');
  
  let scriptContent = '#!/bin/bash\n';
  scriptContent += 'MSG="$(cat)"\n';
  scriptContent += 'HASH=$(git rev-parse --short=7 HEAD)\n\n';
  scriptContent += 'case $HASH in\n';
  
  for (const [hash, message] of Object.entries(commitMap)) {
    const escapedMsg = message.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    scriptContent += `  ${hash})\n`;
    scriptContent += `    echo "${escapedMsg}"\n`;
    scriptContent += `    ;;\n`;
  }
  
  scriptContent += `  *)\n`;
  scriptContent += `    echo "$MSG"\n`;
  scriptContent += `    ;;\n`;
  scriptContent += `esac\n`;
  
  fs.writeFileSync(scriptPath, scriptContent, 'utf-8');
  console.log(`✓ 创建过滤脚本: ${scriptPath}`);
  return scriptPath;
}

async function executeFilterBranch(scriptPath) {
  try {
    console.log('\n🔄 开始执行 git filter-branch...');
    console.log('⏳ 这可能需要 1-2 分钟，请耐心等待...\n');
    
    const cmd = `git filter-branch -f --msg-filter "bash ${scriptPath}" HEAD~30..HEAD`;
    exec(cmd, { stdio: 'inherit' });
    
    console.log('\n✓ filter-branch 执行完成');
  } catch (error) {
    console.error('✗ filter-branch 执行失败');
    throw error;
  }
}

function verifyResults() {
  console.log('\n📋 验证修复结果...\n');
  
  const log = exec('git log --oneline -20');
  console.log('最近 20 条 commit:');
  console.log(log);
}

async function main() {
  try {
    console.log('1️⃣  检查 Git 状态...');
    checkGitStatus();
    
    const branch = getCurrentBranch();
    console.log(`✓ 当前分支: ${branch}`);
    
    console.log('\n2️⃣  创建过滤脚本...');
    const scriptPath = createFilterScript();
    
    console.log('\n3️⃣  执行 git filter-branch...');
    await executeFilterBranch(scriptPath);
    
    console.log('\n4️⃣  验证修复结果...');
    verifyResults();
    
    console.log('\n5️⃣  清理临时文件...');
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
      console.log('✓ 已清理临时脚本');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有 commit message 已修复！\n');
    console.log('📝 下一步操作:\n');
    console.log('1. 检查修复效果 (可选):');
    console.log('   git log --oneline -30\n');
    console.log('2. 强制推送到 GitHub:');
    console.log('   git push --force-with-lease origin master\n');
    console.log('3. 如果需要回滚:');
    console.log('   git checkout backup-before-rebase-20251022\n');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ 执行出错:', error.message);
    console.error('\n💡 恢复方案:');
    console.error('  git reset --hard backup-before-rebase-20251022');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('致命错误:', error);
  process.exit(1);
});
