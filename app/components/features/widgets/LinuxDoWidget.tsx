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
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'analysis'>('overview');

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
      case '讨论': return 'bg-blue-500/20 text-blue-400';
      case '资源分享': return 'bg-green-500/20 text-green-400';
      case '新闻资讯': return 'bg-orange-500/20 text-orange-400';
      case '日常闲聊': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const tabs = [
    { id: 'overview' as const, label: '概览', icon: '📊' },
    { id: 'posts' as const, label: '帖子', icon: '🔥' },
    { id: 'analysis' as const, label: '分析', icon: '🔍' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60 mx-auto mb-4"></div>
          <div className="text-white/60">加载中...</div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-400">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-lg font-semibold mb-2">加载失败</div>
          <div className="text-white/60">{error}</div>
        </div>
      </div>
    );
  }

  const highValuePosts = report.posts.filter(post => post.analysis.value_assessment === '高');

  return (
    <div className="flex flex-col h-full">
      {/* 日期选择器 - 横向滚动 */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-2">
          <button
            onClick={() => setSelectedDate('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              !selectedDate
                ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50'
                : 'bg-white/5 hover:bg-white/10 text-white/70'
            }`}
          >
            {!selectedDate && report?.meta?.report_date
              ? new Date(report.meta.report_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })
              : availableDates[0]?.label || '加载中...'}
          </button>
          {availableDates.slice(0, 8).map((dateInfo) => (
            <button
              key={dateInfo.date}
              onClick={() => setSelectedDate(dateInfo.date)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                selectedDate === dateInfo.date
                  ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50'
                  : 'bg-white/5 hover:bg-white/10 text-white/70'
              }`}
            >
              {dateInfo.label}
            </button>
          ))}
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="px-4 pt-4">
        <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-medium tab-transition ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 标签页内容 - 可滚动 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* 数据统计 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-purple-400">{report.meta.post_count}</div>
                <div className="text-xs text-white/60">总帖子</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-green-400">{highValuePosts.length}</div>
                <div className="text-xs text-white/60">高价值</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-blue-400">{report.meta.report_date.split('-')[2]}</div>
                <div className="text-xs text-white/60">日期</div>
              </div>
            </div>

            {/* 概览 */}
            <div className="p-4 bg-[#1e1e1e] rounded-lg border border-[#2d2d2d]">
              <p className="text-white/80 text-sm leading-relaxed">{report.summary.overview}</p>
            </div>

            {/* 社区亮点 */}
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                <h4 className="text-sm font-bold text-green-400 mb-2">🧠 技术前沿</h4>
                <ul className="space-y-1.5">
                  {report.summary.highlights.tech_savvy.map((item, index) => (
                    <li key={index} className="text-white/70 text-xs flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
                <h4 className="text-sm font-bold text-blue-400 mb-2">📦 资源分享</h4>
                <ul className="space-y-1.5">
                  {report.summary.highlights.resources_deals.map((item, index) => (
                    <li key={index} className="text-white/70 text-xs flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/20">
                <h4 className="text-sm font-bold text-orange-400 mb-2">🔥 热门话题</h4>
                <ul className="space-y-1.5">
                  {report.summary.highlights.hot_topics.map((item, index) => (
                    <li key={index} className="text-white/70 text-xs flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 社区感悟 */}
            <div className="p-3 bg-[#1e1e1e] rounded-lg border border-[#2d2d2d]">
              <h3 className="text-sm font-bold text-blue-400 mb-2">💭 社区感悟</h3>
              <p className="text-white/80 text-sm italic leading-relaxed">&ldquo;{report.summary.conclusion}&rdquo;</p>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="space-y-3">
            {report.posts.map((post, index) => (
              <a
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group border border-white/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                    #{index + 1}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPostTypeColor(post.analysis.post_type)}`}>
                    {post.analysis.post_type}
                  </span>
                  <span className={`text-xs font-medium ${getValueAssessmentColor(post.analysis.value_assessment)}`}>
                    {post.analysis.value_assessment}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white group-hover:text-white/90 mb-2 leading-relaxed">
                  {post.title}
                </h4>
                {post.analysis.core_issue && (
                  <p className="text-white/70 mb-2 text-xs leading-relaxed line-clamp-2">
                    {post.analysis.core_issue}
                  </p>
                )}
                {post.analysis.key_info && post.analysis.key_info.length > 0 && (
                  <div className="text-xs text-white/40">
                    {post.analysis.key_info.length} 个关键点
                  </div>
                )}
              </a>
            ))}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-4">
            {/* 帖子类型分布 */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">📊 帖子类型分布</h4>
              <div className="grid grid-cols-2 gap-2">
                {['求助', '讨论', '资源分享', '新闻资讯', '日常闲聊'].map((type) => {
                  const count = report.posts.filter(post => post.analysis.post_type === type).length;
                  const percentage = ((count / report.posts.length) * 100).toFixed(1);
                  return (
                    <div key={type} className="p-3 bg-white/5 rounded-lg text-center">
                      <div className="text-lg font-bold text-white">{count}</div>
                      <div className="text-xs text-white/60">{type}</div>
                      <div className="text-xs text-white/40">{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 价值评估分布 */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">⭐ 价值评估</h4>
              <div className="grid grid-cols-3 gap-3">
                {['高', '中', '低'].map((level) => {
                  const count = report.posts.filter(post => post.analysis.value_assessment === level).length;
                  const percentage = ((count / report.posts.length) * 100).toFixed(1);
                  return (
                    <div key={level} className="p-3 bg-white/5 rounded-lg text-center">
                      <div className={`text-xl font-bold ${getValueAssessmentColor(level)}`}>{count}</div>
                      <div className="text-xs text-white/60">{level}价值</div>
                      <div className="text-xs text-white/40">{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 关键信息统计 */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">📝 关键信息</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-lg font-bold text-blue-400">
                    {report.posts.reduce((sum, post) => sum + (post.analysis.key_info?.length || 0), 0)}
                  </div>
                  <div className="text-xs text-white/60">总信息点</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-lg font-bold text-green-400">
                    {(report.posts.reduce((sum, post) => sum + (post.analysis.key_info?.length || 0), 0) / report.posts.length).toFixed(1)}
                  </div>
                  <div className="text-xs text-white/60">平均每帖</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinuxDoWidget;
