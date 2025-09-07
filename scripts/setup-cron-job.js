#!/usr/bin/env node

/**
 * 设置AI总结定时任务的脚本
 * 这个脚本会创建一个cron job，每天凌晨1点自动生成前一天的AI总结
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// 获取项目根目录
const projectRoot = process.cwd();
const scriptPath = path.join(projectRoot, 'scripts', 'daily-ai-summary.js');

async function setupCronJob() {
  try {
    console.log('🚀 开始设置AI总结定时任务...');
    
    // 检查脚本文件是否存在
    if (!fs.existsSync(scriptPath)) {
      console.error('❌ 找不到 daily-ai-summary.js 脚本文件');
      console.log('请确保脚本文件存在于:', scriptPath);
      process.exit(1);
    }
    
    // 检查Node.js环境
    try {
      await execAsync('node --version');
      console.log('✅ Node.js 环境检查通过');
    } catch (error) {
      console.error('❌ Node.js 环境检查失败:', error.message);
      process.exit(1);
    }
    
    // 创建cron job命令
    const cronCommand = `0 1 * * * cd ${projectRoot} && node ${scriptPath} >> ${projectRoot}/logs/ai-summary-cron.log 2>&1`;
    
    console.log('\n📋 请手动执行以下命令来设置定时任务:');
    console.log('='.repeat(60));
    console.log('1. 打开crontab编辑器:');
    console.log('   crontab -e');
    console.log('');
    console.log('2. 在文件末尾添加以下行:');
    console.log(`   ${cronCommand}`);
    console.log('');
    console.log('3. 保存并退出编辑器');
    console.log('');
    console.log('📝 说明:');
    console.log('- 这个任务会在每天凌晨1点执行');
    console.log('- 日志会保存到 logs/ai-summary-cron.log');
    console.log('- 如果需要修改执行时间，请调整 "0 1 * * *" 部分');
    console.log('');
    console.log('🔍 验证定时任务:');
    console.log('   crontab -l');
    console.log('');
    console.log('📊 查看执行日志:');
    console.log(`   tail -f ${projectRoot}/logs/ai-summary-cron.log`);
    console.log('='.repeat(60));
    
    // 创建日志目录
    const logsDir = path.join(projectRoot, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log('✅ 创建日志目录:', logsDir);
    }
    
    // 测试脚本是否可以正常运行
    console.log('\n🧪 测试脚本执行...');
    try {
      const { stdout, stderr } = await execAsync(`node ${scriptPath}`);
      console.log('✅ 脚本测试执行成功');
      if (stdout) console.log('输出:', stdout);
      if (stderr) console.log('警告:', stderr);
    } catch (error) {
      console.log('⚠️ 脚本测试执行有警告:', error.message);
      console.log('这可能是正常的，因为可能没有数据需要处理');
    }
    
    console.log('\n✅ 定时任务设置完成！');
    console.log('请按照上述说明手动设置cron job。');
    
  } catch (error) {
    console.error('❌ 设置定时任务失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  setupCronJob();
}

export { setupCronJob };
