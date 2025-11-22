#!/usr/bin/env node
/**
 * 检查LinuxDo爬虫脚本执行状态
 * 用途：诊断Windows计划任务是否正确执行
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * 检查爬虫脚本日志
 */
function checkScraperLogs() {
  const logPath = path.join(process.cwd(), 'linuxdo-scraper', 'logs', 'scraper.log');
  
  if (!fs.existsSync(logPath)) {
    console.log('❌ 日志文件不存在:', logPath);
    return null;
  }

  const logs = fs.readFileSync(logPath, 'utf-8');
  const lines = logs.split('\n').filter(l => l.trim());
  
  // 获取最后5条记录
  const recentLogs = lines.slice(-5);
  
  // 找最近的执行时间
  const latestExecution = lines.reverse().find(l => l.includes('[INFO]'));
  
  return {
    logPath,
    fileExists: true,
    totalLines: lines.length,
    latestExecution: latestExecution || '未找到最近执行记录',
    recentLogs: recentLogs
  };
}

/**
 * 检查数据库中最新的数据
 */
async function checkLatestData() {
  try {
    const latestPost = await prisma.posts.findFirst({
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        title: true,
        timestamp: true
      }
    });

    if (!latestPost) {
      return { hasData: false, message: '数据库中没有任何LinuxDo数据' };
    }

    const today = new Date().toISOString().split('T')[0];
    const latestDate = latestPost.timestamp.toISOString().split('T')[0];
    const daysDiff = Math.floor(
      (new Date().getTime() - latestPost.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      hasData: true,
      latestDate,
      isToday: latestDate === today,
      daysSinceLatest: daysDiff,
      latestTitle: latestPost.title.substring(0, 60),
      latestTime: latestPost.timestamp.toLocaleString('zh-CN')
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * 主诊断函数
 */
async function diagnose() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 LinuxDo爬虫执行诊断工具');
  console.log('='.repeat(70) + '\n');

  // 1. 检查日志
  console.log('📋 1️⃣ 爬虫脚本日志检查');
  console.log('-'.repeat(70));
  const logInfo = checkScraperLogs();
  if (logInfo) {
    console.log(`✓ 日志文件: ${logInfo.logPath}`);
    console.log(`✓ 总行数: ${logInfo.totalLines}`);
    console.log(`✓ 最近执行: ${logInfo.latestExecution.substring(0, 100)}`);
    console.log(`\n📝 最近5条日志:`);
    logInfo.recentLogs.forEach(log => {
      if (log.trim()) console.log(`  ${log.substring(0, 80)}`);
    });
  } else {
    console.log('❌ 日志文件不存在或读取失败');
  }

  // 2. 检查数据库数据
  console.log('\n📊 2️⃣ 数据库数据检查');
  console.log('-'.repeat(70));
  const dbInfo = await checkLatestData();
  if (dbInfo.error) {
    console.log(`❌ 错误: ${dbInfo.error}`);
  } else if (!dbInfo.hasData) {
    console.log(`❌ ${dbInfo.message}`);
  } else {
    console.log(`✓ 最新数据时间: ${dbInfo.latestTime}`);
    console.log(`✓ 最新数据日期: ${dbInfo.latestDate}`);
    console.log(`✓ 距离现在: ${dbInfo.daysSinceLatest} 天前`);
    console.log(`✓ 是否为今天: ${dbInfo.isToday ? '✅ 是' : '❌ 否'}`);
    console.log(`✓ 最新标题: ${dbInfo.latestTitle}...`);
  }

  // 3. 诊断建议
  console.log('\n💡 3️⃣ 诊断建议');
  console.log('-'.repeat(70));
  
  if (dbInfo.hasData && dbInfo.daysSinceLatest === 0) {
    console.log('✅ 一切正常：爬虫脚本今天已成功运行，数据已更新');
  } else if (dbInfo.hasData && dbInfo.daysSinceLatest === 1) {
    console.log('⚠️  数据已1天未更新，可能是今天的计划任务还未执行（取决于执行时间）');
  } else if (dbInfo.hasData) {
    console.log(`⚠️  数据已 ${dbInfo.daysSinceLatest} 天未更新，建议检查:`);
    console.log('  1. 计划任务是否存在且启用 (检查：任务计划程序 → LinuxDo*)');
    console.log('  2. 计划任务的上次运行时间和结果');
    console.log('  3. .env 文件中的数据库连接配置是否正确');
    console.log('  4. 虚拟环境中的依赖是否完整: pip install -r requirements.txt');
    console.log('\n📝 手动测试脚本:');
    console.log('  cd linuxdo-scraper && python linuxdo/scripts/scraper_optimized.py');
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

// 执行诊断
diagnose()
  .catch(err => {
    console.error('诊断过程出错:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());



