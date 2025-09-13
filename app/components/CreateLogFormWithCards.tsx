'use client'

import React, { useState } from 'react';
// import { createLog } from '@/app/actions';
// import { getBeijingTime } from '@/lib/utils';
import CategorySelector from './CategorySelector';
// import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface CreateLogFormWithCardsProps {
  onLogSaved?: () => void;
  onAddToTimer?: (taskName: string, categoryPath: string, initialTime?: number, instanceTagNames?: string) => void;
}

export default function CreateLogFormWithCards({ onLogSaved, onAddToTimer }: CreateLogFormWithCardsProps) {
  const [isLoading] = useState(false);
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
    <div className="space-y-8">
      {/* 页面标题和说明 */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">创建新事物</h2>
        <p className="text-gray-600">选择分类快速创建任务，或手动输入内容</p>
      </div>

      {/* 分类选择区域 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">📋</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">快速分类创建</h3>
        </div>
        <CategorySelector 
          onLogSaved={onLogSaved}
          onAddToTimer={onAddToTimer}
          className="mb-4"
        />
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-100 rounded-lg p-3">
          <span className="text-lg">💡</span>
          <span>点击分类按钮快速创建任务（默认使用分类名），或点击🕳️按钮直接创建时间黑洞</span>
        </div>
      </div>

      {/* 手动输入区域 */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">✏️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">手动记录</h3>
        </div>
        <div className="space-y-4">
          <Textarea
            value={logContent}
            onChange={(e) => setLogContent(e.target.value)}
            rows={4}
            placeholder="在这里输入你想做的事情..."
            className="w-full border-green-200 focus:border-green-400 focus:ring-green-400 rounded-xl resize-none"
          />
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 rounded-lg p-3">
            <span className="text-lg">⚡</span>
            <span>输入内容后点击下方按钮，将自动添加到计时器区域</span>
          </div>
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !logContent.trim()}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          size="lg"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>添加中...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg">⏱️</span>
              <span>添加到计时器</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}
