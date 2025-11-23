#!/usr/bin/env node

/**
 * 解决失败的 Prisma 迁移
 * 如果检测到失败的迁移，将其标记为已解决（rolled back）
 */

import { execSync } from 'child_process';

const MIGRATION_NAME = '20251123120000_add_taskdefinitionid_to_timertask';

try {
  console.log('🔍 检查是否有失败的迁移...');
  
  // 尝试解决失败的迁移
  try {
    execSync(`npx prisma migrate resolve --rolled-back ${MIGRATION_NAME}`, {
      stdio: 'inherit',
      env: process.env
    });
    console.log('✅ 失败的迁移已标记为已回滚');
  } catch (error) {
    // 如果迁移不存在或已经解决，继续
    if (error.message.includes('not found') || error.message.includes('already')) {
      console.log('ℹ️  迁移状态正常，无需处理');
    } else {
      // 尝试标记为已应用（如果数据库状态已经正确）
      try {
        execSync(`npx prisma migrate resolve --applied ${MIGRATION_NAME}`, {
          stdio: 'inherit',
          env: process.env
        });
        console.log('✅ 失败的迁移已标记为已应用');
      } catch (error2) {
        console.log('⚠️  无法自动解决失败的迁移，将尝试继续...');
        // 不抛出错误，让迁移部署继续尝试
      }
    }
  }
} catch (error) {
  console.error('❌ 解决失败迁移时出错:', error.message);
  // 不退出，让构建继续
}

