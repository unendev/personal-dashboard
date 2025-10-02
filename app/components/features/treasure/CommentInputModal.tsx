'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { X } from 'lucide-react'

interface CommentInputModalProps {
  isOpen: boolean
  onClose: () => void
  treasureId: string
  treasureTitle: string
  onCommentAdded?: () => void
}

export function CommentInputModal({ 
  isOpen, 
  onClose, 
  treasureId, 
  treasureTitle,
  onCommentAdded 
}: CommentInputModalProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/treasures/${treasureId}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: content.trim() })
      })

      if (response.ok) {
        setContent('')
        onCommentAdded?.()
        onClose()
      } else {
        console.error('提交回答失败')
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4">
        <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6">
          {/* 标题栏 */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-lg">写下你的回答</h3>
              <p className="text-white/60 text-sm mt-1 line-clamp-1">{treasureTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 输入表单 */}
          <form onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写下你的回答..."
              rows={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none"
              autoFocus
            />
            
            <div className="flex justify-end gap-3 mt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="ghost"
                className="text-white/60 hover:text-white"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
              >
                {isSubmitting ? '发送中...' : '发送'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

