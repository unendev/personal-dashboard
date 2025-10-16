'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Hash, Sparkles, User, Calendar, Layers } from 'lucide-react'
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['hierarchy', 'emotion']))

  // 按类型分组标签
  const groupedTags = useMemo(() => {
    const groups = {
      hierarchy: [] as TagWithCount[],
      emotion: [] as TagWithCount[],
      person: [] as TagWithCount[],
      year: [] as TagWithCount[],
      normal: [] as TagWithCount[]
    }

    tags.forEach(tag => {
      const type = detectTagType(tag.name)
      if (type === 'hierarchical') {
        groups.hierarchy.push(tag)
      } else if (type === 'emotion') {
        groups.emotion.push(tag)
      } else if (type === 'person') {
        groups.person.push(tag)
      } else if (type === 'year') {
        groups.year.push(tag)
      } else {
        groups.normal.push(tag)
      }
    })

    return groups
  }, [tags])

  // 构建层级树
  const hierarchyTree = useMemo(() => {
    const tree: Record<string, Record<string, string[]>> = {}

    groupedTags.hierarchy.forEach(tag => {
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
  }, [groupedTags.hierarchy])

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
      {/* 层级标签树 */}
      {Object.keys(hierarchyTree).length > 0 && (
        <div className="bg-[#0d1117] rounded-xl p-4 border border-white/10">
          <button
            onClick={() => toggleGroup('hierarchy')}
            className="flex items-center gap-2 mb-3 w-full hover:opacity-80 transition-opacity"
          >
            {expandedGroups.has('hierarchy') ? (
              <ChevronDown className="w-4 h-4 text-blue-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-blue-400" />
            )}
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">层级标签树</h3>
            <span className="text-xs text-white/40 ml-auto">{groupedTags.hierarchy.length} 个</span>
          </button>

          {expandedGroups.has('hierarchy') && (
            <div className="space-y-1 pl-2">
              {Object.entries(hierarchyTree).map(([level1, level2s]) => (
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

      {/* 感受标签 */}
      {groupedTags.emotion.length > 0 && (
        <div className="bg-[#161b22] rounded-xl p-4 border border-white/10">
          <button
            onClick={() => toggleGroup('emotion')}
            className="flex items-center gap-2 mb-3 w-full hover:opacity-80 transition-opacity"
          >
            {expandedGroups.has('emotion') ? (
              <ChevronDown className="w-4 h-4 text-amber-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-amber-400" />
            )}
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">感受标签</h3>
            <span className="text-xs text-white/40 ml-auto">{groupedTags.emotion.length} 个</span>
          </button>

          {expandedGroups.has('emotion') && (
            <div className="flex flex-wrap gap-2">
              {groupedTags.emotion.map(tag => (
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

      {/* 人物标签 */}
      {groupedTags.person.length > 0 && (
        <div className="bg-[#161b22] rounded-xl p-4 border border-white/10">
          <button
            onClick={() => toggleGroup('person')}
            className="flex items-center gap-2 mb-3 w-full hover:opacity-80 transition-opacity"
          >
            {expandedGroups.has('person') ? (
              <ChevronDown className="w-4 h-4 text-purple-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-purple-400" />
            )}
            <User className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">人物标签</h3>
            <span className="text-xs text-white/40 ml-auto">{groupedTags.person.length} 个</span>
          </button>

          {expandedGroups.has('person') && (
            <div className="flex flex-wrap gap-2">
              {groupedTags.person.map(tag => (
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

      {/* 年代标签 */}
      {groupedTags.year.length > 0 && (
        <div className="bg-[#161b22] rounded-xl p-4 border border-white/10">
          <button
            onClick={() => toggleGroup('year')}
            className="flex items-center gap-2 mb-3 w-full hover:opacity-80 transition-opacity"
          >
            {expandedGroups.has('year') ? (
              <ChevronDown className="w-4 h-4 text-teal-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-teal-400" />
            )}
            <Calendar className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">年代标签</h3>
            <span className="text-xs text-white/40 ml-auto">{groupedTags.year.length} 个</span>
          </button>

          {expandedGroups.has('year') && (
            <div className="flex flex-wrap gap-2">
              {groupedTags.year.sort((a, b) => b.name.localeCompare(a.name)).map(tag => (
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

      {/* 普通标签 */}
      {groupedTags.normal.length > 0 && (
        <div className="bg-[#161b22] rounded-xl p-4 border border-white/10">
          <button
            onClick={() => toggleGroup('normal')}
            className="flex items-center gap-2 mb-3 w-full hover:opacity-80 transition-opacity"
          >
            {expandedGroups.has('normal') ? (
              <ChevronDown className="w-4 h-4 text-green-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-green-400" />
            )}
            <Hash className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-white">通用标签</h3>
            <span className="text-xs text-white/40 ml-auto">{groupedTags.normal.length} 个</span>
          </button>

          {expandedGroups.has('normal') && (
            <div className="flex flex-wrap gap-2">
              {groupedTags.normal.map(tag => (
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

