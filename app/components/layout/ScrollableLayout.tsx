'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LinuxDoPost, LinuxDoReport } from '@/types/linuxdo';
import { RedditPost, RedditReport } from '@/types/reddit';
import { HeyboxPost, HeyboxReport } from '@/types/heybox';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { safeFetchJSON } from '@/lib/fetch-utils';

type SourceType = 'all' | 'linuxdo' | 'reddit' | 'heybox';

const ScrollableLayout = () => {
  const [linuxdoData, setLinuxdoData] = useState<LinuxDoReport | null>(null);
  const [redditData, setRedditData] = useState<RedditReport | null>(null);
  const [heyboxData, setHeyboxData] = useState<HeyboxReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPost, setHoveredPost] = useState<(LinuxDoPost | RedditPost | HeyboxPost) | null>(null);
  const [activeSource, setActiveSource] = useState<SourceType>('all');
  const [activeSection, setActiveSection] = useState<string>('linuxdo');
  const [showAIChat, setShowAIChat] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  // 日期选择相关state
  const [selectedLinuxDoDate, setSelectedLinuxDoDate] = useState<string>('');
  const [selectedRedditDate, setSelectedRedditDate] = useState<string>('');
  const [selectedHeyboxDate, setSelectedHeyboxDate] = useState<string>('');
  const [availableLinuxDoDates, setAvailableLinuxDoDates] = useState<Array<{ date: string; count: number; label: string }>>([]);
  const [availableRedditDates, setAvailableRedditDates] = useState<Array<{ date: string; count: number; label: string }>>([]);
  const [availableHeyboxDates, setAvailableHeyboxDates] = useState<Array<{ date: string; count: number; label: string }>>([]);
  const [loadingDates, setLoadingDates] = useState(true);

  // 日期格式化工具函数
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 比较日期（忽略时间）
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (dateOnly.getTime() === todayOnly.getTime()) {
      return `${dateStr} (今天)`;
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return `${dateStr} (昨天)`;
    } else {
      const diffTime = todayOnly.getTime() - dateOnly.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays <= 7) {
        return `${dateStr} (${diffDays}天前)`;
      }
      return dateStr;
    }
  };

  // 获取默认日期
  const getDefaultDate = (type: 'linuxdo' | 'reddit') => {
    const today = new Date();
    if (type === 'linuxdo') {
      // LinuxDo默认昨天
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    } else {
      // Reddit默认今天
      return today.toISOString().split('T')[0];
    }
  };

  // 获取可用日期列表
  useEffect(() => {
    const fetchDates = async () => {
      try {
        setLoadingDates(true);
        const [linuxdoData, redditData, heyboxData] = await Promise.all([
          safeFetchJSON<{ dates: Array<{ date: string; count: number }> }>('/api/linuxdo/dates', {}, 0).catch(() => null),
          safeFetchJSON<{ dates: Array<{ date: string; count: number }> }>('/api/reddit/dates', {}, 0).catch(() => null),
          safeFetchJSON<{ dates: Array<{ date: string; count: number }> }>('/api/heybox/dates', {}, 0).catch(() => null)
        ]);

        if (linuxdoData) {
          setAvailableLinuxDoDates(linuxdoData.dates || []);
          // 设置默认日期
          if (!selectedLinuxDoDate) {
            const defaultDate = getDefaultDate('linuxdo');
            const dateStrings = (linuxdoData.dates || []).map((d: { date: string }) => d.date);
            setSelectedLinuxDoDate(dateStrings.includes(defaultDate) ? defaultDate : (dateStrings[0] || defaultDate));
          }
        }

        if (redditData) {
          setAvailableRedditDates(redditData.dates || []);
          // 设置默认日期
          if (!selectedRedditDate) {
            const defaultDate = getDefaultDate('reddit');
            const dateStrings = (redditData.dates || []).map((d: { date: string }) => d.date);
            setSelectedRedditDate(dateStrings.includes(defaultDate) ? defaultDate : (dateStrings[0] || defaultDate));
          }
        }

        if (heyboxData) {
          setAvailableHeyboxDates(heyboxData.dates || []);
          // 设置默认日期（小黑盒用今天）
          if (!selectedHeyboxDate) {
            const defaultDate = new Date().toISOString().split('T')[0];
            const dateStrings = (heyboxData.dates || []).map((d: { date: string }) => d.date);
            setSelectedHeyboxDate(dateStrings.includes(defaultDate) ? defaultDate : (dateStrings[0] || defaultDate));
          }
        }
      } catch (error) {
        console.error('Failed to fetch dates:', error);
        // 设置默认日期作为降级
        if (!selectedLinuxDoDate) setSelectedLinuxDoDate(getDefaultDate('linuxdo'));
        if (!selectedRedditDate) setSelectedRedditDate(getDefaultDate('reddit'));
        if (!selectedHeyboxDate) setSelectedHeyboxDate(new Date().toISOString().split('T')[0]);
      } finally {
        setLoadingDates(false);
      }
    };

    fetchDates();
  }, []);

  // 获取数据
  useEffect(() => {
    // 等待日期加载完成
    if (loadingDates) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const [linuxdoData, redditData, heyboxData] = await Promise.all([
          safeFetchJSON<LinuxDoReport>(
            `/api/linuxdo${selectedLinuxDoDate ? `?date=${selectedLinuxDoDate}` : ''}`, 
            {}, 
            0
          ).catch(() => null),
          safeFetchJSON<RedditReport>(
            `/api/reddit${selectedRedditDate ? `?date=${selectedRedditDate}` : ''}`, 
            {}, 
            0
          ).catch(() => null),
          safeFetchJSON<HeyboxReport>(
            `/api/heybox${selectedHeyboxDate ? `?date=${selectedHeyboxDate}` : ''}`, 
            {}, 
            0
          ).catch(() => null)
        ]);

        setLinuxdoData(linuxdoData);
        setRedditData(redditData);
        setHeyboxData(heyboxData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLinuxDoDate, selectedRedditDate, selectedHeyboxDate, loadingDates]);

  // 处理点击展开详情
  const handleClick = (post: LinuxDoPost | RedditPost) => {
    setHoveredPost(post);
  };

  // 处理鼠标离开 - 延迟关闭
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // 延迟 200ms 关闭，给用户时间移动到详情面板
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPost(null);
    }, 200);
  };

  // 详情面板鼠标进入 - 取消关闭
  const handleDetailPanelEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  // 详情面板鼠标离开 - 关闭详情
  const handleDetailPanelLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPost(null);
    }, 200);
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

  // 获取显示的帖子
  const displayedPosts = React.useMemo(() => {
    const allPosts: Array<(LinuxDoPost | RedditPost | HeyboxPost) & { source: 'linuxdo' | 'reddit' | 'heybox' }> = [];
    
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
    
    if (activeSource === 'all' || activeSource === 'heybox') {
      heyboxData?.posts.forEach(post => {
        allPosts.push({ ...post, source: 'heybox' as const });
      });
    }
    
    return allPosts;
  }, [linuxdoData, redditData, heyboxData, activeSource]);

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

  const getSourceBadge = (source: 'linuxdo' | 'reddit' | 'heybox') => {
    if (source === 'linuxdo') {
      return <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs border border-blue-500/30">🐧</span>;
    } else if (source === 'reddit') {
      return <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-xs border border-orange-500/30">🔴</span>;
    } else {
      return <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs border border-purple-500/30">🎮</span>;
    }
  };

  if (loading || loadingDates) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60 mx-auto mb-4"></div>
          <p className="text-white/60">{loadingDates ? '加载日期列表...' : '加载中...'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen flex">
      {/* 左侧：大纲导航 */}
      <aside className="w-56 flex-shrink-0 border-r border-white/10 bg-gray-900/50 backdrop-blur-sm 
                      fixed left-0 top-0 bottom-0 overflow-y-auto custom-scrollbar z-20">
        <div className="p-4">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <span>📋</span>
            大纲导航
          </h2>

          {/* Linuxdo */}
          {(activeSource === 'all' || activeSource === 'linuxdo') && linuxdoData && (
            <div className="mb-6">
              <div 
                onClick={() => scrollToSection('linuxdo')}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeSection === 'linuxdo' ? 'bg-blue-500/20 text-blue-400' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <span className="text-base">🐧</span>
                <span className="font-medium">Linux.do</span>
                <span className="ml-auto text-xs text-white/40">({linuxdoData.posts.length})</span>
              </div>
              <div className="ml-6 mt-2 space-y-1">
                {linuxdoData.posts.slice(0, 10).map((post, idx) => (
                  <div
                    key={post.id}
                    onClick={() => scrollToSection(`post-linuxdo-${post.id}`)}
                    className="text-xs text-white/50 hover:text-white/80 cursor-pointer truncate 
                             transition-colors py-1 hover:bg-white/5 rounded px-2"
                    title={post.title}
                  >
                    {idx + 1}. {post.title}
                  </div>
                ))}
                {linuxdoData.posts.length > 10 && (
                  <div className="text-xs text-white/30 px-2 py-1">
                    还有 {linuxdoData.posts.length - 10} 篇...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reddit板块 */}
          {(activeSource === 'all' || activeSource === 'reddit') && Object.entries(groupedReddit).map(([subreddit, posts]) => (
            <div key={subreddit} className="mb-6">
              <div
                onClick={() => scrollToSection(`reddit-${subreddit}`)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeSection === `reddit-${subreddit}` ? 'bg-orange-500/20 text-orange-400' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <span className="text-base">🔴</span>
                <span className="font-medium">r/{subreddit}</span>
                <span className="ml-auto text-xs text-white/40">({posts.length})</span>
              </div>
              <div className="ml-6 mt-2 space-y-1">
                {posts.slice(0, 10).map((post, idx) => (
                  <div
                    key={post.id}
                    onClick={() => scrollToSection(`post-reddit-${post.id}`)}
                    className="text-xs text-white/50 hover:text-white/80 cursor-pointer truncate 
                             transition-colors py-1 hover:bg-white/5 rounded px-2"
                    title={post.title}
                  >
                    {idx + 1}. {post.title}
                  </div>
                ))}
                {posts.length > 10 && (
                  <div className="text-xs text-white/30 px-2 py-1">
                    还有 {posts.length - 10} 篇...
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 小黑盒 */}
          {(activeSource === 'all' || activeSource === 'heybox') && heyboxData && (
            <div className="mb-6">
              <div 
                onClick={() => scrollToSection('heybox')}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeSection === 'heybox' ? 'bg-purple-500/20 text-purple-400' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <span className="text-base">🎮</span>
                <span className="font-medium">小黑盒</span>
                <span className="ml-auto text-xs text-white/40">({heyboxData.posts.length})</span>
              </div>
              <div className="ml-6 mt-2 space-y-1">
                {heyboxData.posts.slice(0, 10).map((post, idx) => (
                  <div
                    key={post.id}
                    onClick={() => scrollToSection(`post-heybox-${post.id}`)}
                    className="text-xs text-white/50 hover:text-white/80 cursor-pointer truncate 
                             transition-colors py-1 hover:bg-white/5 rounded px-2"
                    title={post.title}
                  >
                    {idx + 1}. {post.title}
                  </div>
                ))}
                {heyboxData.posts.length > 10 && (
                  <div className="text-xs text-white/30 px-2 py-1">
                    还有 {heyboxData.posts.length - 10} 篇...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 ml-56 overflow-hidden flex flex-col">
        {/* 顶部切换栏 */}
        <div className="flex-shrink-0 bg-gray-900/80 backdrop-blur-md border-b border-white/10 z-10">
          <div className="px-6 py-3 space-y-3">
            {/* 第一行：源选择 */}
            <div className="flex items-center justify-between">
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
                <button
                  onClick={() => setActiveSource('heybox')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSource === 'heybox'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🎮 小黑盒
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

            {/* 第二行：日期选择 */}
            <div className="flex items-center gap-4 pt-2 border-t border-white/5">
              {/* LinuxDo日期选择 */}
              {(activeSource === 'all' || activeSource === 'linuxdo') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50 flex items-center gap-1">
                    <span>🐧</span>
                    <span>日期:</span>
                  </span>
                  <select
                    value={selectedLinuxDoDate}
                    onChange={(e) => setSelectedLinuxDoDate(e.target.value)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white
                             hover:bg-white/10 hover:border-white/20 focus:outline-none focus:border-blue-500/50
                             transition-all cursor-pointer"
                  >
                    {availableLinuxDoDates.length > 0 ? (
                      availableLinuxDoDates.map(dateObj => (
                        <option key={dateObj.date} value={dateObj.date} className="bg-gray-900">
                          {formatDateLabel(dateObj.date)} ({dateObj.count}篇)
                        </option>
                      ))
                    ) : (
                      <option value={selectedLinuxDoDate} className="bg-gray-900">
                        {formatDateLabel(selectedLinuxDoDate)}
                      </option>
                    )}
                  </select>
                </div>
              )}

              {/* Reddit日期选择 */}
              {(activeSource === 'all' || activeSource === 'reddit') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50 flex items-center gap-1">
                    <span>🔴</span>
                    <span>日期:</span>
                  </span>
                  <select
                    value={selectedRedditDate}
                    onChange={(e) => setSelectedRedditDate(e.target.value)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white
                             hover:bg-white/10 hover:border-white/20 focus:outline-none focus:border-orange-500/50
                             transition-all cursor-pointer"
                  >
                    {availableRedditDates.length > 0 ? (
                      availableRedditDates.map(dateObj => (
                        <option key={dateObj.date} value={dateObj.date} className="bg-gray-900">
                          {formatDateLabel(dateObj.date)} ({dateObj.count}篇)
                        </option>
                      ))
                    ) : (
                      <option value={selectedRedditDate} className="bg-gray-900">
                        {formatDateLabel(selectedRedditDate)}
                      </option>
                    )}
                  </select>
                </div>
              )}

              {/* 小黑盒日期选择 */}
              {(activeSource === 'all' || activeSource === 'heybox') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50 flex items-center gap-1">
                    <span>🎮</span>
                    <span>日期:</span>
                  </span>
                  <select
                    value={selectedHeyboxDate}
                    onChange={(e) => setSelectedHeyboxDate(e.target.value)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white
                             hover:bg-white/10 hover:border-white/20 focus:outline-none focus:border-purple-500/50
                             transition-all cursor-pointer"
                  >
                    {availableHeyboxDates.length > 0 ? (
                      availableHeyboxDates.map(dateObj => (
                        <option key={dateObj.date} value={dateObj.date} className="bg-gray-900">
                          {formatDateLabel(dateObj.date)} ({dateObj.count}篇)
                        </option>
                      ))
                    ) : (
                      <option value={selectedHeyboxDate} className="bg-gray-900">
                        {formatDateLabel(selectedHeyboxDate)}
                      </option>
                    )}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
          <div className="max-w-7xl mx-auto">
            {/* 网格布局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedPosts.map((post) => (
                <div
                  key={`${post.source}-${post.id}`}
                  id={`post-${post.source}-${post.id}`}
                  onClick={() => handleClick(post)}
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

                    {/* 标题（优先显示中文优化标题） */}
                    <h3 className="text-base font-semibold text-white group-hover:text-blue-400 
                                 transition-colors mb-2 line-clamp-2 flex-shrink-0">
                      {'title_cn' in post && post.title_cn ? post.title_cn : post.title}
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

                    {/* 社区互动数据 */}
                    {('replies_count' in post || 'participants_count' in post) && (
                      <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                        {'replies_count' in post && (post as { replies_count: number }).replies_count > 0 && (
                          <span className="flex items-center gap-1">💬 {(post as { replies_count: number }).replies_count} 条回复</span>
                        )}
                        {'participants_count' in post && (post as { participants_count: number }).participants_count > 0 && (
                          <span className="flex items-center gap-1">👥 {(post as { participants_count: number }).participants_count} 人参与</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 空状态 */}
            {displayedPosts.length === 0 && !loading && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-white/60 text-lg mb-2">该日期暂无数据</p>
                <p className="text-white/40 text-sm">请选择其他日期查看</p>
              </div>
            )}
                    </div>
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
          onClick={() => setHoveredPost(null)}
        >
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          
          {/* 内容面板 */}
          <div
            ref={detailPanelRef}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={handleDetailPanelEnter}
            onMouseLeave={handleDetailPanelLeave}
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
                    {'title_cn' in hoveredPost && hoveredPost.title_cn ? hoveredPost.title_cn : hoveredPost.title}
                  </h2>
                  <p className="text-sm text-white/70">
                    {hoveredPost.analysis.core_issue}
                  </p>
                      </div>
                <button
                  onClick={() => setHoveredPost(null)}
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
