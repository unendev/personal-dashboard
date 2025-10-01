'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { InstanceTagCache } from '@/app/lib/instance-tag-cache';

interface InstanceTag {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface InstanceTagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  userId?: string;
  className?: string;
}

const InstanceTagSelector: React.FC<InstanceTagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  userId = 'user-1',
  className = ''
}) => {
  const [availableTags, setAvailableTags] = useState<InstanceTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 加载可用的事务项
  useEffect(() => {
    const loadInstanceTags = async () => {
      setIsLoading(true);
      try {
        // 首先尝试从缓存加载
        const cachedData = InstanceTagCache.loadFromStorage();
        if (cachedData && cachedData.length > 0) {
          console.log('使用本地缓存的事务项数据:', cachedData.length);
          setAvailableTags(cachedData);
          setIsLoading(false);
          
          // 异步检查更新（不阻塞UI）
          checkForUpdates();
          return;
        }

        // 如果没有本地缓存，从API加载
        const tags = await InstanceTagCache.preload(userId);
        setAvailableTags(tags);
      } catch (error) {
        console.error('加载事务项失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 异步检查更新的函数
    const checkForUpdates = async () => {
      try {
        const response = await fetch(`/api/instance-tags?userId=${userId}`);
        if (response.ok) {
          const newData = await response.json();
          const currentData = InstanceTagCache.getInstanceTags();
          
          // 简单比较数据是否有变化（比较长度和第一个事务项名）
          const hasChanges = !currentData || 
            currentData.length !== newData.length ||
            (currentData.length > 0 && newData.length > 0 && 
             currentData[0].name !== newData[0].name);
          
          if (hasChanges) {
            console.log('检测到事务项数据更新，静默更新缓存');
            InstanceTagCache.updateInstanceTags(newData);
            setAvailableTags(newData);
          }
        }
      } catch (error) {
        console.log('检查事务项更新失败（不影响用户体验）:', error);
      }
    };

    loadInstanceTags();
  }, [userId]);

  // 创建新的事务项
  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      alert('请输入事务项名称');
      return;
    }

    // 确保以#开头
    const tagName = newTagName.trim().startsWith('#') ? newTagName.trim() : `#${newTagName.trim()}`;

    setIsCreating(true);
    try {
      const response = await fetch('/api/instance-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tagName,
          userId: userId
        }),
      });

      if (response.ok) {
        const newTag = await response.json();
        setAvailableTags(prev => [...prev, newTag]);
        
        // 更新缓存
        InstanceTagCache.addInstanceTag(newTag);
        
        setNewTagName('');
        setShowCreateDialog(false);
        
        // 自动选择新创建的事务项
        onTagsChange([...selectedTags, tagName]);
      } else {
        const errorData = await response.json();
        if (response.status === 409) {
          alert('该事务项已存在');
        } else {
          alert(`创建失败: ${errorData.error || '未知错误'}`);
        }
      }
    } catch (error) {
      console.error('创建事务项失败:', error);
      alert('创建失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  // 切换事务项选择状态
  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(tag => tag !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  // 删除事务项
  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`确定要删除事务项 "${tagName}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/instance-tags/${tagId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAvailableTags(prev => prev.filter(tag => tag.id !== tagId));
        onTagsChange(selectedTags.filter(tag => tag !== tagName));
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('删除事务项失败:', error);
      alert('删除失败，请重试');
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 标签选择区域 */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          事务项 (可选)
        </label>
        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-gray-200 rounded-lg bg-gray-50/50">
          {selectedTags.length === 0 ? (
            <span className="text-gray-400 text-sm">点击下方按钮选择事务项</span>
          ) : (
            selectedTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
              >
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  className="text-blue-500 hover:text-blue-700 ml-1"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* 可用事务项列表 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">可用事务项</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            + 新建
          </Button>
        </div>
        
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 text-sm mt-2">加载中...</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {availableTags.map(tag => (
              <div key={tag.id} className="relative group">
                <Button
                  variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTag(tag.name)}
                  className={`text-sm transition-all duration-200 ${
                    selectedTags.includes(tag.name)
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'hover:bg-blue-50 hover:border-blue-300'
                  }`}
                >
                  {tag.name}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-2 -right-2 w-5 h-5 p-0 bg-red-500 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-xs"
                  onClick={() => handleDeleteTag(tag.id, tag.name)}
                  title="删除"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建新事务项对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">#</span>
              </div>
              创建新事务项
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                事务项名称
              </label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="如: 个人门户, 修Bug, 论文写作..."
                className="border-gray-200 focus:border-green-400 focus:ring-green-400 rounded-xl"
                autoFocus
              />
              <p className="text-xs text-gray-500">
                系统会自动添加 # 前缀，如输入&ldquo;个人门户&rdquo;会创建&ldquo;#个人门户&rdquo;
              </p>
            </div>
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
              onClick={handleCreateTag} 
              disabled={!newTagName.trim() || isCreating}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl px-6"
            >
              {isCreating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>创建中...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg">#</span>
                  <span>创建事务项</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstanceTagSelector;



