/**
 * 检查待办清单数据格式
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 检查待办清单数据格式...\n');
  
  try {
    const todos = await prisma.todo.findMany({
      where: {
        mdContent: {
          not: null
        }
      },
      take: 1
    });
    
    if (todos.length === 0) {
      console.log('❌ 没有找到任何待办数据');
      return;
    }
    
    const todo = todos[0];
    console.log('📊 找到第一条数据：');
    console.log('userId:', todo.userId);
    console.log('\n📝 mdContent (前500字符):');
    console.log('='.repeat(60));
    console.log(todo.mdContent?.substring(0, 500));
    console.log('='.repeat(60));
    console.log('\n完整长度:', todo.mdContent?.length);
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

