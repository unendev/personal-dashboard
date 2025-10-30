/**
 * 计时器工具函数
 */

interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  instanceTag?: string | null;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  parentId?: string | null;
  children?: TimerTask[];
  totalTime?: number;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryGroup {
  id: string;
  categoryPath: string;
  categoryName: string;
  level: number; // 1: 一级, 2: 二级, 3: 三级
  tasks: TimerTask[];
  subGroups?: CategoryGroup[]; // 子分组（用于嵌套）
  totalTime: number;
  runningCount: number;
  color?: string; // 颜色标识（仅一级分组）
  displayName?: string; // 显示名称
}

/**
 * 按分类分组任务（支持3层嵌套）
 * 
 * @example
 * "娱乐/游戏/文明6" 会创建：
 * - 娱乐 (level=1)
 *   - 游戏 (level=2)
 *     - 文明6 (level=3, 实际任务)
 */
export function groupTasksByCategory(tasks: TimerTask[]): CategoryGroup[] {
  // 只处理顶层任务（无父级）
  const topLevelTasks = tasks.filter(t => !t.parentId);
  
  // 排除特殊分类（时间黑洞、身体锻炼）
  const tasksToGroup = topLevelTasks.filter(t =>
    !t.categoryPath?.includes('时间黑洞') &&
    !t.categoryPath?.includes('身体锻炼')
  );

  // 按一级分类分组
  const level1Map = new Map<string, TimerTask[]>();
  
  tasksToGroup.forEach(task => {
    const parts = (task.categoryPath || '未分类').split('/');
    const level1 = parts[0] || '未分类';
    
    const list = level1Map.get(level1) || [];
    list.push(task);
    level1Map.set(level1, list);
  });

  // 构建嵌套结构
  const groups: CategoryGroup[] = [];
  
  // 颜色池（与 CategoryZoneHeader 对应）
  const colors = ['blue', 'green', 'purple', 'red', 'orange', 'indigo'];
  let colorIndex = 0;

  level1Map.forEach((level1Tasks, level1Name) => {
    // 按二级分类分组
    const level2Map = new Map<string, TimerTask[]>();
    
    level1Tasks.forEach(task => {
      const parts = task.categoryPath.split('/');
      const level2 = parts.length >= 2 ? parts[1] : ''; // 空字符串表示直接在一级下
      
      const list = level2Map.get(level2) || [];
      list.push(task);
      level2Map.set(level2, list);
    });

    // 如果所有任务都是2层（没有第三层），直接放在一级下
    const hasThirdLevel = level1Tasks.some(t => t.categoryPath.split('/').length >= 3);
    
    if (!hasThirdLevel) {
      // 2层结构：直接创建一级分组
      groups.push({
        id: `cat-${level1Name}`,
        categoryPath: level1Name,
        categoryName: level1Name,
        level: 1,
        tasks: level1Tasks,
        totalTime: calculateGroupTotalTime(level1Tasks),
        runningCount: level1Tasks.filter(t => t.isRunning).length,
        color: colors[colorIndex % colors.length],
        displayName: level1Name
      });
      colorIndex++;
    } else {
      // 3层结构：创建嵌套分组
      const subGroups: CategoryGroup[] = [];
      
      level2Map.forEach((level2Tasks, level2Name) => {
        if (level2Name === '') {
          // 直接在一级分类下的任务（没有二级）
          // 这些任务放在 "其他" 子分组
          if (level2Tasks.length > 0) {
            subGroups.push({
              id: `cat-${level1Name}-其他`,
              categoryPath: `${level1Name}/其他`,
              categoryName: '其他',
              level: 2,
              tasks: level2Tasks,
              totalTime: calculateGroupTotalTime(level2Tasks),
              runningCount: level2Tasks.filter(t => t.isRunning).length
            });
          }
        } else {
          // 按三级分类分组
          const level3Map = new Map<string, TimerTask[]>();
          
          level2Tasks.forEach(task => {
            const parts = task.categoryPath.split('/');
            const level3 = parts.length >= 3 ? parts[2] : ''; // 空表示直接在二级下
            
            const list = level3Map.get(level3) || [];
            list.push(task);
            level3Map.set(level3, list);
          });
          
          // 检查是否有第三层
          const hasLevel3 = level2Tasks.some(t => t.categoryPath.split('/').length >= 3);
          
          if (!hasLevel3) {
            // 没有第三层，二级直接包含任务
            subGroups.push({
              id: `cat-${level1Name}-${level2Name}`,
              categoryPath: `${level1Name}/${level2Name}`,
              categoryName: level2Name,
              level: 2,
              tasks: level2Tasks,
              totalTime: calculateGroupTotalTime(level2Tasks),
              runningCount: level2Tasks.filter(t => t.isRunning).length
            });
          } else {
            // 有第三层，创建嵌套
            const level3Groups: CategoryGroup[] = [];
            const level2DirectTasks: TimerTask[] = []; // 直接在二级下的任务
            
            level3Map.forEach((level3Tasks, level3Name) => {
              if (level3Name === '') {
                // 这些是2层任务，应该直接显示在二级下，而不是创建"其他"分组
                level2DirectTasks.push(...level3Tasks);
              } else {
                // 真正的三级分类
                level3Groups.push({
                  id: `cat-${level1Name}-${level2Name}-${level3Name}`,
                  categoryPath: `${level1Name}/${level2Name}/${level3Name}`,
                  categoryName: level3Name,
                  level: 3,
                  tasks: level3Tasks,
                  totalTime: calculateGroupTotalTime(level3Tasks),
                  runningCount: level3Tasks.filter(t => t.isRunning).length
                });
              }
            });
            
            subGroups.push({
              id: `cat-${level1Name}-${level2Name}`,
              categoryPath: `${level1Name}/${level2Name}`,
              categoryName: level2Name,
              level: 2,
              tasks: level2DirectTasks, // 二级直接包含2层任务
              subGroups: level3Groups.length > 0 ? level3Groups : undefined, // 只有真正的三级分类
              totalTime: calculateGroupTotalTime(level2Tasks),
              runningCount: level2Tasks.filter(t => t.isRunning).length
            });
          }
        }
      });
      
      groups.push({
        id: `cat-${level1Name}`,
        categoryPath: level1Name,
        categoryName: level1Name,
        level: 1,
        tasks: [], // 一级本身不直接包含任务
        subGroups,
        totalTime: calculateGroupTotalTime(level1Tasks),
        runningCount: level1Tasks.filter(t => t.isRunning).length,
        color: colors[colorIndex % colors.length],
        displayName: level1Name
      });
      colorIndex++;
    }
  });

  // 排序：运行中的在前，然后按总时间排序
  return groups.sort((a, b) => {
    if (a.runningCount > 0 && b.runningCount === 0) return -1;
    if (a.runningCount === 0 && b.runningCount > 0) return 1;
    return b.totalTime - a.totalTime;
  });
}

/**
 * 计算分组总时间（包括子任务）
 */
function calculateGroupTotalTime(tasks: TimerTask[]): number {
  return tasks.reduce((sum, task) => {
    let total = task.elapsedTime;
    if (task.children) {
      total += calculateTaskTotalTime(task.children);
    }
    return sum + total;
  }, 0);
}

/**
 * 递归计算任务总时间
 */
function calculateTaskTotalTime(tasks: TimerTask[]): number {
  return tasks.reduce((sum, task) => {
    let total = task.elapsedTime;
    if (task.children) {
      total += calculateTaskTotalTime(task.children);
    }
    return sum + total;
  }, 0);
}

/**
 * 加载折叠分类状态
 */
export function loadCollapsedCategories(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  
  try {
    const saved = localStorage.getItem('collapsed-categories');
    if (saved) {
      return new Set(JSON.parse(saved));
    }
  } catch (error) {
    console.error('加载折叠状态失败:', error);
  }
  return new Set();
}

/**
 * 保存折叠分类状态
 */
export function saveCollapsedCategories(collapsed: Set<string>): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('collapsed-categories', JSON.stringify(Array.from(collapsed)));
  } catch (error) {
    console.error('保存折叠状态失败:', error);
  }
}

/**
 * 格式化时间显示
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`;
  }
  return `${minutes}m`;
}

/**
 * 获取运行中的任务（递归查找）
 */
export function getRunningTasks(tasks: TimerTask[]): TimerTask[] {
  const running: TimerTask[] = [];
  
  function findRunning(taskList: TimerTask[]): void {
    taskList.forEach(task => {
      if (task.isRunning && !task.isPaused) {
        running.push(task);
      }
      if (task.children && task.children.length > 0) {
        findRunning(task.children);
      }
    });
  }
  
  findRunning(tasks);
  return running;
}


