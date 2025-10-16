'use client'

import { TreasureList } from '../components/features/treasure/TreasureList'
import { useDevSession } from '../hooks/useDevSession'

export default function TreasurePavilionPage() {
  // 使用开发会话，支持自动登录示例账户
  const { data: session, status } = useDevSession()

  return (
    <div className="log-page-layout">
      <div className="w-full container-padding py-8">
        {/* 宝藏列表 */}
        <TreasureList />
      </div>
    </div>
  )
}
