'use client';

import React, { useState, useEffect } from 'react';
import { LinuxDoReport } from '@/types/linuxdo';

const LinuxDoWidget = () => {
  const [report, setReport] = useState<LinuxDoReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/linuxdo');
        if (!response.ok) {
          throw new Error('Failed to fetch Linux.do report');
        }
        const data = await response.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="glass-effect rounded-2xl p-6">
        <div className="text-center">Loading Linux.do report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="glass-effect rounded-2xl p-6">
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  const getValueAssessmentColor = (assessment: string) => {
    switch (assessment) {
      case '高': return 'text-green-400';
      case '中': return 'text-yellow-400';
      case '低': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case '求助': return 'bg-blue-500/20 text-blue-400';
      case '讨论': return 'bg-purple-500/20 text-purple-400';
      case '资源分享': return 'bg-green-500/20 text-green-400';
      case '新闻资讯': return 'bg-orange-500/20 text-orange-400';
      case '日常闲聊': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const highValuePosts = report.posts.filter(post => post.analysis.value_assessment === '高');
  const displayPosts = expandedPosts ? report.posts.slice(0, 10) : report.posts.slice(0, 5);

  return (
    <div className="glass-effect rounded-2xl p-4 hover-lift max-h-[600px] overflow-hidden">
      {/* 紧凑的标题区域 */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold gradient-text mb-1">Linux.do 热帖报告</h2>
        <p className="text-white/60 text-xs">{report.meta.report_date}</p>
        <div className="flex justify-center items-center gap-2 mt-1">
          <span className="px-2 py-0.5 bg-purple-500/20 rounded-full text-xs text-purple-400">
            {report.meta.post_count} 篇
          </span>
          <span className="px-2 py-0.5 bg-green-500/20 rounded-full text-xs text-green-400">
            {highValuePosts.length} 高价值
          </span>
        </div>
      </div>

      {/* 紧凑的总结概览 */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
          今日概览
        </h3>
        <p className="text-white/70 text-xs leading-relaxed line-clamp-3">{report.summary.overview}</p>
      </div>

      {/* 紧凑的亮点内容 */}
      <div className="mb-4 space-y-3">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
          社区亮点
        </h3>

        {/* 技术亮点 */}
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-green-400 mb-1">🧠 技术前沿</h4>
          <ul className="space-y-1">
            {report.summary.highlights.tech_savvy.slice(0, 2).map((item, index) => (
              <li key={index} className="text-white/60 text-xs flex items-start gap-1">
                <span className="text-green-400 mt-0.5 text-xs">•</span>
                <span className="line-clamp-2">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 资源分享 */}
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-blue-400 mb-1">📦 资源分享</h4>
          <ul className="space-y-1">
            {report.summary.highlights.resources_deals.slice(0, 2).map((item, index) => (
              <li key={index} className="text-white/60 text-xs flex items-start gap-1">
                <span className="text-blue-400 mt-0.5 text-xs">•</span>
                <span className="line-clamp-2">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 热门话题 */}
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-orange-400 mb-1">🔥 热门话题</h4>
          <ul className="space-y-1">
            {report.summary.highlights.hot_topics.slice(0, 2).map((item, index) => (
              <li key={index} className="text-white/60 text-xs flex items-start gap-1">
                <span className="text-orange-400 mt-0.5 text-xs">•</span>
                <span className="line-clamp-2">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 紧凑的结论 */}
      <div className="mb-4 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
        <h3 className="text-xs font-semibold text-purple-400 mb-1">💭 社区感悟</h3>
        <p className="text-white/70 text-xs italic line-clamp-2">&quot;{report.summary.conclusion}&quot;</p>
      </div>

      {/* 紧凑的热门帖子 */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
            热门帖子
          </h3>
        </div>

        <div className="space-y-2">
          {displayPosts.slice(0, 3).map((post, index) => (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium text-white group-hover:text-white/90 mb-1 line-clamp-1">
                    {post.title}
                  </h4>
                  <div className="flex items-center gap-1">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${getPostTypeColor(post.analysis.post_type)}`}>
                      {post.analysis.post_type}
                    </span>
                    <span className={`text-xs ${getValueAssessmentColor(post.analysis.value_assessment)}`}>
                      {post.analysis.value_assessment}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="text-center mt-2">
          <span className="text-xs text-white/40">
            显示前3篇，共{report.posts.length}篇
          </span>
        </div>
      </div>
    </div>
  );
};

export default LinuxDoWidget;