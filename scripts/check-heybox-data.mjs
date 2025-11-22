#!/usr/bin/env node
/**
 * 快速检查小黑盒数据
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 检查小黑盒数据...\n');
    
    // 查询帖子总数
    const postsCount = await prisma.heybox_posts.count();
    console.log(`📊 帖子总数: ${postsCount}`);
    
    // 查询评论总数
    const commentsCount = await prisma.heybox_comments.count();
    console.log(`💬 评论总数: ${commentsCount}\n`);
    
    if (postsCount > 0) {
      // 获取最新的5个帖子
      const latestPosts = await prisma.heybox_posts.findMany({
        take: 5,
        orderBy: {
          timestamp: 'desc'
        },
        select: {
          id: true,
          title: true,
          author: true,
          likes_count: true,
          comments_count: true,
          game_tag: true,
          core_issue: true,
          value_assessment: true,
          timestamp: true
        }
      });
      
      console.log('📝 最新5个帖子：\n');
      latestPosts.forEach((post, index) => {
        console.log(`${index + 1}. ${post.author || '未知作者'}`);
        console.log(`   ID: ${post.id}`);
        console.log(`   核心议题: ${post.core_issue || '未分析'}`);
        console.log(`   价值评估: ${post.value_assessment || '未评估'}`);
        console.log(`   点赞: ${post.likes_count || 0} | 评论: ${post.comments_count || 0}`);
        console.log(`   时间: ${post.timestamp?.toLocaleString() || '未知'}\n`);
      });
      
      // 统计各类型帖子数量
      const typeStats = await prisma.heybox_posts.groupBy({
        by: ['post_type'],
        _count: true
      });
      
      console.log('📊 帖子类型分布：');
      typeStats.forEach(stat => {
        console.log(`   ${stat.post_type || '未分类'}: ${stat._count} 个`);
      });
      console.log();
      
      // 统计价值评估分布
      const valueStats = await prisma.heybox_posts.groupBy({
        by: ['value_assessment'],
        _count: true
      });
      
      console.log('💎 价值评估分布：');
      valueStats.forEach(stat => {
        console.log(`   ${stat.value_assessment || '未评估'}: ${stat._count} 个`);
      });
    }
    
    console.log('\n✅ 数据检查完成！');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();


