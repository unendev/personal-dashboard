'use client'

import { Suspense } from 'react';
import CreateLogForm from '@/app/components/CreateLogForm';

export default function CreateLogPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">创建日志</h1>
      <Suspense fallback={<div>加载中...</div>}>
        <CreateLogForm />
      </Suspense>
    </div>
  );
}

