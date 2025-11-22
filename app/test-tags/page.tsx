'use client'

import { useState } from 'react'
import { TagInput } from '../components/features/treasure/treasure-input/TagInput'
import { PrimaryCategorySelector } from '../components/features/treasure/treasure-input/PrimaryCategorySelector'

export default function TestTagsPage() {
  const [primaryCategory, setPrimaryCategory] = useState('')
  const [topicTags, setTopicTags] = useState<string[]>([])
  const [suggestions] = useState(['javascript', 'react', 'typescript', 'frontend', 'backend', 'design'])

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white mb-6">标签系统测试</h1>
        
        {/* 主要分类测试 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-4">主要分类</h2>
          <PrimaryCategorySelector
            value={primaryCategory}
            onChange={setPrimaryCategory}
          />
          <div className="mt-4 text-sm text-white/60">
            当前选择：{primaryCategory || '无'}
          </div>
        </div>

        {/* 主题标签测试 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-4">主题标签</h2>
          <TagInput
            tags={topicTags}
            onChange={setTopicTags}
            suggestions={suggestions}
            maxTags={10}
          />
          <div className="mt-4 text-sm text-white/60">
            已选择标签：{topicTags.length > 0 ? topicTags.join(', ') : '无'}
          </div>
        </div>

        {/* 合并结果 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-4">合并结果</h2>
          <div className="space-y-2">
            <div className="text-white">
              最终标签数组：
            </div>
            <pre className="bg-gray-900 p-4 rounded text-sm text-green-400 overflow-x-auto">
              {JSON.stringify([
                ...(primaryCategory ? [primaryCategory] : []),
                ...topicTags
              ], null, 2)}
            </pre>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-300 mb-4">💡 使用说明</h2>
          <ul className="text-sm text-blue-200 space-y-2">
            <li>• 在主题标签输入框中输入文字，按 Enter 或空格添加标签</li>
            <li>• 按 Backspace 删除最后一个标签</li>
            <li>• 点击标签上的 ✕ 删除该标签</li>
            <li>• 支持层级标签，使用 / 分隔，如 tech/frontend</li>
            <li>• 输入时会显示建议列表（如果有匹配的）</li>
          </ul>
        </div>
      </div>
    </div>
  )
}


