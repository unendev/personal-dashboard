'use client'

import { X, Music } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

interface MusicData {
  title: string
  artist: string
  album: string
  url: string
  coverUrl: string
}

interface MusicCardFormProps {
  data: MusicData
  onChange: (data: MusicData) => void
  onClose: () => void
}

export function MusicCardForm({ data, onChange, onClose }: MusicCardFormProps) {
  const updateField = (field: keyof MusicData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-900/20 p-4 space-y-3">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400">
            <Music className="h-4 w-4" />
          </div>
          <h3 className="font-medium text-purple-300">音乐卡片</h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 表单 */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-purple-300 mb-1">
            歌曲名称 <span className="text-red-400">*</span>
          </label>
          <Input
            value={data.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="例如：晴天"
            className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-400 focus:ring-purple-400/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-1">
              艺术家
            </label>
            <Input
              value={data.artist}
              onChange={(e) => updateField('artist', e.target.value)}
              placeholder="例如：周杰伦"
              className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-400 focus:ring-purple-400/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-300 mb-1">
              专辑
            </label>
            <Input
              value={data.album}
              onChange={(e) => updateField('album', e.target.value)}
              placeholder="例如：叶惠美"
              className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-400 focus:ring-purple-400/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-300 mb-1">
            音乐链接
          </label>
          <Input
            value={data.url}
            onChange={(e) => updateField('url', e.target.value)}
            placeholder="Spotify、Apple Music、网易云等链接"
            className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-400 focus:ring-purple-400/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-300 mb-1">
            封面链接
          </label>
          <Input
            value={data.coverUrl}
            onChange={(e) => updateField('coverUrl', e.target.value)}
            placeholder="专辑封面图片链接"
            className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-400 focus:ring-purple-400/20"
          />
        </div>
      </div>

      {/* 提示 */}
      <div className="pt-2 border-t border-purple-500/30">
        <p className="text-xs text-purple-300">
          💡 填写完音乐信息后，可以继续在上方输入框添加你的感受和想法
        </p>
      </div>
    </div>
  )
}
