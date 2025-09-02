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
  onAddToTimer?: (taskName: string, categoryPath: string) => void;
}

export default function CreateLogFormWithCards({ onLogSaved, onAddToTimer }: CreateLogFormWithCardsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [logContent, setLogContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 日志区域不再保存，只记录事物到计时器区域
    if (!logContent.trim()) {
      alert('请输入日志内容');
      return;
    }

    // 将日志内容作为事物添加到计时器区域
    if (onAddToTimer) {
      onAddToTimer(logContent.trim(), '日志记录');
      setLogContent('');
      alert('已添加到计时器区域');
    } else {
      alert('无法添加到计时器区域');
    }
  };

  return (
    <div className="space-y-6">
      {/* 分类选择区域 - 现在可以直接创建日志 */}
      <Card>
        <CardHeader>
          <CardTitle>快速添加事物</CardTitle>
        </CardHeader>
        <CardContent>
          <CategorySelector 
            onLogSaved={onLogSaved}
            onAddToTimer={onAddToTimer}
            className="mb-4"
          />
          <p className="text-sm text-gray-600 mt-4">
            点击上面的卡片按钮，可以将事物添加到计时器区域进行时间管理
          </p>
        </CardContent>
      </Card>

      {/* 日志内容区域 */}
      <Card>
        <CardHeader>
          <CardTitle>记录事物</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={logContent}
            onChange={(e) => setLogContent(e.target.value)}
            rows={4}
            placeholder="记录你想做的事情，将自动添加到计时器区域..."
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* 提交按钮 */}
      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? '添加中...' : '添加到计时器'}
      </Button>
    </div>
  );
}
