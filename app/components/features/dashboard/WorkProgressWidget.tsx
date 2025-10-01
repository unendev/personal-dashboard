'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TaskInput from '../todo/TaskInput';
import TaskTree from '../todo/TaskTree';
import type { TaskNode } from '../todo/TaskItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

interface WorkProgressWidgetProps {
  classificationPath: string;
}

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const STORAGE_KEY = 'work-progress-tasks-v1';

function loadAllTasks(): Record<string, TaskNode[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, TaskNode[]>;
  } catch {
    return {};
  }
}

function saveAllTasks(map: Record<string, TaskNode[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

// 深度遍历，找到节点并返回其路径
function findPathById(nodes: TaskNode[], id: string, path: number[] = []): number[] | null {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.id === id) return [...path, i];
    const child = findPathById(n.children ?? [], id, [...path, i, -1]);
    if (child) return child;
  }
  return null;
}

function getNodeByPath(nodes: TaskNode[], path: number[]): TaskNode | null {
  let cur: TaskNode[] | TaskNode = nodes;
  for (let i = 0; i < path.length; i++) {
    const idx = path[i];
    if (idx === -1) {
      // -1 表示下一层 children
      if (Array.isArray(cur) || !cur.children) return null;
      cur = cur.children;
    } else {
      if (Array.isArray(cur)) {
        if (idx >= cur.length) return null;
        cur = cur[idx];
      } else {
        return null;
      }
    }
    if (!cur) return null;
  }
  return Array.isArray(cur) ? null : cur;
}

const WorkProgressWidget: React.FC<WorkProgressWidgetProps> = ({ classificationPath }) => {
  const [taskMap, setTaskMap] = useState<Record<string, TaskNode[]>>({});
  const tasks = useMemo(() => taskMap[classificationPath] ?? [], [taskMap, classificationPath]);

  const runningTaskRef = useRef<{ id: string } | null>(null);
  const intervalRef = useRef<number | null>(null);

  // 初始化
  useEffect(() => {
    const all = loadAllTasks();
    setTaskMap(all);
  }, []);

  // 持久化
  useEffect(() => {
    saveAllTasks(taskMap);
  }, [taskMap]);

  const setTasksForPath = useCallback((updater: (prev: TaskNode[]) => TaskNode[]) => {
    setTaskMap(prev => ({ ...prev, [classificationPath]: updater(prev[classificationPath] ?? []) }));
  }, [classificationPath]);

  const stopOtherTasks = useCallback((draft: TaskNode[]) => {
    const now = Date.now();
    const dfs = (nodes: TaskNode[]) => {
      nodes.forEach(n => {
        if (n.isRunning) {
          if (n.lastStartTime) {
            const delta = Math.floor((now / 1000 - n.lastStartTime));
            n.timeSpent += Math.max(0, delta);
          }
          n.isRunning = false;
          n.lastStartTime = null;
        }
        if (n.children?.length) dfs(n.children);
      });
    };
    dfs(draft);
  }, []);

  // 全局停止所有其他路径的任务
  const stopAllOtherPaths = useCallback(() => {
    setTaskMap(prev => {
      const draft = { ...prev };
      Object.keys(draft).forEach(path => {
        if (path !== classificationPath) {
          const pathDraft = clone(draft[path] || []);
          stopOtherTasks(pathDraft);
          draft[path] = pathDraft;
        }
      });
      return draft;
    });
  }, [classificationPath, stopOtherTasks]);

  const toggleTaskInternal = useCallback((taskId: string, autoStartIfPaused = false) => {
    setTasksForPath(prev => {
      const draft = clone(prev);
      // 停止所有其他任务
      stopOtherTasks(draft);
      // 切换当前任务
      const path = findPathById(draft, taskId);
      if (!path) return prev;
      const node = getNodeByPath(draft, path);
      if (!node) return prev;
      if (node.isRunning) {
        // 暂停
        if (node.lastStartTime) {
                      const delta = Math.floor((Date.now() / 1000 - node.lastStartTime));
          node.timeSpent += Math.max(0, delta);
        }
        node.isRunning = false;
        node.lastStartTime = null;
        runningTaskRef.current = null;
      } else if (autoStartIfPaused || !node.isRunning) {
        // 开始前先停止所有其他路径的任务
        stopAllOtherPaths();
        node.isRunning = true;
                    node.lastStartTime = Math.floor(Date.now() / 1000);
        runningTaskRef.current = { id: node.id };
      }
      return draft;
    });
  }, [stopOtherTasks, setTasksForPath, stopAllOtherPaths]);

  const addTopTask = useCallback((name: string) => {
    const newTask: TaskNode = {
      id: generateId(),
      name,
      classificationPath,
      parentId: null,
      children: [],
      timeSpent: 0,
      isRunning: false,
      lastStartTime: null,
    };
    setTasksForPath(prev => [newTask, ...prev]);
    // 自动开始/继续
    toggleTaskInternal(newTask.id, true);
  }, [classificationPath, setTasksForPath, toggleTaskInternal]);

  const addChildTask = useCallback((parentId: string) => {
    const childName = prompt('输入子任务名称');
    if (!childName) return;
    setTasksForPath(prev => {
      const draft = clone(prev);
      const path = findPathById(draft, parentId);
      if (!path) return prev;
      const parent = getNodeByPath(draft, path);
      if (!parent) return prev;
      const child: TaskNode = {
        id: generateId(),
        name: childName,
        classificationPath,
        parentId: parentId,
        children: [],
        timeSpent: 0,
        isRunning: false,
        lastStartTime: null,
      };
      parent.children.push(child);
      return draft;
    });
  }, [classificationPath, setTasksForPath]);

  // 心跳：每秒更新当前运行任务的展示时间（非持久化加和，暂停时已固化）
  useEffect(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setTasksForPath(prev => {
        const draft = clone(prev);
        const update = (nodes: TaskNode[]) => {
          nodes.forEach(n => {
            // 展示层不修改 timeSpent，timeSpent 只在暂停时固化
            // 这里选择不做额外字段，依靠 rerender 驱动 TaskItem 的 mm:ss:ss 展示
            if (n.children?.length) update(n.children);
          });
        };
        update(draft);
        return draft;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [setTasksForPath]);

  const onToggle = useCallback((taskId: string) => {
    toggleTaskInternal(taskId);
  }, [toggleTaskInternal]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>工作进度 - {classificationPath}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TaskInput classificationPath={classificationPath} onCreate={addTopTask} />
        <TaskTree tasks={tasks} onToggle={onToggle} onAddChild={addChildTask} />
      </CardContent>
    </Card>
  );
};

export default WorkProgressWidget;





