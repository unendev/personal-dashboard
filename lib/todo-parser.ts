/**
 * Markdown Todo Parser
 * 负责在 Markdown 格式和结构化 Todo 数据之间进行双向转换
 */

export interface ParsedTodo {
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  level: number; // 缩进层级，用于确定父子关系
  order: number; // 在当前层级的顺序
}

export interface TodoWithId extends ParsedTodo {
  id: string;
  parentId?: string | null;
  userId: string;
  date: string;
  createdAtUnix: number;
  mdContent?: string;
}

/**
 * 解析 Markdown 文本为结构化的 Todo 列表
 * 支持的语法：
 * - [ ] 未完成任务
 * - [x] 已完成任务
 * - [ ] 🔴 高优先级任务
 * - [ ] 🟡 中优先级任务
 * - [ ] 🟢 低优先级任务
 * - [ ] 任务 #标签
 *   - [ ] 子任务（2个空格缩进）
 */
export function parseMarkdownToTodos(mdContent: string): ParsedTodo[] {
  const lines = mdContent.split('\n');
  const todos: ParsedTodo[] = [];
  let orderCounter = 0;

  for (const line of lines) {
    // 匹配任务列表项：- [ ] 或 - [x]
    const taskMatch = line.match(/^(\s*)- \[([ xX])\] (.+)$/);
    
    if (taskMatch) {
      const [, indent, check, content] = taskMatch;
      const level = Math.floor(indent.length / 2); // 每2个空格为一级
      const completed = check.toLowerCase() === 'x';
      
      // 解析优先级（通过emoji）
      let priority: 'low' | 'medium' | 'high' = 'medium';
      let textContent = content.trim();
      
      if (textContent.startsWith('🔴')) {
        priority = 'high';
        textContent = textContent.replace(/^🔴\s*/, '');
      } else if (textContent.startsWith('🟡')) {
        priority = 'medium';
        textContent = textContent.replace(/^🟡\s*/, '');
      } else if (textContent.startsWith('🟢')) {
        priority = 'low';
        textContent = textContent.replace(/^🟢\s*/, '');
      }
      
      // 解析分类标签（#标签）
      let category: string | undefined;
      const categoryMatch = textContent.match(/#(\S+)/);
      if (categoryMatch) {
        category = categoryMatch[1];
        textContent = textContent.replace(/#\S+/, '').trim();
      }
      
      todos.push({
        text: textContent,
        completed,
        priority,
        category,
        level,
        order: orderCounter++
      });
    }
  }
  
  return todos;
}

/**
 * 将扁平的 ParsedTodo 列表转换为带有 parentId 的结构
 */
export function assignParentIds(todos: ParsedTodo[]): Array<ParsedTodo & { parentId?: string | null }> {
  const result: Array<ParsedTodo & { parentId?: string | null }> = [];
  const stack: Array<{ level: number; index: number }> = [];
  
  todos.forEach((todo, index) => {
    // 找到父节点（上一个层级较小的节点）
    while (stack.length > 0 && stack[stack.length - 1].level >= todo.level) {
      stack.pop();
    }
    
    const parentIndex = stack.length > 0 ? stack[stack.length - 1].index : undefined;
    
    result.push({
      ...todo,
      parentId: parentIndex !== undefined ? (result[parentIndex] as any).id : null
    });
    
    stack.push({ level: todo.level, index: result.length - 1 });
  });
  
  return result;
}

/**
 * 将 Todo 数据库对象列表转换为 Markdown 格式
 */
export function todosToMarkdown(todos: TodoWithId[]): string {
  if (todos.length === 0) return '';
  
  // 构建层级结构
  const todoMap = new Map<string, TodoWithId>();
  const rootTodos: TodoWithId[] = [];
  
  todos.forEach(todo => {
    todoMap.set(todo.id, todo);
  });
  
  todos.forEach(todo => {
    if (!todo.parentId) {
      rootTodos.push(todo);
    }
  });
  
  // 递归构建 Markdown
  function buildMarkdown(todoList: TodoWithId[], level: number = 0): string {
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

/**
 * 统计 Markdown 中的任务信息
 */
export function getMarkdownStats(mdContent: string): {
  total: number;
  completed: number;
  active: number;
  byPriority: { high: number; medium: number; low: number };
} {
  const todos = parseMarkdownToTodos(mdContent);
  
  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    active: todos.filter(t => !t.completed).length,
    byPriority: {
      high: todos.filter(t => t.priority === 'high').length,
      medium: todos.filter(t => t.priority === 'medium').length,
      low: todos.filter(t => t.priority === 'low').length,
    }
  };
  
  return stats;
}

/**
 * 过滤 Markdown 内容
 */
export function filterMarkdown(
  mdContent: string, 
  filter: 'all' | 'active' | 'completed'
): string {
  if (filter === 'all') return mdContent;
  
  const lines = mdContent.split('\n');
  const filteredLines: string[] = [];
  
  for (const line of lines) {
    const taskMatch = line.match(/^(\s*)- \[([ xX])\] (.+)$/);
    
    if (taskMatch) {
      const [, , check] = taskMatch;
      const isCompleted = check.toLowerCase() === 'x';
      
      if (
        (filter === 'active' && !isCompleted) ||
        (filter === 'completed' && isCompleted)
      ) {
        filteredLines.push(line);
      }
    } else if (line.trim() === '') {
      // 保留空行
      filteredLines.push(line);
    }
  }
  
  return filteredLines.join('\n').trim();
}

