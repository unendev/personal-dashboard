/**
 * 从旧Todo格式迁移到新Markdown格式
 * 旧格式：每个Todo是一条记录，有text、priority、completed等字段
 * 新格式：单个Markdown文档存储在mdContent字段
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始从旧格式迁移到Markdown格式...\n');
  
  try {
    // 获取所有用户的Todo
    const allTodos = await prisma.todo.findMany({
      orderBy: [
        { userId: 'asc' },
        { order: 'asc' }
      ]
    });
    
    if (allTodos.length === 0) {
      console.log('❌ 没有找到任何待办数据');
      return;
    }
    
    console.log(`📊 找到 ${allTodos.length} 条旧格式待办记录\n`);
    
    // 按用户分组
    const userTodos = {};
    for (const todo of allTodos) {
      if (!userTodos[todo.userId]) {
        userTodos[todo.userId] = [];
      }
      userTodos[todo.userId].push(todo);
    }
    
    console.log(`👥 涉及 ${Object.keys(userTodos).length} 个用户\n`);
    
    // 为每个用户生成Markdown
    for (const [userId, todos] of Object.entries(userTodos)) {
      console.log(`\n🔄 处理用户: ${userId}`);
      console.log(`   找到 ${todos.length} 个任务`);
      
      // 按优先级分组
      const byPriority = {
        high: [],
        medium: [],
        low: []
      };
      
      const processed = new Set();
      
      // 递归处理任务（包括子任务）
      const processTodo = (todo, level = 0) => {
        if (processed.has(todo.id)) return '';
        processed.add(todo.id);
        
        const indent = '  '.repeat(level);
        const checkbox = todo.completed ? '[x]' : '[ ]';
        const categoryTag = todo.category ? ` #${todo.category}` : '';
        
        let result = `${indent}- ${checkbox} ${todo.text}${categoryTag}\n`;
        
        // 处理子任务
        const children = todos.filter(t => t.parentId === todo.id);
        for (const child of children) {
          result += processTodo(child, level + 1);
        }
        
        return result;
      };
      
      // 处理根任务
      for (const todo of todos) {
        if (todo.parentId) continue; // 跳过子任务，会在父任务中处理
        
        const priority = todo.priority || 'medium';
        const markdown = processTodo(todo, 0);
        
        if (byPriority[priority]) {
          byPriority[priority].push(markdown);
        } else {
          byPriority['medium'].push(markdown);
        }
      }
      
      // 生成完整的Markdown文档
      let fullMarkdown = '';
      
      if (byPriority.high.length > 0) {
        fullMarkdown += '# 高优先级\n\n';
        fullMarkdown += byPriority.high.join('');
        fullMarkdown += '\n';
      }
      
      if (byPriority.medium.length > 0) {
        fullMarkdown += '## 中优先级\n\n';
        fullMarkdown += byPriority.medium.join('');
        fullMarkdown += '\n';
      }
      
      if (byPriority.low.length > 0) {
        fullMarkdown += '### 低优先级\n\n';
        fullMarkdown += byPriority.low.join('');
      }
      
      console.log(`   - 高优先级: ${byPriority.high.length} 个`);
      console.log(`   - 中优先级: ${byPriority.medium.length} 个`);
      console.log(`   - 低优先级: ${byPriority.low.length} 个`);
      
      // 找到该用户的第一个Todo记录，更新其mdContent
      const firstTodo = todos[0];
      
      await prisma.todo.update({
        where: { id: firstTodo.id },
        data: {
          mdContent: fullMarkdown.trim(),
          text: '✅ 已迁移到Markdown格式'
        }
      });
      
      console.log(`   ✅ 已保存Markdown到 Todo ID: ${firstTodo.id}`);
      
      // 预览前200字符
      console.log(`   📝 预览:\n${fullMarkdown.substring(0, 200)}...`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ 迁移完成！`);
    console.log(`\n💡 提示：现在刷新 /log 页面即可看到新的Markdown格式`);
    console.log(`\n⚠️  注意：旧的Todo记录仍然保留在数据库中，如需清理请手动操作\n`);
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

