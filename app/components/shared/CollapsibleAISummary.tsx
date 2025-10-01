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
  needsGeneration?: boolean;
}

interface CollapsibleAISummaryProps {
  userId?: string;
  date?: string;
}

const CollapsibleAISummary: React.FC<CollapsibleAISummaryProps> = ({ 
  userId = 'user-1', 
  date = typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '2024-01-01'
}) => {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 计算前一天日期
  const getPreviousDay = (currentDate: string) => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  // 在紧凑模式下使用前一天日期
  const targetDate = getPreviousDay(date);

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

  // 如果正在加载且没有数据
  if (loading && !summary) {
    return (
      <Card className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            🤖 前一天总结
            <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full">加载中...</span>
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

  // 如果有错误
  if (error) {
    return (
      <Card className="bg-gradient-to-r from-red-900/30 to-pink-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            🤖 前一天总结
            <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded-full">错误</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-400 text-sm mb-3">{error}</p>
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

  // 如果没有总结数据或需要生成
  if ((!summary && !loading) || (summary && summary.needsGeneration)) {
    return (
      <Card className="bg-gradient-to-r from-gray-900/30 to-slate-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            🤖 前一天总结
            <span className="text-xs bg-gray-800/50 text-gray-400 px-2 py-1 rounded-full">未生成</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm mb-3">
              {summary?.needsGeneration 
                ? "AI总结尚未生成，点击按钮手动生成" 
                : "点击按钮生成前一天AI总结"
              }
            </p>
            <button
              onClick={generateSummary}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '生成中...' : '生成总结'}
            </button>
            <p className="text-xs text-gray-400 mt-2">
              定时任务会在每天凌晨自动生成前一天的总结
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30">
      <CardHeader className="pb-3">
        <CardTitle 
          className="text-lg flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            🤖 前一天总结
            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full">
              {summary?.isFromCache ? '已缓存' : '实时生成'}
            </span>
          </div>
          <span className={`text-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </CardTitle>
      </CardHeader>
      
      {/* 折叠时显示的核心信息 */}
      {!isExpanded && summary && (
        <CardContent className="pt-0">
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-green-700/30">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">
                  {formatTime(summary.totalTime)}
                </div>
                <div className="text-xs text-gray-400">总工作时间</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">
                  {summary.taskCount}
                </div>
                <div className="text-xs text-gray-400">任务数量</div>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              点击展开查看详细分析
            </div>
          </div>
        </CardContent>
      )}

      {/* 展开时显示的详细信息 */}
      {isExpanded && summary && (
        <CardContent className="space-y-4">
          {/* 主要总结 */}
          <div className="bg-gray-800/50 rounded-lg p-3 border border-green-700/30">
            <p className="text-gray-200 text-sm leading-relaxed">{summary.summary}</p>
          </div>

          {/* 统计数据 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center bg-gray-800/50 rounded-lg p-2 border border-green-700/30">
              <div className="text-lg font-bold text-blue-400">
                {formatTime(summary.totalTime)}
              </div>
              <div className="text-xs text-gray-400">总工作时间</div>
            </div>
            <div className="text-center bg-gray-800/50 rounded-lg p-2 border border-green-700/30">
              <div className="text-lg font-bold text-green-400">
                {summary.taskCount}
              </div>
                <div className="text-xs text-gray-400">任务数量</div>
            </div>
          </div>

          {/* AI 洞察 */}
          {summary.insights && summary.insights.length > 0 && (
            <div>
              <h4 className="text-gray-200 font-medium mb-2 text-sm">💡 AI 洞察</h4>
              <div className="space-y-1">
                {summary.insights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="flex items-start space-x-2 bg-gray-800/50 rounded-lg p-2 border border-green-700/30">
                    <span className="text-blue-400 text-xs mt-0.5">•</span>
                    <p className="text-gray-300 text-xs">{insight}</p>
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
      )}
    </Card>
  );
};

export default CollapsibleAISummary;



