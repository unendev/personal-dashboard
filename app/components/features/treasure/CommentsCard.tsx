'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Answer {
  id: string
  userId: string
  content: string
  createdAt: string
}

interface Treasure {
  id: string
  title: string
  _count?: {
    answers: number
  }
}

interface CommentsCardProps {
  treasure: Treasure
}

export function CommentsCard({ treasure }: CommentsCardProps) {
  const [answers, setAnswers] = useState<Answer[]>([])
  const [answersCount, setAnswersCount] = useState(treasure._count?.answers || 0)

  // 获取回答列表
  const fetchAnswers = useCallback(async () => {
    try {
      const response = await fetch(`/api/treasures/${treasure.id}/answers`)
      if (response.ok) {
        const data = await response.json()
        setAnswers(data)
        setAnswersCount(data.length)
      }
    } catch (error) {
      console.error('Error fetching answers:', error)
    }
  }, [treasure.id])

  // 初始加载回答
  useEffect(() => {
    fetchAnswers()
  }, [fetchAnswers])

  // 删除回答（乐观更新）
  const handleDeleteAnswer = async (answerId: string) => {
    const deletedAnswer = answers.find(a => a.id === answerId)
    if (!deletedAnswer) return

    setAnswers(prev => prev.filter(a => a.id !== answerId))
    setAnswersCount(prev => Math.max(0, prev - 1))

    try {
      const response = await fetch(`/api/treasures/${treasure.id}/answers/${answerId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        setAnswers(prev => [deletedAnswer, ...prev])
        setAnswersCount(prev => prev + 1)
        console.error('删除回答失败')
      }
    } catch (error) {
      setAnswers(prev => [deletedAnswer, ...prev])
      setAnswersCount(prev => prev + 1)
      console.error('Error deleting answer:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return `${diffInMinutes}分钟前`
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`
    } else if (diffInHours < 48) {
      return '昨天'
    } else if (diffInHours < 168) {
      const days = Math.floor(diffInHours / 24)
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  return (
    <div className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm p-6 shadow-lg h-fit lg:sticky lg:top-4">
      {/* 标题栏 */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
        <MessageCircle className="h-5 w-5 text-blue-400" />
        <h3 className="text-white font-medium">评论</h3>
        <span className="text-white/60 text-sm">({answersCount})</span>
      </div>

      {/* 回答列表 */}
      <div className="space-y-3 max-h-[calc(100vh-24rem)] overflow-y-auto custom-scrollbar">
        {answers.length > 0 ? (
          answers.map((answer) => (
            <div
              key={answer.id}
              className="bg-white/5 rounded-lg p-3 border border-white/10 group/answer hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-white/90 text-sm flex-1 break-words">{answer.content}</p>
                <button
                  onClick={() => handleDeleteAnswer(answer.id)}
                  className="opacity-0 group-hover/answer:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all text-red-400 hover:text-red-300 shrink-0"
                  title="删除回答"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-white/40 text-xs mt-2">{formatDate(answer.createdAt)}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 mx-auto text-white/20 mb-3" />
            <p className="text-white/40 text-sm">暂无评论</p>
            <p className="text-white/30 text-xs mt-1">来抢沙发吧~</p>
          </div>
        )}
      </div>
    </div>
  )
}

