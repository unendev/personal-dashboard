'use client';

import React, { useState, useEffect } from 'react';
import { LinuxDoReport } from '@/types/linuxdo';

interface AvailableDate {
  date: string;
  count: number;
  label: string;
}

const LinuxDoWidget = () => {
  const [report, setReport] = useState<LinuxDoReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [showDateSelector, setShowDateSelector] = useState(false);

  // 获取可用日期列表
  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const response = await fetch('/api/linuxdo/dates');
        if (response.ok) {
          const data = await response.json();
          setAvailableDates(data.dates);
        }
      } catch (err) {
        console.error('Failed to fetch available dates:', err);
      }
    };

    fetchAvailableDates();
  }, []);

  // 获取报告数据
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const url = selectedDate ? `/api/linuxdo?date=${selectedDate}` : '/api/linuxdo';
        const response = await fetch(url);
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
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading Linux.do report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
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
  const displayPosts = expandedPosts ? report.posts : report.posts.slice(0, 3);

  return (
    <div className="p-4">
      {/* 紧凑的标题区域 */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold gradient-text">Linux.do 热帖报告</h2>
          <button
            onClick={() => setShowDateSelector(!showDateSelector)}
            className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-xs text-blue-400 transition-colors"
          >
            📅 往期
          </button>
        </div>
        
        {/* 日期选择器 */}
        {showDateSelector && (
          <div className="mb-3 p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="text-xs text-white/60 mb-2">选择查看日期：</div>
            <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
              {availableDates.map((dateInfo) => (
                <button
                  key={dateInfo.date}
                  onClick={() => {
                    setSelectedDate(dateInfo.date);
                    setShowDateSelector(false);
                  }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    selectedDate === dateInfo.date
                      ? 'bg-blue-500/30 text-blue-400'
                      : 'bg-white/5 hover:bg-white/10 text-white/70'
                  }`}
                >
                  <div className="font-medium">{dateInfo.label}</div>
                  <div className="text-xs opacity-60">{dateInfo.count}篇</div>
                </button>
              ))}
            </div>
            {selectedDate && (
              <button
                onClick={() => {
                  setSelectedDate('');
                  setShowDateSelector(false);
                }}
                className="mt-2 px-2 py-1 bg-gray-500/20 hover:bg-gray-500/30 rounded text-xs text-gray-400 transition-colors"
              >
                返回最新
              </button>
            )}
          </div>
        )}
        
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

      {/* 总结概览 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
            今日概览
          </h3>
          <button
            onClick={() => setExpandedSummary(!expandedSummary)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {expandedSummary ? '收起' : '展开'}
          </button>
        </div>
        <div className={`expandable-content ${expandedSummary ? 'expanded' : 'collapsed'}`}>
          <p className="text-white/70 text-sm leading-relaxed">{report.summary.overview}</p>
        </div>
        {!expandedSummary && (
          <div className="mt-1 text-xs text-white/40">点击展开查看完整内容...</div>
        )}
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
                <span className="leading-relaxed">{item}</span>
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
                <span className="leading-relaxed">{item}</span>
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
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 结论 */}
      <div className="mb-4 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
        <h3 className="text-xs font-semibold text-purple-400 mb-1">💭 社区感悟</h3>
        <p className="text-white/70 text-sm italic leading-relaxed">&quot;{report.summary.conclusion}&quot;</p>
      </div>

      {/* 热门帖子 */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
            热门帖子
          </h3>
          <button
            onClick={() => setExpandedPosts(!expandedPosts)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {expandedPosts ? '收起' : '展开'}
          </button>
        </div>

        <div className={`space-y-2 expandable-content ${expandedPosts ? 'expanded' : 'collapsed'}`}>
          {displayPosts.map((post) => (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white group-hover:text-white/90 mb-2 leading-relaxed">
                    {post.title}
                  </h4>
                  {post.analysis.core_issue && (
                    <p className="text-xs text-white/60 mb-2 leading-relaxed">
                      {post.analysis.core_issue}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded text-xs ${getPostTypeColor(post.analysis.post_type)}`}>
                      {post.analysis.post_type}
                    </span>
                    <span className={`text-xs ${getValueAssessmentColor(post.analysis.value_assessment)}`}>
                      {post.analysis.value_assessment}
                    </span>
                    {post.analysis.key_info && post.analysis.key_info.length > 0 && (
                      <span className="text-xs text-white/40">
                        {post.analysis.key_info.length} 个关键点
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="text-center mt-3">
          <span className="text-xs text-white/40">
            {expandedPosts ? `显示全部 ${report.posts.length} 篇` : `显示前 ${displayPosts.length} 篇，共 ${report.posts.length} 篇`}
          </span>
          {!expandedPosts && report.posts.length > 3 && (
            <div className="mt-1 text-xs text-blue-400">
              点击展开查看全部帖子
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinuxDoWidget;


