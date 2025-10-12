'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LinuxDoPost, LinuxDoReport } from '@/types/linuxdo';
import { RedditPost, RedditReport } from '@/types/reddit';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

const ScrollableLayout = () => {
  const [linuxdoData, setLinuxdoData] = useState<LinuxDoReport | null>(null);
  const [redditData, setRedditData] = useState<RedditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPost, setHoveredPost] = useState<(LinuxDoPost | RedditPost) | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [activeSection, setActiveSection] = useState<string>('linuxdo');
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

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
      const rect = event.currentTarget.getBoundingClientRect();
      setHoverPosition({ x: rect.left, y: rect.top });
      setHoveredPost(post);
    }, 300); // 300ms延迟，避免误触
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const closeDetail = () => {
    setHoveredPost(null);
  };

  // 大纲跳转
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  // 获取Reddit按板块分组
  const groupedReddit = React.useMemo(() => {
    if (!redditData) return {};
    const groups: Record<string, RedditPost[]> = {};
    redditData.posts.forEach(post => {
      const subreddit = post.subreddit || 'other';
      if (!groups[subreddit]) groups[subreddit] = [];
      groups[subreddit].push(post);
    });
    return groups;
  }, [redditData]);

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
    <main className="w-full min-h-screen flex">
      {/* 左侧：大纲导航 */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 bg-gray-900/50 backdrop-blur-sm fixed left-0 top-0 bottom-0 overflow-y-auto custom-scrollbar">
        <div className="p-4">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>📋</span>
            大纲导航
          </h2>

          {/* Linuxdo */}
          <div className="mb-6">
            <div 
              onClick={() => scrollToSection('linuxdo')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                activeSection === 'linuxdo' ? 'bg-blue-500/20 text-blue-400' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <span>🐧</span>
              <span className="text-sm font-medium">Linux.do ({linuxdoData?.posts.length || 0})</span>
            </div>
            <div className="ml-6 mt-2 space-y-1">
              {linuxdoData?.posts.map((post, idx) => (
                <div
                  key={post.id}
                  onClick={() => scrollToSection(`post-${post.id}`)}
                  className="text-xs text-white/50 hover:text-white/80 cursor-pointer truncate transition-colors py-1"
                  title={post.title}
                >
                  {idx + 1}. {post.title}
                </div>
              ))}
            </div>
          </div>

          {/* Reddit板块 */}
          {Object.entries(groupedReddit).map(([subreddit, posts]) => (
            <div key={subreddit} className="mb-6">
              <div
                onClick={() => scrollToSection(`reddit-${subreddit}`)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeSection === `reddit-${subreddit}` ? 'bg-orange-500/20 text-orange-400' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <span>🔴</span>
                <span className="text-sm font-medium">r/{subreddit} ({posts.length})</span>
              </div>
              <div className="ml-6 mt-2 space-y-1">
                {posts.map((post, idx) => (
                  <div
                    key={post.id}
                    onClick={() => scrollToSection(`post-${post.id}`)}
                    className="text-xs text-white/50 hover:text-white/80 cursor-pointer truncate transition-colors py-1"
                    title={post.title}
                  >
                    {idx + 1}. {post.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* 中间：内容区域 */}
      <div className="flex-1 ml-64 mr-80 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto p-6">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Intelligence Hub
            </h1>
            <p className="text-sm text-white/60">情报中心 · 深度解读 · 鼠标悬停查看详情</p>
          </div>

          {/* Linuxdo社区 */}
          <section id="linuxdo" className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 sticky top-0 bg-gray-900/80 backdrop-blur-sm py-3 z-10">
              <span>🐧</span>
              Linux.do 社区
              <span className="text-sm text-white/40">({linuxdoData?.posts.length || 0}篇)</span>
            </h2>
            
            <div className="space-y-2">
              {linuxdoData?.posts.map((post) => (
                <div
                  key={post.id}
                  id={`post-${post.id}`}
                  onMouseEnter={(e) => handleMouseEnter(post, e)}
                  onMouseLeave={handleMouseLeave}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 
                           transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs border ${getPostTypeColor(post.analysis.post_type)}`}>
                          {post.analysis.post_type}
                        </span>
                        <span className="text-xs">
                          {getValueIcon(post.analysis.value_assessment)}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors mb-1">
                        {post.title}
                      </h3>
                      <p className="text-xs text-white/60 line-clamp-2">
                        {post.analysis.core_issue}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Reddit板块 */}
          {Object.entries(groupedReddit).map(([subreddit, posts]) => (
            <section key={subreddit} id={`reddit-${subreddit}`} className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 sticky top-0 bg-gray-900/80 backdrop-blur-sm py-3 z-10">
                <span>🔴</span>
                r/{subreddit}
                <span className="text-sm text-white/40">({posts.length}篇)</span>
              </h2>
              
              <div className="space-y-2">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    id={`post-${post.id}`}
                    onMouseEnter={(e) => handleMouseEnter(post, e)}
                    onMouseLeave={handleMouseLeave}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 
                             transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs border ${getPostTypeColor(post.analysis.post_type)}`}>
                            {post.analysis.post_type}
                          </span>
                          <span className="text-xs">
                            {getValueIcon(post.analysis.value_assessment)}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-white group-hover:text-orange-400 transition-colors mb-1">
                          {post.title}
                        </h3>
                        <p className="text-xs text-white/60 line-clamp-2">
                          {post.analysis.core_issue}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* 右侧：在线对话占位 */}
      <aside className="w-80 flex-shrink-0 border-l border-white/10 bg-gray-900/50 backdrop-blur-sm fixed right-0 top-0 bottom-0">
        <div className="p-4 h-full flex flex-col">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>💬</span>
            AI 对话助手
          </h2>
          
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full 
                            flex items-center justify-center border-2 border-purple-500/30">
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
        </div>
      </aside>

      {/* 悬停详情面板 */}
      {hoveredPost && (
        <div
          ref={detailRef}
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
