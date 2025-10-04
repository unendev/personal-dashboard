'use client'

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Checkbox } from '@/app/components/ui/checkbox';
import InstanceTagSelector from '@/app/components/shared/InstanceTagSelector';
import { parseTimeToSeconds, loadAutoStartPreference, saveAutoStartPreference } from '@/lib/timer-utils';

export interface QuickCreateData {
  name: string;
  categoryPath: string;
  instanceTagNames: string[];
  initialTime: number;
  autoStart: boolean;
}

interface QuickCreateDialogProps {
  visible: boolean;
  type: 'category' | 'clone';
  categoryPath: string;
  instanceTag?: string | null;
  sourceName?: string;
  userId?: string;
  onClose: () => void;
  onCreate: (data: QuickCreateData) => void;
}

const QuickCreateDialog: React.FC<QuickCreateDialogProps> = ({
  visible,
  type,
  categoryPath,
  instanceTag,
  sourceName,
  userId = 'user-1',
  onClose,
  onCreate
}) => {
  const [taskName, setTaskName] = useState('');
  const [initialTime, setInitialTime] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [autoStart, setAutoStart] = useState(true);
  
  // 初始化表单数据
  useEffect(() => {
    if (visible) {
      // 加载自动计时偏好
      setAutoStart(loadAutoStartPreference());
      
      if (type === 'clone' && sourceName) {
        // 复制模式：使用原任务名 + " - 副本"
        setTaskName(`${sourceName} - 副本`);
      } else {
        setTaskName('');
      }
      
      // 设置标签
      if (instanceTag) {
        setSelectedTags([instanceTag]);
      } else {
        setSelectedTags([]);
      }
      
      setInitialTime('');
    }
  }, [visible, type, sourceName, instanceTag]);
  
  const handleSubmit = () => {
    if (!taskName.trim()) {
      alert('请输入任务名称');
      return;
    }
    
    // 保存自动计时偏好
    saveAutoStartPreference(autoStart);
    
    onCreate({
      name: taskName.trim(),
      categoryPath,
      instanceTagNames: selectedTags,
      initialTime: parseTimeToSeconds(initialTime),
      autoStart
    });
    
    // 重置表单
    setTaskName('');
    setInitialTime('');
    setSelectedTags([]);
    onClose();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">
              {type === 'category' ? '⚡' : '📋'}
            </span>
            {type === 'category' ? '快速创建任务' : '复制创建任务'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 原任务信息（仅复制模式） */}
          {type === 'clone' && sourceName && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-medium">复制自：</span>{sourceName}
              </p>
            </div>
          )}
          
          {/* 分类路径（只读） */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              分类路径
            </label>
            <Input
              value={categoryPath || '未分类'}
              disabled
              className="mt-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            />
          </div>
          
          {/* 任务名称 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              任务名称 <span className="text-red-500">*</span>
            </label>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入任务名称"
              className="mt-1"
              autoFocus
            />
          </div>
          
          {/* 初始时间 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              初始时间 <span className="text-gray-500 font-normal">(可选)</span>
            </label>
            <Input
              value={initialTime}
              onChange={(e) => setInitialTime(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="如: 30m, 1h20m, 2h"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              支持格式：1h30m、45m、2h
            </p>
          </div>
          
          {/* 事物项标签 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              事物项标签 <span className="text-gray-500 font-normal">(可选)</span>
            </label>
            <InstanceTagSelector
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              userId={userId}
            />
          </div>
          
          {/* 自动开始计时选项 */}
          <div className="flex items-center space-x-2 pt-2 pb-1">
            <Checkbox
              id="auto-start"
              checked={autoStart}
              onCheckedChange={(checked) => setAutoStart(checked === true)}
            />
            <label
              htmlFor="auto-start"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
            >
              创建后自动开始计时
            </label>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="rounded-xl"
          >
            取消
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!taskName.trim()}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl px-6"
          >
            {autoStart ? '⏱️ 创建并开始' : '✅ 创建'}
          </Button>
        </DialogFooter>
        
        {/* 键盘提示 */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center pb-2">
          按 Ctrl/Cmd + Enter 快速创建
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickCreateDialog;

