'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { getEffectiveDateString } from '@/lib/timer-utils';
import { DateRangeValue } from '@/app/components/shared/DateRangePicker';
import { TimerTask } from '@/app/features/timer/types';
import { CategoryCache } from '@/lib/category-cache';
import { InstanceTagCache } from '@/lib/instance-tag-cache';

/**
 * 操作历史记录类型
 */
export interface OperationRecord {
  id: string;
  action: string;
  taskName: string;
  timestamp: Date;
  details?: string;
}

/**
 * 日志页面状态管理 Hook
 * 
 * 职责：
 * - 管理页面级别的所有状态
 * - 处理数据加载（任务、操作记录）
 * - 管理移动端响应式状态
 * - 处理缓存预加载
 */
export function useLogPageState(userId: string) {
  // ============ 基础状态 ============
  const [isPageReady, setIsPageReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getEffectiveDateString(new Date(), 2));
  const [isMobile, setIsMobile] = useState(false);
  
  // 时间段选择（用于统计和AI总结）
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: getEffectiveDateString(new Date(), 2),
    endDate: getEffectiveDateString(new Date(), 2),
    label: '今日'
  });
  
  // 移动端区域切换
  const [activeSection, setActiveSection] = useState<'timer' | 'notes' | 'stats' | 'ai'>('timer');
  
  // ============ 任务状态 ============
  const [timerTasks, setTimerTasks] = useState<TimerTask[]>([]);
  const [rangeTimerTasks, setRangeTimerTasks] = useState<TimerTask[]>([]);
  
  // ============ 操作历史 ============
  const [operationHistory, setOperationHistory] = useState<OperationRecord[]>([]);
  const [isOperationHistoryExpanded, setIsOperationHistoryExpanded] = useState(false);
  const [hasFetchedHistory, setHasFetchedHistory] = useState(false);
  const operationHistoryRef = useRef<HTMLDivElement>(null);
  
  // ============ 数据加载函数 ============
  
  /**
   * 加载单日任务（用于计时器）
   */
  const fetchTimerTasks = useCallback(async () => {
    try {
      const response = await fetch(`/api/timer-tasks?userId=${userId}&date=${selectedDate}`);
      if (response.ok) {
        const tasks = await response.json();
        setTimerTasks(tasks);
      }
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  }, [userId, selectedDate]);
  
  /**
   * 加载时间范围任务（用于统计）
   */
  const fetchRangeTimerTasks = useCallback(async () => {
    if (!dateRange.startDate || !dateRange.endDate) return;
    
    try {
      const response = await fetch(
        `/api/timer-tasks?userId=${userId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      if (response.ok) {
        const tasks = await response.json();
        setRangeTimerTasks(tasks);
      }
    } catch (error) {
      console.error('Failed to fetch range timer tasks:', error);
    }
  }, [userId, dateRange.startDate, dateRange.endDate]);
  
  /**
   * 加载操作记录
   */
  const fetchOperationRecords = useCallback(async () => {
    try {
      const response = await fetch('/api/operation-records');
      if (response.ok) {
        const records = await response.json();
        // 转换时间戳
        const formattedRecords = records.map((record: { id: string; action: string; taskName: string; timestamp: string; details?: string }) => ({
          ...record,
          timestamp: new Date(record.timestamp),
        }));
        setOperationHistory(formattedRecords);
        setHasFetchedHistory(true);
      }
    } catch (error) {
      console.error('获取操作记录失败:', error);
    }
  }, []);
  
  // ============ 初始化逻辑 ============
  
  /**
   * 检测屏幕尺寸
   */
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind md breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  /**
   * 预加载分类和事务项数据
   */
  useEffect(() => {
    const preloadData = async () => {
      try {
        await Promise.all([
          CategoryCache.preload(),
          InstanceTagCache.preload(userId)
        ]);
        console.log('分类和事务项数据预加载完成');
      } catch (error) {
        console.error('预加载数据失败:', error);
      }
    };

    preloadData();
  }, [userId]);
  
  /**
   * 页面加载完成后加载任务数据
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageReady(true);
      fetchTimerTasks();
    }, 100);

    return () => clearTimeout(timer);
  }, [fetchTimerTasks]);
  
  /**
   * 时间范围变化时加载统计任务
   */
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchRangeTimerTasks();
    }
  }, [fetchRangeTimerTasks]);
  
  /**
   * 点击外部区域关闭操作记录折叠栏
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (operationHistoryRef.current && !operationHistoryRef.current.contains(event.target as Node)) {
        setIsOperationHistoryExpanded(false);
      }
    };

    if (isOperationHistoryExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOperationHistoryExpanded]);
  
  // ============ 返回值 ============
  return {
    // 基础状态
    isPageReady,
    selectedDate,
    setSelectedDate,
    dateRange,
    setDateRange,
    activeSection,
    setActiveSection,
    isMobile,
    
    // 任务状态
    timerTasks,
    setTimerTasks,
    rangeTimerTasks,
    
    // 操作历史
    operationHistory,
    setOperationHistory,
    isOperationHistoryExpanded,
    setIsOperationHistoryExpanded,
    hasFetchedHistory,
    operationHistoryRef,
    
    // 数据加载函数
    fetchTimerTasks,
    fetchRangeTimerTasks,
    fetchOperationRecords,
  };
}

