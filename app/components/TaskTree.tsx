'use client'

import React from 'react';
import TaskItem, { TaskNode } from './TaskItem';

interface TaskTreeProps {
  tasks: TaskNode[];
  onToggle: (taskId: string) => void;
  onAddChild: (parentId: string) => void;
}

const TaskTree: React.FC<TaskTreeProps> = ({ tasks, onToggle, onAddChild }) => {
  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onAddChild={onAddChild} />)
      )}
    </div>
  );
};

export default TaskTree;


