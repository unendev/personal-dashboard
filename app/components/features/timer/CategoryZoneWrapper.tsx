'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/app/components/ui/card';
import CategoryZoneHeader from './CategoryZoneHeader';
import QuickCreateDialog, { QuickCreateData } from './QuickCreateDialog';
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
  onQuickCreate: (data: QuickCreateData) => Promise<void>;
  renderTaskList: (tasks: TimerTask[], onTaskClone: (task: TimerTask) => void) => React.ReactNode;
}

const CategoryZoneWrapper: React.FC<CategoryZoneWrapperProps> = ({
  tasks,
  userId = 'user-1',
  onQuickCreate,
  renderTaskList
}) => {
  // 折叠状态
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  // 快速创建对话框状态
  const [quickCreateDialog, setQuickCreateDialog] = useState<{
    visible: boolean;
    type: 'category' | 'clone';
    categoryPath: string;
    instanceTag?: string | null;
    sourceName?: string;
  } | null>(null);
  
  // 加载折叠状态
  useEffect(() => {
    const saved = loadCollapsedCategories();
    setCollapsedCategories(saved);
  }, []);
  
  // 分组任务
  const categoryGroups = useMemo(() => {
    return groupTasksByCategory(tasks);
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
      categoryPath
    });
  };
  
  // 处理快速创建
  const handleQuickCreate = async (data: QuickCreateData) => {
    await onQuickCreate(data);
    setQuickCreateDialog(null);
  };
  
  // 打开任务级复制创建对话框
  const handleTaskClone = (task: TimerTask) => {
    setQuickCreateDialog({
      visible: true,
      type: 'clone',
      categoryPath: task.categoryPath,
      instanceTag: task.instanceTag,
      sourceName: task.name
    });
  };
  
  // 如果没有任务，显示空状态
  if (categoryGroups.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-lg mb-2">暂无任务</p>
        <p className="text-sm">点击"创建新事物"开始添加任务</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {categoryGroups.map((group) => {
        const isCollapsed = collapsedCategories.has(group.categoryPath);
        
        return (
          <Card 
            key={group.categoryPath}
            className="overflow-hidden border-2 hover:shadow-lg transition-shadow duration-200"
          >
            {/* 区域头部 */}
            <CategoryZoneHeader
              group={group}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => toggleCategoryCollapse(group.categoryPath)}
              onQuickCreate={() => handleCategoryQuickCreate(group.categoryPath)}
            />
            
            {/* 任务列表（展开时显示） */}
            {!isCollapsed && (
              <div className="p-4">
                {renderTaskList(group.tasks, handleTaskClone)}
              </div>
            )}
          </Card>
        );
      })}
      
      {/* 快速创建对话框 */}
      {quickCreateDialog && (
        <QuickCreateDialog
          visible={quickCreateDialog.visible}
          type={quickCreateDialog.type}
          categoryPath={quickCreateDialog.categoryPath}
          instanceTag={quickCreateDialog.instanceTag}
          sourceName={quickCreateDialog.sourceName}
          userId={userId}
          onClose={() => setQuickCreateDialog(null)}
          onCreate={handleQuickCreate}
        />
      )}
    </div>
  );
};

export default CategoryZoneWrapper;

