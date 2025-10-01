'use client'

import React, { useState } from 'react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';

interface TaskInputProps {
  classificationPath: string;
  onCreate: (taskName: string) => void;
  placeholder?: string;
}

const TaskInput: React.FC<TaskInputProps> = ({ classificationPath, onCreate, placeholder }) => {
  const [name, setName] = useState('');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? `在 ${classificationPath} 下输入任务名并回车/点击创建`}
      />
      <Button onClick={handleCreate}>开始/创建</Button>
    </div>
  );
};

export default TaskInput;





