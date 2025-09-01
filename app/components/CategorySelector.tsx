'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

type CategoryNode = {
  name: string;
  children?: CategoryNode[];
};

interface CategorySelectorProps {
  onSelected: (classificationPath: string) => void;
  className?: string;
}

function buildPath(parent: string | null, current: string): string {
  return parent ? `${parent}/${current}` : current;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelected, className }) => {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [selectedTop, setSelectedTop] = useState<string | null>(null);
  const [selectedMid, setSelectedMid] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/log-categories');
        const data = await res.json();
        setCategories(data as CategoryNode[]);
      } catch (e) {
        console.error('加载分类失败', e);
      }
    };
    load();
  }, []);

  const topList = categories;
  const midList = useMemo(() => {
    if (!selectedTop) return [] as CategoryNode[];
    const top = categories.find(c => c.name === selectedTop);
    return top?.children ?? [];
  }, [categories, selectedTop]);

  const leafList = useMemo(() => {
    if (!selectedTop) return [] as CategoryNode[];
    if (!selectedMid) return [] as CategoryNode[];
    const top = categories.find(c => c.name === selectedTop);
    const mid = top?.children?.find(c => c.name === selectedMid);
    return mid?.children ?? [];
  }, [categories, selectedTop, selectedMid]);

  const handleSelectTop = (name: string) => {
    setSelectedTop(name);
    setSelectedMid(null);
  };

  const handleSelectMid = (name: string) => {
    setSelectedMid(name);
    const topPath = buildPath(null, selectedTop as string);
    const midPath = buildPath(topPath, name);

    // 使用当前点击的中类名称直接计算是否有子类，避免使用可能滞后的 leafList
    const top = categories.find(c => c.name === selectedTop);
    const mid = top?.children?.find(c => c.name === name);
    const hasLeaf = (mid?.children?.length ?? 0) > 0;
    if (!hasLeaf) onSelected(midPath);
  };

  const handleSelectLeaf = (name: string) => {
    const topPath = buildPath(null, selectedTop as string);
    const midPath = buildPath(topPath, selectedMid as string);
    const leafPath = buildPath(midPath, name);
    onSelected(leafPath);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>选择大类</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topList.map(item => (
                <Button
                  key={item.name}
                  variant={selectedTop === item.name ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => handleSelectTop(item.name)}
                >
                  {item.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>选择中类</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {midList.length === 0 && (
                <div className="text-sm text-muted-foreground">请选择大类</div>
              )}
              {midList.map(item => (
                <Button
                  key={item.name}
                  variant={selectedMid === item.name ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => handleSelectMid(item.name)}
                >
                  {item.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>选择子类</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedMid && leafList.length === 0 && (
                <div className="text-sm text-muted-foreground">此中类无子类，已可直接创建任务</div>
              )}
              {leafList.map(item => (
                <Button
                  key={item.name}
                  variant={'ghost'}
                  className="w-full justify-start"
                  onClick={() => handleSelectLeaf(item.name)}
                >
                  {item.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CategorySelector;


