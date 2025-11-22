#!/usr/bin/env node
/**
 * 检查 LinuxDo 爬虫数据概况
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 检查 LinuxDo 数据概况
 */
async function checkLinuxdoDataOverview() {
  try {
    // 查询总数据量
    const totalCount = await prisma.posts.count();
    console.log(`📊 LinuxDo 总数据量: ${totalCount} 条`);

    if (totalCount === 0) {
      console.log('❌ LinuxDo 表中没有任何数据');
      return;
    }

    // 查询最早和最新的数据
    const oldestPost = await prisma.posts.findFirst({
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true, title: true }
    });

    const newestPost = await prisma.posts.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true, title: true }
    });

    console.log('\n📅 数据时间范围:');
    console.log(`最早: ${oldestPost?.timestamp?.toLocaleString('zh-CN') || '未知'} - ${oldestPost?.title?.substring(0, 50) || ''}...`);
    console.log(`最新: ${newestPost?.timestamp?.toLocaleString('zh-CN') || '未知'} - ${newestPost?.title?.substring(0, 50) || ''}...`);

    // 查询最近7天的数据量
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCount = await prisma.posts.count({
      where: {
        timestamp: {
          gte: sevenDaysAgo
        }
      }
    });

    console.log(`\n📈 最近7天数据量: ${recentCount} 条`);

    // 显示最新的5条数据样本
    const samples = await prisma.posts.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        title: true,
        timestamp: true,
        post_type: true,
        value_assessment: true
      }
    });

    if (samples.length > 0) {
      console.log('\n📝 最新数据样本:');
      samples.forEach((post, index) => {
        console.log(`${index + 1}. ${post.title.substring(0, 60)}...`);
        console.log(`   时间: ${post.timestamp?.toLocaleString('zh-CN')}`);
        console.log(`   类型: ${post.post_type || '未分类'}`);
        console.log(`   价值: ${post.value_assessment || '未评估'}\n`);
      });
    }

  } catch (error) {
    console.error('查询 LinuxDo 数据时出错:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🔍 检查 LinuxDo 爬虫数据概况...\n');

    await checkLinuxdoDataOverview();

    console.log('✅ 检查完成！');
  } catch (error) {
    console.error('❌ 执行出错:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();



