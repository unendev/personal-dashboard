'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { TimerDB, TimerTask } from '../lib/timer-db';

const TimerWidget: React.FC = () => {
  const [currentTask, setCurrentTask] = useState<TimerTask | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [userId] = useState('user-1'); // 临时用户ID，后续需要集成认证

  // 从数据库加载当前运行的任务
  useEffect(() => {
    const loadRunningTask = async () => {
      try {
        const runningTask = await TimerDB.getRunningTask(userId);
        if (runningTask) {
          setCurrentTask(runningTask);
          if (runningTask.startTime) {
            setElapsedTime(Math.floor((Date.now() / 1000 - runningTask.startTime)));
          }
        }
      } catch (error) {
        console.error('Failed to load running task:', error);
      }
    };

    loadRunningTask();
  }, [userId]);

  // 更新计时器显示
  useEffect(() => {
    if (currentTask && currentTask.isRunning && currentTask.startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() / 1000 - currentTask.startTime!)));
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
  }, [currentTask]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const stopCurrentTask = async () => {
    if (!currentTask || !currentTask.startTime) return;

    try {
      const elapsed = Math.floor((Date.now() / 1000 - currentTask.startTime));
      const finalElapsedTime = currentTask.elapsedTime + elapsed;
      
      // 更新数据库中的任务
      await TimerDB.updateTask(currentTask.id, {
        elapsedTime: finalElapsedTime,
        isRunning: false,
        isPaused: false,
        completedAt: Math.floor(Date.now() / 1000)
      });

      // 重新加载运行中的任务
      const runningTask = await TimerDB.getRunningTask(userId);
      setCurrentTask(runningTask);
      setElapsedTime(0);
    } catch (error) {
      console.error('Failed to stop task:', error);
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-6 hover-lift h-full">
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold gradient-text mb-1">计时器</h2>
        <p className="text-white/60 text-xs">时间追踪</p>
      </div>
      
      {currentTask ? (
        <div className="text-center">
          <div className="text-2xl font-mono text-white mb-3">
            {formatTime(elapsedTime)}
          </div>
          <div className="text-white/80 mb-4">
            <div className="font-medium">{currentTask.name}</div>
            <div className="text-sm text-white/60">{currentTask.categoryPath}</div>
          </div>
          <Button 
            onClick={stopCurrentTask}
            className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
          >
            完成
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-2xl font-mono text-white/60 mb-3">
            00:00
          </div>
          <div className="text-white/60 text-sm">
            暂无运行中的任务
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerWidget;
