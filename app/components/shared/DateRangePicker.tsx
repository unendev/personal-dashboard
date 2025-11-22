'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';

export interface DateRangeValue {
  startDate: string;
  endDate: string;
  label: string;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  const [mode, setMode] = useState<'week' | 'month' | 'custom'>('week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // 计算昨天的日期
  const getYesterday = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  // 计算本周：从昨天往前推7天
  const getThisWeek = (): DateRangeValue => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const weekStart = new Date(yesterday);
    weekStart.setDate(yesterday.getDate() - 6); // 往前推6天，加上昨天共7天
    
    return {
      startDate: weekStart.toISOString().split('T')[0],
      endDate: yesterday.toISOString().split('T')[0],
      label: '本周'
    };
  };

  // 计算本月：从昨天往前推30天
  const getThisMonth = (): DateRangeValue => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const monthStart = new Date(yesterday);
    monthStart.setDate(yesterday.getDate() - 29); // 往前推29天，加上昨天共30天
    
    return {
      startDate: monthStart.toISOString().split('T')[0],
      endDate: yesterday.toISOString().split('T')[0],
      label: '本月'
    };
  };

  // 初始化为本周
  useEffect(() => {
    if (!value.startDate || !value.endDate) {
      onChange(getThisWeek());
    }
  }, []);

  // 处理快捷选项点击
  const handleQuickSelect = (type: 'week' | 'month') => {
    setMode(type);
    const range = type === 'week' ? getThisWeek() : getThisMonth();
    onChange(range);
  };

  // 处理自定义时间段
  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      
      if (start <= end) {
        onChange({
          startDate: customStart,
          endDate: customEnd,
          label: '自定义'
        });
        setMode('custom');
      } else {
        alert('开始日期不能晚于结束日期');
      }
    }
  };

  // 格式化日期范围显示
  const formatDateRange = () => {
    if (!value.startDate || !value.endDate) return '';
    
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('zh-CN', {
        month: 'numeric',
        day: 'numeric'
      });
    };
    
    // 计算天数
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 包含起止日期
    
    return `${formatDate(start)} - ${formatDate(end)} (${diffDays}天)`;
  };

  return (
    <div className="space-y-4">
      {/* 快捷选项按钮组 */}
      <div className="flex items-center justify-center gap-3">
        <Button
          onClick={() => handleQuickSelect('week')}
          variant={mode === 'week' ? 'default' : 'outline'}
          size="sm"
          className={`${
            mode === 'week'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'text-gray-300 hover:text-gray-100 border-gray-600'
          }`}
        >
          📅 本周
        </Button>
        
        <Button
          onClick={() => handleQuickSelect('month')}
          variant={mode === 'month' ? 'default' : 'outline'}
          size="sm"
          className={`${
            mode === 'month'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'text-gray-300 hover:text-gray-100 border-gray-600'
          }`}
        >
          📆 本月
        </Button>

        <Button
          onClick={() => {
            setMode('custom');
            // 初始化自定义日期为当前选中的范围
            if (!customStart) setCustomStart(value.startDate || getYesterday());
            if (!customEnd) setCustomEnd(value.endDate || getYesterday());
          }}
          variant={mode === 'custom' ? 'default' : 'outline'}
          size="sm"
          className={`${
            mode === 'custom'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'text-gray-300 hover:text-gray-100 border-gray-600'
          }`}
        >
          🔧 自定义
        </Button>
      </div>

      {/* 自定义时间段选择器 */}
      {mode === 'custom' && (
        <div className="flex items-center justify-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">开始:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              max={getYesterday()}
              className="border border-gray-600 bg-gray-800/80 rounded px-2 py-1 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          
          <span className="text-gray-400">-</span>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">结束:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              max={getYesterday()}
              className="border border-gray-600 bg-gray-800/80 rounded px-2 py-1 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <Button
            onClick={handleCustomApply}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            应用
          </Button>
        </div>
      )}

      {/* 当前选中的时间范围显示 */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-700/50 rounded-lg px-4 py-2">
          <span className="text-sm font-medium text-blue-300">{value.label || '本周'}</span>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-300">{formatDateRange()}</span>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;

