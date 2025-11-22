'use client';

import { useState } from 'react';
import { X, Copy, Bookmark, Loader2 } from 'lucide-react';

interface TranslationResult {
  type: string;
  originalText: string;
  result: string;
  timestamp: string;
}

interface AITranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  onAddToNotes?: (text: string, translation: string) => void;
}

export default function AITranslationModal({
  isOpen,
  onClose,
  selectedText,
  onAddToNotes,
}: AITranslationModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [activeType, setActiveType] = useState<string>('translate');

  const translationTypes = [
    { id: 'translate', label: '翻译', icon: '🔤', description: '中英互译' },
    { id: 'explain', label: '解释', icon: '📖', description: '语法词汇解释' },
    { id: 'summarize', label: '总结', icon: '💡', description: '内容总结' },
    { id: 'qa', label: '问答', icon: '❓', description: '相关问题回答' },
  ];

  const handleTranslation = async (type: string) => {
    if (!selectedText.trim()) return;

    setLoading(true);
    setActiveType(type);

    try {
      const response = await fetch('/api/webread/ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: selectedText,
          type: type,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        const error = await response.json();
        alert(`翻译失败：${error.error}`);
      }
    } catch (error) {
      console.error('Translation failed:', error);
      alert('翻译失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 这里可以添加一个 toast 提示
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const addToNotes = () => {
    if (result && onAddToNotes) {
      onAddToNotes(result.originalText, result.result);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">AI 智能助手</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 选中文本 */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">选中文本：</h3>
          <p className="text-gray-900 bg-white p-3 rounded border text-sm leading-relaxed">
            {selectedText}
          </p>
        </div>

        {/* 功能按钮 */}
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            {translationTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleTranslation(type.id)}
                disabled={loading}
                className={`p-3 rounded-lg border text-left hover:bg-gray-50 transition-colors ${
                  activeType === type.id && result
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{type.icon}</span>
                  <div>
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                  {loading && activeType === type.id && (
                    <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 结果展示 */}
        {result && (
          <div className="flex-1 p-4 overflow-auto">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {translationTypes.find(t => t.id === result.type)?.label}结果：
                </h3>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                    {result.result}
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => copyToClipboard(result.result)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  <Copy className="h-4 w-4" />
                  <span>复制结果</span>
                </button>
                
                {onAddToNotes && (
                  <button
                    onClick={addToNotes}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm"
                  >
                    <Bookmark className="h-4 w-4" />
                    <span>添加到笔记</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 底部 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>AI 翻译由 DeepSeek 提供支持</span>
            {result && (
              <span>{new Date(result.timestamp).toLocaleString('zh-CN')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
