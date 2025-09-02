'use client'

import React, { useState } from 'react';
import { createLog } from '@/app/actions';
import { getBeijingTime } from '@/lib/utils';
import CategorySelector from './CategorySelector';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface CreateLogFormWithCardsProps {
  onLogSaved?: () => void;
}

export default function CreateLogFormWithCards({ onLogSaved }: CreateLogFormWithCardsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [logContent, setLogContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logContent.trim()) {
      alert('请输入日志内容');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', logContent);
      // 使用北京时间
      const beijingTime = getBeijingTime();
      formData.append('timestamp', beijingTime.toISOString());

      await createLog(formData);
      
      // 重置表单
      setLogContent('');
      
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
      {/* 分类选择区域 - 现在可以直接创建日志 */}
      <Card>
        <CardHeader>
          <CardTitle>快速记录活动</CardTitle>
        </CardHeader>
        <CardContent>
          <CategorySelector 
            onLogSaved={onLogSaved}
            className="mb-4"
          />
          <p className="text-sm text-gray-600 mt-4">
            点击上面的卡片按钮，可以直接记录你的活动和时间消耗
          </p>
        </CardContent>
      </Card>

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
        disabled={isLoading || !logContent.trim()}
        className="w-full"
        size="lg"
      >
        {isLoading ? '保存中...' : '保存日志'}
      </Button>
    </div>
  );
}
