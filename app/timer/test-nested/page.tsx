'use client'

import { useState } from 'react';
import NestedTimerZone from '@/app/components/NestedTimerZone';

interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  parentId?: string | null;
  children?: TimerTask[];
}

export default function TestNestedPage() {
  const [tasks, setTasks] = useState<TimerTask[]>([
    {
      id: '1',
      name: '测试父任务',
      categoryPath: '测试分类',
      elapsedTime: 3600,
      initialTime: 0,
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      children: [
        {
          id: '2',
          name: '测试子任务1',
          categoryPath: '子分类1',
          elapsedTime: 1800,
          initialTime: 0,
          isRunning: false,
          startTime: null,
          isPaused: false,
          pausedTime: 0,
          children: [
            {
              id: '3',
              name: '测试孙任务',
              categoryPath: '孙分类',
              elapsedTime: 900,
              initialTime: 0,
              isRunning: false,
              startTime: null,
              isPaused: false,
              pausedTime: 0,
            }
          ]
        },
        {
          id: '4',
          name: '测试子任务2',
          categoryPath: '子分类2',
          elapsedTime: 1800,
          initialTime: 0,
          isRunning: false,
          startTime: null,
          isPaused: false,
          pausedTime: 0,
        }
      ]
    }
  ]);

  const recordOperation = (action: string, taskName: string, details?: string) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${action}: ${taskName}${details ? ` ${details}` : ''}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">嵌套计时器测试页面</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">测试任务列表</h2>
        <p className="text-gray-600 mb-4">
          这个页面用于测试嵌套计时器功能。每个任务卡片都应该显示"添加子任务"按钮。
        </p>
        
        <NestedTimerZone
          tasks={tasks}
          onTasksChange={setTasks}
          onOperationRecord={recordOperation}
        />
      </div>
      
      <div className="mt-8 bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">测试说明：</h3>
        <ul className="text-blue-800 space-y-1">
          <li>• 每个任务卡片右侧应该有3个按钮：开始/暂停、添加子任务、删除</li>
          <li>• "添加子任务"按钮应该是绿色的</li>
          <li>• 点击"添加子任务"应该弹出对话框</li>
          <li>• 有子任务的任务应该有绿色左边框</li>
          <li>• 子任务应该有缩进显示</li>
        </ul>
      </div>
    </div>
  );
}
