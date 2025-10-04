/**
 * 计时器工具函数
 * 包含：分组逻辑、折叠状态持久化、颜色生成等
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
  id: string;                   // 唯一标识符（用于 React key）
  categoryPath: string;        // 分类路径（如 "工作/开发"）
  displayName: string;          // 显示名称（从路径提取）
  tasks: TimerTask[];           // 该分类下的所有任务（包含嵌套）
  totalTime: number;            // 分类总时间
  runningCount: number;         // 运行中的任务数
  isCollapsed: boolean;         // 是否折叠
  color: string;                // 区域主题色
}

/**
 * 按 categoryPath 分组任务
 * 注意：只对顶级任务（没有 parentId 的）进行分组，保持子任务的嵌套结构
 * 特殊处理：时间黑洞分类的任务不参与分组
 */
export function groupTasksByCategory(tasks: TimerTask[]): CategoryGroup[] {
  const groups = new Map<string, TimerTask[]>();
  
  // 只对顶级任务（没有 parentId 的）进行分组
  const topLevelTasks = tasks.filter(t => !t.parentId);
  
  // 过滤掉不参与分组的任务（时间黑洞、身体锻炼）
  topLevelTasks.forEach(task => {
    const category = task.categoryPath || "未分类";
    
    // 跳过不参与分组的分类（检查路径中是否包含这些关键词）
    if (category.includes('时间黑洞') || category.includes('身体锻炼')) {
      return;
    }
    
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(task);
  });
  
  // 转换为 CategoryGroup 并计算统计信息
  return Array.from(groups.entries()).map(([categoryPath, tasks]) => {
    const totalTime = calculateGroupTotalTime(tasks);
    const runningCount = countRunningTasks(tasks);
    
    return {
      id: categoryPath,
      categoryPath: categoryPath,
      displayName: extractDisplayName(categoryPath),
      tasks: sortTasks(tasks),
      totalTime,
      runningCount,
      isCollapsed: false,
      color: generateCategoryColor(categoryPath)
    };
  }).sort((a, b) => {
    // 有运行任务的分类排在前面
    if (a.runningCount > 0 && b.runningCount === 0) return -1;
    if (a.runningCount === 0 && b.runningCount > 0) return 1;
    // 按总时间降序
    return b.totalTime - a.totalTime;
  });
}

/**
 * 计算分组的总时间（包含所有子任务）
 */
function calculateGroupTotalTime(tasks: TimerTask[]): number {
  let total = 0;
  
  function sumTaskTime(task: TimerTask): number {
    let time = task.totalTime || task.elapsedTime || 0;
    if (task.children && task.children.length > 0) {
      time += task.children.reduce((sum, child) => sum + sumTaskTime(child), 0);
    }
    return time;
  }
  
  tasks.forEach(task => {
    total += sumTaskTime(task);
  });
  
  return total;
}

/**
 * 计算运行中的任务数量（包含所有子任务）
 */
function countRunningTasks(tasks: TimerTask[]): number {
  let count = 0;
  
  function countTask(task: TimerTask): void {
    if (task.isRunning && !task.isPaused) {
      count++;
    }
    if (task.children && task.children.length > 0) {
      task.children.forEach(child => countTask(child));
    }
  }
  
  tasks.forEach(task => countTask(task));
  
  return count;
}

/**
 * 提取显示名称
 */
function extractDisplayName(categoryPath: string): string {
  if (!categoryPath) return "未分类";
  const parts = categoryPath.split('/').filter(p => p.trim());
  return parts.length > 1 ? parts.join(' / ') : parts[0] || "未分类";
}

/**
 * 对任务进行排序
 */
function sortTasks(tasks: TimerTask[]): TimerTask[] {
  return [...tasks].sort((a, b) => {
    // 如果两个任务都有order字段且order >= 0，按order排序
    if (a.order !== undefined && b.order !== undefined && a.order >= 0 && b.order >= 0) {
      // 如果order相同，按createdAt降序排序（新任务在前）
      if (a.order === b.order) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.order - b.order;
    }
    // 如果只有一个有有效的order字段，有order的排在前面
    if (a.order !== undefined && a.order >= 0 && (b.order === undefined || b.order < 0)) {
      return -1;
    }
    if (b.order !== undefined && b.order >= 0 && (a.order === undefined || a.order < 0)) {
      return 1;
    }
    // 如果都没有有效的order字段，按创建时间降序排序（新任务在前）
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * 生成分类颜色
 */
export function generateCategoryColor(categoryPath: string): string {
  const colorMap: Record<string, string> = {
    '工作': 'blue',
    '娱乐': 'purple',
    '学习': 'green',
    '时间黑洞': 'red',
    '健康': 'teal',
    '生活': 'yellow',
    '运动': 'orange',
    '社交': 'pink',
    '阅读': 'indigo',
  };
  
  if (!categoryPath) return 'gray';
  
  const topCategory = categoryPath.split('/')[0];
  return colorMap[topCategory] || 'gray';
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

// ============ 折叠状态持久化 ============

const COLLAPSED_CATEGORIES_KEY = 'timer-collapsed-categories';

/**
 * 保存折叠状态
 */
export function saveCollapsedCategories(categories: Set<string>): void {
  try {
    localStorage.setItem(
      COLLAPSED_CATEGORIES_KEY, 
      JSON.stringify(Array.from(categories))
    );
  } catch (error) {
    console.error('保存折叠状态失败:', error);
  }
}

/**
 * 加载折叠状态
 */
export function loadCollapsedCategories(): Set<string> {
  try {
    const saved = localStorage.getItem(COLLAPSED_CATEGORIES_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch (error) {
    console.error('加载折叠状态失败:', error);
    return new Set();
  }
}

// ============ 自动计时偏好持久化 ============

const AUTO_START_PREFERENCE_KEY = 'timer-auto-start-preference';

/**
 * 保存自动开始计时偏好
 */
export function saveAutoStartPreference(autoStart: boolean): void {
  try {
    localStorage.setItem(AUTO_START_PREFERENCE_KEY, JSON.stringify(autoStart));
  } catch (error) {
    console.error('保存自动计时偏好失败:', error);
  }
}

/**
 * 加载自动开始计时偏好
 */
export function loadAutoStartPreference(): boolean {
  try {
    const saved = localStorage.getItem(AUTO_START_PREFERENCE_KEY);
    return saved ? JSON.parse(saved) : true; // 默认为 true
  } catch (error) {
    console.error('加载自动计时偏好失败:', error);
    return true;
  }
}

// ============ 时间格式化 ============

/**
 * 格式化时间显示
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * 解析时间输入（支持 "1h20m", "45m", "2h" 等格式）
 */
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr || !timeStr.trim()) return 0;
  
  const hours = timeStr.match(/(\d+)h/);
  const minutes = timeStr.match(/(\d+)m/);
  
  const hoursNum = hours ? parseInt(hours[1]) : 0;
  const minutesNum = minutes ? parseInt(minutes[1]) : 0;
  
  return hoursNum * 3600 + minutesNum * 60;
}

