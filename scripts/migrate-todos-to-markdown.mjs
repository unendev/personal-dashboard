/**
 * 数据迁移脚本：将现有 Todo 数据转换为 Markdown 格式
 * 
 * 用法：node scripts/migrate-todos-to-markdown.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 将 Todo 数组转换为 Markdown 格式
 */
function todosToMarkdown(todos) {
  if (todos.length === 0) return '';
  
  // 构建层级结构
  const todoMap = new Map();
  const rootTodos = [];
  
  todos.forEach(todo => {
    todoMap.set(todo.id, todo);
  });
  
  todos.forEach(todo => {
    if (!todo.parentId) {
      rootTodos.push(todo);
    }
  });
  
  // 递归构建 Markdown
  function buildMarkdown(todoList, level = 0) {
    let markdown = '';
    
    // 按 order 排序
    const sortedTodos = [...todoList].sort((a, b) => a.order - b.order);
    
    for (const todo of sortedTodos) {
      const indent = '  '.repeat(level);
      const checkbox = todo.completed ? '[x]' : '[ ]';
      
      // 添加优先级emoji
      let priorityEmoji = '';
      if (todo.priority === 'high') priorityEmoji = '🔴 ';
      else if (todo.priority === 'low') priorityEmoji = '🟢 ';
      else if (todo.priority === 'medium') priorityEmoji = '🟡 ';
      
      // 添加分类标签
      const categoryTag = todo.category ? ` #${todo.category}` : '';
      
      markdown += `${indent}- ${checkbox} ${priorityEmoji}${todo.text}${categoryTag}\n`;
      
      // 递归处理子任务
      const children = todos.filter(t => t.parentId === todo.id);
      if (children.length > 0) {
        markdown += buildMarkdown(children, level + 1);
      }
    }
    
    return markdown;
  }
  
  return buildMarkdown(rootTodos).trim();
}

async function migrateAllUsers() {
  try {
    console.log('🚀 开始迁移任务数据...\n');
    
    // 获取所有有任务的用户
    const users = await prisma.user.findMany({
      where: {
        todos: {
          some: {}
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
      }
    });
    
    console.log(`📊 找到 ${users.length} 个用户有任务数据\n`);
    
    let totalMigrated = 0;
    
    for (const user of users) {
      console.log(`👤 处理用户: ${user.name || user.email} (${user.id})`);
      
      // 获取用户的所有任务
      const todos = await prisma.todo.findMany({
        where: {
          userId: user.id
        },
        orderBy: [
          { order: 'asc' },
          { createdAtUnix: 'desc' }
        ]
      });
      
      console.log(`   📝 任务数量: ${todos.length}`);
      
      if (todos.length === 0) {
        console.log('   ⏭️  跳过（无任务）\n');
        continue;
      }
      
      // 转换为 Markdown
      const mdContent = todosToMarkdown(todos);
      
      console.log(`   ✨ 生成的 Markdown 长度: ${mdContent.length} 字符`);
      console.log(`   📄 预览:\n${mdContent.split('\n').slice(0, 5).map(line => '      ' + line).join('\n')}`);
      if (todos.length > 5) {
        console.log(`      ...（还有 ${todos.length - 5} 个任务）`);
      }
      
      // 查找用户的第一个根任务作为主文档
      let mainTodo = todos.find(t => !t.parentId);
      
      if (mainTodo) {
        // 更新主文档的 mdContent
        await prisma.todo.update({
          where: { id: mainTodo.id },
          data: { mdContent }
        });
        
        console.log(`   ✅ 已更新任务 "${mainTodo.text}" 的 mdContent 字段\n`);
        totalMigrated++;
      } else {
        console.log(`   ⚠️  警告：未找到根任务，跳过\n`);
      }
    }
    
    console.log(`\n🎉 迁移完成！`);
    console.log(`📊 成功迁移 ${totalMigrated} 个用户的任务数据`);
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行迁移
migrateAllUsers()
  .then(() => {
    console.log('\n✨ 脚本执行完毕');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 脚本执行出错:', error);
    process.exit(1);
  });

