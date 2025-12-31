'use client'

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AIStatus = 'idle' | 'analyzing' | 'success' | 'error';

interface AIStatusLogProps {
  status: AIStatus;
  message: string;
  details?: string;
}

export function AIStatusLog({ status, message, details }: AIStatusLogProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== 'idle') {
      setVisible(true);
      // Auto hide after success/error after 5s
      if (status === 'success' || status === 'error') {
        const timer = setTimeout(() => setVisible(false), 5000);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [status, message]);

  if (!visible) return null;

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 max-w-sm w-full bg-gray-900/95 backdrop-blur-md border border-gray-700/50 shadow-2xl rounded-lg overflow-hidden transition-all duration-300 transform translate-y-0 opacity-100 font-mono text-sm",
      !visible && "translate-y-10 opacity-0 pointer-events-none"
    )}>
      <div className="flex items-center gap-3 p-3 border-b border-gray-800 bg-gray-950/50">
        {status === 'analyzing' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
        {status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        {status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
        <span className={cn(
          "font-semibold",
          status === 'analyzing' && "text-indigo-300",
          status === 'success' && "text-emerald-300",
          status === 'error' && "text-red-300"
        )}>
          {status === 'analyzing' ? 'AI 正在思考...' : 
           status === 'success' ? '执行成功' : '执行失败'}
        </span>
      </div>
      
      <div className="p-3 text-gray-300 space-y-1">
        <div className="flex gap-2">
            <Terminal size={14} className="mt-0.5 text-gray-500 shrink-0" />
            <p>{message}</p>
        </div>
        {details && (
          <div className="pl-6 text-xs text-gray-500 border-l border-gray-800 ml-1.5 mt-1 pt-1">
            {details}
          </div>
        )}
      </div>
    </div>
  );
}
