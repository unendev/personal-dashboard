'use client'

import { useDevSession } from '@/app/hooks/useDevSession'

export default function MindMapPage() {
  // 使用开发会话，支持自动登录示例账户
  const { data: session, status } = useDevSession()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">思维导图功能开发中...</h1>
      <p className="mt-4 text-gray-600">此功能正在开发中，敬请期待。</p>
    </div>
  )
}
