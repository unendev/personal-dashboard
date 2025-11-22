'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { WeeklyReviewData } from '@/types/milestone';

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  onConfirmed: () => void;
}

export default function WeeklyReviewModal({
  isOpen,
  onClose,
  startDate,
  endDate,
  onConfirmed,
}: WeeklyReviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<WeeklyReviewData | null>(null);
  const [selectedAchievements, setSelectedAchievements] = useState<string[]>([]);
  const [userNotes, setUserNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDraft = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/milestones/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成周报失败');
      }

      const data = await response.json();
      setDraft(data);

      // 默认全选所有成果
      if (data.aiKeyAchievements && data.aiKeyAchievements.length > 0) {
        setSelectedAchievements(data.aiKeyAchievements.map((a: { taskId: string }) => a.taskId));
      }
    } catch (err) {
      console.error('Error loading draft:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // 自动加载周报初稿
  useEffect(() => {
    if (isOpen && !draft) {
      loadDraft();
    }
  }, [isOpen, draft, loadDraft]);

  const handleToggleAchievement = (taskId: string) => {
    setSelectedAchievements((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleConfirm = async () => {
    if (!draft) return;

    setSaving(true);
    setError(null);

    try {
      const confirmedAchievements = draft.aiKeyAchievements.filter((a: { taskId: string }) =>
        selectedAchievements.includes(a.taskId)
      );

      const response = await fetch('/api/milestones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          aiTitle: draft.aiTitle,
          aiFocus: draft.aiFocus,
          aiInsights: draft.aiInsights,
          aiKeyAchievements: draft.aiKeyAchievements,
          confirmedAchievements,
          userNotes: userNotes.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存失败');
      }

      // 成功后关闭模态框并触发回调
      onConfirmed();
      handleClose();
    } catch (err) {
      console.error('Error saving milestone:', err);
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setDraft(null);
    setSelectedAchievements([]);
    setUserNotes('');
    setError(null);
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            📝 每周回顾
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="ml-4 text-gray-600 dark:text-gray-400">AI 正在分析你的一周...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <button
                onClick={loadDraft}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                重试
              </button>
            </div>
          )}

          {draft && (
            <>
              {/* AI 生成的标题 */}
              <div className="text-center">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {draft.aiTitle}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {startDate} 至 {endDate}
                </p>
              </div>

              {/* 本周焦点 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  💡 本周焦点
                </h4>
                <p className="text-gray-700 dark:text-gray-300">{draft.aiFocus}</p>
              </div>

              {/* 关键成果（可勾选） */}
              {draft.aiKeyAchievements && draft.aiKeyAchievements.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    🎯 关键成果（请勾选你认可的成果）
                  </h4>
                  <div className="space-y-2">
                    {draft.aiKeyAchievements.map((achievement: { taskId: string; taskName: string; categoryPath: string; duration: number; reason?: string }) => (
                      <label
                        key={achievement.taskId}
                        className="flex items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAchievements.includes(achievement.taskId)}
                          onChange={() => handleToggleAchievement(achievement.taskId)}
                          className="mt-1 mr-3 h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {achievement.taskName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <span className="text-blue-600 dark:text-blue-400">
                              {formatDuration(achievement.duration)}
                            </span>
                            {' • '}
                            <span>{achievement.categoryPath}</span>
                          </div>
                          {achievement.reason && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
                              {achievement.reason}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* AI 洞察 */}
              {draft.aiInsights && draft.aiInsights.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    ✨ AI 洞察
                  </h4>
                  <ul className="space-y-2">
                    {draft.aiInsights.map((insight, index) => (
                      <li
                        key={index}
                        className="flex items-start text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 用户备注输入框 */}
              <div>
                <label
                  htmlFor="userNotes"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  💭 你的感想（可选）
                </label>
                <textarea
                  id="userNotes"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="有什么特别的感悟吗？记录下这一周的心路历程..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        {/* 底部按钮 */}
        {draft && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || selectedAchievements.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  保存中...
                </>
              ) : (
                '✅ 确认存档'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}







