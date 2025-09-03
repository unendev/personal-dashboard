'use client'

import React, { useState } from 'react';
import AISummaryWidget from '../components/AISummaryWidget';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function SummaryPage() {
  // 默认显示昨天的日期，因为昨天的记录今天才完整
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const [selectedDate, setSelectedDate] = useState(yesterday.toISOString().split('T')[0]);
  const [userId] = useState('user-1');

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDate(yesterday.toISOString().split('T')[0]);
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

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI 昨日总结</h1>
          <p className="text-gray-600">智能分析您昨天的工作模式和效率</p>
        </div>

        {/* 日期选择器 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>选择日期</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center space-x-4">
              <Button 
                onClick={goToPreviousDay}
                variant="outline"
              >
                前一天
              </Button>
              
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <span className="text-gray-600 text-sm">
                  {formatDate(selectedDate)}
                </span>
              </div>
              
              <Button 
                onClick={goToNextDay}
                variant="outline"
              >
                后一天
              </Button>
              
              <Button 
                onClick={goToYesterday}
                variant="outline"
              >
                昨天
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI 总结组件 */}
        <div className="grid gap-6">
          <AISummaryWidget userId={userId} date={selectedDate} />
          
          {/* 额外信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>功能说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>• 默认显示昨天的总结，因为昨天的记录今天才完整</p>
              <p>• AI 会自动分析您的工作模式和时间分配</p>
              <p>• 提供个性化的效率建议和洞察</p>
              <p>• 支持按日期查看历史总结</p>
              <p>• 每日总结会在早上 8:00 自动生成</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
