#!/usr/bin/env node
/**
 * 添加 heybox_posts 表的 title_cn 字段
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 开始添加 title_cn 字段...\n');
    
    // 检查字段是否已存在
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'heybox_posts' AND column_name = 'title_cn'
    `;
    
    if (result.length > 0) {
      console.log('✅ title_cn 字段已存在，无需添加');
      return;
    }
    
    // 添加字段
    await prisma.$executeRaw`
      ALTER TABLE heybox_posts 
      ADD COLUMN IF NOT EXISTS title_cn TEXT
    `;
    
    console.log('✅ title_cn 字段添加成功！\n');
    
    // 验证
    const verify = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'heybox_posts' AND column_name = 'title_cn'
    `;
    
    console.log('验证结果：', verify);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();


