/**
 * 迁移脚本：将待办清单中的emoji转换为Markdown标题
 * 运行：node scripts/migrate-todos-emoji-to-headers.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// emoji到优先级的映射
const emojiToPriority = {
  '🔴': 'high',
  '🟡': 'medium', 
  '🟢': 'low',
};

// 优先级到标题的映射
const priorityToHeader = {
  high: '# 高优先级',
  medium: '## 中优先级',
  low: '### 低优先级',
};

// 解析HTML中的任务项
function parseTasksFromHTML(html) {
  const tasks = { high: [], medium: [], low: [], unknown: [] };
  
  // 匹配任务列表项：<li data-type="taskItem" data-checked="true/false">内容</li>
  const taskRegex = /<li[^>]*data-type="taskItem"[^>]*data-checked="(true|false)"[^>]*>(.*?)<\/li>/gs;
  
  let match;
  while ((match = taskRegex.exec(html)) !== null) {
    const checked = match[1] === 'true';
    let content = match[2];
    
    // 移除HTML标签
    content = content.replace(/<[^>]+>/g, '').trim();
    
    // 检测emoji并确定优先级
    let priority = 'unknown';
    let cleanContent = content;
    
    for (const [emoji, pri] of Object.entries(emojiToPriority)) {
      if (content.includes(emoji)) {
        priority = pri;
        // 移除emoji
        cleanContent = content.replace(emoji, '').trim();
        break;
      }
    }
    
    // 构造Markdown任务
    const checkbox = checked ? '[x]' : '[ ]';
    const taskLine = `- ${checkbox} ${cleanContent}`;
    
    tasks[priority].push(taskLine);
  }
  
  return tasks;
}

// 生成新的Markdown内容
function generateMarkdownWithHeaders(tasks) {
  let markdown = '';
  
  // 高优先级
  if (tasks.high.length > 0) {
    markdown += '# 高优先级\n\n';
    markdown += tasks.high.join('\n') + '\n\n';
  }
  
  // 中优先级
  if (tasks.medium.length > 0) {
    markdown += '## 中优先级\n\n';
    markdown += tasks.medium.join('\n') + '\n\n';
  }
  
  // 低优先级
  if (tasks.low.length > 0) {
    markdown += '### 低优先级\n\n';
    markdown += tasks.low.join('\n') + '\n\n';
  }
  
  // 未知优先级（没有emoji的）
  if (tasks.unknown.length > 0) {
    markdown += '## 其他任务\n\n';
    markdown += tasks.unknown.join('\n') + '\n';
  }
  
  return markdown.trim();
}

async function main() {
  console.log('🚀 开始迁移待办清单数据...\n');
  
  try {
    // 获取所有有mdContent的Todo
    const todos = await prisma.todo.findMany({
      where: {
        mdContent: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`📊 找到 ${todos.length} 条待办记录\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const todo of todos) {
      const { id, userId, mdContent } = todo;
      
      // 检查是否包含emoji
      const hasEmoji = /🔴|🟡|🟢/.test(mdContent);
      
      if (!hasEmoji) {
        console.log(`⏭️  跳过 (userId: ${userId}) - 没有emoji`);
        skippedCount++;
        continue;
      }
      
      console.log(`\n🔄 处理 (userId: ${userId})...`);
      
      // 解析任务
      const tasks = parseTasksFromHTML(mdContent);
      
      console.log(`   - 高优先级: ${tasks.high.length} 个`);
      console.log(`   - 中优先级: ${tasks.medium.length} 个`);
      console.log(`   - 低优先级: ${tasks.low.length} 个`);
      console.log(`   - 其他: ${tasks.unknown.length} 个`);
      
      // 生成新的Markdown
      const newMarkdown = generateMarkdownWithHeaders(tasks);
      
      // 更新数据库（需要先用Tiptap渲染成HTML）
      // 这里我们暂时存储纯Markdown，让编辑器重新渲染
      await prisma.todo.update({
        where: { id },
        data: {
          mdContent: newMarkdown,
          text: '已迁移到Markdown标题格式', // 更新text字段作为标记
        }
      });
      
      console.log(`   ✅ 更新成功`);
      updatedCount++;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`\n✅ 迁移完成！`);
    console.log(`   - 更新: ${updatedCount} 条`);
    console.log(`   - 跳过: ${skippedCount} 条`);
    console.log(`   - 总计: ${todos.length} 条\n`);
    
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

