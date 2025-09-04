'use client'

import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import SunburstChart from './SunburstChart';

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
  const [chartType, setChartType] = React.useState<'sunburst' | 'pie' | 'bar'>('sunburst');
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

  // 构建旭日图数据
  const buildSunburstData = () => {
    const categoryMap = new Map<string, { time: number; tasks: TimerTask[] }>();
    
    const allTasks = getAllTasksFlat(tasks);
    allTasks.forEach(task => {
      const category = task.categoryPath || '未分类';
      const current = categoryMap.get(category) || { time: 0, tasks: [] };
      const taskTotalTime = calculateTotalTime(task);
      current.time += taskTotalTime;
      current.tasks.push(task);
      categoryMap.set(category, current);
    });

    // 构建层级结构
    const root = {
      name: '总时间',
      value: 0,
      children: [] as any[]
    };

    categoryMap.forEach((value, category) => {
      const categoryParts = category.split('/');
      let currentLevel = root;
      
      categoryParts.forEach((part, index) => {
        const existingChild = currentLevel.children?.find(child => child.name === part);
        if (existingChild) {
          currentLevel = existingChild;
        } else {
          const newChild = {
            name: part,
            value: index === categoryParts.length - 1 ? Math.max(value.time, 0) : 0,
            children: [],
            tasks: index === categoryParts.length - 1 ? value.tasks : []
          };
          currentLevel.children.push(newChild);
          currentLevel = newChild;
        }
      });
    });

    // 计算根节点的总值
    root.value = root.children.reduce((sum, child) => sum + child.value, 0);

    // 确保根节点有有效值
    if (root.value <= 0) {
      root.value = 1; // 设置默认值避免除零错误
    }

    return root;
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
    
    return Array.from(categoryMap.entries()).map(([name, value]) => {
      // 提取最里层分类名称（最后一个斜杠后的部分）
      const categoryParts = name.split('/');
      const displayName = categoryParts[categoryParts.length - 1];
      
      return {
        name: displayName.length > 8 ? displayName.substring(0, 8) + '...' : displayName, // 只显示最里层分类
        value: Math.round(value / 60), // 转换为分钟
        fullName: name, // 完整分类路径用于悬停显示
        seconds: value, // 保留秒数用于精确显示
        categoryPath: name // 完整分类路径
      };
    }).sort((a, b) => b.value - a.value);
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

  const sunburstData = buildSunburstData();
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

  const handleChartHover = (type: 'sunburst' | 'pie' | 'bar') => {
    setChartType(type);
  };

  // CustomTooltip 函数已移除，因为新的SunburstChart组件有自己的tooltip实现

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

      {/* 图表切换区域 */}
      <Card>
        <CardHeader>
          <CardTitle>时间分布图表</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 图表类型选择器 */}
          <div className="flex gap-2 mb-4">
            <div 
              className={`px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                chartType === 'sunburst' 
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              onMouseEnter={() => handleChartHover('sunburst')}
            >
              旭日图
            </div>
            <div 
              className={`px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                chartType === 'pie' 
                  ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              onMouseEnter={() => handleChartHover('pie')}
            >
              饼图
            </div>
            <div 
              className={`px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                chartType === 'bar' 
                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              onMouseEnter={() => handleChartHover('bar')}
            >
              柱状图
            </div>
          </div>

          {/* 图表显示区域 */}
          <div className="h-96 flex items-center justify-center">
            {chartType === 'sunburst' && sunburstData.children && sunburstData.children.length > 0 && (
              <SunburstChart data={sunburstData} width={400} height={400} />
            )}
            
            {chartType === 'pie' && categoryStats.length > 0 && (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatTime(value), '时间']}
                    labelFormatter={(label) => `分类: ${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            {chartType === 'bar' && taskStats.length > 0 && (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={taskStats}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [formatTime(value), '时间']}
                    labelFormatter={(label) => `任务: ${label}`}
                  />
                  <Bar dataKey="time" fill="#8884d8">
                    {taskStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 任务时间排行 */}
      {taskStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>任务时间排行</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taskStats.map((task, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{task.fullName}</div>
                      <div className="text-sm text-gray-500">{task.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-blue-600">{formatTime(task.time)}</div>
                    {task.hasChildren && (
                      <div className="text-xs text-green-600">包含子任务</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TimeStatsChart;
