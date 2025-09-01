'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';

type CategoryNode = {
  name: string;
  children?: CategoryNode[];
};

interface CategorySelectorProps {
  onSelected: (classificationPath: string, taskName: string) => void;
  className?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelected, className }) => {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [taskName, setTaskName] = useState('');

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
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (taskName.trim()) {
      onSelected(selectedPath, taskName.trim());
      setShowDialog(false);
      setTaskName('');
      setSelectedPath('');
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
      {/* 4个大类卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((topCategory) => (
          <Card key={topCategory.name} className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="text-lg font-bold text-gray-800">
                {topCategory.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {/* 中类卡片 */}
              <div className="grid grid-cols-1 gap-3">
                {topCategory.children?.map((midCategory) => (
                  <Card key={midCategory.name} className="border border-gray-200 hover:border-blue-300 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-gray-700">
                        {midCategory.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* 子类按钮 */}
                      <div className="flex flex-wrap gap-2">
                        {midCategory.children?.map((subCategory) => (
                          <Button
                            key={subCategory.name}
                            variant="outline"
                            size="sm"
                            className="text-xs hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => handleSubCategoryClick(topCategory.name, midCategory.name, subCategory.name)}
                          >
                            {subCategory.name}
                          </Button>
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

      {/* 输入任务名称的弹框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建任务</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-3">
              在 <span className="font-medium text-blue-600">{selectedPath}</span> 下创建任务
            </p>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入具体事物名称..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={!taskName.trim()}>
              创建并开始
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategorySelector;


