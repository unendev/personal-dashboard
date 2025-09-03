'use client'

import React, { useState, useEffect } from 'react';
// import { createLog } from '@/app/actions';
// import { getBeijingTime } from '@/lib/utils';
import CategorySelector from './CategorySelector';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface CreateLogFormWithCardsProps {
  onLogSaved?: () => void;
  onAddToTimer?: (taskName: string, categoryPath: string, initialTime?: number) => void;
}

export default function CreateLogFormWithCards({ onLogSaved, onAddToTimer }: CreateLogFormWithCardsProps) {
  const [isLoading] = useState(false);
  const [logContent, setLogContent] = useState('');
  const [isCategorySelectorReady, setIsCategorySelectorReady] = useState(false);

  // 预加载分类数据
  useEffect(() => {
    const preloadCategories = async () => {
      try {
        // 预加载分类数据到缓存
        await fetch('/api/log-categories');
        setIsCategorySelectorReady(true);
      } catch (error) {
        console.error('预加载分类失败:', error);
        setIsCategorySelectorReady(true); // 即使失败也设置为ready，让用户看到错误状态
      }
    };

    preloadCategories();
  }, []);

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
          {isCategorySelectorReady ? (
            <CategorySelector 
              onLogSaved={onLogSaved}
              onAddToTimer={onAddToTimer}
              className="mb-4"
            />
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">加载分类中...</p>
            </div>
          )}
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
