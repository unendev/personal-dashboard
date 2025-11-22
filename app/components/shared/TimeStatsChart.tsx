'use client'

import React from 'react';
import EChartsSunburstChart from './EChartsSunburstChart';

interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  // 可选：事务项标签
  instanceTag?: string | null;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  parentId?: string | null;
  children?: TimerTask[];
  createdAt?: string;
  updatedAt?: string;
}

interface DateRangeValue {
  startDate: string;
  endDate: string;
  label: string;
}

interface TimeStatsChartProps {
  tasks: TimerTask[];
  userId?: string;
  dateRange?: DateRangeValue;
}

const TimeStatsChart: React.FC<TimeStatsChartProps> = ({ tasks, userId, dateRange }) => {
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

  const totalTime = getTotalTime();
  const runningTasksCount = getRunningTasksCount();
  const averageTaskTime = getAverageTaskTime();
  const hierarchyStats = getHierarchyStats();

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };


  if (tasks.length === 0) {
    return (
      <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-6 text-center">
        <p className="text-gray-400">暂无时间数据</p>
        <p className="text-sm text-gray-400 mt-2">开始计时后这里会显示统计图表</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 总览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {totalTime.hours}h{totalTime.minutes}m
            </div>
            <div className="text-sm text-gray-300">{dateRange?.label || '今日'}总时间</div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {hierarchyStats.totalTasks}
            </div>
            <div className="text-sm text-gray-300">任务总数</div>
            <div className="text-xs text-gray-400">
              ({hierarchyStats.topLevelTasks}个顶级任务)
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">
              {runningTasksCount}
            </div>
            <div className="text-sm text-gray-300">正在运行</div>
          </div>
        </div>

        <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {formatTime(averageTaskTime)}
            </div>
            <div className="text-sm text-gray-300">平均任务时间</div>
          </div>
        </div>
      </div>

      {/* 层级统计 */}
      <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-200 mb-2">层级统计</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xl font-bold text-indigo-400">
                {hierarchyStats.maxDepth}
              </div>
              <div className="text-sm text-gray-300">最大深度</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-400">
                {hierarchyStats.tasksWithChildren}
              </div>
              <div className="text-sm text-gray-300">有子任务</div>
            </div>
            <div>
              <div className="text-xl font-bold text-blue-400">
                {hierarchyStats.totalTasks - hierarchyStats.topLevelTasks}
              </div>
              <div className="text-sm text-gray-300">子任务数</div>
            </div>
          </div>
        </div>
      </div>

      {/* ECharts 旭日图（内置切换：分类 / 事务项总时长） */}
      <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <span className="text-xl">🌅</span>
          时间分布旭日图
        </h3>
        <EChartsSunburstChart tasks={tasks} userId={userId} />
      </div>
    </div>
  );
};

export default TimeStatsChart;



