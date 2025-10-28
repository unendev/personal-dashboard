'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'

interface CategoryNode {
  id: string
  name: string
  children?: CategoryNode[]
}

interface CustomCategories {
  [key: string]: string[]
}

interface ThreeLayerCategorySelectorProps {
  value: string
  onChange: (path: string) => void
  className?: string
}

export function ThreeLayerCategorySelector({
  value,
  onChange,
  className = ''
}: ThreeLayerCategorySelectorProps) {
  // 分类数据状态
  const [allCategories, setAllCategories] = useState<CategoryNode[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 选择状态
  const [selectedTop, setSelectedTop] = useState('')
  const [selectedMid, setSelectedMid] = useState('')
  const [selectedSub, setSelectedSub] = useState('')

  // 自定义分类状态
  const [customCategories, setCustomCategories] = useState<CustomCategories>({})
  const [showAddTopDialog, setShowAddTopDialog] = useState(false)
  const [showAddMidDialog, setShowAddMidDialog] = useState(false)
  const [newTopName, setNewTopName] = useState('')
  const [newMidName, setNewMidName] = useState('')
  const [showAddSubDialog, setShowAddSubDialog] = useState(false)
  const [newSubName, setNewSubName] = useState('')

  // 加载分类数据
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/log-categories')
        const data = await response.json()
        setAllCategories(data)
      } catch (error) {
        console.error('加载分类失败:', error)
        setAllCategories([])
      } finally {
        setIsLoading(false)
      }
    }

    loadCategories()

    // 加载自定义分类
    const saved = localStorage.getItem('customCategories')
    if (saved) {
      try {
        setCustomCategories(JSON.parse(saved))
      } catch (e) {
        console.error('加载自定义分类失败:', e)
      }
    }
  }, [])

  // 解析路径并更新选择状态
  useEffect(() => {
    if (value && allCategories.length > 0) {
      const parts = value.split('/')
      setSelectedTop(parts[0] || '')
      setSelectedMid(parts[1] || '')
      setSelectedSub(parts[2] || '')
    }
  }, [value, allCategories])

  // 获取顶层分类
  const topCategories = [
    ...allCategories.map(cat => ({ name: cat.name, id: cat.id, isCustom: false })),
    ...Object.keys(customCategories)
      .filter(key => !key.includes('/'))
      .map(name => ({ name, id: `custom-${name}`, isCustom: true }))
  ]

  // 获取中层分类
  const getMidCategories = () => {
    // 从真实数据中查找
    const topCat = allCategories.find(cat => cat.name === selectedTop)
    const fromData = topCat?.children || []

    // 从自定义中查找
    const customMids = (customCategories[selectedTop] || [])
      .filter(m => !m.includes('/'))
      .map(mid => ({
        name: mid,
        isCustom: true
      }))

    return [
      ...fromData.map(cat => ({ name: cat.name, isCustom: false })),
      ...customMids
    ]
  }

  // 获取底层分类
  const getSubCategories = () => {
    // 从真实数据中查找
    const topCat = allCategories.find(cat => cat.name === selectedTop)
    const midCat = topCat?.children?.find(cat => cat.name === selectedMid)
    const fromData = midCat?.children?.map(cat => ({ name: cat.name, isCustom: false })) || []

    // 从自定义中查找 (存储格式: "顶层/中层/底层")
    const key = `${selectedTop}/${selectedMid}`
    const customSubs = (customCategories[key] || []).map(sub => ({
      name: sub,
      isCustom: true
    }))

    return [...fromData, ...customSubs]
  }

  const midCategories = getMidCategories()
  const subCategories = getSubCategories()

  // 构建路径字符串
  const buildPath = (top: string, mid: string, sub?: string) => {
    if (sub) return `${top}/${mid}/${sub}`
    return `${top}/${mid}`
  }

  // 选择顶层
  const handleTopSelect = (top: string) => {
    setSelectedTop(top)
    setSelectedMid('')
    setSelectedSub('')

    const firstMid = midCategories[0]
    if (firstMid) {
      setSelectedMid(firstMid.name)
      onChange(buildPath(top, firstMid.name))
    }
  }

  // 选择中层
  const handleMidSelect = (mid: string) => {
    setSelectedMid(mid)
    setSelectedSub('')

    const firstSub = subCategories[0]
    if (firstSub) {
      setSelectedSub(firstSub.name)
      onChange(buildPath(selectedTop, mid, firstSub.name))
    } else {
      onChange(buildPath(selectedTop, mid))
    }
  }

  // 选择底层
  const handleSubSelect = (sub: string) => {
    setSelectedSub(sub)
    onChange(buildPath(selectedTop, selectedMid, sub))
  }

  // 添加顶层
  const addTopCategory = () => {
    if (!newTopName.trim()) return
    if (topCategories.find(cat => cat.name === newTopName)) {
      alert('该分类已存在')
      return
    }

    const updated = { ...customCategories, [newTopName]: [] }
    setCustomCategories(updated)
    localStorage.setItem('customCategories', JSON.stringify(updated))
    setNewTopName('')
    setShowAddTopDialog(false)
  }

  // 添加中层
  const addMidCategory = () => {
    if (!selectedTop || !newMidName.trim()) return
    if (midCategories.find(cat => cat.name === newMidName)) {
      alert('该分类已存在')
      return
    }

    const updated = {
      ...customCategories,
      [selectedTop]: [...(customCategories[selectedTop] || []), newMidName]
    }
    setCustomCategories(updated)
    localStorage.setItem('customCategories', JSON.stringify(updated))
    setNewMidName('')
    setShowAddMidDialog(false)
  }

  // 添加底层
  const addSubCategory = () => {
    if (!selectedMid || !newSubName.trim()) return
    if (subCategories.find(cat => cat.name === newSubName)) {
      alert('该分类已存在')
      return
    }

    const key = `${selectedTop}/${selectedMid}`
    const updated = {
      ...customCategories,
      [key]: [...(customCategories[key] || []), newSubName]
    }
    setCustomCategories(updated)
    localStorage.setItem('customCategories', JSON.stringify(updated))
    setNewSubName('')
    setShowAddSubDialog(false)
  }

  // 删除分类
  const deleteCategory = (type: 'top' | 'mid' | 'sub', name: string) => {
    if (!confirm(`确定删除"${name}"吗？`)) return

    const updated = { ...customCategories }
    if (type === 'top') {
      delete updated[name]
      Object.keys(updated).forEach(key => {
        if (key.startsWith(`${name}/`)) {
          delete updated[key]
        }
      })
    } else if (type === 'mid' && selectedTop) {
      updated[selectedTop] = (updated[selectedTop] || []).filter(m => m !== name)
      Object.keys(updated).forEach(key => {
        if (key.startsWith(`${selectedTop}/${name}/`)) {
          delete updated[key]
        }
      })
    } else if (type === 'sub' && selectedTop && selectedMid) {
      const key = `${selectedTop}/${selectedMid}`
      updated[key] = (updated[key] || []).filter(s => s !== name)
      if (!updated[key] || updated[key].length === 0) {
        delete updated[key]
      }
    }

    setCustomCategories(updated)
    localStorage.setItem('customCategories', JSON.stringify(updated))
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500">加载分类中...</div>
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 当前选择显示 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          分类路径
        </label>
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-base text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
            <span>{selectedTop || '未选择'}</span>
            {selectedMid && (
              <>
                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                <span>{selectedMid}</span>
              </>
            )}
            {selectedSub && (
              <>
                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                <span>{selectedSub}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 三列并排布局 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 顶层分类 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              顶层分类
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowAddTopDialog(true)}
              className="h-6 px-2 text-xs gap-1"
            >
              <Plus className="h-3 w-3" />
              新增
            </Button>
          </div>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {topCategories.map((cat) => (
              <div
                key={cat.id}
                className="relative"
                onMouseEnter={(e) => {
                  const btn = e.currentTarget.querySelector('[data-delete-btn]')
                  if (btn) btn.classList.remove('hidden')
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget.querySelector('[data-delete-btn]')
                  if (btn) btn.classList.add('hidden')
                }}
              >
                <button
                  onClick={() => handleTopSelect(cat.name)}
                  className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all text-left ${
                    selectedTop === cat.name
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.name}
                </button>
                <button
                  onClick={() => deleteCategory('top', cat.name)}
                  data-delete-btn
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-all shadow-lg hidden"
                  title="删除此分类"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* 新增顶层对话框 */}
          {showAddTopDialog && (
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
              <div className="flex gap-2">
                <Input
                  value={newTopName}
                  onChange={(e) => setNewTopName(e.target.value)}
                  placeholder="输入新分类名..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTopCategory()
                    if (e.key === 'Escape') setShowAddTopDialog(false)
                  }}
                  autoFocus
                  className="text-sm"
                />
                <Button size="sm" onClick={addTopCategory} className="bg-blue-600 hover:bg-blue-700 text-white px-3">
                  确定
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddTopDialog(false)} className="px-3">
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 中层分类 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <ChevronDown className="h-3 w-3 rotate-[-90deg]" />
              中层分类
            </div>
            {selectedTop && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowAddMidDialog(true)}
                className="h-6 px-2 text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                新增
              </Button>
            )}
          </div>
          {selectedTop ? (
            <>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {midCategories.map((cat) => (
                  <div
                    key={cat.name}
                    className="relative"
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget.querySelector('[data-delete-btn]')
                      if (btn) btn.classList.remove('hidden')
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget.querySelector('[data-delete-btn]')
                      if (btn) btn.classList.add('hidden')
                    }}
                  >
                    <button
                      onClick={() => handleMidSelect(cat.name)}
                      className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all text-left ${
                        selectedMid === cat.name
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {cat.name}
                    </button>
                    <button
                      onClick={() => deleteCategory('mid', cat.name)}
                      data-delete-btn
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-all shadow-lg hidden"
                      title="删除此分类"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* 新增中层对话框 */}
              {showAddMidDialog && (
                <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                  <div className="flex gap-2">
                    <Input
                      value={newMidName}
                      onChange={(e) => setNewMidName(e.target.value)}
                      placeholder="输入新分类名..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addMidCategory()
                        if (e.key === 'Escape') setShowAddMidDialog(false)
                      }}
                      autoFocus
                      className="text-sm"
                    />
                    <Button size="sm" onClick={addMidCategory} className="bg-blue-600 hover:bg-blue-700 text-white px-3">
                      确定
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddMidDialog(false)} className="px-3">
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
              请先选择顶层分类
            </div>
          )}
        </div>

        {/* 底层分类 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <ChevronDown className="h-3 w-3 rotate-[-90deg]" />
              底层分类
            </div>
            {selectedMid && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowAddSubDialog(true)}
                className="h-6 px-2 text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                新增
              </Button>
            )}
          </div>
          {selectedMid ? (
            <>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {subCategories.map((sub) => (
                  <div
                    key={sub.name}
                    className="relative"
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget.querySelector('[data-delete-btn]')
                      if (btn) btn.classList.remove('hidden')
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget.querySelector('[data-delete-btn]')
                      if (btn) btn.classList.add('hidden')
                    }}
                  >
                    <button
                      onClick={() => handleSubSelect(sub.name)}
                      className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all text-left ${
                        selectedSub === sub.name
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {sub.name}
                    </button>
                    <button
                      onClick={() => deleteCategory('sub', sub.name)}
                      data-delete-btn
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-all shadow-lg hidden"
                      title="删除此分类"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* 新增底层对话框 */}
              {showAddSubDialog && (
                <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                  <div className="flex gap-2">
                    <Input
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      placeholder="输入新分类名..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addSubCategory()
                        if (e.key === 'Escape') setShowAddSubDialog(false)
                      }}
                      autoFocus
                      className="text-sm"
                    />
                    <Button size="sm" onClick={addSubCategory} className="bg-blue-600 hover:bg-blue-700 text-white px-3">
                      确定
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddSubDialog(false)} className="px-3">
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
              请先选择中层分类
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
