'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface AISummary {
  summary: string;
  totalTime: number;
  taskCount: number;
  categories: Record<string, number>;
  insights: string[];
  tasks: Array<{
    id: string;
    name: string;
    categoryPath: string;
    elapsedTime: number;
    completedAt?: number;
  }>;
}

interface AISummaryWidgetProps {
  userId?: string;
  date?: string;
}

const AISummaryWidget: React.FC<AISummaryWidgetProps> = ({ 
  userId = 'default-user-id', 
  date = new Date().toISOString().split('T')[0] 
}) => {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ai-summary?userId=${userId}&date=${date}`);
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
  }, [userId, date]);

  useEffect(() => {
    fetchSummary();
  }, [userId, date, fetchSummary]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  if (loading) {
    return (
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="gradient-text">AI 每日总结</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            <p className="text-white/60 mt-2">正在生成总结...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="gradient-text">AI 每日总结</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={fetchSummary} variant="outline" size="sm">
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="gradient-text">AI 每日总结</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-white/60">暂无数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="gradient-text flex items-center justify-between">
          <span>AI 每日总结</span>
          <span className="text-sm font-normal text-white/60">
            {formatDate(date)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 主要总结 */}
        <div className="bg-white/10 rounded-lg p-4">
          <p className="text-white/90 leading-relaxed">{summary.summary}</p>
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {formatTime(summary.totalTime)}
            </div>
            <div className="text-sm text-white/60">总工作时间</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {summary.taskCount}
            </div>
            <div className="text-sm text-white/60">任务数量</div>
          </div>
        </div>

        {/* AI 洞察 */}
        {summary.insights.length > 0 && (
          <div>
            <h4 className="text-white/80 font-medium mb-2">AI 洞察</h4>
            <div className="space-y-2">
              {summary.insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-blue-400 mt-1">💡</span>
                  <p className="text-white/70 text-sm">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 分类统计 */}
        {Object.keys(summary.categories).length > 0 && (
          <div>
            <h4 className="text-white/80 font-medium mb-2">分类统计</h4>
            <div className="space-y-2">
              {Object.entries(summary.categories)
                .sort((a, b) => b[1] - a[1])
                .map(([category, time]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">{category}</span>
                    <span className="text-white/60 text-sm">
                      {formatTime(time)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 刷新按钮 */}
        <div className="pt-2">
          <Button 
            onClick={fetchSummary} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            刷新总结
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AISummaryWidget;
