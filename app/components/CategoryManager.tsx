'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { createLog } from '@/app/actions';

type CategoryNode = {
  name: string;
  children?: CategoryNode[];
};

interface CategoryManagerProps {
  className?: string;
  onLogSaved?: () => void;
  onSelected?: (path: string, taskName: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ className, onLogSaved, onSelected }) => {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [taskName, setTaskName] = useState('');
  const [duration, setDuration] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: string, path: string, name: string} | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/log-categories');
        const data = await res.json();
        setCategories(data as CategoryNode[]);
      } catch (e) {
        console.error('加载分类失败', e);
      }
    };
    load();
  }, []);

  const handleSubCategoryClick = (topName: string, midName: string, subName: string) => {
    const path = `${topName}/${midName}/${subName}`;
    setSelectedPath(path);
    setTaskName(subName || '');
    setShowDialog(true);
  };

  const handleDeleteCategory = (type: string, path: string, name: string) => {
    setDeleteTarget({ type, path, name });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    // 这里应该调用API来删除分类
    // 暂时只是从本地状态中移除
    console.log('删除分类:', deleteTarget);
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    
    // TODO: 实现实际的删除逻辑
    alert('删除功能待实现');
  };

  const handleSubmit = async () => {
    if (!taskName.trim()) {
      alert('请输入任务名称');
      return;
    }

    if (onSelected) {
      onSelected(selectedPath, taskName.trim());
      setShowDialog(false);
      setTaskName('');
      setSelectedPath('');
      return;
    }

    setIsLoading(true);
    try {
      const pathParts = selectedPath.split('/');
      const categories = [{
        name: pathParts[0] || '',
        subCategories: [{
          name: pathParts[1] || '',
          activities: [{
            name: pathParts[2] || taskName,
            duration: duration || '0h'
          }]
        }]
      }];

      const formData = new FormData();
      formData.append('categories', JSON.stringify(categories));
      formData.append('content', '');
      // 使用北京时间 (UTC+8)
      const now = new Date();
      const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      formData.append('timestamp', beijingTime.toISOString());

      await createLog(formData);
      
      setTaskName('');
      setDuration('');
      setShowDialog(false);
      
      if (onLogSaved) {
        onLogSaved();
      }
    } catch (error) {
      console.error('创建日志失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={className}>
      {/* 分类卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((topCategory) => (
          <Card key={topCategory.name} className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="text-lg font-bold text-gray-800 flex justify-between items-center">
                {topCategory.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeleteCategory('top', '', topCategory.name)}
                >
                  删除
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3">
                {topCategory.children?.map((midCategory) => (
                  <Card key={midCategory.name} className="border border-gray-200 hover:border-blue-300 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                        {midCategory.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                          onClick={() => handleDeleteCategory('mid', topCategory.name, midCategory.name)}
                        >
                          删除
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
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

      {/* 任务输入弹框 */}
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
                onChange={(e) => setDuration(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例如: 2h30m, 45m"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={!taskName.trim() || isLoading}>
              {isLoading ? '保存中...' : '保存记录'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              确定要删除 {'"'}{deleteTarget?.name}{'"'} 吗？此操作不可撤销。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManager;
