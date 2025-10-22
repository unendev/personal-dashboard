#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n=== Git Commit 历史修复自动化脚本 v2 ===\n');

// 定义需要修改的 commit 映射表（完整哈希）
const commitMap = {
  'a523d3db80314918a9b56bac42f953aefd86247c': 'feat: 切换到 DeepSeek API 并实现 WebRead IndexedDB 缓存功能',
  'd352c9995e2c129e792bfa461ceff0746c7cab45': 'fix(reddit-scraper): 修复 Gemini 模型 404 错误',
  '3c6a3aebdac2d4035168fdef6b472185abe8b04c': 'refactor(reddit-scraper): 清理冗余代码，统一使用 Gemini API',
  '1623691f0eb5b84ca90772f5a4173c29d127f102': 'optimize: 优化 /log 页面布局，提升空间利用率 70%',
  '981ba5f0f6fa7235e9a41dae0b7d94944d6b10f0': `fix: 修复 SimpleMdEditor 快捷键和 Markdown 语法
- 添加 Ctrl+D 删除行快捷键
- 确保 Bold 扩展的粗体语法（**text**）正常工作`,
  '83b986dac94fe15629eb0152698deff5f6347730': 'feat: 为笔记编辑器添加边框样式',
  '1fd67c1d01a285000647e960ab2022e3633e9e1c': 'revert: 回滚 /log 页面扁平化全屏设计',
  'd5fc7d907784ab8c3c4d0174864c1b8ad05de0ae': 'refactor: 重构 /log 页面为扁平化全屏设计，充分利用页面空间',
  'df4cda8ff6df69d901db4ff9fdb74d83d99154e2': 'feat: 为笔记编辑器添加 Markdown 样式支持（列表/粗体/斜体/代码等）',
  'd3bba122f7b31454b98392f1676ac1d313e289fa': `fix: 修复编译错误并清理代码
- 修复 Button 导入缺失
- 更新 Next.js 15 动态路由参数为异步
- 删除依赖已移除 Todo 组件的 WorkProgressWidget
- 成功编译构建`,
  '31dbb0a707badaf5f26e098187eecd5f18cc5663': `feat: 优化 /log 页面布局和交互体验
主要改动：
1. 时间段选择器：支持周/月/自定义时间段查看
2. 移除所有 Card 布局：改用简洁的 section，提升空间利用率 30%
3. 任务列表折叠：默认显示前 5 条，可展开查看全部
4. AI 总结默认展开：提升信息触达率
5. 代码优化：移除未使用的导入，减少 bundle 体积`,
  'c2a64374a4490bd22f48ae9f12236cbb1b1f3e91': 'fix: 修复构建错误和 linting 警告',
  'd4bc91b5c99a625bda8acd2e3851b45b2cf604ed': 'fix: 修复 TypeScript 编译错误，完成 Next.js 构建优化',
  'd212b67a75f14ac36a93ec0b0bbdac79d38e7ebe': 'chore: 清理项目根目录，移除调试文件和临时脚本',
};

function exec(cmd) {
  try {
    const result = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    return result;
  } catch (error) {
    throw error;
  }
}

function checkGitStatus() {
  const status = exec('git status --porcelain');
  if (status.trim() !== '') {
    throw new Error('请先提交所有更改或暂存');
  }
  console.log('✓ 工作区干净');
}

function getCurrentBranch() {
  return exec('git rev-parse --abbrev-ref HEAD').trim();
}

function amendCommitMessage(hash, newMessage) {
  try {
    const tempFile = path.join(__dirname, '.git_amend_msg');
    fs.writeFileSync(tempFile, newMessage, 'utf-8');
    
    // 使用 git filter-branch 但这次用 commit-filter
    const cmd = `git filter-branch -f --env-filter 'if [ $GIT_COMMIT = "${hash}" ]; then export GIT_AUTHOR_DATE="$GIT_AUTHOR_DATE"; export GIT_COMMITTER_DATE="$GIT_COMMITTER_DATE"; fi' -- HEAD~30..HEAD`;
    
    // 实际上直接使用 git rebase 不太实用，改用 filter-branch 的 msg-filter
    // 但需要通过环境变量传递
    
    fs.unlinkSync(tempFile);
    return true;
  } catch (error) {
    return false;
  }
}

function createAdvancedFilterScript() {
  const scriptPath = path.join(__dirname, 'advanced-filter.sh');
  
  let script = '#!/bin/bash\\n';
  script += 'export FILTER_BRANCH_SQUELCH_WARNING=1\n';
  script += 'COMMIT_HASH=$GIT_COMMIT\n';
  script += 'case $COMMIT_HASH in\n';
  
  Object.entries(commitMap).forEach(([hash, msg]) => {
    const escapedMsg = msg.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
    script += `  "${hash}")\n`;
    script += `    echo "${escapedMsg}"\n`;
    script += `    ;;\n`;
  });
  
  script += `  *)\n`;
  script += `    cat\n`;
  script += `    ;;\n`;
  script += `esac\n`;
  
  fs.writeFileSync(scriptPath, script, 'utf-8');
  return scriptPath;
}

function executeAdvancedFilterBranch(scriptPath) {
  try {
    console.log('\n🔄 开始执行 git filter-branch (MSG-FILTER)...');
    console.log('⏳ 这可能需要 1-2 分钟...\n');
    
    const cmd = `FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter "bash ${scriptPath.replace(/\\/g, '/')}" -- HEAD~30..HEAD`;
    
    console.log(`执行: ${cmd}\n`);
    const result = execSync(cmd, { 
      encoding: 'utf-8',
      stdio: 'inherit',
      env: { ...process.env, FILTER_BRANCH_SQUELCH_WARNING: '1' }
    });
    
    console.log('\n✓ filter-branch 执行完成');
    return true;
  } catch (error) {
    console.error('✗ filter-branch 执行失败');
    console.error(error.message);
    throw error;
  }
}

function verifyResults() {
  console.log('\n📋 验证修复结果...\n');
  
  const log = exec('git log --oneline -25');
  console.log('最近 25 条 commit:');
  console.log(log);
  
  // 检查乱码是否还存在
  if (log.includes('鍒')) {
    console.log('\n⚠️  仍有乱码存在，脚本可能未生效');
    return false;
  }
  
  return true;
}

async function main() {
  try {
    console.log('1️⃣  检查 Git 状态...');
    checkGitStatus();
    
    const branch = getCurrentBranch();
    console.log(`✓ 当前分支: ${branch}\n`);
    
    console.log('2️⃣  创建高级过滤脚本...');
    const scriptPath = createAdvancedFilterScript();
    console.log(`✓ 脚本路径: ${scriptPath}\n`);
    
    console.log('3️⃣  执行 git filter-branch...');
    executeAdvancedFilterBranch(scriptPath);
    
    console.log('\n4️⃣  验证修复结果...');
    const success = verifyResults();
    
    console.log('\n5️⃣  清理临时文件...');
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
      console.log('✓ 已清理临时脚本');
    }
    
    console.log('\n' + '='.repeat(70));
    if (success) {
      console.log('✅ 所有 commit message 已修复！\n');
    } else {
      console.log('⚠️  修复可能未完全生效，请检查\n');
    }
    console.log('📝 下一步操作:\n');
    console.log('1. 验证结果:');
    console.log('   git log --oneline -30\n');
    console.log('2. 强制推送到 GitHub:');
    console.log('   git push --force-with-lease origin master\n');
    console.log('3. 如果需要回滚:');
    console.log('   git checkout backup-before-rebase-20251022\n');
    console.log('='.repeat(70) + '\n');
    
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
