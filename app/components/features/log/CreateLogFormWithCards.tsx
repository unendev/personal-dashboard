'use client'

import React, { useState } from 'react';
// import { createLog } from '@/app/actions';
// import { getBeijingTime } from '@/lib/utils';
import CategorySelector from '../../shared/CategorySelector';
// import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';

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
    <div className="space-y-4">
      {/* 页面标题和说明 */}
      <div className="text-center space-y-3 mb-6">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800/80 dark:to-gray-700/80 rounded-2xl px-6 py-3 border border-blue-100 dark:border-gray-600/50 backdrop-blur-sm">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-lg">📝</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">创建新事物</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">选择分类快速创建任务，或手动输入内容</p>
          </div>
        </div>
      </div>

      {/* 2x2 网格布局 - PC端大屏幕优化 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左上：快速分类创建 */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50/30 dark:from-gray-800/80 dark:via-gray-700/60 dark:to-gray-600/40 rounded-2xl p-5 border border-blue-200/50 dark:border-gray-600/50 lg:col-span-2 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          {/* 装饰性背景 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 dark:from-blue-400/20 dark:to-purple-400/20 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-400/10 to-blue-400/10 dark:from-indigo-400/20 dark:to-blue-400/20 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-sm">📋</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">快速分类创建</h3>
            </div>
            <CategorySelector 
              onLogSaved={onLogSaved}
              onAddToTimer={onAddToTimer}
              className="mb-4"
            />
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/30 backdrop-blur-sm rounded-xl p-3 border border-blue-200/50 dark:border-blue-700/50">
              <span className="text-lg">💡</span>
              <span className="font-medium">点击分类按钮快速创建任务，或点击🕳️按钮直接创建时间黑洞</span>
            </div>
          </div>
        </div>

        {/* 左下：手动输入区域 */}
        <div className="bg-gradient-to-br from-green-50 via-emerald-50/50 to-teal-50/30 dark:from-gray-800/80 dark:via-gray-700/60 dark:to-gray-600/40 rounded-2xl p-5 border border-green-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          {/* 装饰性背景 */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400/10 to-emerald-400/10 dark:from-green-400/20 dark:to-emerald-400/20 rounded-full -translate-y-10 translate-x-10"></div>
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-sm">✏️</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">手动记录</h3>
            </div>
            <div className="space-y-4">
              <Textarea
                value={logContent}
                onChange={(e) => setLogContent(e.target.value)}
                rows={4}
                placeholder="在这里输入你想做的事情..."
                className="w-full border-green-200 dark:border-gray-600 focus:border-green-400 dark:focus:border-green-500 focus:ring-green-400 dark:focus:ring-green-500 rounded-xl resize-none bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm shadow-sm focus:shadow-md transition-all duration-200 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400"
              />
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 bg-green-100/80 dark:bg-green-900/30 backdrop-blur-sm rounded-xl p-3 border border-green-200/50 dark:border-green-700/50">
                <span className="text-lg">⚡</span>
                <span className="font-medium">输入内容后点击按钮添加到计时器</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右下：操作按钮区域 */}
        <div className="bg-gradient-to-br from-purple-50 via-pink-50/50 to-rose-50/30 dark:from-gray-800/80 dark:via-gray-700/60 dark:to-gray-600/40 rounded-2xl p-5 border border-purple-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-center">
          {/* 装饰性背景 */}
          <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 dark:from-purple-400/20 dark:to-pink-400/20 rounded-full -translate-y-12 -translate-x-12"></div>
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-sm">⚡</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">快速操作</h3>
            </div>
            <div className="space-y-4">
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !logContent.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                size="default"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>添加中...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏱️</span>
                    <span>添加到计时器</span>
                  </div>
                )}
              </Button>
              <div className="text-sm text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-900/30 backdrop-blur-sm rounded-xl p-3 border border-purple-200/50 dark:border-purple-700/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <span className="font-medium">选择分类或手动输入后点击按钮</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



