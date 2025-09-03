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
  parentId?: string | null;
  children?: TimerTask[];
}

interface TimeStatsChartProps {
  tasks: TimerTask[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

const TimeStatsChart: React.FC<TimeStatsChartProps> = ({ tasks }) => {
  // 递归计算任务的总时间（包括子任务）
  const calculateTotalTime = (task: TimerTask): number => {
    let total = task.elapsedTime;
    if (task.children) {
      task.children.forEach(child => {
        total += calculateTotalTime(child);
      });
    }
    return total;
  };

  // 获取所有任务（包括子任务）的扁平化列表
  const getAllTasksFlat = (taskList: TimerTask[]): TimerTask[] => {
    let allTasks: TimerTask[] = [];
    taskList.forEach(task => {
      allTasks.push(task);
      if (task.children) {
        allTasks = allTasks.concat(getAllTasksFlat(task.children));
      }
    });
    return allTasks;
  };

  // 按分类统计时间（包含子任务）
  const getCategoryStats = () => {
    const categoryMap = new Map<string, number>();
    
    const allTasks = getAllTasksFlat(tasks);
    allTasks.forEach(task => {
      const category = task.categoryPath || '未分类';
      const currentTime = categoryMap.get(category) || 0;
      const taskTotalTime = calculateTotalTime(task);
      categoryMap.set(category, currentTime + taskTotalTime);
    });
    
    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name: name.length > 8 ? name.substring(0, 8) + '...' : name, // 缩短显示名称
      value: Math.round(value / 60), // 转换为分钟
      fullName: name, // 完整名称用于悬停显示
      seconds: value // 保留秒数用于精确显示
    })).sort((a, b) => b.value - a.value);
  };

  // 按任务统计时间（只显示顶级任务）
  const getTaskStats = () => {
    return tasks
      .filter(task => {
        const totalTime = calculateTotalTime(task);
        return totalTime > 0; // 只显示有实际时间的任务
      })
      .map(task => ({
        name: task.name.length > 15 ? task.name.substring(0, 15) + '...' : task.name,
        time: Math.round(calculateTotalTime(task) / 60), // 包含子任务的总时间
        fullName: task.name,
        category: task.categoryPath,
        hasChildren: task.children && task.children.length > 0
      }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 8); // 只显示前8个任务
  };

  // 计算总时间（包含所有子任务）
  const getTotalTime = () => {
    const totalSeconds = tasks.reduce((sum, task) => sum + calculateTotalTime(task), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return { hours, minutes, totalSeconds };
  };

  // 计算运行中的任务数量（包括子任务）
  const getRunningTasksCount = () => {
    const allTasks = getAllTasksFlat(tasks);
    return allTasks.filter(task => task.isRunning).length;
  };

  // 计算平均任务时间（只计算顶级任务）
  const getAverageTaskTime = () => {
    if (tasks.length === 0) return 0;
    const totalSeconds = tasks.reduce((sum, task) => sum + calculateTotalTime(task), 0);
    return Math.round(totalSeconds / tasks.length / 60); // 转换为分钟
  };

  // 获取最活跃的分类
  const getMostActiveCategory = () => {
    const categoryMap = new Map<string, number>();
    
    const allTasks = getAllTasksFlat(tasks);
    allTasks.forEach(task => {
      const category = task.categoryPath || '未分类';
      const currentTime = categoryMap.get(category) || 0;
      const taskTotalTime = calculateTotalTime(task);
      categoryMap.set(category, currentTime + taskTotalTime);
    });
    
    if (categoryMap.size === 0) return null;
    
    const sortedCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1]);
    
    return {
      name: sortedCategories[0][0],
      time: Math.round(sortedCategories[0][1] / 60)
    };
  };

  // 获取层级统计信息
  const getHierarchyStats = () => {
    const stats = {
      topLevelTasks: tasks.length,
      totalTasks: getAllTasksFlat(tasks).length,
      tasksWithChildren: tasks.filter(task => task.children && task.children.length > 0).length,
      maxDepth: 0
    };

    // 计算最大深度
    const calculateDepth = (taskList: TimerTask[], currentDepth: number): number => {
      let maxDepth = currentDepth;
      taskList.forEach(task => {
        if (task.children && task.children.length > 0) {
          const childDepth = calculateDepth(task.children, currentDepth + 1);
          maxDepth = Math.max(maxDepth, childDepth);
        }
      });
      return maxDepth;
    };

    stats.maxDepth = calculateDepth(tasks, 1);
    return stats;
  };

  const categoryStats = getCategoryStats();
  const taskStats = getTaskStats();
  const totalTime = getTotalTime();
  const runningTasksCount = getRunningTasksCount();
  const averageTaskTime = getAverageTaskTime();
  const mostActiveCategory = getMostActiveCategory();
  const hierarchyStats = getHierarchyStats();

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
    payload?: Array<{ payload: { fullName?: string; hasChildren?: boolean; seconds?: number; category?: string }; value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const minutes = payload[0].value;
      const seconds = data.seconds || (minutes * 60);
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="font-medium text-gray-800">{data.fullName || label}</p>
          <p className="text-blue-600 font-semibold">{formatTime(minutes)}</p>
          {data.seconds && (
            <p className="text-xs text-gray-500 mt-1">
              精确时间: {Math.floor(seconds / 3600)}h {Math.floor((seconds % 3600) / 60)}m {seconds % 60}s
            </p>
          )}
          {data.category && (
            <p className="text-xs text-gray-600 mt-1">分类: {data.category}</p>
          )}
          {data.hasChildren && (
            <p className="text-xs text-green-600 mt-1">✓ 包含子任务</p>
          )}
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
                {hierarchyStats.totalTasks}
              </div>
              <div className="text-sm text-gray-600">任务总数</div>
              <div className="text-xs text-gray-500">
                ({hierarchyStats.topLevelTasks}个顶级任务)
              </div>
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

      {/* 层级统计 */}
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-800 mb-2">层级统计</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xl font-bold text-indigo-600">
                  {hierarchyStats.maxDepth}
                </div>
                <div className="text-sm text-gray-600">最大深度</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">
                  {hierarchyStats.tasksWithChildren}
                </div>
                <div className="text-sm text-gray-600">有子任务</div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">
                  {hierarchyStats.totalTasks - hierarchyStats.topLevelTasks}
                </div>
                <div className="text-sm text-gray-600">子任务数</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
