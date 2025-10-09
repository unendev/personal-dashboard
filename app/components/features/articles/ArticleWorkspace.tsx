'use client'

import { useState, useEffect } from 'react'
import { Plus, FileText, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { TipTapEditor } from './TipTapEditor'

interface Article {
  id: string
  title: string
  subtitle?: string
  content: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  tags: string[]
  slug: string
  updatedAt: string
}

export function ArticleWorkspace() {
  const [articles, setArticles] = useState<Article[]>([])
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // 自动保存定时器
  useEffect(() => {
    if (!currentArticle) return

    const timer = setTimeout(() => {
      if (title !== currentArticle.title || 
          subtitle !== (currentArticle.subtitle || '') || 
          content !== currentArticle.content) {
        autoSave()
      }
    }, 2000) // 2秒后自动保存

    return () => clearTimeout(timer)
  }, [title, subtitle, content, currentArticle])

  // 加载文章列表
  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/articles')
      if (response.ok) {
        const data = await response.json()
        setArticles(data)
        // 默认选中第一篇
        if (data.length > 0 && !currentArticle) {
          selectArticle(data[0])
        }
      }
    } catch (error) {
      console.error('获取文章失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectArticle = (article: Article) => {
    setCurrentArticle(article)
    setTitle(article.title)
    setSubtitle(article.subtitle || '')
    setContent(article.content)
  }

  const createNewArticle = async () => {
    try {
      const newArticle = {
        title: '无标题文档',
        subtitle: '',
        content: '',
        tags: [],
        slug: `untitled-${Date.now()}`,
        status: 'DRAFT' as const
      }

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArticle)
      })

      if (response.ok) {
        const created = await response.json()
        setArticles([created, ...articles])
        selectArticle(created)
      }
    } catch (error) {
      console.error('创建文章失败:', error)
    }
  }

  const autoSave = async () => {
    if (!currentArticle) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/articles/${currentArticle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || '无标题文档',
          subtitle,
          content,
          slug: currentArticle.slug
        })
      })

      if (response.ok) {
        const updated = await response.json()
        setArticles(articles.map(a => a.id === updated.id ? updated : a))
        setCurrentArticle(updated)
      }
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteArticle = async (id: string) => {
    if (!confirm('确定删除这篇文章吗？')) return

    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setArticles(articles.filter(a => a.id !== id))
        if (currentArticle?.id === id) {
          const remaining = articles.filter(a => a.id !== id)
          if (remaining.length > 0) {
            selectArticle(remaining[0])
          } else {
            setCurrentArticle(null)
            setTitle('')
            setSubtitle('')
            setContent('')
          }
        }
      }
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  return (
    <div className="flex h-screen bg-black">
      {/* 左侧文章列表 */}
      <div className="w-64 border-r border-white/10 flex flex-col bg-black/50">
        {/* 顶部按钮 */}
        <div className="p-4 border-b border-white/10">
          <Button
            onClick={createNewArticle}
            className="w-full bg-blue-500 hover:bg-blue-600"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            新建文档
          </Button>
        </div>

        {/* 文章列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-white/40 text-sm text-center py-8">加载中...</div>
          ) : articles.length === 0 ? (
            <div className="text-white/40 text-sm text-center py-8">
              暂无文档
              <br />
              点击上方创建
            </div>
          ) : (
            <div className="space-y-1">
              {articles.map(article => (
                <div
                  key={article.id}
                  className={`group relative rounded-lg p-3 cursor-pointer transition-all ${
                    currentArticle?.id === article.id
                      ? 'bg-blue-500/20 border border-blue-400/50'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                  onClick={() => selectArticle(article)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {article.title || '无标题'}
                      </div>
                      <div className="text-xs text-white/40 mt-1">
                        {new Date(article.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteArticle(article.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧编辑区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentArticle ? (
          <>
            {/* 顶部状态栏 */}
            <div className="h-12 border-b border-white/10 flex items-center justify-between px-6 bg-black/50">
              <div className="text-sm text-white/60">
                {isSaving ? '保存中...' : '已保存'}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={currentArticle.status}
                  onChange={(e) => {
                    // 更新状态
                  }}
                  className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white"
                >
                  <option value="DRAFT">草稿</option>
                  <option value="PUBLISHED">已发布</option>
                  <option value="ARCHIVED">已归档</option>
                </select>
              </div>
            </div>

            {/* 编辑器区域 - 无限滚动 */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-8 py-12">
                {/* 标题 */}
                <input
                  type="text"
                  placeholder="无标题文档"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-5xl font-bold text-white outline-none mb-4 placeholder-white/20"
                />

                {/* 副标题 */}
                <input
                  type="text"
                  placeholder="添加副标题..."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-transparent text-xl text-white/70 outline-none mb-8 placeholder-white/20"
                />

                {/* 编辑器 */}
                <TipTapEditor
                  content={content}
                  onChange={setContent}
                  placeholder="开始撰写..."
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/40">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>选择一篇文档开始编辑</p>
              <p className="text-sm mt-2">或创建新文档</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

