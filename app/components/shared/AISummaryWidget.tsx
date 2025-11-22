'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

interface AISummary {
  summary: string;
  totalTime: number;
  taskCount: number;
  insights: string[];
  categories: Record<string, number>;
  isFromCache?: boolean;
}

interface AISummaryWidgetProps {
  userId?: string;
  date?: string;
  compact?: boolean; // 紧凑模式，用于在日志页面中显示
}

const AISummaryWidget: React.FC<AISummaryWidgetProps> = ({ 
  userId = 'user-1', 
  date = typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '2024-01-01',
  compact = false
}) => {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 计算前一天日期
  const getPreviousDay = (currentDate: string) => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  // 在紧凑模式下使用前一天日期，否则使用传入的日期
  const targetDate = compact ? getPreviousDay(date) : date;

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ai-summary?userId=${userId}&date=${targetDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch AI summary');
      }
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, targetDate]);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, date: targetDate }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate AI summary');
      }
      
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 当 userId 或 targetDate 改变时，重新获取数据
    fetchSummary();
  }, [userId, targetDate, fetchSummary]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  if (compact) {
    // 紧凑模式 - 用于日志页面
    if (loading && !summary) {
      return (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              🤖 前一天总结
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">加载中...</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card className="bg-gradient-to-r from-red-50 to-pink-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              🤖 前一天总结
              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">错误</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-red-600 text-sm mb-3">{error}</p>
              <button
                onClick={generateSummary}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
              >
                重新生成
              </button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!summary && !loading) {
      return (
        <Card className="bg-gradient-to-r from-gray-50 to-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              🤖 前一天总结
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">未生成</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-gray-600 text-sm mb-3">点击按钮生成前一天AI总结</p>
              <button
                onClick={generateSummary}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
              >
                生成总结
              </button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
              🤖 前一天总结
              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                {summary?.isFromCache ? '已缓存' : '实时生成'}
              </span>
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 主要总结 */}
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <p className="text-gray-900 text-sm leading-relaxed">{summary?.summary}</p>
          </div>

          {/* 统计数据 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center bg-white rounded-lg p-2 border border-green-200">
              <div className="text-lg font-bold text-blue-600">
                {formatTime(summary?.totalTime || 0)}
              </div>
              <div className="text-xs text-gray-600">总工作时间</div>
            </div>
            <div className="text-center bg-white rounded-lg p-2 border border-green-200">
              <div className="text-lg font-bold text-green-600">
                {summary?.taskCount || 0}
              </div>
              <div className="text-xs text-gray-600">任务数量</div>
            </div>
          </div>

          {/* AI 洞察 */}
          {summary?.insights && summary.insights.length > 0 && (
            <div>
              <h4 className="text-gray-800 font-medium mb-2 text-sm">💡 AI 洞察</h4>
              <div className="space-y-1">
                {summary.insights.slice(0, 2).map((insight, index) => (
                  <div key={index} className="flex items-start space-x-2 bg-white rounded-lg p-2 border border-green-200">
                    <span className="text-blue-500 text-xs mt-0.5">•</span>
                    <p className="text-gray-700 text-xs">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 重新生成按钮 */}
          <div className="text-center">
            <button
              onClick={generateSummary}
              className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 transition-colors"
            >
              重新生成
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 完整模式 - 原有功能保持不变
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI 昨日总结</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">正在生成总结...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            AI 昨日总结
            <span className="text-red-500 text-sm">错误</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <p className="text-red-600 mb-3">{error}</p>
            <button
              onClick={generateSummary}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              重新生成
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI 昨日总结</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">暂无总结数据</p>
            <button
              onClick={generateSummary}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              生成总结
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI 昨日总结
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
            {summary.isFromCache ? '已缓存' : '实时生成'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 主要总结 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-900 leading-relaxed">{summary.summary}</p>
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatTime(summary.totalTime)}
            </div>
            <div className="text-sm text-gray-600">总工作时间</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {summary.taskCount}
            </div>
            <div className="text-sm text-gray-600">任务数量</div>
          </div>
        </div>

        {/* AI 洞察 */}
        {summary.insights.length > 0 && (
          <div>
            <h4 className="text-gray-800 font-medium mb-2">AI 洞察</h4>
            <div className="space-y-2">
              {summary.insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">💡</span>
                  <p className="text-gray-700 text-sm">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 分类统计 */}
        {Object.keys(summary.categories).length > 0 && (
          <div>
            <h4 className="text-gray-800 font-medium mb-2">时间分配</h4>
            <div className="space-y-2">
              {Object.entries(summary.categories)
                .sort(([, a], [, b]) => b - a)
                .map(([category, time]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-gray-700 text-sm">{category}</span>
                    <span className="text-gray-600 text-sm">{formatTime(time)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 重新生成按钮 */}
        <div className="text-center pt-4">
          <button
            onClick={generateSummary}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            重新生成
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AISummaryWidget;



