#!/usr/bin/env node
/**
 * 查询 2024-10-28 的 linuxdo 和小黑盒数据
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 目标日期：2025-10-28
const TARGET_DATE = '2025-10-28';

/**
 * 查询 linuxdo 数据
 */
async function checkLinuxdoData() {
  const targetDate = new Date(TARGET_DATE);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // 查询数据总数
    const count = await prisma.posts.count({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    // 获取样本数据
    const samples = await prisma.posts.findMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      take: 5,
      orderBy: {
        timestamp: 'desc'
      },
      select: {
        id: true,
        title: true,
        timestamp: true,
        post_type: true,
        value_assessment: true,
        replies_count: true,
        participants_count: true
      }
    });

    return { count, samples, exists: count > 0 };
  } catch (error) {
    console.error('查询 linuxdo 数据时出错:', error.message);
    return { count: 0, samples: [], exists: false, error: error.message };
  }
}

/**
 * 查询小黑盒数据
 */
async function checkHeyboxData() {
  const targetDate = new Date(TARGET_DATE);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // 查询数据总数
    const count = await prisma.heybox_posts.count({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    // 获取样本数据
    const samples = await prisma.heybox_posts.findMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      take: 5,
      orderBy: {
        timestamp: 'desc'
      },
      select: {
        id: true,
        title: true,
        title_cn: true,
        timestamp: true,
        post_type: true,
        value_assessment: true,
        game_tag: true,
        likes_count: true,
        comments_count: true,
        author: true
      }
    });

    return { count, samples, exists: count > 0 };
  } catch (error) {
    console.error('查询小黑盒数据时出错:', error.message);
    return { count: 0, samples: [], exists: false, error: error.message };
  }
}

/**
 * 显示结果
 */
function displayResults(linuxdoResult, heyboxResult) {
  console.log('\n' + '='.repeat(60));
  console.log(`📅 查询日期: ${TARGET_DATE}`);
  console.log('='.repeat(60) + '\n');

  // Linuxdo 结果
  console.log('🔵 Linuxdo (posts 表)');
  console.log('-'.repeat(60));
  
  if (linuxdoResult.error) {
    console.log(`❌ 查询失败: ${linuxdoResult.error}\n`);
  } else if (linuxdoResult.exists) {
    console.log(`✅ 存在数据`);
    console.log(`📊 数据量: ${linuxdoResult.count} 条\n`);
    
    if (linuxdoResult.samples.length > 0) {
      console.log(`📝 样本数据（前 ${linuxdoResult.samples.length} 条）：\n`);
      linuxdoResult.samples.forEach((post, index) => {
        console.log(`${index + 1}. ${post.title}`);
        console.log(`   ID: ${post.id}`);
        console.log(`   类型: ${post.post_type || '未分类'}`);
        console.log(`   价值: ${post.value_assessment || '未评估'}`);
        console.log(`   回复: ${post.replies_count || 0} | 参与: ${post.participants_count || 0}`);
        console.log(`   时间: ${post.timestamp?.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) || '未知'}\n`);
      });
    }
  } else {
    console.log(`❌ 不存在数据（0 条）\n`);
  }

  // 小黑盒结果
  console.log('🟠 小黑盒 (heybox_posts 表)');
  console.log('-'.repeat(60));
  
  if (heyboxResult.error) {
    console.log(`❌ 查询失败: ${heyboxResult.error}\n`);
  } else if (heyboxResult.exists) {
    console.log(`✅ 存在数据`);
    console.log(`📊 数据量: ${heyboxResult.count} 条\n`);
    
    if (heyboxResult.samples.length > 0) {
      console.log(`📝 样本数据（前 ${heyboxResult.samples.length} 条）：\n`);
      heyboxResult.samples.forEach((post, index) => {
        console.log(`${index + 1}. ${post.title_cn || post.title}`);
        console.log(`   ID: ${post.id}`);
        console.log(`   作者: ${post.author || '未知'}`);
        console.log(`   游戏: ${post.game_tag || '未标记'}`);
        console.log(`   类型: ${post.post_type || '未分类'}`);
        console.log(`   价值: ${post.value_assessment || '未评估'}`);
        console.log(`   点赞: ${post.likes_count || 0} | 评论: ${post.comments_count || 0}`);
        console.log(`   时间: ${post.timestamp?.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) || '未知'}\n`);
      });
    }
  } else {
    console.log(`❌ 不存在数据（0 条）\n`);
  }

  // 总结
  console.log('='.repeat(60));
  console.log('📊 总结');
  console.log('-'.repeat(60));
  console.log(`Linuxdo:  ${linuxdoResult.exists ? '✅ 有数据' : '❌ 无数据'} (${linuxdoResult.count} 条)`);
  console.log(`小黑盒:   ${heyboxResult.exists ? '✅ 有数据' : '❌ 无数据'} (${heyboxResult.count} 条)`);
  console.log('='.repeat(60) + '\n');
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('\n🔍 开始查询数据库...\n');
    
    // 并行查询两个数据源
    const [linuxdoResult, heyboxResult] = await Promise.all([
      checkLinuxdoData(),
      checkHeyboxData()
    ]);

    // 显示结果
    displayResults(linuxdoResult, heyboxResult);
    
    console.log('✅ 查询完成！\n');
  } catch (error) {
    console.error('\n❌ 执行出错:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

