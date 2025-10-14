'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, 
  Italic,
  List,
  ListTodo,
  Heading2,
  Undo,
  Redo,
  Save,
  BookOpen,
  Edit3,
  LayoutList,
  Columns3
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { getMarkdownStats } from '@/lib/todo-parser';

interface MarkdownTodoEditorProps {
  userId: string;
  className?: string;
}

export default function MarkdownTodoEditor({ userId, className = '' }: MarkdownTodoEditorProps) {
  const [mdContent, setMdContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'list' | 'kanban'>('edit'); // 视图模式：编辑/列表/看板
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0 });
  const [showOutline, setShowOutline] = useState(false);
  const [outline, setOutline] = useState<Array<{ level: number; text: string; id: string }>>([]);
  const [showCompleted, setShowCompleted] = useState(false); // 是否显示已完成任务

  // 初始化编辑器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
      }),
      Placeholder.configure({
        placeholder: '输入 "[] " 或 "- [ ] " 创建任务，使用 # 标题区分优先级（# 高 ## 中 ### 低）...',
      }),
    ],
    content: mdContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setMdContent(html);
      
      // 更新统计信息
      updateStats(html);
      
      // 自动保存（防抖）
      debouncedSave(html);
      
      // 延迟更新已完成任务的显示状态（等待DOM更新）
      setTimeout(() => {
        const editorElement = editor.view.dom;
        const allTaskItems = editorElement.querySelectorAll('li[data-type="taskItem"]');
        
        allTaskItems.forEach(taskItem => {
          const checkbox = taskItem.querySelector('input[type="checkbox"]') as HTMLInputElement;
          if (checkbox && checkbox.checked && !showCompleted) {
            (taskItem as HTMLElement).style.display = 'none';
          }
        });
      }, 10);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3 text-gray-200',
      },
      handleDOMEvents: {
        // 处理快捷输入：[] 自动转为任务项
        beforeinput: (view, event) => {
          if (event.data === ' ' && editor) {
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;
            const textBefore = $from.parent.textContent;
            
            // 检测 "[] " 模式
            if (textBefore.endsWith('[]')) {
              event.preventDefault();
              
              // 删除 "[]"
              const tr = state.tr.delete($from.pos - 2, $from.pos);
              view.dispatch(tr);
              
              // 插入任务列表项
              editor.chain().focus().toggleTaskList().run();
              
              return true;
            }
          }
          return false;
        },
      },
    },
  });

  // 手动控制已完成任务的显示/隐藏
  const toggleCompletedTasksVisibility = useCallback(() => {
    if (!editor) return;
    
    const editorElement = editor.view.dom;
    const allTaskItems = editorElement.querySelectorAll('li[data-type="taskItem"]');
    
    allTaskItems.forEach(taskItem => {
      const checkbox = taskItem.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (checkbox && checkbox.checked) {
        (taskItem as HTMLElement).style.display = showCompleted ? 'flex' : 'none';
      } else {
        (taskItem as HTMLElement).style.display = 'flex';
      }
    });
  }, [editor, showCompleted]);

  // 监听showCompleted状态变化
  useEffect(() => {
    toggleCompletedTasksVisibility();
  }, [showCompleted, toggleCompletedTasksVisibility]);

  // 从数据库加载内容
  const loadContent = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/todos?userId=${userId}`);
      
      if (response.ok) {
        const todos = await response.json();
        
        let content = '';
        
        // 如果有任务但没有mdContent，生成初始Markdown
        if (todos.length > 0 && !todos[0]?.mdContent) {
          // 从旧格式转换
          content = generateMarkdownFromTodos(todos);
        } else if (todos[0]?.mdContent) {
          content = todos[0].mdContent;
        }
        
        // 检测是否为纯Markdown（没有HTML标签）
        const isPlainMarkdown = content && !/<[^>]+>/.test(content);
        
        if (isPlainMarkdown && editor) {
          // 将纯Markdown转换为HTML
          const htmlContent = convertMarkdownToHTML(content);
          editor.commands.setContent(htmlContent);
          setMdContent(htmlContent);
          updateStats(htmlContent);
          // 加载后应用隐藏逻辑
          setTimeout(() => toggleCompletedTasksVisibility(), 100);
        } else if (content && editor) {
          // 已经是HTML格式
          editor.commands.setContent(content);
          setMdContent(content);
          updateStats(content);
          // 加载后应用隐藏逻辑
          setTimeout(() => toggleCompletedTasksVisibility(), 100);
        }
      }
    } catch (error) {
      console.error('加载任务失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, editor]);

  // 将纯Markdown转换为HTML
  const convertMarkdownToHTML = (markdown: string): string => {
    let html = '<p></p>'; // 空文档
    
    const lines = markdown.split('\n');
    let inTaskList = false;
    let currentIndent = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 跳过空行
      if (!line.trim()) {
        if (inTaskList) {
          html += '</ul>';
          inTaskList = false;
        }
        continue;
      }
      
      // 标题
      if (line.startsWith('### ')) {
        if (inTaskList) { html += '</ul>'; inTaskList = false; }
        html += `<h3>${line.substring(4)}</h3>`;
      } else if (line.startsWith('## ')) {
        if (inTaskList) { html += '</ul>'; inTaskList = false; }
        html += `<h2>${line.substring(3)}</h2>`;
      } else if (line.startsWith('# ')) {
        if (inTaskList) { html += '</ul>'; inTaskList = false; }
        html += `<h1>${line.substring(2)}</h1>`;
      }
      // 任务列表
      else if (line.trim().startsWith('- [')) {
        if (!inTaskList) {
          html += '<ul data-type="taskList">';
          inTaskList = true;
        }
        
        // 计算缩进层级
        const indent = line.search(/\S/);
        const indentLevel = Math.floor(indent / 2);
        
        // 检查是否完成
        const isChecked = line.includes('- [x]') || line.includes('- [X]');
        const text = line.replace(/^[\s]*- \[[xX ]?\]\s*/, '');
        
        // 处理嵌套
        if (indentLevel > currentIndent) {
          html += '<ul data-type="taskList">';
        } else if (indentLevel < currentIndent) {
          const diff = currentIndent - indentLevel;
          for (let j = 0; j < diff; j++) {
            html += '</ul></li>';
          }
        }
        
        html += `<li data-type="taskItem" data-checked="${isChecked}"><label><input type="checkbox"${isChecked ? ' checked' : ''}><span></span></label><div><p>${text}</p></div>`;
        
        // 检查下一行是否是更深的缩进
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const nextIndent = nextLine.search(/\S/);
          const nextIndentLevel = Math.floor(nextIndent / 2);
          if (nextIndentLevel <= indentLevel) {
            html += '</li>';
          }
        } else {
          html += '</li>';
        }
        
        currentIndent = indentLevel;
      }
    }
    
    if (inTaskList) {
      // 关闭所有未关闭的嵌套列表
      for (let i = 0; i <= currentIndent; i++) {
        html += '</ul>';
      }
    }
    
    return html;
  };

  // 生成Markdown（从旧Todo格式）
  const generateMarkdownFromTodos = (todos: Array<{ id: string; text: string; completed: boolean; priority: string; order: number; groupId?: string | null; isGroup: boolean }>): string => {
    // 按order排序
    const sortedTodos = [...todos].sort((a, b) => a.order - b.order);
    
    let markdown = '';
    const processed = new Set<string>();
    
    // 按优先级分组
    const highPriority = sortedTodos.filter(t => !t.parentId && t.priority === 'high');
    const mediumPriority = sortedTodos.filter(t => !t.parentId && t.priority === 'medium');
    const lowPriority = sortedTodos.filter(t => !t.parentId && t.priority === 'low');
    
    // 递归处理任务
    const processTodo = (todo: { id: string; text: string; completed: boolean; priority: string; isGroup: boolean; groupId?: string | null }, level: number = 0): void => {
      if (processed.has(todo.id)) return;
      processed.add(todo.id);
      
      const indent = '  '.repeat(level);
      const checkbox = todo.completed ? '[x]' : '[ ]';
      
      // 分类标签
      const categoryTag = todo.category ? ` #${todo.category}` : '';
      
      markdown += `${indent}- ${checkbox} ${todo.text}${categoryTag}\n`;
      
      // 处理子任务
      const children = sortedTodos.filter(t => t.parentId === todo.id);
      children.forEach(child => processTodo(child, level + 1));
    };
    
    // 高优先级
    if (highPriority.length > 0) {
      markdown += '# 高优先级\n\n';
      highPriority.forEach(todo => processTodo(todo, 0));
      markdown += '\n';
    }
    
    // 中优先级
    if (mediumPriority.length > 0) {
      markdown += '## 中优先级\n\n';
      mediumPriority.forEach(todo => processTodo(todo, 0));
      markdown += '\n';
    }
    
    // 低优先级
    if (lowPriority.length > 0) {
      markdown += '### 低优先级\n\n';
      lowPriority.forEach(todo => processTodo(todo, 0));
    }
    
    return markdown;
  };

  // 解析HTML内容为结构化数据（用于视图展示）
  const parseContentToTasks = (content: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    const tasks: Array<{
      id: string;
      text: string;
      completed: boolean;
      priority: 'high' | 'medium' | 'low';
    }> = [];
    
    let currentPriority: 'high' | 'medium' | 'low' = 'medium';
    
    // 遍历所有元素
    doc.body.childNodes.forEach((node, index) => {
      if (node.nodeName === 'H1') {
        currentPriority = 'high';
      } else if (node.nodeName === 'H2') {
        currentPriority = 'medium';
      } else if (node.nodeName === 'H3') {
        currentPriority = 'low';
      } else if (node.nodeName === 'UL' && (node as Element).getAttribute('data-type') === 'taskList') {
        // 提取任务列表项
        const taskItems = (node as Element).querySelectorAll('li[data-type="taskItem"]');
        taskItems.forEach((item, taskIndex) => {
          const text = item.querySelector('p')?.textContent || '';
          const completed = item.getAttribute('data-checked') === 'true';
          tasks.push({
            id: `task-${index}-${taskIndex}`,
            text,
            completed,
            priority: currentPriority,
          });
        });
      }
    });
    
    return tasks;
  };

  // 更新统计信息（从HTML解析）
  const updateStats = (content: string) => {
    // 从HTML中提取任务状态
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const taskItems = doc.querySelectorAll('li[data-type="taskItem"]');
    
    const total = taskItems.length;
    let completed = 0;
    
    taskItems.forEach(item => {
      if (item.getAttribute('data-checked') === 'true') {
        completed++;
      }
    });
    
    setStats({
      total,
      completed,
      active: total - completed,
    });
    
    // 同时更新大纲
    const headings = doc.querySelectorAll('h1, h2, h3');
    const newOutline = Array.from(headings).map((heading, index) => ({
      level: parseInt(heading.tagName.substring(1)),
      text: heading.textContent || '',
      id: `heading-${index}`,
    }));
    setOutline(newOutline);
  };

  // 保存到数据库
  const saveContent = async (content: string) => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/todos/batch-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          mdContent: content,
        }),
      });
      
      if (response.ok) {
        setLastSaved(new Date());
      } else {
        console.error('保存失败');
      }
    } catch (error) {
      console.error('保存错误:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 防抖保存
  const debouncedSave = useCallback(
    debounce((content: string) => {
      saveContent(content);
    }, 500),
    [userId]
  );

  // 手动保存
  const handleManualSave = () => {
    if (mdContent) {
      saveContent(mdContent);
    }
  };

  // 加载数据
  useEffect(() => {
    if (userId) {
      loadContent();
    }
  }, [userId, loadContent]);

  if (!editor) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 统计面板 */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-100">{stats.total}</div>
          <div className="text-xs text-gray-400">总任务</div>
        </div>
        <div className="text-center border-l border-r border-gray-700/50">
          <div className="text-xl font-bold text-blue-400">{stats.active}</div>
          <div className="text-xs text-gray-400">待完成</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-green-400">{stats.completed}</div>
          <div className="text-xs text-gray-400">已完成</div>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-sm text-gray-300 font-medium">视图：</span>
        <Button
          variant={viewMode === 'edit' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('edit')}
          className="h-8"
        >
          <Edit3 className="w-3.5 h-3.5 mr-1.5" />
          编辑模式
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('list')}
          className="h-8"
        >
          <LayoutList className="w-3.5 h-3.5 mr-1.5" />
          列表视图
        </Button>
        <Button
          variant={viewMode === 'kanban' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('kanban')}
          className="h-8"
        >
          <Columns3 className="w-3.5 h-3.5 mr-1.5" />
          看板视图
        </Button>
      </div>

      {/* 工具栏 - 仅在编辑模式显示 */}
      {viewMode === 'edit' && (
      <div className="border border-gray-700/50 rounded-lg bg-gray-900/60 backdrop-blur-sm overflow-hidden">
        <div className="border-b border-gray-700/50 p-2 flex flex-wrap gap-1 bg-gray-800/50">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="粗体"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="斜体"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-600 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="标题"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="列表"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            title="任务列表"
          >
            <ListTodo className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-600 mx-1" />

          <ToolbarButton
            onClick={() => setShowOutline(!showOutline)}
            isActive={showOutline}
            title="大纲"
          >
            <BookOpen className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-600 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="撤销"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="重做"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-600 mx-1" />

          <ToolbarButton
            onClick={handleManualSave}
            disabled={isSaving}
            title="手动保存"
          >
            <Save className="w-4 h-4" />
          </ToolbarButton>

          {/* 保存状态 */}
          <div className="ml-auto flex items-center text-xs text-gray-400">
            {isSaving && <span>保存中...</span>}
            {!isSaving && lastSaved && (
              <span>已保存 {formatTime(lastSaved)}</span>
            )}
          </div>
        </div>

      </div>
      )}

      {/* 内容区 - 根据视图模式切换 */}
      <div className="border border-gray-700/50 rounded-lg bg-gray-900/60 backdrop-blur-sm overflow-hidden">
        <div className="flex gap-4">
          {/* 编辑模式 */}
          {viewMode === 'edit' && (
            <div className="relative flex-1">
              <EditorContent 
                editor={editor} 
                className="max-h-[500px] overflow-y-auto"
              />
              <style dangerouslySetInnerHTML={{__html: `
                /* 编辑器基础样式 */
                .ProseMirror {
                  outline: none;
                }
                
                /* 粗体 */
                .ProseMirror strong {
                  font-weight: 700 !important;
                  color: #93c5fd !important;
                }
                
                /* 斜体 */
                .ProseMirror em {
                  font-style: italic !important;
                  color: #fbbf24 !important;
                }
                
                /* 标题样式 */
                .ProseMirror h1 {
                  color: #f87171 !important;
                  font-size: 1.125rem !important;
                  font-weight: 700 !important;
                  margin-top: 1rem !important;
                  margin-bottom: 0.5rem !important;
                  line-height: 1.5 !important;
                }
                .ProseMirror h2 {
                  color: #fbbf24 !important;
                  font-size: 1rem !important;
                  font-weight: 600 !important;
                  margin-top: 0.75rem !important;
                  margin-bottom: 0.375rem !important;
                  line-height: 1.4 !important;
                }
                .ProseMirror h3 {
                  color: #4ade80 !important;
                  font-size: 0.875rem !important;
                  font-weight: 500 !important;
                  margin-top: 0.5rem !important;
                  margin-bottom: 0.25rem !important;
                  line-height: 1.3 !important;
                }
                
                /* 普通无序列表 */
                .ProseMirror ul:not([data-type="taskList"]) {
                  list-style-type: disc !important;
                  padding-left: 1.5rem !important;
                  margin: 0.5rem 0 !important;
                }
                .ProseMirror ul:not([data-type="taskList"]) li {
                  margin: 0.25rem 0 !important;
                  padding-left: 0.25rem !important;
                  color: #d1d5db !important;
                }
                
                /* 有序列表 */
                .ProseMirror ol {
                  list-style-type: decimal !important;
                  padding-left: 1.5rem !important;
                  margin: 0.5rem 0 !important;
                }
                .ProseMirror ol li {
                  margin: 0.25rem 0 !important;
                  padding-left: 0.25rem !important;
                  color: #d1d5db !important;
                }
                
                /* 任务列表容器 */
                .ProseMirror ul[data-type="taskList"] {
                  list-style: none !important;
                  padding-left: 0 !important;
                  margin: 0.75rem 0 !important;
                }
                
                /* 任务项样式 - 添加特殊背景 */
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] {
                  display: flex !important;
                  align-items: flex-start !important;
                  gap: 0.75rem !important;
                  padding: 0.625rem 0.875rem !important;
                  margin: 0.375rem 0 !important;
                  background: rgba(59, 130, 246, 0.08) !important;
                  border: 1px solid rgba(59, 130, 246, 0.2) !important;
                  border-radius: 0.375rem !important;
                  transition: all 0.2s ease !important;
                }
                
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"]:hover {
                  background: rgba(59, 130, 246, 0.12) !important;
                  border-color: rgba(59, 130, 246, 0.3) !important;
                }
                
                /* Checkbox样式优化 */
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] label {
                  flex-shrink: 0 !important;
                  display: flex !important;
                  align-items: center !important;
                  margin-top: 0.1875rem !important;
                  cursor: pointer !important;
                }
                
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] label input[type="checkbox"] {
                  width: 1.375rem !important;
                  height: 1.375rem !important;
                  cursor: pointer !important;
                  border-radius: 0.25rem !important;
                  border: 2px solid #60a5fa !important;
                  background: transparent !important;
                  appearance: none !important;
                  -webkit-appearance: none !important;
                  position: relative !important;
                  margin: 0 !important;
                }
                
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] label input[type="checkbox"]:checked {
                  background: #3b82f6 !important;
                  border-color: #3b82f6 !important;
                }
                
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] label input[type="checkbox"]:checked::after {
                  content: "✓" !important;
                  position: absolute !important;
                  top: 50% !important;
                  left: 50% !important;
                  transform: translate(-50%, -50%) !important;
                  color: white !important;
                  font-size: 0.875rem !important;
                  font-weight: 700 !important;
                }
                
                /* 任务文本内容 */
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] > div {
                  flex: 1 !important;
                  min-width: 0 !important;
                  padding-top: 0.0625rem !important;
                }
                
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] > div > p {
                  margin: 0 !important;
                  line-height: 1.5 !important;
                  word-break: break-word !important;
                  color: #e5e7eb !important;
                }
                
                /* 已完成任务 - 默认隐藏（通过checkbox的checked状态判断） */
                ${!showCompleted ? `
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"]:has(input[type="checkbox"]:checked) {
                  display: none !important;
                }
                /* 兼容旧版浏览器的备用方案 */
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"][data-checked="true"] {
                  display: none !important;
                }
                .ProseMirror ul[data-type="taskList"] li.checked {
                  display: none !important;
                }
                ` : ''}
                
                /* 已完成任务样式（显示时）- 通过checkbox状态 */
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"]:has(input[type="checkbox"]:checked) {
                  background: rgba(107, 114, 128, 0.08) !important;
                  border-color: rgba(107, 114, 128, 0.2) !important;
                  opacity: 0.6 !important;
                }
                
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"]:has(input[type="checkbox"]:checked) > div > p {
                  text-decoration: line-through !important;
                  color: #9ca3af !important;
                }
                
                /* 兼容旧版本的备用样式 */
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"][data-checked="true"] {
                  background: rgba(107, 114, 128, 0.08) !important;
                  border-color: rgba(107, 114, 128, 0.2) !important;
                  opacity: 0.6 !important;
                }
                
                .ProseMirror ul[data-type="taskList"] li[data-type="taskItem"][data-checked="true"] > div > p {
                  text-decoration: line-through !important;
                  color: #9ca3af !important;
                }
                
                /* Placeholder样式 */
                .ProseMirror p.is-editor-empty:first-child::before {
                  color: #6b7280 !important;
                  content: attr(data-placeholder) !important;
                  float: left !important;
                  height: 0 !important;
                  pointer-events: none !important;
                }
              `}} />
            </div>
          )}

          {/* 列表视图 */}
          {viewMode === 'list' && (
            <div className="flex-1">
              {/* 列表视图控制栏 */}
              <div className="border-b border-gray-700/50 p-3 flex items-center justify-between bg-gray-800/50">
                <div className="text-sm text-gray-400">
                  共 <span className="text-blue-400 font-semibold">{parseContentToTasks(mdContent).filter(t => !showCompleted ? !t.completed : true).length}</span> 项任务
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="h-7 text-xs"
                >
                  {showCompleted ? '隐藏已完成' : '显示已完成'} ({stats.completed})
                </Button>
              </div>
              
              <div className="max-h-[450px] overflow-y-auto space-y-2 p-4">
              {parseContentToTasks(mdContent).filter(task => showCompleted || !task.completed).map(task => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    task.completed 
                      ? 'bg-gray-800/30 border-gray-700/30 opacity-50' 
                      : 'bg-gray-800/50 border-gray-700/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    readOnly
                    className="mt-1 w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className={`${task.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                      {task.text}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {parseContentToTasks(mdContent).filter(task => showCompleted || !task.completed).length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <p>{parseContentToTasks(mdContent).length === 0 ? '暂无任务' : '暂无待完成任务'}</p>
                  <p className="text-sm mt-2">切换到编辑模式开始创建</p>
                </div>
              )}
              </div>
            </div>
          )}

          {/* 看板视图 */}
          {viewMode === 'kanban' && (
            <div className="flex-1 max-h-[500px] overflow-y-auto">
              <div className="grid grid-cols-3 gap-4 p-4">
                {/* 高优先级列 */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-red-400 mb-3 pb-2 border-b border-red-400/30">
                    🔴 高优先级 ({parseContentToTasks(mdContent).filter(t => t.priority === 'high' && (showCompleted || !t.completed)).length})
                  </h3>
                  {parseContentToTasks(mdContent)
                    .filter(t => t.priority === 'high' && (showCompleted || !t.completed))
                    .map(task => (
                      <div
                        key={task.id}
                        className={`p-3 border rounded-lg text-sm transition-all ${
                          task.completed
                            ? 'bg-red-500/5 border-red-500/20 opacity-50 line-through text-gray-500'
                            : 'bg-red-500/10 border-red-500/30 text-gray-200'
                        }`}
                      >
                        {task.text}
                      </div>
                    ))}
                </div>

                {/* 中优先级列 */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-3 pb-2 border-b border-yellow-400/30">
                    🟡 中优先级 ({parseContentToTasks(mdContent).filter(t => t.priority === 'medium' && (showCompleted || !t.completed)).length})
                  </h3>
                  {parseContentToTasks(mdContent)
                    .filter(t => t.priority === 'medium' && (showCompleted || !t.completed))
                    .map(task => (
                      <div
                        key={task.id}
                        className={`p-3 border rounded-lg text-sm transition-all ${
                          task.completed
                            ? 'bg-yellow-500/5 border-yellow-500/20 opacity-50 line-through text-gray-500'
                            : 'bg-yellow-500/10 border-yellow-500/30 text-gray-200'
                        }`}
                      >
                        {task.text}
                      </div>
                    ))}
                </div>

                {/* 低优先级列 */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-green-400 mb-3 pb-2 border-b border-green-400/30">
                    🟢 低优先级 ({parseContentToTasks(mdContent).filter(t => t.priority === 'low' && (showCompleted || !t.completed)).length})
                  </h3>
                  {parseContentToTasks(mdContent)
                    .filter(t => t.priority === 'low' && (showCompleted || !t.completed))
                    .map(task => (
                      <div
                        key={task.id}
                        className={`p-3 border rounded-lg text-sm transition-all ${
                          task.completed
                            ? 'bg-green-500/5 border-green-500/20 opacity-50 line-through text-gray-500'
                            : 'bg-green-500/10 border-green-500/30 text-gray-200'
                        }`}
                      >
                        {task.text}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* 大纲面板 - 悬浮框 */}
          {showOutline && (
            <div className="fixed right-6 top-24 w-64 bg-gray-900/95 border border-gray-700/50 rounded-lg shadow-2xl backdrop-blur-sm z-50 max-h-[70vh] overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700/50">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    文档大纲
                  </h3>
                  <button
                    onClick={() => setShowOutline(false)}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                    title="关闭"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-1 max-h-[calc(70vh-80px)] overflow-y-auto pr-2">
                  {outline.length === 0 ? (
                    <div className="text-sm text-gray-500 p-2">
                      <p className="mb-2">暂无标题</p>
                      <p className="text-xs">使用标题来组织任务：</p>
                      <div className="mt-2 space-y-1 text-xs bg-gray-800/50 p-2 rounded">
                        <div className="text-red-400"># 高优先级</div>
                        <div className="text-yellow-400">## 中优先级</div>
                        <div className="text-green-400">### 低优先级</div>
                      </div>
                    </div>
                  ) : (
                    outline.map((item, index) => (
                      <div
                        key={item.id}
                        className={`text-sm cursor-pointer hover:bg-gray-800/50 rounded px-2 py-1.5 transition-all ${
                          item.level === 1 ? 'text-red-400 font-semibold' :
                          item.level === 2 ? 'text-yellow-400' :
                          'text-green-400'
                        }`}
                        style={{ paddingLeft: `${8 + (item.level - 1) * 12}px` }}
                        onClick={() => {
                          // 滚动到对应标题
                          const headings = editor?.view.dom.querySelectorAll('h1, h2, h3');
                          if (headings && headings[index]) {
                            headings[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                      >
                        {item.text}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 使用提示 */}
      <div className="text-xs text-gray-400 space-y-1.5 p-3 bg-gray-800/30 rounded border border-gray-700/50">
        <div className="flex items-start gap-2">
          <span className="text-gray-500">•</span>
          <span>
            <span className="text-gray-300">视图切换：</span>
            <span className="text-blue-400">编辑模式</span> 自由书写，
            <span className="text-blue-400">列表/看板视图</span> 可视化查阅
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-500">•</span>
          <span>输入 <code className="bg-gray-900/50 px-1.5 py-0.5 rounded text-gray-300 font-mono text-xs">[] </code> 或 <code className="bg-gray-900/50 px-1.5 py-0.5 rounded text-gray-300 font-mono text-xs">- [ ]</code> 创建任务</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-500">•</span>
          <span>用 <code className="bg-gray-900/50 px-1.5 py-0.5 rounded text-red-400 font-mono text-xs"># 高</code> <code className="bg-gray-900/50 px-1.5 py-0.5 rounded text-yellow-400 font-mono text-xs">## 中</code> <code className="bg-gray-900/50 px-1.5 py-0.5 rounded text-green-400 font-mono text-xs">### 低</code> 标题组织优先级</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-500">•</span>
          <span>点击工具栏 📖 查看大纲导航</span>
        </div>
      </div>
    </div>
  );
}

// 工具栏按钮组件
function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded hover:bg-gray-700 transition-colors ${
        isActive ? 'bg-blue-600 text-blue-100' : 'text-gray-300'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

// 防抖函数
function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// 格式化时间
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

