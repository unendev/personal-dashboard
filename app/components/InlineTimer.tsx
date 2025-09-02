'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';

interface InlineTimerProps {
  taskName: string;
  categoryPath: string;
  onTimeRecorded: (duration: string) => void;
  onCancel: () => void;
}

const InlineTimer: React.FC<InlineTimerProps> = ({ 
  taskName, 
  categoryPath, 
  onTimeRecorded, 
  onCancel 
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 开始计时
  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      setStartTime(Date.now());
    }
  };

  // 停止计时
  const stopTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  // 记录时间
  const recordTime = () => {
    stopTimer();
    const duration = formatTime(elapsedTime);
    onTimeRecorded(duration);
  };

  // 重置计时器
  const resetTimer = () => {
    stopTimer();
    setElapsedTime(0);
    setStartTime(null);
  };

  // 更新计时器显示
  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, startTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatDisplayTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          计时: {taskName}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          分类: {categoryPath}
        </p>
        
        <div className="text-3xl font-mono text-blue-600 mb-4">
          {formatDisplayTime(elapsedTime)}
        </div>
      </div>

      <div className="flex gap-2">
        {!isRunning ? (
          <Button 
            onClick={startTimer}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            开始计时
          </Button>
        ) : (
          <Button 
            onClick={stopTimer}
            variant="outline"
            className="flex-1"
          >
            暂停
          </Button>
        )}
        
        <Button 
          onClick={resetTimer}
          variant="outline"
          size="sm"
        >
          重置
        </Button>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={recordTime}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          disabled={elapsedTime === 0}
        >
          记录时间 ({formatTime(elapsedTime)})
        </Button>
        
        <Button 
          onClick={onCancel}
          variant="outline"
          className="flex-1"
        >
          取消
        </Button>
      </div>
    </div>
  );
};

export default InlineTimer;
