'use client'

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';

export type TaskNode = {
  id: string;
  name: string;
  classificationPath: string;
  parentId: string | null;
  children: TaskNode[];
  timeSpent: number; // seconds
  isRunning: boolean;
  lastStartTime: number | null;
};

interface TaskItemProps {
  task: TaskNode;
  onToggle: (taskId: string) => void;
  onAddChild: (parentId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onAddChild }) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // 实时更新计时显示
  useEffect(() => {
    if (task.isRunning) {
      const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [task.isRunning]);
  
  const totalSeconds = task.isRunning && task.lastStartTime 
    ? task.timeSpent + Math.floor((currentTime / 1000 - task.lastStartTime))
    : task.timeSpent;
    
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const timeText = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium truncate">{task.name}</div>
        <div className="text-sm tabular-nums text-muted-foreground">{timeText}</div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onToggle(task.id)}>
          {task.isRunning ? '暂停' : '开始/继续'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onAddChild(task.id)}>
          添加子任务
        </Button>
      </div>
      {task.children?.length > 0 && (
        <div className="pl-4 border-l space-y-2">
          {task.children.map(child => (
            <TaskItem key={child.id} task={child} onToggle={onToggle} onAddChild={onAddChild} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskItem;


