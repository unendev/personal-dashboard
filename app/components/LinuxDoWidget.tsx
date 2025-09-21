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
  const [expandedSummary, setExpandedSummary] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [showModal, setShowModal] = useState(false);

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

  return (
    <div 
      className="p-4 cursor-pointer hover:bg-white/5 transition-colors rounded-lg"
      onClick={() => setShowModal(true)}
    >
      {/* 紧凑的标题区域 */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold gradient-text">Linux.do 热帖报告</h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDateSelector(!showDateSelector);
            }}
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
          <div className="text-xs text-blue-400">
            点击查看全部
          </div>
        </div>

        <div className="space-y-2">
          {report.posts.slice(0, 3).map((post) => (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
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
            显示前 3 篇，共 {report.posts.length} 篇
          </span>
          {report.posts.length > 3 && (
            <div className="mt-1 text-xs text-blue-400">
              点击卡片任意位置查看完整列表
            </div>
          )}
        </div>
      </div>

      {/* 展开的完整内容 */}
      {showModal && (
        <div className="mt-4 space-y-4">
          {/* 分隔线 */}
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">📊 完整报告详情</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModal(false);
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                收起
              </button>
            </div>
          </div>

          {/* 总结概览 */}
          <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
            <h3 className="text-base font-semibold text-white mb-3">📊 今日概览</h3>
            <p className="text-white/70 leading-relaxed">{report.summary.overview}</p>
          </div>

          {/* 社区亮点 */}
          <div>
            <h3 className="text-base font-semibold text-white mb-3">✨ 社区亮点</h3>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <h4 className="text-sm font-semibold text-green-400 mb-2">🧠 技术前沿</h4>
                <ul className="space-y-1">
                  {report.summary.highlights.tech_savvy.map((item, index) => (
                    <li key={index} className="text-white/70 text-sm">• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <h4 className="text-sm font-semibold text-blue-400 mb-2">📦 资源分享</h4>
                <ul className="space-y-1">
                  {report.summary.highlights.resources_deals.map((item, index) => (
                    <li key={index} className="text-white/70 text-sm">• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <h4 className="text-sm font-semibold text-orange-400 mb-2">🔥 热门话题</h4>
                <ul className="space-y-1">
                  {report.summary.highlights.hot_topics.map((item, index) => (
                    <li key={index} className="text-white/70 text-sm">• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 完整帖子列表 */}
          <div>
            <h3 className="text-base font-semibold text-white mb-3">📝 完整帖子列表</h3>
            <div className="space-y-2">
              {report.posts.map((post, index) => (
                <a
                  key={post.id}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group border border-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-white/40 font-mono">#{index + 1}</span>
                        <span className={`px-2 py-1 rounded text-xs ${getPostTypeColor(post.analysis.post_type)}`}>
                          {post.analysis.post_type}
                        </span>
                        <span className={`text-xs font-medium ${getValueAssessmentColor(post.analysis.value_assessment)}`}>
                          {post.analysis.value_assessment}价值
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-white group-hover:text-white/90 mb-2 leading-relaxed">
                        {post.title}
                      </h4>
                      {post.analysis.core_issue && (
                        <p className="text-xs text-white/60 mb-2 leading-relaxed">
                          {post.analysis.core_issue}
                        </p>
                      )}
                      {post.analysis.key_info && post.analysis.key_info.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs text-white/40">关键信息：</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {post.analysis.key_info.map((info, infoIndex) => (
                              <span key={infoIndex} className="px-2 py-1 bg-white/10 rounded text-xs text-white/70">
                                {info}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-white/40 group-hover:text-white/60 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinuxDoWidget;