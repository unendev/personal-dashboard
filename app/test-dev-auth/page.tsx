'use client'

import { useDevSession } from '@/app/hooks/useDevSession'
import { useState } from 'react'

export default function TestDevAuthPage() {
  const { data: session, status } = useDevSession()
  const [apiTestResult, setApiTestResult] = useState<{ status?: number; data?: unknown; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const testAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/example-auth')
      const data = await response.json()
      setApiTestResult({ status: response.status, data })
    } catch (error) {
      setApiTestResult({ error: error instanceof Error ? error.message : '请求失败' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🧪 开发环境认证测试
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 前端会话状态 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">
                前端会话状态
              </h2>
              <div className="space-y-2">
                <p><strong>状态:</strong> {status}</p>
                <p><strong>用户ID:</strong> {session?.user?.id || 'N/A'}</p>
                <p><strong>邮箱:</strong> {session?.user?.email || 'N/A'}</p>
                <p><strong>姓名:</strong> {session?.user?.name || 'N/A'}</p>
                <p><strong>环境:</strong> {process.env.NODE_ENV}</p>
              </div>
            </div>

            {/* API测试结果 */}
            <div className="bg-green-50 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-green-900 mb-3">
                API认证测试
              </h2>
              <button
                onClick={testAPI}
                disabled={loading}
                className="mb-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '测试中...' : '测试API认证'}
              </button>
              
              {apiTestResult && (
                <div className="bg-white rounded p-3 text-sm">
                  <pre className="whitespace-pre-wrap overflow-auto">
                    {JSON.stringify(apiTestResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* 开发环境提示 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                🎯 开发环境特性
              </h3>
              <ul className="text-yellow-700 space-y-1">
                <li>✅ 自动提供开发用户会话</li>
                <li>✅ API路由自动认证</li>
                <li>✅ 无需手动登录</li>
                <li>✅ 跳过访客模式检查</li>
              </ul>
            </div>
          )}

          {/* 使用说明 */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              📖 使用说明
            </h3>
            <div className="text-blue-700 space-y-2">
              <p><strong>开发环境:</strong> 自动获得开发用户身份，无需登录</p>
              <p><strong>生产环境:</strong> 需要正常的用户登录流程</p>
              <p><strong>API测试:</strong> 可以使用超级管理员密钥或API密钥</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

