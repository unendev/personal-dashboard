'use client'

import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
}

interface TimeStatsChartProps {
  tasks: TimerTask[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

const TimeStatsChart: React.FC<TimeStatsChartProps> = ({ tasks }) => {
  // 按分类统计时间
  const getCategoryStats = () => {
    const categoryMap = new Map<string, number>();
    
    tasks.forEach(task => {
      const category = task.categoryPath || '未分类';
      const currentTime = categoryMap.get(category) || 0;
      // 使用elapsedTime，它包含了初始时间和计时器运行的时间
      categoryMap.set(category, currentTime + task.elapsedTime);
    });
    
    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name: name.length > 10 ? name.substring(0, 10) + '...' : name,
      value: Math.round(value / 60), // 转换为分钟
      fullName: name
    })).sort((a, b) => b.value - a.value);
  };

  // 按任务统计时间
  const getTaskStats = () => {
    return tasks
      .filter(task => task.elapsedTime > 0) // 只显示有实际时间的任务
      .map(task => ({
        name: task.name.length > 15 ? task.name.substring(0, 15) + '...' : task.name,
        time: Math.round(task.elapsedTime / 60), // 使用elapsedTime，包含所有时间
        fullName: task.name,
        category: task.categoryPath
      }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 8); // 只显示前8个任务
  };

  // 计算总时间
  const getTotalTime = () => {
    const totalSeconds = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return { hours, minutes, totalSeconds };
  };

  // 计算运行中的任务数量
  const getRunningTasksCount = () => {
    return tasks.filter(task => task.isRunning).length;
  };

  // 计算平均任务时间
  const getAverageTaskTime = () => {
    if (tasks.length === 0) return 0;
    const totalSeconds = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    return Math.round(totalSeconds / tasks.length / 60); // 转换为分钟
  };

  // 获取最活跃的分类
  const getMostActiveCategory = () => {
    const categoryMap = new Map<string, number>();
    
    tasks.forEach(task => {
      const category = task.categoryPath || '未分类';
      const currentTime = categoryMap.get(category) || 0;
      // 使用elapsedTime，它包含了初始时间和计时器运行的时间
      categoryMap.set(category, currentTime + task.elapsedTime);
    });
    
    if (categoryMap.size === 0) return null;
    
    const sortedCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1]);
    
    return {
      name: sortedCategories[0][0],
      time: Math.round(sortedCategories[0][1] / 60)
    };
  };

  const categoryStats = getCategoryStats();
  const taskStats = getTaskStats();
  const totalTime = getTotalTime();
  const runningTasksCount = getRunningTasksCount();
  const averageTaskTime = getAverageTaskTime();
  const mostActiveCategory = getMostActiveCategory();

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ payload: { fullName?: string }; value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{payload[0].payload.fullName || label}</p>
          <p className="text-blue-600">{formatTime(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  if (tasks.length === 0) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">暂无时间数据</p>
          <p className="text-sm text-gray-400 mt-2">开始计时后这里会显示统计图表</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 总览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totalTime.hours}h{totalTime.minutes}m
              </div>
              <div className="text-sm text-gray-600">今日总时间</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {tasks.length}
              </div>
              <div className="text-sm text-gray-600">任务总数</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {runningTasksCount}
              </div>
              <div className="text-sm text-gray-600">正在运行</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatTime(averageTaskTime)}
              </div>
              <div className="text-sm text-gray-600">平均任务时间</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最活跃分类 */}
      {mostActiveCategory && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800 mb-2">最活跃分类</div>
              <div className="text-xl font-bold text-indigo-600">
                {mostActiveCategory.name}
              </div>
              <div className="text-sm text-gray-600">
                {formatTime(mostActiveCategory.time)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分类饼图 */}
      {categoryStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>按分类统计</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 任务柱状图 */}
      {taskStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>任务时间排行</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="time" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TimeStatsChart;
