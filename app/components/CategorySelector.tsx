'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { createLog } from '@/app/actions';
import { getBeijingTime } from '@/lib/utils';
import { CategoryCache } from '@/app/lib/category-cache';

type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

interface CategorySelectorProps {
  className?: string;
  onLogSaved?: () => void;
  onSelected?: (path: string, taskName: string) => void; // 新增的回调
  onAddToTimer?: (taskName: string, categoryPath: string, initialTime?: number) => void; // 新增：添加到计时器的回调
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ className, onLogSaved, onSelected, onAddToTimer }) => {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [taskName, setTaskName] = useState('');
  const [duration, setDuration] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: string, path: string, name: string} | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'top' | 'mid' | 'sub'>('top');
  const [createParentPath, setCreateParentPath] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsCategoriesLoading(true);
      try {
        // 首先尝试从缓存获取
        if (CategoryCache.isReady()) {
          const cachedData = CategoryCache.getCategories();
          setCategories(cachedData);
          setIsCategoriesLoading(false);
          console.log('从缓存加载分类数据');
          return;
        }

        // 如果缓存未准备好，等待缓存准备完成
        const data = await CategoryCache.preload();
        setCategories(data);
        console.log('从API加载分类数据');
      } catch (e) {
        console.error('加载分类失败', e);
      } finally {
        setIsCategoriesLoading(false);
      }
    };
    load();
  }, []);

  const handleSubCategoryClick = (topName: string, midName: string, subName: string) => {
    const path = `${topName}/${midName}/${subName}`;
    setSelectedPath(path);
    // 任务名称默认为空，让用户手动输入
    setTaskName('');
    setShowDialog(true);
  };

  const handleDeleteCategory = (type: string, path: string, name: string) => {
    setDeleteTarget({ type, path, name });
    setShowDeleteConfirm(true);
  };

  const handleCreateCategory = (type: 'top' | 'mid' | 'sub', parentPath: string = '') => {
    setCreateType(type);
    setCreateParentPath(parentPath);
    setShowCreateDialog(true);
  };

  const confirmCreate = async () => {
    if (!newCategoryName.trim()) {
      alert('请输入分类名称');
      return;
    }

    try {
      const response = await fetch('/api/log-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: createType,
          parentPath: createParentPath,
          name: newCategoryName.trim()
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setCategories(result.categories);
        // 更新全局缓存
        CategoryCache.updateCategories(result.categories);
        setShowCreateDialog(false);
        setNewCategoryName('');
        setCreateParentPath('');
      } else {
        throw new Error('创建失败');
      }
    } catch (error) {
      console.error('创建分类失败:', error);
      alert('创建失败，请重试');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      const response = await fetch('/api/log-categories', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteTarget),
      });
      
      if (response.ok) {
        const result = await response.json();
        setCategories(result.categories);
        // 更新全局缓存
        CategoryCache.updateCategories(result.categories);
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 乐观更新：立即添加到计时器，然后异步处理数据库操作
  const handleOptimisticAddToTimer = async (taskName: string, categoryPath: string, initialTime: number = 0) => {
    // 立即调用回调，给用户即时反馈
    if (onAddToTimer) {
      onAddToTimer(taskName, categoryPath, initialTime);
    }

    // 如果提供了选择回调，也立即调用
    if (onSelected) {
      onSelected(categoryPath, taskName);
    }

    // 重置表单
    setTaskName('');
    setDuration('');
    setShowDialog(false);
    
    // 调用保存回调
    if (onLogSaved) {
      onLogSaved();
    }

    // 显示成功消息
    alert('任务已添加到计时器！');

    // 后台异步处理数据库操作
    try {
      // 构建分类数据
      const pathParts = categoryPath.split('/');
      const categories = [{
        name: pathParts[0] || '',
        subCategories: [{
          name: pathParts[1] || '',
          activities: [{
            name: pathParts[2] || taskName,
            duration: initialTime ? `${Math.floor(initialTime / 60)}m` : '0m'
          }]
        }]
      }];

      const formData = new FormData();
      formData.append('content', taskName);
      formData.append('categories', JSON.stringify(categories));
      formData.append('timestamp', getBeijingTime().toISOString());

      // 异步创建日志记录（不阻塞UI）
      createLog(formData).catch(error => {
        console.error('后台保存日志失败:', error);
        // 可以选择显示一个不显眼的错误提示
      });
    } catch (error) {
      console.error('后台处理失败:', error);
      // 不影响用户体验，只在控制台记录错误
    }
  };

  // 解析时间格式（支持 "1h20m", "45m", "2h" 等格式）并转换为秒数
  const parseTimeToSeconds = (timeStr: string): number => {
    const hours = timeStr.match(/(\d+)h/);
    const minutes = timeStr.match(/(\d+)m/);
    
    const hoursNum = hours ? parseInt(hours[1]) : 0;
    const minutesNum = minutes ? parseInt(minutes[1]) : 0;
    
    return hoursNum * 3600 + minutesNum * 60;
  };



  // 处理时间输入
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDuration(value);
  };

  // 在提交时转换时间格式 - 使用乐观更新
  const handleSubmitWithFormat = async () => {
    if (!taskName.trim()) {
      alert('请输入任务名称');
      return;
    }

    // 解析时间输入并转换为秒数
    const initialTimeSeconds = parseTimeToSeconds(duration);

    // 使用乐观更新：立即添加到计时器，然后异步处理数据库操作
    await handleOptimisticAddToTimer(taskName.trim(), selectedPath, initialTimeSeconds);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitWithFormat();
    }
  };

  // 如果正在加载分类，显示加载状态
  if (isCategoriesLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">加载分类中...</p>
        </div>
      </div>
    );
  }

  // 如果没有分类，显示空状态
  if (categories.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm mb-4">暂无分类，请先创建分类</p>
          <Button
            onClick={() => handleCreateCategory('top')}
            variant="category"
            size="sm"
          >
            ➕ 创建顶级分类
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 创建顶级分类按钮 */}
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">分类管理</h3>
        <Button
          onClick={() => handleCreateCategory('top')}
          variant="category"
          size="sm"
        >
          ➕ 创建顶级分类
        </Button>
      </div>
      
      {/* 4个大类卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((topCategory) => (
          <Card key={topCategory.name} className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="text-lg font-bold text-gray-800 flex justify-between items-center">
                {topCategory.name}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleCreateCategory('mid', topCategory.name)}
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteCategory('top', '', topCategory.name)}
                  >
                    删除
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {/* 中类卡片 */}
              <div className="grid grid-cols-1 gap-3">
                {topCategory.children?.map((midCategory) => (
                  <Card key={midCategory.name} className="border border-gray-200 hover:border-blue-300 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                        {midCategory.name}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs"
                            onClick={() => handleCreateCategory('sub', `${topCategory.name}/${midCategory.name}`)}
                          >
                            +
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                            onClick={() => handleDeleteCategory('mid', topCategory.name, midCategory.name)}
                          >
                            删除
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* 子类按钮 */}
                      <div className="flex flex-wrap gap-2">
                        {midCategory.children?.map((subCategory) => (
                          <div key={subCategory.name} className="relative group">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs hover:bg-blue-50 hover:border-blue-300 pr-8"
                              onClick={() => handleSubCategoryClick(topCategory.name, midCategory.name, subCategory.name)}
                            >
                              {subCategory.name}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteCategory('sub', `${topCategory.name}/${midCategory.name}`, subCategory.name)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                        {/* 如果中类没有子类，显示一个通用按钮 */}
                        {(!midCategory.children || midCategory.children.length === 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => handleSubCategoryClick(topCategory.name, midCategory.name, '')}
                          >
                            直接创建任务
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 输入任务名称和时间的弹框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>快速记录</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-600">
              在 <span className="font-medium text-blue-600">{selectedPath}</span> 下记录活动
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                任务名称
              </label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入具体事物名称..."
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                时间消耗 (可选)
              </label>
              <Input
                value={duration}
                onChange={handleDurationChange}
                onKeyDown={handleKeyDown}
                placeholder="如: 45m, 1h20m, 2h (为空则使用计时器)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button variant="timer" onClick={handleSubmitWithFormat} disabled={!taskName.trim()}>
              ⏱️ 添加到计时器
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              确定要删除分类 <span className="font-medium text-red-600">{deleteTarget?.name}</span> 吗？
            </p>
            <p className="text-xs text-gray-500 mt-2">
              删除后无法恢复，请谨慎操作。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              取消
            </Button>
            <Button variant="delete" onClick={confirmDelete}>
              🗑️ 确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建分类对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新分类</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类名称
              </label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="输入分类名称..."
                autoFocus
              />
            </div>
            {createType !== 'top' && (
              <p className="text-sm text-gray-600">
                将在 <span className="font-medium text-blue-600">{createParentPath}</span> 下创建新分类
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button variant="category" onClick={confirmCreate} disabled={!newCategoryName.trim()}>
              ➕ 创建分类
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategorySelector;


