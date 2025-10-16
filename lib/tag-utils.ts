/**
 * 标签工具函数 - 简单的两类标签系统
 * 
 * 设计理念：
 * - 导航标签（包含 /）：用于结构化知识组织
 * - 自由标签（其他）：随意打标签，不限定语义
 * - 系统自动判断，用户无需手动分类
 */

export type TagType = 'navigation' | 'free'

/**
 * 标签颜色配置 - 只有两种
 * 
 * 调整颜色：直接修改下面的配置即可
 */
export const TAG_COLORS = {
  // 导航标签（层级标签，如：视野/游戏开发/宣发）
  navigation: {
    bg: 'bg-gradient-to-r from-blue-500/20 to-purple-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    hover: 'hover:bg-blue-500/30'
  },
  
  // 自由标签（其他所有标签）
  free: {
    bg: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    hover: 'hover:bg-emerald-500/30'
  }
}

/**
 * 检测标签类型（自动判断，无需用户操作）
 */
export function detectTagType(tag: string): TagType {
  // 包含斜杠 = 导航标签
  // 其他 = 自由标签
  return tag.includes('/') ? 'navigation' : 'free'
}

/**
 * 获取标签颜色方案
 */
export function getTagColorScheme(type: TagType) {
  return TAG_COLORS[type]
}

/**
 * 获取标签类型的描述
 */
export function getTagTypeLabel(type: TagType): string {
  return type === 'navigation' ? '导航标签' : '自由标签'
}

