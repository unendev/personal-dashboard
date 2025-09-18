'use client'

import React from 'react';
import ReactECharts from 'echarts-for-react';

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
  createdAt?: string;
  updatedAt?: string;
}

interface EChartsSunburstChartProps {
  tasks: TimerTask[];
  // 第三层展示配置（可选）
  detailTopN?: number;           // 每个二级分类展示前 N 个任务
  detailMinPercent?: number;     // 每个二级分类展示占比 >= 此阈值的任务（0-1）
  minLeafSeconds?: number;       // 每个二级分类展示时长 >= 此秒数的任务
  showAllLeaf?: boolean;         // 是否强制展示所有叶子（为 true 时忽略聚合）
}

interface TaskDetail {
  id: string;
  name: string;
  elapsedTime: number;
  categoryPath: string;
}

const EChartsSunburstChart: React.FC<EChartsSunburstChartProps> = ({
  tasks,
  detailTopN = 5,
  detailMinPercent = 0.1,
  minLeafSeconds = 600,
  showAllLeaf = false
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [taskDetails, setTaskDetails] = React.useState<TaskDetail[]>([]);
  const [showTaskList, setShowTaskList] = React.useState(true); // 默认显示任务列表

  // 初始化时设置默认的任务详情数据 - 显示所有任务按耗时时长排序
  React.useEffect(() => {
    if (tasks.length > 0) {
      // 获取所有任务并按耗时时长排序
      const allTasks: TaskDetail[] = [];
      tasks.forEach(task => {
        allTasks.push({
          id: task.id,
          name: task.name,
          elapsedTime: calculateTotalTime(task),
          categoryPath: task.categoryPath || '未分类'
        });
      });
      
      // 按耗时时长从高到低排序
      const sortedTasks = allTasks.sort((a, b) => b.elapsedTime - a.elapsedTime);
      setTaskDetails(sortedTasks);
      setSelectedCategory('所有任务');
    }
  }, [tasks]);

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

  // 获取指定分类下的具体事物项（按两级分类匹配）
  const getTasksByCategory = (categoryPath: string): TaskDetail[] => {
    const tasksInCategory: TaskDetail[] = [];

    tasks.forEach(task => {
      const rawCategory = task.categoryPath || '未分类';
      const parts = rawCategory.split('/');
      const twoLevel = parts.length >= 2 ? parts.slice(0, 2).join('/') : parts[0];
      if (twoLevel === categoryPath) {
        tasksInCategory.push({
          id: task.id,
          name: task.name,
          elapsedTime: calculateTotalTime(task),
          categoryPath: twoLevel
        });
      }
    });

    return tasksInCategory.sort((a, b) => b.elapsedTime - a.elapsedTime);
  };

  // 构建 ECharts 旭日图数据（严格父=子求和，避免数值重叠；第三层可选并支持“其他”聚合）
  const buildEChartsSunburstData = () => {
    // 预聚合成两级分类结构：First -> Second -> TaskDetail[]
    const firstLevelMap = new Map<string, Map<string, TaskDetail[]>>();
    tasks.forEach(task => {
      const category = task.categoryPath || '未分类';
      const taskTotalTime = calculateTotalTime(task);
      const parts = category.split('/');
      const first = parts[0] || '未分类';
      const second = parts.length >= 2 ? parts[1] : '其他';

      const secondMap = firstLevelMap.get(first) || new Map<string, TaskDetail[]>();
      const list = secondMap.get(second) || [];
      list.push({
        id: task.id,
        name: task.name,
        elapsedTime: taskTotalTime,
        categoryPath: `${first}/${second}`
      });
      secondMap.set(second, list);
      firstLevelMap.set(first, secondMap);
    });

    interface SunburstNode {
      name: string;
      value: number;
      children: SunburstNode[];
      itemStyle?: { color: string };
      // 叶子元数据（仅叶子存在）
      fullName?: string;
      taskId?: string;
      categoryPath?: string;
      isLeaf?: boolean;
    }

    const root: SunburstNode = { name: '总时间', value: 0, children: [] };
    const colors = [
      '#5470c6', '#91cc75', '#fac858', '#ee6666',
      '#73c0de', '#3ba272', '#fc8452', '#9a60b4',
      '#ea7ccc', '#ff9f7f', '#ffdb5c', '#37a2da'
    ];
    let colorIndex = 0;

    // 构造第一层
    firstLevelMap.forEach((secondMap, firstName) => {
      const firstNode: SunburstNode = {
        name: firstName,
        value: 0,
        children: [],
        itemStyle: { color: colors[colorIndex % colors.length] }
      };
      colorIndex++;

      // 构造第二层
      secondMap.forEach((taskList, secondName) => {
        // 分类下的全部任务时间
        const totalCategoryTime = taskList.reduce((s, t) => s + t.elapsedTime, 0);

        // 选择要展开为叶子的任务
        let selected: TaskDetail[] = [];
        if (showAllLeaf) {
          selected = [...taskList].sort((a, b) => b.elapsedTime - a.elapsedTime);
        } else {
          const sorted = [...taskList].sort((a, b) => b.elapsedTime - a.elapsedTime);
          const byTopN = sorted.slice(0, Math.max(0, detailTopN || 0));
          const byPercent = sorted.filter(t => totalCategoryTime > 0 && (t.elapsedTime / totalCategoryTime) >= (detailMinPercent || 0));
          const bySeconds = sorted.filter(t => t.elapsedTime >= (minLeafSeconds || 0));
          const mergedMap = new Map<string, TaskDetail>();
          [...byTopN, ...byPercent, ...bySeconds].forEach(t => mergedMap.set(t.id, t));
          selected = Array.from(mergedMap.values()).sort((a, b) => b.elapsedTime - a.elapsedTime);
        }

        const selectedSum = selected.reduce((s, t) => s + t.elapsedTime, 0);
        const otherSum = Math.max(0, totalCategoryTime - selectedSum);

        const secondNode: SunburstNode = {
          name: secondName,
          value: 0,
          children: [],
          itemStyle: { color: colors[colorIndex % colors.length] }
        };
        colorIndex++;

        // 第三层：选中的任务叶子
        selected.forEach((t, idx) => {
          const truncated = t.name.length > 8 ? t.name.substring(0, 8) + '...' : t.name;
          secondNode.children.push({
            name: truncated,
            fullName: t.name,
            taskId: t.id,
            categoryPath: t.categoryPath,
            isLeaf: true,
            value: t.elapsedTime,
            children: [],
            itemStyle: { color: colors[(colorIndex + idx) % colors.length] }
          });
        });

        // 第三层：其他聚合
        if (!showAllLeaf && selected.length > 0 && otherSum > 0) {
          secondNode.children.push({
            name: '其他',
            value: otherSum,
            children: [],
            itemStyle: { color: colors[colorIndex % colors.length] }
          });
        }

        // 二级节点取子节点之和，避免父子数值重叠
        secondNode.value = secondNode.children.reduce((s, c) => s + c.value, 0);
        firstNode.children.push(secondNode);
      });

      // 一级节点取子节点之和
      firstNode.value = firstNode.children.reduce((s, c) => s + c.value, 0);
      root.children.push(firstNode);
    });

    // 根节点取子节点之和
    root.value = root.children.reduce((s, c) => s + c.value, 0);
    if (root.value <= 0) root.value = 1;
    return root;
  };

  const formatTime = React.useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes > 0 ? `${minutes}分钟` : ''}`;
    }
    return `${minutes}分钟`;
  }, []);

  const sunburstData = React.useMemo(() => buildEChartsSunburstData(), [tasks, detailTopN, detailMinPercent, minLeafSeconds, showAllLeaf]);
  const totalSecondsAllTasks = React.useMemo(() => {
    return tasks.reduce((sum, task) => sum + calculateTotalTime(task), 0);
  }, [tasks]);

  // 处理点击事件
  const handleChartClick = (params: { data?: { isLeaf?: boolean; categoryPath?: string }; treePathInfo?: Array<{ name?: string }> }) => {
    const clickedData = params?.data;

    // 仅在我们定义的叶子（任务项）点击时触发
    if (clickedData && clickedData.isLeaf === true) {
      const categoryPath = clickedData.categoryPath
        || (Array.isArray(params?.treePathInfo)
          ? params.treePathInfo
              .map((p: { name?: string }) => p?.name)
              .filter((n: string) => !!n && n !== '总时间')
              .slice(0, 2)
              .join('/')
          : null)
        || findCategoryPathForTask(clickedData.fullName || params.name);

      if (categoryPath) {
        const tasks = getTasksByCategory(categoryPath);
        setTaskDetails(tasks);
        setSelectedCategory(categoryPath);
        setShowTaskList(true);
      }
    }
  };

  // 查找任务对应的分类路径
  const findCategoryPathForTask = (taskName: string): string | null => {
    for (const task of tasks) {
      if (task.name === taskName || task.name.includes(taskName.replace('...', ''))) {
        return task.categoryPath;
      }
    }
    return null;
  };

  // ECharts 配置选项
  const option = React.useMemo(() => ({
    series: [
      {
        type: 'sunburst',
        data: sunburstData.children,
        radius: [0, '90%'],
        center: ['50%', '50%'],
        nodeClick: 'zoomToNode',
        itemStyle: {
          borderRadius: 7,
          borderWidth: 2,
          borderColor: '#fff'
        },
        label: {
          show: true,
          formatter: function (params: { data: { children?: unknown[] }; name: string }) {
            // 只显示叶子节点的标签
            if (params.data.children && params.data.children.length > 0) {
              return '';
            }
            const name = params.name;
            return name.length > 6 ? name.substring(0, 6) + '...' : name;
          },
          fontSize: 12,
          color: '#fff',
          fontWeight: 'bold'
        },
        emphasis: {
          focus: 'ancestor',
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        levels: [
          {
            r0: '0%',
            r: '35%',
            itemStyle: {
              borderWidth: 2
            },
            label: {
              rotate: 'tangential'
            }
          },
          {
            r0: '35%',
            r: '70%',
            itemStyle: {
              borderWidth: 2
            },
            label: {
              align: 'right'
            }
          },
          {
            r0: '70%',
            r: '90%',
            itemStyle: {
              borderWidth: 2
            },
            label: {
              position: 'outside',
              padding: 3,
              silent: false
            }
          }
        ]
      }
    ],
    tooltip: {
      trigger: 'item',
      formatter: function (params: { data?: { fullName?: string; name?: string; value?: number } }) {
        const data = params?.data || {};
        const displayName = data.fullName || data.name || '';
        const time = formatTime(data.value || 0);
        return `${displayName}<br/>时间: ${time}`;
      }
    },
    animation: true,
    animationType: 'scale',
    animationEasing: 'elasticOut',
    animationDelay: function () {
      return Math.random() * 200;
    }
  }), [sunburstData, formatTime]);

  // 添加点击事件处理
  const onChartClick = (params: any) => {
    handleChartClick(params);
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-500">暂无时间数据</p>
          <p className="text-sm text-gray-400 mt-2">开始计时后这里会显示统计图表</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ReactECharts 
        option={option} 
        style={{ height: '500px', width: '100%' }}
        opts={{ renderer: 'svg' }}
        onEvents={{
          click: onChartClick
        }}
      />
      <div className="mt-4 text-sm text-gray-600 text-center">
        <p>点击扇形区域查看详细信息</p>
        <p className="text-xs text-gray-500 mt-1">总时间: {formatTime(totalSecondsAllTasks)}</p>
      </div>

      {/* 任务详情显示 */}
      {showTaskList && (
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {selectedCategory === '所有任务' ? '任务时间统计（按耗时时长排序）' : `${selectedCategory} - 具体事物项`}
            </h3>
            <button
              onClick={() => setShowTaskList(false)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ✕ 关闭
            </button>
          </div>
          
          {taskDetails.length > 0 ? (
            <div className="space-y-3">
              {taskDetails.map((task) => (
                <div key={task.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{task.name}</h4>
                    <p className="text-sm text-gray-600">{task.categoryPath}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-blue-600">
                      {formatTime(task.elapsedTime)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round((task.elapsedTime / sunburstData.value) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800">总计</span>
                  <span className="text-lg font-semibold text-green-600">
                    {formatTime(taskDetails.reduce((sum, task) => sum + task.elapsedTime, 0))}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <p>该分类下暂无具体事物项</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EChartsSunburstChart;
