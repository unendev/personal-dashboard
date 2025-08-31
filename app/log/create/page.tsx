'use client'

import CreateLogForm from '@/app/components/CreateLogForm';

export default function CreateLogPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">创建日志</h1>
      <CreateLogForm />
    </div>
  );
}

