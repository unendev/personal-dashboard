'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/app/components/ui/card';
import CategoryZoneHeader from './CategoryZoneHeader';
import CategorySubHeader from './CategorySubHeader';
import QuickCreateDialog, { QuickCreateData } from './QuickCreateDialog';
import CreateLogModal from '@/app/components/features/log/CreateLogModal';
import { 
  groupTasksByCategory, 
  loadCollapsedCategories, 
  saveCollapsedCategories,
  CategoryGroup
} from '@/lib/timer-utils';

interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  instanceTag?: string | null;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  parentId?: string | null;
  children?: TimerTask[];
  totalTime?: number;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryZoneWrapperProps {
  tasks: TimerTask[];
  userId?: string;
  selectedDate?: string;
  onQuickCreate: (data: QuickCreateData) => Promise<void>;
  onBeforeOperation?: () => void; // 新增：在操作前执行的回调
  renderTaskList: (tasks: TimerTask[], onTaskClone: (task: TimerTask) => void, onBeforeOperation?: () => void) => React.ReactNode;
}

const CategoryZoneWrapper: React.FC<CategoryZoneWrapperProps> = ({
  tasks,
  userId = 'user-1',
  selectedDate,
  onQuickCreate,
  onBeforeOperation,
  renderTaskList
}) => {
  // 折叠状态
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  // 快速创建对话框状态（用于分类创建）
  const [quickCreateDialog, setQuickCreateDialog] = useState<{
    visible: boolean;
    type: 'category';
    categoryPath: string;
    lastCategoryName?: string;
  } | null>(null);
  
  // 复制任务模态框状态（使用 CreateLogModal）
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneTaskCategory, setCloneTaskCategory] = useState<string>('');
  
  // 【新增】提取 categoryPath 的最后一层名称（使用 useCallback 优化）
  const getLastCategoryName = useCallback((categoryPath: string): string => {
    if (!categoryPath) return '';
    const parts = categoryPath.split('/');
    return parts[parts.length - 1] || '';
  }, []);
  
  // 加载折叠状态
  useEffect(() => {
    const saved = loadCollapsedCategories();
    setCollapsedCategories(saved);
  }, []);
  
  // 分组任务
  const categoryGroups = useMemo(() => {
    return groupTasksByCategory(tasks);
  }, [tasks]);
  
  // 提取不参与分组的任务（时间黑洞、身体锻炼）
  const ungroupedTasks = useMemo(() => {
    const filtered = tasks.filter(t => 
      !t.parentId && 
      (t.categoryPath?.includes('时间黑洞') || t.categoryPath?.includes('身体锻炼'))
    );
    
    // 排序：运行中的任务在前，然后按创建时间降序
    return filtered.sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks]);
  
  // 切换折叠状态
  const toggleCategoryCollapse = (categoryPath: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryPath)) {
        next.delete(categoryPath);
      } else {
        next.add(categoryPath);
      }
      saveCollapsedCategories(next);
      return next;
    });
  };
  
  // 打开区域级快速创建对话框
  const handleCategoryQuickCreate = (categoryPath: string) => {
    setQuickCreateDialog({
      visible: true,
      type: 'category',
      categoryPath,
      lastCategoryName: getLastCategoryName(categoryPath) // 【新增】传递最后一层名称
    });
  };
  
  // 处理快速创建
  const handleQuickCreate = async (data: QuickCreateData) => {
    // 立即关闭对话框（乐观更新，不等待 API）
    setQuickCreateDialog(null);
    
    // 异步创建任务（不阻塞 UI）
    onQuickCreate({ ...data, date: selectedDate }).catch((error) => {
      console.error('创建任务失败:', error);
      // 失败时显示错误提示，但不阻止对话框关闭
      alert(`任务创建失败: ${error instanceof Error ? error.message : '未知错误'}\n\n请检查网络连接后重试`);
    });
  };
  
  // 打开任务级复制创建对话框（使用 CreateLogModal）
  const handleTaskClone = (task: TimerTask) => {
    setCloneTaskCategory(task.categoryPath);
    setCloneModalOpen(true);
  };
  
  // 处理复制任务（将 CreateLogModal 的数据转换为 QuickCreateData）
  const handleCloneTask = async (
    taskName: string,
    categoryPath: string,
    date: string,
    initialTime?: number,
    instanceTagNames?: string
  ) => {
    setCloneModalOpen(false);
    
    // 转换为 QuickCreateData 格式
    const quickCreateData: QuickCreateData = {
      name: taskName,
      categoryPath,
      instanceTagNames: instanceTagNames ? instanceTagNames.split(',').map(t => t.trim()).filter(Boolean) : [],
      initialTime: initialTime || 0,
      autoStart: false, // 复制任务默认不自动开始
      date: selectedDate
    };
    
    // 调用 onQuickCreate
    await onQuickCreate(quickCreateData).catch((error) => {
      console.error('复制任务失败:', error);
      alert(`复制任务失败: ${error instanceof Error ? error.message : '未知错误'}\n\n请检查网络连接后重试`);
    });
  };
  
  // 递归渲染分组（支持3层嵌套）
  const renderCategoryGroup = (group: CategoryGroup, parentColor?: string): React.ReactNode => {
    const isCollapsed = collapsedCategories.has(group.categoryPath);
    const color = group.color || parentColor || 'blue';
    
    // Level 1: 一级分类（大卡片 + CategoryZoneHeader）
    if (group.level === 1) {
      return (
        <Card 
          key={group.id}
          className="overflow-hidden border-2 hover:shadow-lg transition-shadow duration-200"
        >
          <CategoryZoneHeader
            group={group}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => toggleCategoryCollapse(group.categoryPath)}
            onQuickCreate={() => handleCategoryQuickCreate(group.categoryPath)}
          />
          
          {!isCollapsed && (
            <div className="p-4 space-y-3">
              {/* 渲染一级的任务 */}
              {group.tasks.length > 0 && (
                <div>
                  {renderTaskList(group.tasks, handleTaskClone, onBeforeOperation)}
                </div>
              )}
              
              {/* 递归渲染子分组（二级） */}
              {group.subGroups && group.subGroups.length > 0 && (
                <div className="space-y-3">
                  {group.subGroups.map(subGroup => renderCategoryGroup(subGroup, color))}
                </div>
              )}
            </div>
          )}
        </Card>
      );
    }
    
    // Level 2/3: 二三级分类（简化头部）
    const indentClass = group.level === 3 ? 'ml-4' : '';
    
    return (
      <div key={group.id} className={indentClass}>
        <div className="space-y-2">
          <CategorySubHeader
            group={group}
            level={group.level as 2 | 3}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => toggleCategoryCollapse(group.categoryPath)}
            parentColor={color}
          />
          
          {!isCollapsed && (
            <div className="space-y-2 pl-4">
              {/* 渲染当前层级的任务 */}
              {group.tasks.length > 0 && (
                <div>
                  {renderTaskList(group.tasks, handleTaskClone, onBeforeOperation)}
                </div>
              )}
              
              {/* 递归渲染子分组（三级） */}
              {group.subGroups && group.subGroups.length > 0 && (
                <div className="space-y-2">
                  {group.subGroups.map(subGroup => renderCategoryGroup(subGroup, color))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // 如果没有任务，显示空状态
  if (categoryGroups.length === 0 && ungroupedTasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-lg mb-2">暂无任务</p>
        <p className="text-sm">点击&ldquo;创建新事物&rdquo;开始添加任务</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* 分组任务 - 使用递归渲染支持多层嵌套 */}
      {categoryGroups.map((group) => renderCategoryGroup(group))}
      
      {/* 不分组的任务（时间黑洞、身体锻炼）：直接显示 */}
      {ungroupedTasks.length > 0 && (
        <div className="space-y-4">
          {renderTaskList(ungroupedTasks, handleTaskClone, onBeforeOperation)}
        </div>
      )}
      
      {/* 快速创建对话框（仅用于分类创建） */}
      {quickCreateDialog && quickCreateDialog.type === 'category' && (
        <QuickCreateDialog
          visible={quickCreateDialog.visible}
          type="category"
          categoryPath={quickCreateDialog.categoryPath}
          lastCategoryName={quickCreateDialog.lastCategoryName}
          userId={userId}
          onClose={() => setQuickCreateDialog(null)}
          onCreate={handleQuickCreate}
        />
      )}
      
      {/* 复制任务模态框（使用 CreateLogModal） */}
      <CreateLogModal
        isOpen={cloneModalOpen}
        onClose={() => setCloneModalOpen(false)}
        onAddToTimer={handleCloneTask}
        initialCategory={cloneTaskCategory}
      />
    </div>
  );
};

export default CategoryZoneWrapper;

