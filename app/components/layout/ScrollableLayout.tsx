'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LinuxDoPost, LinuxDoReport } from '@/types/linuxdo';
import { RedditPost, RedditReport } from '@/types/reddit';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

type SourceType = 'all' | 'linuxdo' | 'reddit';

const ScrollableLayout = () => {
  const [linuxdoData, setLinuxdoData] = useState<LinuxDoReport | null>(null);
  const [redditData, setRedditData] = useState<RedditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPost, setHoveredPost] = useState<(LinuxDoPost | RedditPost) | null>(null);
  const [activeSource, setActiveSource] = useState<SourceType>('all');
  const [showAIChat, setShowAIChat] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [linuxdoRes, redditRes] = await Promise.all([
          fetch('/api/linuxdo'),
          fetch('/api/reddit')
        ]);

        if (linuxdoRes.ok) {
          const data = await linuxdoRes.json();
          setLinuxdoData(data);
        }

        if (redditRes.ok) {
          const data = await redditRes.json();
          setRedditData(data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 处理鼠标悬停
  const handleMouseEnter = (post: LinuxDoPost | RedditPost, event: React.MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPost(post);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const closeDetail = () => {
    setHoveredPost(null);
  };

  // 获取显示的帖子
  const displayedPosts = React.useMemo(() => {
    const allPosts: Array<(LinuxDoPost | RedditPost) & { source: 'linuxdo' | 'reddit' }> = [];
    
    if (activeSource === 'all' || activeSource === 'linuxdo') {
      linuxdoData?.posts.forEach(post => {
        allPosts.push({ ...post, source: 'linuxdo' as const });
      });
    }
    
    if (activeSource === 'all' || activeSource === 'reddit') {
      redditData?.posts.forEach(post => {
        allPosts.push({ ...post, source: 'reddit' as const });
      });
    }
    
    return allPosts;
  }, [linuxdoData, redditData, activeSource]);

  const getPostTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      '技术问答': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      '技术讨论': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      '资源分享': 'bg-green-500/10 text-green-400 border-green-500/30',
      '新闻资讯': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      '新闻分享': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      '教程指南': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      '项目展示': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
      '优惠活动': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    };
    return colors[type] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  };

  const getValueIcon = (value: string) => {
    return value === '高' ? '⭐' : value === '中' ? '◆' : '○';
  };

  const getSourceBadge = (source: 'linuxdo' | 'reddit') => {
    return source === 'linuxdo' 
      ? <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs border border-blue-500/30">🐧 Linux.do</span>
      : <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-xs border border-orange-500/30">🔴 Reddit</span>;
  };

  if (loading) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60 mx-auto mb-4"></div>
          <p className="text-white/60">加载中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen overflow-hidden">
      {/* 顶部切换栏 */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSource('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSource === 'all'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              📊 全部源
            </button>
            <button
              onClick={() => setActiveSource('linuxdo')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSource === 'linuxdo'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              🐧 Linux.do
            </button>
            <button
              onClick={() => setActiveSource('reddit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSource === 'reddit'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              🔴 Reddit
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-white/60">
            <span>共 {displayedPosts.length} 篇</span>
            <button
              onClick={() => setShowAIChat(!showAIChat)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 
                       text-purple-400 border border-purple-500/30 hover:border-purple-500/50 
                       transition-all flex items-center gap-2"
            >
              <span>💬</span>
              <span>AI助手</span>
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="pt-16 px-6 pb-6 h-screen overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {/* 网格布局 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedPosts.map((post) => (
              <div
                key={post.id}
                onMouseEnter={(e) => handleMouseEnter(post, e)}
                onMouseLeave={handleMouseLeave}
                className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 
                         hover:border-white/20 transition-all duration-200 cursor-pointer group 
                         hover:shadow-lg hover:scale-[1.02]"
              >
                <div className="flex flex-col h-full">
                  {/* 标签行 */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {getSourceBadge(post.source)}
                    <span className={`px-2 py-0.5 rounded text-xs border ${getPostTypeColor(post.analysis.post_type)}`}>
                      {post.analysis.post_type}
                    </span>
                    <span className="text-xs">
                      {getValueIcon(post.analysis.value_assessment)}
                    </span>
                  </div>

                  {/* 标题 */}
                  <h3 className="text-base font-semibold text-white group-hover:text-blue-400 
                               transition-colors mb-2 line-clamp-2 flex-shrink-0">
                    {post.title}
                  </h3>

                  {/* 核心问题 */}
                  <p className="text-sm text-white/60 line-clamp-3 flex-1">
                    {post.analysis.core_issue}
                  </p>

                  {/* 关键信息预览 */}
                  {post.analysis.key_info && post.analysis.key_info.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>💡</span>
                        <span>{post.analysis.key_info.length} 个关键点</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 空状态 */}
          {displayedPosts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-white/40">暂无数据</p>
            </div>
          )}
        </div>
      </div>

      {/* AI对话悬浮窗 */}
      {showAIChat && (
        <div className="fixed bottom-6 right-6 z-40 w-96 h-[600px] bg-gray-900 rounded-2xl 
                      border border-white/20 shadow-2xl overflow-hidden flex flex-col animate-fade-in">
          {/* 头部 */}
          <div className="flex-shrink-0 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 
                        border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <span className="text-white font-semibold">AI 对话助手</span>
            </div>
            <button
              onClick={() => setShowAIChat(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full 
                       bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* 内容区 */}
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500/20 to-pink-500/20 
                            rounded-full flex items-center justify-center border-2 border-purple-500/30">
                <span className="text-4xl">🤖</span>
              </div>
              <div>
                <p className="text-white/70 text-sm mb-2">AI对话功能</p>
                <p className="text-white/40 text-xs">即将推出</p>
              </div>
              <div className="text-xs text-white/30 space-y-1">
                <p>✨ 智能问答</p>
                <p>📚 内容总结</p>
                <p>🔍 深度解析</p>
                <p>💡 个性推荐</p>
              </div>
            </div>
          </div>

          {/* 底部输入框占位 */}
          <div className="flex-shrink-0 p-4 border-t border-white/10">
            <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-lg border border-white/10">
              <input
                type="text"
                placeholder="即将开放..."
                disabled
                className="flex-1 bg-transparent text-white/40 text-sm outline-none"
              />
              <button
                disabled
                className="px-3 py-1 bg-purple-500/20 text-purple-400/50 rounded-lg text-sm"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 悬停详情面板 */}
      {hoveredPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeDetail}
        >
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          
          {/* 内容面板 */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-gray-900 rounded-2xl border border-white/20 shadow-2xl 
                     max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-fade-in"
          >
            {/* 头部 */}
            <div className="flex-shrink-0 p-6 border-b border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs border ${
                      getPostTypeColor(hoveredPost.analysis.post_type)
                    }`}>
                      {hoveredPost.analysis.post_type}
                    </span>
                    <span className="text-sm">
                      {getValueIcon(hoveredPost.analysis.value_assessment)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    {hoveredPost.title}
                  </h2>
                  <p className="text-sm text-white/70">
                    {hoveredPost.analysis.core_issue}
                  </p>
                </div>
                <button
                  onClick={closeDetail}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full 
                           bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {hoveredPost.analysis.detailed_analysis ? (
                <div className="markdown-content prose prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {hoveredPost.analysis.detailed_analysis}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>💡</span>
                    关键信息
                  </h3>
                  <ul className="space-y-2">
                    {hoveredPost.analysis.key_info.map((info, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-white/80">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center 
                                       bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span>{info}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 底部 */}
            <div className="flex-shrink-0 p-4 border-t border-white/10 flex justify-end">
              <a
                href={hoveredPost.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 
                         hover:from-blue-600 hover:to-purple-600
                         text-white font-medium rounded-lg transition-all duration-200 
                         flex items-center gap-2"
              >
                查看原文
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ScrollableLayout;
