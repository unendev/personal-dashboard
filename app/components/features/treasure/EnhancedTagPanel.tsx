'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Hash, Sparkles, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HierarchicalTag } from '@/app/components/shared/HierarchicalTag'
import { detectTagType } from '@/lib/tag-utils'

interface TagWithCount {
  name: string
  count: number
}

interface EnhancedTagPanelProps {
  tags: TagWithCount[]
  selectedTag?: string
  onTagClick: (tag: string) => void
}

export function EnhancedTagPanel({ tags, selectedTag, onTagClick }: EnhancedTagPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['navigation', 'free']))

  // 按类型分组标签（只有两类：导航 vs 自由）
  const groupedTags = useMemo(() => {
    const groups = {
      navigation: [] as TagWithCount[],
      free: [] as TagWithCount[]
    }

    tags.forEach(tag => {
      const type = detectTagType(tag.name)
      groups[type].push(tag)
    })

    return groups
  }, [tags])

  // 构建导航标签树
  const navigationTree = useMemo(() => {
    const tree: Record<string, Record<string, string[]>> = {}

    groupedTags.navigation.forEach(tag => {
      const parts = tag.name.split('/')
      if (parts.length === 1) {
        // 一级标签
        if (!tree[parts[0]]) tree[parts[0]] = {}
      } else if (parts.length === 2) {
        // 二级标签
        if (!tree[parts[0]]) tree[parts[0]] = {}
        if (!tree[parts[0]][parts[1]]) tree[parts[0]][parts[1]] = []
      } else if (parts.length >= 3) {
        // 三级标签
        if (!tree[parts[0]]) tree[parts[0]] = {}
        if (!tree[parts[0]][parts[1]]) tree[parts[0]][parts[1]] = []
        tree[parts[0]][parts[1]].push(tag.name)
      }
    })

    return tree
  }, [groupedTags.navigation])

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const toggleNode = (node: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(node)) {
      newExpanded.delete(node)
    } else {
      newExpanded.add(node)
    }
    setExpandedNodes(newExpanded)
  }

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(group)) {
      newExpanded.delete(group)
    } else {
      newExpanded.add(group)
    }
    setExpandedGroups(newExpanded)
  }

  const getTagCount = (tagName: string) => {
    return tags.find(t => t.name === tagName)?.count || 0
  }

  return (
    <div className="space-y-4">
      {/* 导航标签树 */}
      {Object.keys(navigationTree).length > 0 && (
        <div className="bg-[#0d1117] rounded-xl p-4 border border-white/10">
          <button
            onClick={() => toggleGroup('navigation')}
            className="flex items-center gap-2 mb-3 w-full hover:opacity-80 transition-opacity"
          >
            {expandedGroups.has('navigation') ? (
              <ChevronDown className="w-4 h-4 text-blue-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-blue-400" />
            )}
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">导航标签</h3>
            <span className="text-xs text-white/40 ml-auto">{groupedTags.navigation.length} 个</span>
          </button>

          {expandedGroups.has('navigation') && (
            <div className="space-y-1 pl-2">
              {Object.entries(navigationTree).map(([level1, level2s]) => (
                <div key={level1} className="space-y-1">
                  <button
                    onClick={() => {
                      toggleNode(level1)
                      onTagClick(level1)
                    }}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-white/5 transition-colors text-left",
                      selectedTag === level1 && "bg-blue-500/20"
                    )}
                  >
                    {Object.keys(level2s).length > 0 && (
                      expandedNodes.has(level1) ? (
                        <ChevronDown className="w-3 h-3 text-white/60" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-white/60" />
                      )
                    )}
                    {Object.keys(level2s).length === 0 && <div className="w-3" />}
                    <Hash className="w-3 h-3 text-blue-400" />
                    <span className="text-sm text-white/90">{level1}</span>
                    <span className="text-xs text-white/40 ml-auto">{getTagCount(level1)}</span>
                  </button>

                  {expandedNodes.has(level1) && Object.entries(level2s).map(([level2, level3s]) => (
                    <div key={`${level1}/${level2}`} className="pl-6 space-y-1">
                      <button
                        onClick={() => {
                          toggleNode(`${level1}/${level2}`)
                          onTagClick(`${level1}/${level2}`)
                        }}
                        className={cn(
                          "flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-white/5 transition-colors text-left",
                          selectedTag === `${level1}/${level2}` && "bg-blue-500/20"
                        )}
                      >
                        {level3s.length > 0 && (
                          expandedNodes.has(`${level1}/${level2}`) ? (
                            <ChevronDown className="w-3 h-3 text-white/60" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-white/60" />
                          )
                        )}
                        {level3s.length === 0 && <div className="w-3" />}
                        <Hash className="w-3 h-3 text-blue-300" />
                        <span className="text-sm text-white/80">{level2}</span>
                        <span className="text-xs text-white/40 ml-auto">{getTagCount(`${level1}/${level2}`)}</span>
                      </button>

                      {expandedNodes.has(`${level1}/${level2}`) && level3s.map(level3 => (
                        <button
                          key={level3}
                          onClick={() => onTagClick(level3)}
                          className={cn(
                            "flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-white/5 transition-colors text-left pl-6",
                            selectedTag === level3 && "bg-blue-500/20"
                          )}
                        >
                          <Hash className="w-3 h-3 text-blue-200" />
                          <span className="text-sm text-white/70">{level3.split('/')[2]}</span>
                          <span className="text-xs text-white/40 ml-auto">{getTagCount(level3)}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 自由标签云 */}
      {groupedTags.free.length > 0 && (
        <div className="bg-[#161b22] rounded-xl p-4 border border-white/10">
          <button
            onClick={() => toggleGroup('free')}
            className="flex items-center gap-2 mb-3 w-full hover:opacity-80 transition-opacity"
          >
            {expandedGroups.has('free') ? (
              <ChevronDown className="w-4 h-4 text-emerald-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-emerald-400" />
            )}
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">自由标签</h3>
            <span className="text-xs text-white/40 ml-auto">{groupedTags.free.length} 个</span>
          </button>

          {expandedGroups.has('free') && (
            <div className="flex flex-wrap gap-2">
              {groupedTags.free.map(tag => (
                <HierarchicalTag
                  key={tag.name}
                  tag={tag.name}
                  variant="cloud"
                  size="sm"
                  isSelected={selectedTag === tag.name}
                  onClick={() => onTagClick(tag.name)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

