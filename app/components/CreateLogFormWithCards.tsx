'use client'

import React, { useState } from 'react';
import { createLog } from '@/app/actions';
import CategorySelector from './CategorySelector';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

interface CreateLogFormWithCardsProps {
  onLogSaved?: () => void;
}

export default function CreateLogFormWithCards({ onLogSaved }: CreateLogFormWithCardsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [logContent, setLogContent] = useState('');
  const [taskName, setTaskName] = useState('');
  const [duration, setDuration] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const handleCategorySelected = (path: string, name: string) => {
    setSelectedPath(path);
    setTaskName(name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPath || !taskName) {
      alert('请选择分类并输入任务名称');
      return;
    }

    setIsLoading(true);
    try {
      // 构建分类数据
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
      formData.append('content', logContent);
      // 使用北京时间 (UTC+8)
      const now = new Date();
      const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      formData.append('timestamp', beijingTime.toISOString());

      await createLog(formData);
      
      // 重置表单
      setSelectedPath(null);
      setLogContent('');
      setTaskName('');
      setDuration('');
      setStartTime('');
      setEndTime('');
      
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

  return (
    <div className="space-y-6">
      {/* 分类选择区域 */}
      <Card>
        <CardHeader>
          <CardTitle>选择分类</CardTitle>
        </CardHeader>
        <CardContent>
                     <CategorySelector 
             onSelected={handleCategorySelected}
             className="mb-4"
           />
          {selectedPath && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm">
                已选择: <span className="font-medium">{selectedPath}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 任务输入区域 */}
      {selectedPath && (
        <Card>
          <CardHeader>
            <CardTitle>记录任务</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="taskName" className="block text-sm font-medium text-gray-700 mb-1">
                任务名称
              </label>
              <Input
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder={`在 ${selectedPath} 下输入具体任务名称`}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                耗时 (可选)
              </label>
              <Input
                type="text"
                placeholder="例如: 2h30m"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  开始时间
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  结束时间
                </label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 日志内容区域 */}
      <Card>
        <CardHeader>
          <CardTitle>日志内容 (可选)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={logContent}
            onChange={(e) => setLogContent(e.target.value)}
            rows={4}
            placeholder="记录今天做了什么，有什么收获或感受..."
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* 提交按钮 */}
      <Button
        onClick={handleSubmit}
        disabled={isLoading || !selectedPath || !taskName}
        className="w-full"
        size="lg"
      >
        {isLoading ? '保存中...' : '保存日志'}
      </Button>
    </div>
  );
}
