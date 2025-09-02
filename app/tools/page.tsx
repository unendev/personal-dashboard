import React from 'react';
import TimerWidget from '../components/TimerWidget';
import TodoList from '../components/TodoList';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function ToolsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">个人工具</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 计时器 */}
        <Card>
          <CardHeader>
            <CardTitle>计时器</CardTitle>
          </CardHeader>
          <CardContent>
            <TimerWidget />
          </CardContent>
        </Card>

        {/* 任务清单 */}
        <Card>
          <CardHeader>
            <CardTitle>任务清单</CardTitle>
          </CardHeader>
          <CardContent>
            <TodoList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
