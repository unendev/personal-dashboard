/**
 * 标签工具函数 - 标签类型检测和分类
 */

export type TagType = 'hierarchical' | 'emotion' | 'person' | 'year' | 'normal'

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
 * 获取标签类型对应的颜色方案
 */
export function getTagColorScheme(type: TagType) {
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

