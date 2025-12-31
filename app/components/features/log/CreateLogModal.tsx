'use client'

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import CreateLogFormWithCards from './CreateLogFormWithCards';
import SmartCreateLogForm from './SmartCreateLogForm';
import { Button } from '@/app/components/ui/button';
import { Sparkles, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogSaved?: () => void;
  onAddToTimer?: (taskName: string, categoryPath: string, date: string, initialTime?: number, instanceTagNames?: string) => Promise<void>;
  initialCategory?: string;
  selectedDate?: string;
}

const CreateLogModal: React.FC<CreateLogModalProps> = ({ 
  isOpen, 
  onClose, 
  onLogSaved, 
  onAddToTimer,
  initialCategory,
  selectedDate
}) => {
  const [mode, setMode] = useState<'smart' | 'manual'>('smart');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl md:w-auto max-h-[95vh] md:max-h-[90vh] overflow-y-auto mx-auto px-3 md:px-6 py-4 md:py-6 bg-gray-900 border-gray-800 text-gray-100">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-800">
          <DialogTitle className="text-lg md:text-xl font-semibold flex items-center gap-2">
            {mode === 'smart' ? '✨ 智能创建' : '📝 手动创建'}
          </DialogTitle>
          
          <div className="flex bg-gray-800 p-1 rounded-lg">
            <button
                onClick={() => setMode('smart')}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    mode === 'smart' 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                )}
            >
                <Sparkles size={14} />
                <span>AI</span>
            </button>
            <button
                onClick={() => setMode('manual')}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    mode === 'manual' 
                        ? "bg-gray-700 text-white shadow-sm" 
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                )}
            >
                <ListTodo size={14} />
                <span>表单</span>
            </button>
          </div>
        </DialogHeader>

        <div className="mt-3 md:mt-4 pb-4">
          {mode === 'smart' ? (
            <SmartCreateLogForm 
                onAddToTimer={onAddToTimer}
                selectedDate={selectedDate}
                onCancel={onClose}
            />
          ) : (
            <CreateLogFormWithCards 
                onLogSaved={onLogSaved}
                onAddToTimer={onAddToTimer}
                initialCategory={initialCategory}
                selectedDate={selectedDate}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLogModal;