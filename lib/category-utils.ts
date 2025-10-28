/**
 * 分类工具函数
 * 支持三层分类架构：顶层/中层/底层
 * 示例：时间黑洞/娱乐/网文
 */

export interface CategoryLayers {
  top: string;      // 顶层分类
  mid: string;      // 中层分类
  sub?: string;     // 底层分类（可选）
}

/**
 * 解析分类路径为三层结构
 * @param path 分类路径，如 "时间黑洞/娱乐/网文"
 * @returns 解析后的三层结构
 */
export function parseCategory(path: string): CategoryLayers {
  if (!path || path.trim() === '') {
    return { top: '未分类', mid: '其他', sub: undefined };
  }

  const parts = path.split('/').map(p => p.trim()).filter(p => p);
  
  if (parts.length === 0) {
    return { top: '未分类', mid: '其他', sub: undefined };
  } else if (parts.length === 1) {
    // 一层：补齐为 "输入值/其他"
    return { top: parts[0], mid: '其他', sub: undefined };
  } else if (parts.length === 2) {
    // 两层：保持不变
    return { top: parts[0], mid: parts[1], sub: undefined };
  } else {
    // 三层及以上：取前三层
    return { top: parts[0], mid: parts[1], sub: parts[2] };
  }
}

/**
 * 验证分类路径的层级深度
 * @param path 分类路径
 * @param maxDepth 最大层级深度，默认3
 * @returns 是否符合深度要求
 */
export function validateCategoryDepth(path: string, maxDepth: number = 3): boolean {
  if (!path || path.trim() === '') {
    return true; // 空路径视为有效
  }

  const parts = path.split('/').map(p => p.trim()).filter(p => p);
  return parts.length <= maxDepth;
}

/**
 * 规范化分类路径（补齐或截断为标准格式）
 * @param path 原始分类路径
 * @param format 格式化模式：'strict'=严格三层，'flexible'=灵活1-3层
 * @returns 规范化后的路径
 */
export function normalizeCategoryPath(path: string, format: 'strict' | 'flexible' = 'flexible'): string {
  const layers = parseCategory(path);
  
  if (format === 'strict') {
    // 严格模式：总是返回三层
    return `${layers.top}/${layers.mid}/${layers.sub || '其他'}`;
  } else {
    // 灵活模式：保持原有层级
    if (layers.sub) {
      return `${layers.top}/${layers.mid}/${layers.sub}`;
    } else {
      return `${layers.top}/${layers.mid}`;
    }
  }
}

/**
 * 格式化分类路径用于显示
 * @param path 分类路径
 * @param showFull 是否显示完整路径
 * @returns 格式化后的显示文本
 */
export function formatCategoryDisplay(path: string, showFull: boolean = true): string {
  const layers = parseCategory(path);
  
  if (showFull) {
    // 完整显示
    if (layers.sub) {
      return `${layers.top} > ${layers.mid} > ${layers.sub}`;
    } else {
      return `${layers.top} > ${layers.mid}`;
    }
  } else {
    // 简化显示：只显示最后一层
    return layers.sub || layers.mid;
  }
}

/**
 * 获取分类的顶层名称
 * @param path 分类路径
 * @returns 顶层分类名称
 */
export function getTopCategory(path: string): string {
  return parseCategory(path).top;
}

/**
 * 获取分类的中层名称
 * @param path 分类路径
 * @returns 中层分类名称
 */
export function getMidCategory(path: string): string {
  return parseCategory(path).mid;
}

/**
 * 获取分类的底层名称
 * @param path 分类路径
 * @returns 底层分类名称（可能为 undefined）
 */
export function getSubCategory(path: string): string | undefined {
  return parseCategory(path).sub;
}

/**
 * 构建分类路径
 * @param top 顶层分类
 * @param mid 中层分类
 * @param sub 底层分类（可选）
 * @returns 完整的分类路径
 */
export function buildCategoryPath(top: string, mid: string, sub?: string): string {
  if (sub) {
    return `${top}/${mid}/${sub}`;
  } else {
    return `${top}/${mid}`;
  }
}

/**
 * 检查两个分类路径是否属于同一顶层分类
 * @param path1 第一个分类路径
 * @param path2 第二个分类路径
 * @returns 是否属于同一顶层
 */
export function isSameTopCategory(path1: string, path2: string): boolean {
  return getTopCategory(path1) === getTopCategory(path2);
}

/**
 * 获取分类路径的层级数
 * @param path 分类路径
 * @returns 层级数（1-3）
 */
export function getCategoryDepth(path: string): number {
  const layers = parseCategory(path);
  if (layers.sub) return 3;
  if (layers.mid && layers.mid !== '其他') return 2;
  return 1;
}

/**
 * 迁移旧的两层分类数据为三层
 * 策略：保持原有数据，仅在需要时自动升级
 * @param path 原始路径
 * @returns 迁移后的路径
 */
export function migrateLegacyCategory(path: string): string {
  const layers = parseCategory(path);
  
  // 如果已经是三层，直接返回
  if (layers.sub) {
    return normalizeCategoryPath(path);
  }
  
  // 如果是两层，保持不变（向后兼容）
  return normalizeCategoryPath(path, 'flexible');
}

/**
 * 常用分类预设
 */
export const COMMON_CATEGORIES = {
  timeBlackHole: {
    name: '时间黑洞',
    subcategories: [
      { mid: '娱乐', subs: ['网文', '视频', '游戏', '社交'] },
      { mid: '拖延', subs: ['发呆', '刷手机', '闲聊', '其他'] }
    ]
  },
  work: {
    name: '工作',
    subcategories: [
      { mid: '开发', subs: ['前端', '后端', '调试', '部署'] },
      { mid: '会议', subs: ['项目讨论', '团队同步', '客户沟通'] },
      { mid: '文档', subs: ['编写', '审阅', '整理'] }
    ]
  },
  study: {
    name: '学习',
    subcategories: [
      { mid: '技术', subs: ['编程', '框架', '工具', '架构'] },
      { mid: '外语', subs: ['英语', '日语', '其他'] },
      { mid: '阅读', subs: ['技术书籍', '文学', '论文'] }
    ]
  },
  life: {
    name: '生活',
    subcategories: [
      { mid: '运动', subs: ['健身', '跑步', '球类', '瑜伽'] },
      { mid: '休息', subs: ['睡眠', '冥想', '放松'] },
      { mid: '家务', subs: ['清洁', '烹饪', '整理'] }
    ]
  }
} as const;

/**
 * 获取常用分类的快捷路径
 * @returns 常用分类路径数组
 */
export function getCommonCategoryPaths(): string[] {
  const paths: string[] = [];
  
  Object.values(COMMON_CATEGORIES).forEach(category => {
    category.subcategories.forEach(sub => {
      sub.subs.forEach(subsub => {
        paths.push(buildCategoryPath(category.name, sub.mid, subsub));
      });
      // 也添加两层的路径
      paths.push(buildCategoryPath(category.name, sub.mid));
    });
  });
  
  return paths;
}

/**
 * 搜索匹配的分类路径
 * @param query 搜索关键词
 * @param paths 待搜索的路径列表
 * @returns 匹配的路径列表
 */
export function searchCategories(query: string, paths: string[]): string[] {
  if (!query || query.trim() === '') {
    return paths;
  }
  
  const lowerQuery = query.toLowerCase();
  return paths.filter(path => 
    path.toLowerCase().includes(lowerQuery) ||
    formatCategoryDisplay(path).toLowerCase().includes(lowerQuery)
  );
}






