/**
 * 标签工具函数 - 标签类型检测和分类
 */

export type TagType = 'hierarchical' | 'emotion' | 'person' | 'year' | 'normal'

/**
 * 自定义标签颜色配置
 * 在这里添加您想要自定义颜色的标签
 */
export const CUSTOM_TAG_COLORS: Record<string, {
  bg: string
  border: string
  text: string
  hover: string
}> = {
  // 示例：为"小约翰可汗"设置特定颜色
  '小约翰可汗': {
    bg: 'bg-gradient-to-r from-rose-500/20 to-red-500/20',
    border: 'border-rose-500/30',
    text: 'text-rose-300',
    hover: 'hover:bg-rose-500/30'
  },
  '迷思': {
    bg: 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20',
    border: 'border-indigo-500/30',
    text: 'text-indigo-300',
    hover: 'hover:bg-indigo-500/30'
  },
  '时光机': {
    bg: 'bg-gradient-to-r from-cyan-500/20 to-sky-500/20',
    border: 'border-cyan-500/30',
    text: 'text-cyan-300',
    hover: 'hover:bg-cyan-500/30'
  },
  // 在此添加更多自定义标签...
}

/**
 * 检测标签类型
 */
export function detectTagType(tag: string): TagType {
  // 层级标签（包含斜杠）
  if (tag.includes('/')) {
    return 'hierarchical'
  }
  
  // 年代标签（4位数字）
  if (/^\d{4}$/.test(tag)) {
    return 'year'
  }
  
  // 感受标签（预定义列表）
  const emotionTags = ['迷思', '时光机', '未来', '回忆', '梦境', '灵感', '顿悟']
  if (emotionTags.includes(tag)) {
    return 'emotion'
  }
  
  // 人物标签（中文人名特征 或 包含特定关键词）
  // 简单判断：包含"可汗"、以大写字母开头的英文、或常见人名后缀
  if (
    tag.includes('可汗') || 
    tag.includes('老师') || 
    tag.includes('先生') ||
    /^[A-Z][a-z]+/.test(tag) // 英文人名
  ) {
    return 'person'
  }
  
  // 默认为普通标签
  return 'normal'
}

/**
 * 获取标签颜色方案（优先使用自定义颜色）
 */
export function getTagColorScheme(type: TagType, tagName?: string) {
  // 优先检查是否有自定义颜色
  if (tagName && CUSTOM_TAG_COLORS[tagName]) {
    return CUSTOM_TAG_COLORS[tagName]
  }
  
  // 否则使用类型默认颜色
  switch (type) {
    case 'hierarchical':
      return {
        bg: 'bg-gradient-to-r from-blue-500/20 to-purple-500/20',
        border: 'border-blue-500/30',
        text: 'text-blue-300',
        hover: 'hover:bg-blue-500/30'
      }
    case 'emotion':
      return {
        bg: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20',
        border: 'border-amber-500/30',
        text: 'text-amber-300',
        hover: 'hover:bg-amber-500/30'
      }
    case 'person':
      return {
        bg: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
        border: 'border-purple-500/30',
        text: 'text-purple-300',
        hover: 'hover:bg-purple-500/30'
      }
    case 'year':
      return {
        bg: 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20',
        border: 'border-teal-500/30',
        text: 'text-teal-300',
        hover: 'hover:bg-teal-500/30'
      }
    case 'normal':
    default:
      return {
        bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20',
        border: 'border-green-500/30',
        text: 'text-green-300',
        hover: 'hover:bg-green-500/30'
      }
  }
}

/**
 * 获取标签类型的描述
 */
export function getTagTypeLabel(type: TagType): string {
  switch (type) {
    case 'hierarchical':
      return '层级标签'
    case 'emotion':
      return '感受标签'
    case 'person':
      return '人物标签'
    case 'year':
      return '年代标签'
    case 'normal':
    default:
      return '普通标签'
  }
}

