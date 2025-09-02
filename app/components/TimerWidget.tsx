'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';

interface TimerTask {
  id: string;
  name: string;
  startTime: number | null;
  totalTime: number;
  isRunning: boolean;
}

const TimerWidget: React.FC = () => {
  const [currentTask, setCurrentTask] = useState<TimerTask | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 从localStorage加载当前任务
  useEffect(() => {
    const savedTasks = localStorage.getItem('enhanced-timer-tasks');
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks);
      const runningTask = parsedTasks.find((task: TimerTask) => task.isRunning);
      if (runningTask) {
        setCurrentTask(runningTask);
        if (runningTask.startTime) {
          setElapsedTime(Math.floor((Date.now() - runningTask.startTime) / 1000));
        }
      }
    }
  }, []);

  // 更新计时器显示
  useEffect(() => {
    if (currentTask && currentTask.isRunning && currentTask.startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - currentTask.startTime!) / 1000));
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

  const stopCurrentTask = () => {
    if (!currentTask || !currentTask.startTime) return;

    const elapsed = Math.floor((Date.now() - currentTask.startTime) / 1000);
    const updatedTask = {
      ...currentTask,
      startTime: null,
      totalTime: currentTask.totalTime + elapsed,
      isRunning: false
    };

    // 更新localStorage中的任务
    const savedTasks = localStorage.getItem('enhanced-timer-tasks');
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks);
      const updatedTasks = parsedTasks.map((t: TimerTask) => 
        t.id === currentTask.id ? updatedTask : t
      );
      localStorage.setItem('enhanced-timer-tasks', JSON.stringify(updatedTasks));
    }

    setCurrentTask(null);
    setElapsedTime(0);
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
          <div className="text-white/80 text-sm mb-4">
            {currentTask.name}
          </div>
          <Button 
            onClick={stopCurrentTask}
            variant="outline"
            size="sm"
            className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
          >
            停止
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-2xl font-mono text-white/40 mb-3">
            00:00
          </div>
          <div className="text-white/60 text-sm mb-4">
            暂无活动任务
          </div>
          <a 
            href="/timer"
            className="inline-block px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            开始计时
          </a>
        </div>
      )}
    </div>
  );
};

export default TimerWidget;
