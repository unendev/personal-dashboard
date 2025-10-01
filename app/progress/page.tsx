'use client'

import React, { useState } from 'react';
import CategorySelector from '../components/shared/CategorySelector';
import WorkProgressWidget from '../components/features/dashboard/WorkProgressWidget';

export default function ProgressPage() {
  const [path, setPath] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">工作进度（预览）</h1>
      <CategorySelector onSelected={setPath} />
      {path && (
        <div className="pt-2">
          <WorkProgressWidget classificationPath={path} />
        </div>
      )}
    </div>
  );
}


