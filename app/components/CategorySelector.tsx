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
        // 清除缓存，强制重新加载
        CategoryCache.clear();
        
        // 直接从API加载数据
        const response = await fetch('/api/log-categories');
        if (response.ok) {
          const data = await response.json();
          console.log('API返回的分类数据:', data);
          setCategories(Array.isArray(data) ? data : []);
        } else {
          console.error('API请求失败:', response.status);
          setCategories([]);
        }
      } catch (e) {
        console.error('加载分类失败', e);
        setCategories([]);
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

  // 时间黑洞直接创建功能 - 使用分类名作为任务名
  const handleTimeHoleCreate = async (topName: string, midName: string, subName: string) => {
    const path = `${topName}/${midName}/${subName}`;
    const taskName = subName || midName || topName; // 使用最具体的分类名作为任务名
    
    // 直接创建时间黑洞任务，不需要用户输入
    await handleOptimisticAddToTimer(taskName, path, 0);
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
        const newCategories = Array.isArray(result.categories) ? result.categories : [];
        setCategories(newCategories);
        // 更新全局缓存
        CategoryCache.updateCategories(newCategories);
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
        const newCategories = Array.isArray(result.categories) ? result.categories : [];
        setCategories(newCategories);
        // 更新全局缓存
        CategoryCache.updateCategories(newCategories);
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

  // 如果没有分类或分类不是数组，显示空状态
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
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
      {/* 分类网格布局 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {categories.map((topCategory) => (
          <Card key={topCategory.name} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="relative overflow-hidden">
              {/* 背景装饰 */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <CardTitle className="relative text-lg font-bold text-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    {topCategory.name.charAt(0)}
                  </div>
                  <span>{topCategory.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full w-8 h-8 p-0"
                    onClick={() => handleCreateCategory('mid', topCategory.name)}
                    title="添加子分类"
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full w-8 h-8 p-0"
                    onClick={() => handleDeleteCategory('top', '', topCategory.name)}
                    title="删除分类"
                  >
                    ×
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 space-y-3 overflow-hidden">
              {/* 中类卡片 */}
              <div className="space-y-3">
                {topCategory.children?.map((midCategory) => (
                  <div key={midCategory.name} className="bg-gray-50/50 rounded-xl p-2 md:p-3 hover:bg-gray-100/50 transition-colors overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">{midCategory.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full w-6 h-6 p-0 text-xs"
                          onClick={() => handleCreateCategory('sub', `${topCategory.name}/${midCategory.name}`)}
                          title="添加子分类"
                        >
                          +
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full w-6 h-6 p-0 text-xs"
                          onClick={() => handleDeleteCategory('mid', topCategory.name, midCategory.name)}
                          title="删除"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                    {/* 子类按钮 */}
                    <div className="flex flex-wrap gap-1 md:gap-2 overflow-x-auto">
                      {midCategory.children?.map((subCategory) => (
                        <div key={subCategory.name} className="relative group flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`text-xs hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 rounded-lg min-w-0 ${
                              topCategory.name === '时间黑洞' ? 'pr-8 md:pr-10' : 'pr-6 md:pr-8'
                            }`}
                            onClick={() => handleSubCategoryClick(topCategory.name, midCategory.name, subCategory.name)}
                          >
                            <span className="truncate">{subCategory.name}</span>
                          </Button>
                          {/* 只在时间黑洞分类的第三层级显示时间黑洞按钮 */}
                          {topCategory.name === '时间黑洞' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 active:bg-purple-100 text-xs opacity-0 group-hover:opacity-100 group-active:opacity-100 md:group-hover:opacity-100 transition-opacity rounded-full w-5 h-5 md:w-6 md:h-6 p-0 z-10 touch-manipulation"
                              onClick={() => handleTimeHoleCreate(topCategory.name, midCategory.name, subCategory.name)}
                              title="时间黑洞"
                            >
                              🕳️
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`absolute top-1/2 -translate-y-1/2 text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 text-xs opacity-0 group-hover:opacity-100 group-active:opacity-100 md:group-hover:opacity-100 transition-opacity rounded-full w-5 h-5 md:w-6 md:h-6 p-0 z-10 touch-manipulation ${
                              topCategory.name === '时间黑洞' ? 'right-6 md:right-8' : 'right-1'
                            }`}
                            onClick={() => handleDeleteCategory('sub', `${topCategory.name}/${midCategory.name}`, subCategory.name)}
                            title="删除"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      {/* 如果中类没有子类，显示通用按钮 */}
                      {(!midCategory.children || midCategory.children.length === 0) && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs hover:bg-blue-50 hover:border-blue-300 rounded-lg"
                            onClick={() => handleSubCategoryClick(topCategory.name, midCategory.name, '')}
                          >
                            创建任务
                          </Button>
                          {/* 只在时间黑洞分类显示时间黑洞按钮 */}
                          {topCategory.name === '时间黑洞' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs hover:bg-purple-50 hover:border-purple-300 text-purple-600 rounded-lg"
                              onClick={() => handleTimeHoleCreate(topCategory.name, midCategory.name, '')}
                              title="时间黑洞"
                            >
                              🕳️ 时间黑洞
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 输入任务名称和时间的弹框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">⚡</span>
              </div>
              快速创建任务
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-700 font-medium mb-2">分类路径</p>
              <p className="text-blue-600 font-semibold">{selectedPath}</p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                任务名称
              </label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入具体任务名称..."
                className="border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                时间消耗 (可选)
              </label>
              <Input
                value={duration}
                onChange={handleDurationChange}
                onKeyDown={handleKeyDown}
                placeholder="如: 45m, 1h20m, 2h (为空则使用计时器)"
                className="border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowDialog(false)}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button 
              variant="default" 
              onClick={handleSubmitWithFormat} 
              disabled={!taskName.trim()}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl px-6"
            >
              ⏱️ 添加到计时器
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">⚠️</span>
              </div>
              确认删除
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-sm text-red-700 font-medium mb-2">即将删除</p>
              <p className="text-red-600 font-semibold">{deleteTarget?.name}</p>
              <p className="text-xs text-red-500 mt-2">
                删除后无法恢复，请谨慎操作。
              </p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-6"
            >
              🗑️ 确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建分类对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">➕</span>
              </div>
              创建新分类
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                分类名称
              </label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="输入分类名称..."
                className="border-gray-200 focus:border-green-400 focus:ring-green-400 rounded-xl"
                autoFocus
              />
            </div>
            {createType !== 'top' && (
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-green-700 font-medium mb-2">父级分类</p>
                <p className="text-green-600 font-semibold">{createParentPath}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button 
              variant="default" 
              onClick={confirmCreate} 
              disabled={!newCategoryName.trim()}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl px-6"
            >
              ➕ 创建分类
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategorySelector;


